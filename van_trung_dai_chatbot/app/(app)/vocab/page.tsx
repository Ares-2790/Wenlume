"use client";

import { useEffect, useState } from "react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { EmptyBlock } from "@/components/ui/States";
import { vocabStorage } from "@/lib/vocab/storage";
import type { VocabularyItem } from "@/lib/vocab/types";

export default function VocabPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);

  function refresh() {
    setItems(vocabStorage.list());
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Từ vựng</h1>
        <p>Lưu tạm bằng localStorage — sẵn sàng đổi sang database sau.</p>
      </header>

      {!items.length ? (
        <EmptyBlock text="Chưa có từ nào. Hãy lưu từ từ Scan, Translator hoặc AI Tutor." />
      ) : (
        <section className="panel">
          {items.map((item) => (
            <div key={item.id} className="vocab-item">
              <div className="zh-block" style={{ fontSize: "1.35rem" }}>
                {item.chinese}
              </div>
              <div className="meta-line">
                {item.pinyin} · HV: {item.hanViet || "—"}
              </div>
              <div>
                {item.vietnamese}
                {item.english ? ` / ${item.english}` : ""}
              </div>
              {item.exampleChinese ? (
                <div className="meta-line">
                  VD: {item.exampleChinese} — {item.exampleVietnamese}
                </div>
              ) : null}
              <div className="row">
                <span className="chip">{item.source}</span>
                <SpeakButton text={item.chinese} mode="slow" />
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    vocabStorage.remove(item.id);
                    refresh();
                  }}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
