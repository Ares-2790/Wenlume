import { GoogleGenAI } from "@google/genai";
import {
  LITE_FALLBACKS,
  MODELS,
  PRIMARY_FALLBACKS,
  TTS_VOICE,
  type ModelId,
  type TtsMode,
} from "./models";
import type {
  CharacterResult,
  ChatMessage,
  ConversationTurnResult,
  LessonSummary,
  ScanResult,
  SpeakingResult,
  TranslateMode,
  TranslateResult,
} from "./types";

/** Strip BOM / whitespace — BOM (char 65279) breaks HTTP header ByteString. */
function sanitizeApiKey(raw: string | undefined): string {
  return (raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function getClient() {
  const apiKey = sanitizeApiKey(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
}

function isTemporaryError(message: string): boolean {
  const lower = message.toLowerCase();
  return ["high demand", "500", "503", "429", "overloaded", "try again", "unavailable"].some(
    (token) => lower.includes(token),
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withModelFallback<T>(
  models: ModelId[],
  fn: (model: ModelId) => Promise<T>,
): Promise<{ result: T; model: ModelId }> {
  let lastError: Error | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await fn(model);
        return { result, model };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        if (isTemporaryError(err.message) && attempt === 0) {
          await sleep(1200);
          continue;
        }
        if (isTemporaryError(err.message)) break;
        throw err;
      }
    }
  }

  throw lastError ?? new Error("Gemini request failed");
}

function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model did not return valid JSON");
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

export async function generateChat(params: {
  messages: ChatMessage[];
  systemPrompt: string;
}): Promise<{ answer: string; model: ModelId }> {
  const ai = getClient();
  const history = params.messages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
  const lastMessage = params.messages[params.messages.length - 1]?.content ?? "";

  const { result, model } = await withModelFallback(PRIMARY_FALLBACKS, async (m) => {
    const response = await ai.models.generateContent({
      model: m,
      contents: [
        ...history,
        { role: "user", parts: [{ text: lastMessage }] },
      ],
      config: {
        systemInstruction: params.systemPrompt,
      },
    });
    return response.text ?? "Không nhận được phản hồi từ mô hình.";
  });

  return { answer: result, model };
}

export async function analyzeScanImage(params: {
  mimeType: string;
  base64Data: string;
}): Promise<{ result: ScanResult; model: ModelId }> {
  const ai = getClient();
  const prompt = `You are an expert Chinese OCR and language tutor for Vietnamese learners.
Analyze the image. Extract all Chinese text in reading order.
Return ONLY valid JSON with this exact schema:
{
  "fullText": "",
  "translationVietnamese": "",
  "translationEnglish": "",
  "segments": [
    {
      "chinese": "",
      "pinyin": "",
      "hanViet": "",
      "vietnamese": "",
      "english": "",
      "explanation": ""
    }
  ],
  "vocabulary": [
    {
      "word": "",
      "pinyin": "",
      "hanViet": "",
      "meaningVi": "",
      "meaningEn": "",
      "exampleZh": "",
      "examplePinyin": "",
      "exampleVi": "",
      "partOfSpeech": ""
    }
  ]
}
Rules:
- Keep original Chinese characters exactly.
- Provide accurate pinyin with tone marks.
- Han Viet only when historically appropriate; otherwise empty string.
- Do not invent text not present in the image.
- If no Chinese is found, return empty strings and empty arrays.`;

  return withModelFallback(PRIMARY_FALLBACKS, async (m) => {
    const response = await ai.models.generateContent({
      model: m,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: params.mimeType,
                data: params.base64Data,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "{}";
    const parsed = extractJson<ScanResult>(text);
    return {
      fullText: parsed.fullText ?? "",
      translationVietnamese: parsed.translationVietnamese ?? "",
      translationEnglish: parsed.translationEnglish ?? "",
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
      vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
    };
  });
}

export async function translateText(params: {
  text: string;
  sourceLang: "zh" | "vi" | "en" | "auto";
  targetLang: "zh" | "vi" | "en";
  mode: TranslateMode;
}): Promise<{ result: TranslateResult; model: ModelId }> {
  const ai = getClient();
  const modeHint =
    params.mode === "literal"
      ? "Prefer literal / word-for-word fidelity."
      : params.mode === "learner"
        ? "Explain for Chinese learners: natural translation plus learning notes."
        : "Prefer natural fluent translation.";

  const prompt = `Translate for a Mandarin learning app (Vietnamese users).
Source language: ${params.sourceLang}
Target language: ${params.targetLang}
Mode: ${params.mode}. ${modeHint}

Text:
"""
${params.text}
"""

Return ONLY JSON:
{
  "sourceLang": "",
  "targetLang": "",
  "sourceText": "",
  "translation": "",
  "chinese": "",
  "pinyin": "",
  "hanViet": "",
  "keyWords": [
    {
      "word": "",
      "pinyin": "",
      "hanViet": "",
      "meaningVi": "",
      "meaningEn": ""
    }
  ],
  "notes": ""
}
If Chinese appears in input or output, fill chinese/pinyin. Han Viet only when appropriate.`;

  return withModelFallback(PRIMARY_FALLBACKS, async (m) => {
    const response = await ai.models.generateContent({
      model: m,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsed = extractJson<TranslateResult>(response.text ?? "{}");
    return {
      sourceLang: parsed.sourceLang || params.sourceLang,
      targetLang: parsed.targetLang || params.targetLang,
      sourceText: parsed.sourceText || params.text,
      translation: parsed.translation ?? "",
      chinese: parsed.chinese,
      pinyin: parsed.pinyin,
      hanViet: parsed.hanViet,
      keyWords: parsed.keyWords ?? [],
      notes: parsed.notes,
    };
  });
}

function buildTtsTranscript(text: string, mode: TtsMode): string {
  const clean = text.trim();
  if (mode === "slow") {
    return `[slow] ${clean}`;
  }
  if (mode === "shadowing") {
    return `[slow] ${clean} [short pause] ${clean}`;
  }
  if (mode === "literary") {
    return `[calm] ${clean}`;
  }
  return clean;
}

/** Gemini TTS returns raw PCM (24kHz mono). Wrap as WAV for browsers. */
export function pcmBase64ToWavBase64(
  pcmBase64: string,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16,
): string {
  const pcm = Buffer.from(pcmBase64, "base64");
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

export async function synthesizeSpeech(params: {
  text: string;
  mode?: TtsMode;
}): Promise<{ audioBase64: string; mimeType: string; model: ModelId }> {
  const ai = getClient();
  const mode = params.mode ?? "normal";
  const transcript = buildTtsTranscript(params.text, mode);

  // Style preamble so the model does not speak the instructions aloud.
  const input = `Read the Mandarin Chinese transcript aloud only. Do not read any instructions.
Speak clearly in standard Putonghua for a Vietnamese learner.
Transcript:
${transcript}`;

  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: input,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: TTS_VOICE },
        },
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data,
  );
  const data = part?.inlineData?.data;
  const mime = part?.inlineData?.mimeType ?? "audio/L16";

  if (!data) {
    throw new Error("TTS did not return audio data");
  }

  // Convert PCM to WAV when needed
  const isPcm =
    mime.toLowerCase().includes("l16") ||
    mime.toLowerCase().includes("pcm") ||
    mime.toLowerCase().includes("raw");

  if (isPcm) {
    return {
      audioBase64: pcmBase64ToWavBase64(data),
      mimeType: "audio/wav",
      model: MODELS.TTS,
    };
  }

  return {
    audioBase64: data,
    mimeType: mime.startsWith("audio/") ? mime : "audio/wav",
    model: MODELS.TTS,
  };
}

export async function generateLiteJson<T>(prompt: string): Promise<{
  result: T;
  model: ModelId;
}> {
  const ai = getClient();
  return withModelFallback(LITE_FALLBACKS, async (m) => {
    const response = await ai.models.generateContent({
      model: m,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return extractJson<T>(response.text ?? "{}");
  });
}

export async function analyzeSpeakingAudio(params: {
  expected: string;
  mimeType: string;
  base64Data: string;
}): Promise<{ result: SpeakingResult; model: ModelId }> {
  const ai = getClient();
  const prompt = `You are a Mandarin speaking coach for Vietnamese learners.
Expected sentence: "${params.expected}"

Listen to the learner audio. Return ONLY JSON:
{
  "expected": "",
  "expectedPinyin": "",
  "transcript": "",
  "overallFeedback": "",
  "fluencyFeedback": "",
  "pronunciationFeedback": "",
  "toneFeedback": [],
  "wordFeedback": [
    { "word": "", "pinyin": "", "status": "good|warning|incorrect", "feedback": "" }
  ],
  "correction": "",
  "naturalVersion": "",
  "estimatedScore": 0,
  "disclaimer": "Đây là nhận xét ước lượng bằng AI, không phải đo âm học chuyên dụng theo phoneme."
}
Rules:
- Be encouraging and specific.
- estimatedScore is AI-estimated 0-100 only.
- Always include the disclaimer above.
- If audio is empty/unclear, say so in overallFeedback.`;

  return withModelFallback(PRIMARY_FALLBACKS, async (m) => {
    const response = await ai.models.generateContent({
      model: m,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: params.mimeType,
                data: params.base64Data,
              },
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });
    const parsed = extractJson<SpeakingResult>(response.text ?? "{}");
    return {
      expected: parsed.expected || params.expected,
      expectedPinyin: parsed.expectedPinyin ?? "",
      transcript: parsed.transcript ?? "",
      overallFeedback: parsed.overallFeedback ?? "",
      fluencyFeedback: parsed.fluencyFeedback ?? "",
      pronunciationFeedback: parsed.pronunciationFeedback ?? "",
      toneFeedback: Array.isArray(parsed.toneFeedback) ? parsed.toneFeedback : [],
      wordFeedback: Array.isArray(parsed.wordFeedback) ? parsed.wordFeedback : [],
      correction: parsed.correction ?? "",
      naturalVersion: parsed.naturalVersion ?? "",
      estimatedScore: parsed.estimatedScore,
      disclaimer:
        parsed.disclaimer ||
        "Đây là nhận xét ước lượng bằng AI, không phải đo âm học chuyên dụng theo phoneme.",
    };
  });
}

export async function generatePracticeSentences(params: {
  level: string;
  count?: number;
  topic?: string;
}): Promise<{
  result: Array<{ chinese: string; pinyin: string; vietnamese: string }>;
  model: ModelId;
}> {
  const count = params.count ?? 8;
  const prompt = `Generate ${count} Mandarin practice sentences for HSK level ${params.level}.
Topic: ${params.topic || "daily life"}.
Return ONLY JSON:
{ "sentences": [ { "chinese": "", "pinyin": "", "vietnamese": "" } ] }`;
  const { result, model } = await generateLiteJson<{
    sentences: Array<{ chinese: string; pinyin: string; vietnamese: string }>;
  }>(prompt);
  return { result: result.sentences ?? [], model };
}

export async function lookupCharacter(character: string): Promise<{
  result: CharacterResult;
  model: ModelId;
}> {
  const prompt = `Explain the Chinese character/word for Vietnamese learners: "${character}".
Return ONLY JSON:
{
  "character": "",
  "pinyin": "",
  "hanViet": "",
  "meanings": [],
  "radical": "",
  "structure": "",
  "originalMeaning": "",
  "modernMeaning": "",
  "mnemonic": "",
  "compounds": [
    {
      "word": "",
      "pinyin": "",
      "hanViet": "",
      "meaningVi": "",
      "exampleZh": "",
      "examplePinyin": "",
      "exampleVi": ""
    }
  ],
  "nearSynonyms": [],
  "easilyConfused": [],
  "notes": "",
  "strokeOrderAvailable": false,
  "strokeOrderNote": "Stroke order data is not provided by this model; integrate a dedicated stroke-order dataset later."
}
Do NOT invent exact stroke order sequences. Keep strokeOrderAvailable false.`;

  return withModelFallback(PRIMARY_FALLBACKS, async (m) => {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: m,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsed = extractJson<CharacterResult>(response.text ?? "{}");
    return {
      character: parsed.character || character,
      pinyin: parsed.pinyin ?? "",
      hanViet: parsed.hanViet ?? "",
      meanings: parsed.meanings ?? [],
      radical: parsed.radical ?? "",
      structure: parsed.structure ?? "",
      originalMeaning: parsed.originalMeaning ?? "",
      modernMeaning: parsed.modernMeaning ?? "",
      mnemonic: parsed.mnemonic ?? "",
      compounds: parsed.compounds ?? [],
      nearSynonyms: parsed.nearSynonyms ?? [],
      easilyConfused: parsed.easilyConfused ?? [],
      notes: parsed.notes ?? "",
      strokeOrderAvailable: false,
      strokeOrderNote:
        parsed.strokeOrderNote ||
        "Chưa có dữ liệu nét viết chính xác; sẽ gắn nguồn stroke-order riêng sau.",
    };
  });
}

export async function conversationTurn(params: {
  scenario: string;
  level: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userText?: string;
  audio?: { mimeType: string; base64Data: string };
}): Promise<{ result: ConversationTurnResult; model: ModelId }> {
  const ai = getClient();
  const historyText = params.history
    .slice(-8)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `You are a Mandarin conversation partner for Vietnamese learners.
Scenario: ${params.scenario}
HSK level: ${params.level}
Speak mostly Chinese, adjust vocabulary to level.
Only translate if learner asks. Correct important errors briefly without stopping the flow.
History:
${historyText || "(start)"}
Learner text (may be empty if audio provided): ${params.userText || ""}

Return ONLY JSON:
{
  "replyChinese": "",
  "replyPinyin": "",
  "replyVietnamese": "",
  "correction": "",
  "tip": "",
  "newWords": [ { "word": "", "pinyin": "", "meaningVi": "" } ]
}`;

  return withModelFallback(PRIMARY_FALLBACKS, async (m) => {
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (params.audio) {
      parts.push({
        inlineData: {
          mimeType: params.audio.mimeType,
          data: params.audio.base64Data,
        },
      });
    }
    const response = await ai.models.generateContent({
      model: m,
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json" },
    });
    const parsed = extractJson<ConversationTurnResult>(response.text ?? "{}");
    return {
      replyChinese: parsed.replyChinese ?? "",
      replyPinyin: parsed.replyPinyin ?? "",
      replyVietnamese: parsed.replyVietnamese ?? "",
      correction: parsed.correction,
      tip: parsed.tip,
      newWords: parsed.newWords ?? [],
    };
  });
}

export async function summarizeConversation(params: {
  scenario: string;
  level: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<{ result: LessonSummary; model: ModelId }> {
  const prompt = `Create a Mandarin lesson summary for Vietnamese learner.
Scenario: ${params.scenario}
Level: ${params.level}
Transcript:
${params.history.map((m) => `${m.role}: ${m.content}`).join("\n")}

Return ONLY JSON:
{
  "goodSentences": [],
  "grammarErrors": [],
  "unnaturalWords": [],
  "newWords": [ { "word": "", "pinyin": "", "meaningVi": "" } ],
  "usefulPatterns": [],
  "practiceAgain": []
}`;
  return generateLiteJson<LessonSummary>(prompt);
}
