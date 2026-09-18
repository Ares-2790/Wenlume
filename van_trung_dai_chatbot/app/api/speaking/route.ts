import { NextRequest, NextResponse } from "next/server";
import { analyzeSpeakingAudio, generatePracticeSentences } from "@/lib/ai/gemini";

export const maxDuration = 60;
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const action = String(form.get("action") ?? "analyze");

    if (action === "generate") {
      const level = String(form.get("level") ?? "HSK 2");
      const topic = String(form.get("topic") ?? "daily life");
      const { result, model } = await generatePracticeSentences({
        level,
        topic,
        count: 6,
      });
      return NextResponse.json({ sentences: result, model });
    }

    const expected = String(form.get("expected") ?? "").trim();
    const file = form.get("audio");
    if (!expected) {
      return NextResponse.json({ error: "Thiếu câu chuẩn." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file âm thanh." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Audio quá lớn (tối đa 6MB)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { result, model } = await analyzeSpeakingAudio({
      expected,
      mimeType: file.type || "audio/webm",
      base64Data: buffer.toString("base64"),
    });
    return NextResponse.json({ result, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi Speaking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
