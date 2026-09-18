"use client";

import { useEffect, useState } from "react";
import { Mic, Square } from "lucide-react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import type { SpeakingResult } from "@/lib/ai/types";
import { progressStorage } from "@/lib/progress/storage";

type Sentence = { chinese: string; pinyin: string; vietnamese: string };
type Level = "beginner" | "intermediate" | "advanced";

export default function ShadowPage() {
  const [level, setLevel] = useState<Level>("beginner");
  const [showPinyin, setShowPinyin] = useState(true);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const recorder = useAudioRecorder();
  const current = sentences[index];

  async function loadPlaylist() {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("action", "generate");
      form.append("level", level === "beginner" ? "HSK 1" : level === "intermediate" ? "HSK 3" : "HSK 5");
      form.append("topic", "shadowing practice");
      const res = await fetch("/api/speaking", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo playlist");
      setSentences((data.sentences as Sentence[]) ?? []);
      setIndex(0);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi playlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlaylist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function analyze(blob: Blob) {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("expected", current.chinese);
      form.append("audio", blob, "shadow.webm");
      const res = await fetch("/api/speaking", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không phân tích được");
      setResult(data.result as SpeakingResult);
      progressStorage.track("shadow", `Shadow: ${current.chinese}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi shadow");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Listen & Shadow</h1>
        <p>Nghe mẫu → nói lại → AI chỉ chỗ cần cải thiện.</p>
      </header>

      <section className="panel stack">
        <div className="row">
          {(
            [
              ["beginner", "Beginner"],
              ["intermediate", "Intermediate"],
              ["advanced", "Advanced"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tab ${level === id ? "active" : ""}`}
              onClick={() => {
                setLevel(id);
                setShowPinyin(id !== "advanced");
              }}
            >
              {label}
            </button>
          ))}
          <button type="button" className="btn secondary" onClick={() => void loadPlaylist()}>
            Tạo playlist mới
          </button>
          <label className="chip">
            <input
              type="checkbox"
              checked={showPinyin}
              onChange={(e) => setShowPinyin(e.target.checked)}
            />{" "}
            Hiện Pinyin
          </label>
        </div>

        {current ? (
          <>
            <div className="meta-line">
              Câu {index + 1}/{sentences.length}
            </div>
            <div className="zh-block">{current.chinese}</div>
            {showPinyin ? <div className="meta-line">{current.pinyin}</div> : null}
            {level === "beginner" ? <div>{current.vietnamese}</div> : null}
            <SpeakButton text={current.chinese} mode="shadowing" label="Nghe mẫu (shadowing)" />

            <div className="row">
              {recorder.status !== "recording" ? (
                <button type="button" className="btn" onClick={() => void recorder.start()}>
                  <Mic size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                  Nói lại
                </button>
              ) : (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => void recorder.stop().then((b) => b && analyze(b))}
                >
                  <Square size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                  Dừng
                </button>
              )}
              <button
                type="button"
                className="btn secondary"
                disabled={index >= sentences.length - 1}
                onClick={() => {
                  setIndex((i) => i + 1);
                  setResult(null);
                }}
              >
                Câu tiếp
              </button>
            </div>
            {recorder.error ? <p className="field-error">{recorder.error}</p> : null}
          </>
        ) : (
          <p className="meta-line">Chưa có playlist.</p>
        )}
      </section>

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={() => void loadPlaylist()} /> : null}

      {result ? (
        <section className="panel stack">
          <p className="chip">{result.disclaimer}</p>
          <p>{result.overallFeedback}</p>
          <div className="row">
            {result.wordFeedback.map((w) => (
              <span
                key={`${w.word}-${w.feedback}`}
                className="chip"
                style={{
                  background:
                    w.status === "good"
                      ? "#dcfce7"
                      : w.status === "warning"
                        ? "#fef3c7"
                        : "#fee2e2",
                }}
              >
                {w.word}
              </span>
            ))}
          </div>
          <button type="button" className="btn" onClick={() => setResult(null)}>
            Thử lại câu này
          </button>
        </section>
      ) : null}
    </div>
  );
}
