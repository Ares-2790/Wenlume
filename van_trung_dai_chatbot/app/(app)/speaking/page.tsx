"use client";

import { useState } from "react";
import { Mic, Square } from "lucide-react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import type { SpeakingResult } from "@/lib/ai/types";
import { progressStorage } from "@/lib/progress/storage";

const PRESETS = [
  { chinese: "我今天想去学校。", pinyin: "Wǒ jīntiān xiǎng qù xuéxiào." },
  { chinese: "请问，洗手间在哪里？", pinyin: "Qǐngwèn, xǐshǒujiān zài nǎlǐ?" },
  { chinese: "我想点一杯咖啡。", pinyin: "Wǒ xiǎng diǎn yì bēi kāfēi." },
];

export default function SpeakingPage() {
  const [level, setLevel] = useState("HSK 2");
  const [expected, setExpected] = useState(PRESETS[0].chinese);
  const [pinyin, setPinyin] = useState(PRESETS[0].pinyin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const recorder = useAudioRecorder();

  async function generateSentences() {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("action", "generate");
      form.append("level", level);
      const res = await fetch("/api/speaking", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được câu");
      const first = data.sentences?.[0];
      if (first) {
        setExpected(first.chinese);
        setPinyin(first.pinyin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo câu");
    } finally {
      setLoading(false);
    }
  }

  async function analyze(blob: Blob) {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("expected", expected);
      form.append("audio", blob, "take.webm");
      const res = await fetch("/api/speaking", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không phân tích được");
      setResult(data.result as SpeakingResult);
      progressStorage.track("speaking", `Luyện nói: ${expected}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi phân tích");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Speaking Coach</h1>
        <p>Thu âm và nhận xét phát âm / thanh điệu (ước lượng AI).</p>
      </header>

      <section className="panel stack">
        <div className="row">
          <select
            className="select"
            style={{ width: "auto" }}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5+"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <button type="button" className="btn secondary" onClick={() => void generateSentences()}>
            AI sinh câu
          </button>
        </div>

        <div className="tabs">
          {PRESETS.map((p) => (
            <button
              key={p.chinese}
              type="button"
              className={`tab ${expected === p.chinese ? "active" : ""}`}
              onClick={() => {
                setExpected(p.chinese);
                setPinyin(p.pinyin);
                setResult(null);
              }}
            >
              {p.chinese}
            </button>
          ))}
        </div>

        <textarea
          className="textarea"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          rows={2}
        />
        <div className="meta-line">{pinyin}</div>
        <SpeakButton text={expected} mode="slow" label="Nghe câu chuẩn" />

        <div className="row" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
          {recorder.status !== "recording" ? (
            <button type="button" className="btn" onClick={() => void recorder.start()}>
              <Mic size={18} style={{ marginRight: 6, verticalAlign: -3 }} />
              Bắt đầu thu âm
            </button>
          ) : (
            <button
              type="button"
              className="btn secondary"
              onClick={() => void recorder.stop().then((b) => b && analyze(b))}
            >
              <Square size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
              Dừng & chấm
            </button>
          )}
        </div>
        {recorder.error ? <p className="field-error">{recorder.error}</p> : null}
      </section>

      {loading ? <LoadingBlock text="Đang phân tích giọng nói..." /> : null}
      {error ? <ErrorBlock message={error} /> : null}

      {result ? (
        <section className="panel stack">
          <p className="chip">{result.disclaimer}</p>
          {typeof result.estimatedScore === "number" ? (
            <strong>Điểm ước lượng AI: {result.estimatedScore}/100</strong>
          ) : null}
          <div>
            <div className="meta-line">Bạn nói (transcript)</div>
            <div>{result.transcript || "—"}</div>
          </div>
          <div className="row">
            {result.wordFeedback.map((w) => (
              <span
                key={`${w.word}-${w.status}`}
                className="chip"
                style={{
                  background:
                    w.status === "good"
                      ? "#dcfce7"
                      : w.status === "warning"
                        ? "#fef3c7"
                        : "#fee2e2",
                  color:
                    w.status === "good"
                      ? "#166534"
                      : w.status === "warning"
                        ? "#92400e"
                        : "#991b1b",
                }}
                title={w.feedback}
              >
                {w.word}
              </span>
            ))}
          </div>
          <div>
            <strong>Nhận xét chung</strong>
            <p>{result.overallFeedback}</p>
          </div>
          <div>
            <strong>Thanh điệu</strong>
            <ul>
              {result.toneFeedback.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Phát âm / lưu loát</strong>
            <p>{result.pronunciationFeedback}</p>
            <p>{result.fluencyFeedback}</p>
          </div>
          <div>
            <strong>Bản tự nhiên hơn</strong>
            <div className="zh-block" style={{ fontSize: "1.2rem" }}>
              {result.naturalVersion || result.correction}
            </div>
            <SpeakButton text={result.naturalVersion || expected} mode="slow" />
          </div>
          <button type="button" className="btn" onClick={() => setResult(null)}>
            Thử lại
          </button>
        </section>
      ) : null}
    </div>
  );
}
