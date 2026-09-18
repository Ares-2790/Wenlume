"use client";

import { useState } from "react";
import { Mic, Square } from "lucide-react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import type { LessonSummary } from "@/lib/ai/types";
import { progressStorage } from "@/lib/progress/storage";
import { vocabStorage } from "@/lib/vocab/storage";

const SCENARIOS = [
  "Quán cà phê",
  "Nhà hàng",
  "Sân bay",
  "Khách sạn",
  "Mua sắm",
  "Đại học",
  "Phỏng vấn",
  "Kết bạn",
  "Du lịch Trung Quốc",
];

const LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5+", "Free conversation"];

type Msg = { role: "user" | "assistant"; content: string; pinyin?: string; vi?: string };

export default function ConversationPage() {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [level, setLevel] = useState("HSK 2");
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">(
    "idle",
  );
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const recorder = useAudioRecorder();

  async function send(text?: string, audio?: Blob) {
    setLoading(true);
    setError(null);
    setStatus(audio ? "listening" : "thinking");
    const userContent = text?.trim() || (audio ? "[voice message]" : "");
    if (!userContent && !audio) {
      setLoading(false);
      return;
    }

    const nextHistory = [
      ...messages,
      { role: "user" as const, content: text?.trim() || "[Đã gửi audio]" },
    ];
    setMessages(nextHistory);
    setInput("");

    try {
      const form = new FormData();
      form.append("action", "turn");
      form.append("scenario", scenario);
      form.append("level", level);
      form.append("history", JSON.stringify(nextHistory));
      if (text?.trim()) form.append("text", text.trim());
      if (audio) form.append("audio", audio, "talk.webm");

      setStatus("thinking");
      const res = await fetch("/api/conversation", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi hội thoại");

      const reply = data.result;
      setStatus("speaking");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply.replyChinese,
          pinyin: reply.replyPinyin,
          vi: reply.replyVietnamese,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi hội thoại");
    } finally {
      setLoading(false);
      setStatus("idle");
    }
  }

  async function endConversation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "summary",
          scenario,
          level,
          history: messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo summary");
      setSummary(data.result as LessonSummary);
      progressStorage.track("conversation", `Hội thoại: ${scenario}`);
      setStarted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi summary");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Conversation</h1>
        <p>
          Hội thoại theo tình huống + HSK. (Bản turn-based an toàn: text/audio → server →
          Gemini; TTS để nghe lại. Live realtime thuần sẽ nâng cấp tiếp.)
        </p>
      </header>

      {!started ? (
        <section className="panel stack">
          <label>
            Tình huống
            <select
              className="select"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {SCENARIOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Level
            <select
              className="select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setStarted(true);
              setMessages([]);
              setSummary(null);
              void send("你好！");
            }}
          >
            Bắt đầu hội thoại
          </button>
        </section>
      ) : (
        <section className="panel stack">
          <div className="row">
            <span className="chip">{scenario}</span>
            <span className="chip">{level}</span>
            <span className="chip">Trạng thái: {status}</span>
            <button type="button" className="btn secondary" onClick={() => void endConversation()}>
              Kết thúc & tóm tắt
            </button>
          </div>

          <div className="chat-log" style={{ maxHeight: 360 }}>
            {messages.map((m, i) => (
              <article key={`${m.role}-${i}`} className={`bubble ${m.role === "user" ? "user" : ""}`}>
                <div className="role">{m.role === "user" ? "Bạn" : "AI"}</div>
                <div className="zh-block" style={{ fontSize: "1.15rem" }}>
                  {m.content}
                </div>
                {m.pinyin ? <div className="meta-line">{m.pinyin}</div> : null}
                {m.vi ? <div className="meta-line">{m.vi}</div> : null}
                {m.role === "assistant" ? (
                  <SpeakButton text={m.content} mode="normal" />
                ) : null}
              </article>
            ))}
          </div>

          <div className="composer">
            <textarea
              className="textarea"
              rows={2}
              value={input}
              placeholder="Gõ tiếng Trung hoặc Việt..."
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={loading || !input.trim()}
              onClick={() => void send(input)}
            >
              Gửi
            </button>
          </div>
          <div className="row">
            {recorder.status !== "recording" ? (
              <button type="button" className="btn secondary" onClick={() => void recorder.start()}>
                <Mic size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                Nói
              </button>
            ) : (
              <button
                type="button"
                className="btn secondary"
                onClick={() => void recorder.stop().then((b) => b && send(undefined, b))}
              >
                <Square size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                Gửi audio
              </button>
            )}
          </div>
          {recorder.error ? <p className="field-error">{recorder.error}</p> : null}
        </section>
      )}

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} /> : null}

      {summary ? (
        <section className="panel stack">
          <h3 style={{ margin: 0 }}>Lesson Summary</h3>
          <div>
            <strong>Câu nói tốt</strong>
            <ul>
              {summary.goodSentences.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Lỗi grammar</strong>
            <ul>
              {summary.grammarErrors.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Từ mới</strong>
            {summary.newWords.map((w) => (
              <div key={w.word} className="row">
                <span>
                  {w.word} ({w.pinyin}) — {w.meaningVi}
                </span>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    vocabStorage.save({
                      chinese: w.word,
                      pinyin: w.pinyin,
                      vietnamese: w.meaningVi,
                      source: "chat",
                    })
                  }
                >
                  Lưu từ
                </button>
              </div>
            ))}
          </div>
          <div>
            <strong>Cần luyện lại</strong>
            <ul>
              {summary.practiceAgain.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
