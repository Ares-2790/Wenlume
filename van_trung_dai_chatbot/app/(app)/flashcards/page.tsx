"use client";

import { useEffect, useMemo, useState } from "react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { EmptyBlock } from "@/components/ui/States";
import { vocabStorage } from "@/lib/vocab/storage";
import type { VocabularyItem } from "@/lib/vocab/types";
import { progressStorage } from "@/lib/progress/storage";

type Mode = "zh-vi" | "vi-zh" | "zh-pinyin";

export default function FlashcardsPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<Mode>("zh-vi");
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const list = vocabStorage.dueForReview(30);
    setItems(list);
  }, []);

  const card = items[index];

  const front = useMemo(() => {
    if (!card) return "";
    if (mode === "vi-zh") return card.vietnamese || card.english || "?";
    return card.chinese;
  }, [card, mode]);

  useEffect(() => {
    if (!card) return;
    const pool = items
      .map((i) =>
        mode === "zh-pinyin"
          ? i.pinyin
          : mode === "vi-zh"
            ? i.chinese
            : i.vietnamese || i.english,
      )
      .filter(Boolean);
    const answer =
      mode === "zh-pinyin"
        ? card.pinyin
        : mode === "vi-zh"
          ? card.chinese
          : card.vietnamese || card.english;
    const distractors = pool
      .filter((x) => x !== answer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    setChoices([answer, ...distractors].sort(() => Math.random() - 0.5));
    setFlipped(false);
    setFeedback(null);
  }, [card, mode, items]);

  function answerQuiz(choice: string) {
    if (!card) return;
    const correct =
      mode === "zh-pinyin"
        ? card.pinyin
        : mode === "vi-zh"
          ? card.chinese
          : card.vietnamese || card.english;
    const ok = choice === correct;
    setFeedback(ok ? "Đúng!" : `Sai. Đáp án: ${correct}`);
    vocabStorage.markReviewed(card.id);
    progressStorage.track("flashcard", `Ôn: ${card.chinese}`);
    setFlipped(true);
  }

  if (!items.length) {
    return (
      <div className="stack">
        <header className="page-header">
          <h1>Flashcards</h1>
          <p>Ôn từ đã lưu — quiz local, không tốn API.</p>
        </header>
        <EmptyBlock text="Chưa có từ. Hãy lưu từ từ Scan / Translator / Character Lens trước." />
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Flashcards</h1>
        <p>
          Thẻ {index + 1}/{items.length}
        </p>
      </header>

      <div className="tabs">
        {(
          [
            ["zh-vi", "中文 → Việt"],
            ["vi-zh", "Việt → 中文"],
            ["zh-pinyin", "中文 → Pinyin"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab ${mode === id ? "active" : ""}`}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <section
        className="panel"
        style={{ minHeight: 180, cursor: "pointer" }}
        onClick={() => setFlipped((v) => !v)}
      >
        <div className="zh-block" style={{ textAlign: "center", fontSize: "2rem" }}>
          {flipped ? (
            <>
              <div>{card.chinese}</div>
              <div className="meta-line">{card.pinyin}</div>
              <div style={{ fontSize: "1.1rem" }}>
                {card.vietnamese} {card.hanViet ? `· HV: ${card.hanViet}` : ""}
              </div>
              {card.exampleChinese ? (
                <div className="meta-line" style={{ marginTop: 8 }}>
                  {card.exampleChinese}
                </div>
              ) : null}
            </>
          ) : (
            front
          )}
        </div>
      </section>

      <div className="row">
        <SpeakButton text={card.chinese} mode="slow" />
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            className="btn secondary"
            onClick={() => answerQuiz(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {feedback ? <p className="chip">{feedback}</p> : null}

      <button
        type="button"
        className="btn"
        onClick={() => setIndex((i) => (i + 1) % items.length)}
      >
        Thẻ tiếp
      </button>
    </div>
  );
}
