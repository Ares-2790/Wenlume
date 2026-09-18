"use client";

import { useState } from "react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/States";
import type { TranslateMode, TranslateResult } from "@/lib/ai/types";
import { vocabStorage } from "@/lib/vocab/storage";

const LANGS = [
  { id: "zh", label: "中文" },
  { id: "vi", label: "Tiếng Việt" },
  { id: "en", label: "English" },
] as const;

const MODES: Array<{ id: TranslateMode; label: string }> = [
  { id: "natural", label: "Dịch tự nhiên" },
  { id: "literal", label: "Dịch sát nghĩa" },
  { id: "learner", label: "Giải thích cho người học" },
];

export default function TranslatePage() {
  const [tab, setTab] = useState<"text" | "camera" | "voice">("text");
  const [sourceLang, setSourceLang] = useState<"zh" | "vi" | "en" | "auto">("auto");
  const [targetLang, setTargetLang] = useState<"zh" | "vi" | "en">("vi");
  const [mode, setMode] = useState<TranslateMode>("natural");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResult | null>(null);

  async function translate() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang, targetLang, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dịch thất bại");
      setResult(data.result as TranslateResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi dịch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Translator</h1>
        <p>中文 · Tiếng Việt · English — dành cho người học.</p>
      </header>

      <div className="tabs">
        {(
          [
            ["text", "Text"],
            ["camera", "Camera"],
            ["voice", "Voice"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "camera" ? (
        <EmptyBlock text="Camera OCR đầy đủ nằm ở Scan & Learn. Mở /scan để chụp ảnh và dịch." />
      ) : tab === "voice" ? (
        <EmptyBlock text="Thu âm hội thoại nằm ở Conversation / Speaking Coach. Dùng tab Text để dịch văn bản." />
      ) : (
        <section className="panel stack">
          <div className="row">
            <select
              className="select"
              style={{ width: "auto" }}
              value={sourceLang}
              onChange={(e) =>
                setSourceLang(e.target.value as typeof sourceLang)
              }
            >
              <option value="auto">Tự nhận diện</option>
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <span>→</span>
            <select
              className="select"
              style={{ width: "auto" }}
              value={targetLang}
              onChange={(e) =>
                setTargetLang(e.target.value as typeof targetLang)
              }
            >
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tabs">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`tab ${mode === m.id ? "active" : ""}`}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <textarea
            className="textarea"
            placeholder="Nhập câu cần dịch..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            disabled={!text.trim() || loading}
            onClick={() => void translate()}
          >
            Dịch
          </button>
        </section>
      )}

      {loading ? <LoadingBlock text="Đang dịch..." /> : null}
      {error ? <ErrorBlock message={error} onRetry={() => void translate()} /> : null}

      {result ? (
        <section className="panel stack">
          <div>
            <div className="meta-line">Kết quả</div>
            <div className="zh-block" style={{ fontSize: "1.25rem" }}>
              {result.translation}
            </div>
          </div>

          {result.chinese ? (
            <>
              <div>
                <div className="meta-line">中文</div>
                <div className="zh-block">{result.chinese}</div>
              </div>
              <div className="meta-line">Pinyin: {result.pinyin || "—"}</div>
              <div className="meta-line">
                Hán Việt: {result.hanViet || "—"}
              </div>
              <SpeakButton text={result.chinese} mode="slow" />
            </>
          ) : null}

          {result.notes ? <p>{result.notes}</p> : null}

          {result.keyWords?.length ? (
            <div className="stack">
              <h3 style={{ margin: 0 }}>Từ quan trọng</h3>
              {result.keyWords.map((w) => (
                <div key={w.word} className="vocab-item">
                  <strong>{w.word}</strong>
                  <div className="meta-line">
                    {w.pinyin} · HV: {w.hanViet || "—"}
                  </div>
                  <div>
                    {w.meaningVi} / {w.meaningEn}
                  </div>
                  <div className="row">
                    <SpeakButton text={w.word} mode="slow" />
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() =>
                        vocabStorage.save({
                          chinese: w.word,
                          pinyin: w.pinyin,
                          hanViet: w.hanViet,
                          vietnamese: w.meaningVi,
                          english: w.meaningEn,
                          source: "translator",
                        })
                      }
                    >
                      Lưu từ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
