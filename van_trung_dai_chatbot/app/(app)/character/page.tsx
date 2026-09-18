"use client";

import { useState } from "react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import type { CharacterResult } from "@/lib/ai/types";
import { vocabStorage } from "@/lib/vocab/storage";

export default function CharacterPage() {
  const [query, setQuery] = useState("情");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CharacterResult | null>(null);

  async function lookup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tra được chữ");
      setResult(data.result as CharacterResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tra cứu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Character Lens</h1>
        <p>Tra chữ Hán: nghĩa, cấu tạo, Hán Việt, từ ghép, mnemonic.</p>
      </header>

      <section className="panel stack">
        <div className="row">
          <input
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập chữ hoặc từ, ví dụ: 情"
          />
          <button type="button" className="btn" onClick={() => void lookup()}>
            Tra cứu
          </button>
        </div>
      </section>

      {loading ? <LoadingBlock text="Đang phân tích chữ..." /> : null}
      {error ? <ErrorBlock message={error} onRetry={() => void lookup()} /> : null}

      {result ? (
        <section className="panel stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="zh-block" style={{ fontSize: "3rem" }}>
              {result.character}
            </div>
            <SpeakButton text={result.character} mode="slow" />
          </div>
          <div>Pinyin: {result.pinyin}</div>
          <div>Hán Việt: {result.hanViet || "—"}</div>
          <div>Nghĩa: {result.meanings.join(" · ") || result.modernMeaning}</div>
          <div>Bộ thủ: {result.radical || "—"}</div>
          <div>Cấu tạo: {result.structure || "—"}</div>
          <div>
            <strong>Nghĩa gốc / hiện đại</strong>
            <p>{result.originalMeaning}</p>
            <p>{result.modernMeaning}</p>
          </div>
          <div>
            <strong>Mnemonic</strong>
            <p>{result.mnemonic}</p>
          </div>
          <p className="chip">{result.strokeOrderNote}</p>

          <h3 style={{ margin: 0 }}>Từ ghép</h3>
          {result.compounds.map((c) => (
            <div key={c.word} className="vocab-item">
              <strong>{c.word}</strong>
              <div className="meta-line">
                {c.pinyin} · HV: {c.hanViet || "—"}
              </div>
              <div>{c.meaningVi}</div>
              {c.exampleZh ? (
                <div className="meta-line">
                  {c.exampleZh} — {c.exampleVi}
                </div>
              ) : null}
              <div className="row">
                <SpeakButton text={c.word} mode="slow" />
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    vocabStorage.save({
                      chinese: c.word,
                      pinyin: c.pinyin,
                      hanViet: c.hanViet,
                      vietnamese: c.meaningVi,
                      exampleChinese: c.exampleZh,
                      examplePinyin: c.examplePinyin,
                      exampleVietnamese: c.exampleVi,
                      source: "character",
                    })
                  }
                >
                  Lưu từ
                </button>
              </div>
            </div>
          ))}

          <div className="meta-line">
            Gần nghĩa: {result.nearSynonyms.join(" · ") || "—"}
          </div>
          <div className="meta-line">
            Dễ nhầm: {result.easilyConfused.join(" · ") || "—"}
          </div>
        </section>
      ) : null}
    </div>
  );
}
