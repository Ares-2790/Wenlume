"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { progressStorage } from "@/lib/progress/storage";
import { vocabStorage } from "@/lib/vocab/storage";

const ACTIONS = [
  {
    href: "/flashcards",
    title: "Ôn từ hôm nay",
    desc: "Flashcards từ vựng đã lưu",
  },
  {
    href: "/speaking",
    title: "Luyện nói",
    desc: "Speaking Coach với phân tích AI",
  },
  {
    href: "/scan",
    title: "Scan tiếng Trung",
    desc: "OCR ảnh menu, sách, biển hiệu",
  },
  {
    href: "/conversation",
    title: "Hội thoại AI",
    desc: "Hội thoại theo tình huống + HSK",
  },
  {
    href: "/character",
    title: "Character Lens",
    desc: "Phân tích chữ Hán và từ ghép",
  },
  {
    href: "/tutor",
    title: "AI Tutor",
    desc: "Hỏi đáp Văn học & tiếng Trung",
  },
];

export default function HomePage() {
  const [vocabCount, setVocabCount] = useState(0);
  const [speakingCount, setSpeakingCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setVocabCount(vocabStorage.count());
    const p = progressStorage.get();
    setSpeakingCount(p.speakingSessions + p.shadowSessions);
    setStreak(p.streak);
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1>Wenlume 文露明</h1>
        <p>Tiếp tục học tiếng Trung — scan, nghe, nói, dịch và AI tutor.</p>
      </header>

      <section className="stat-row">
        <div className="stat">
          <strong>{vocabCount}</strong>
          <span>Từ đã lưu</span>
        </div>
        <div className="stat">
          <strong>{speakingCount}</strong>
          <span>Bài speaking</span>
        </div>
        <div className="stat">
          <strong>{streak || "—"}</strong>
          <span>Streak (ngày)</span>
        </div>
      </section>

      <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem" }}>Tiếp tục học</h2>
      <div className="card-grid">
        {ACTIONS.map((item) => (
          <Link key={item.href} href={item.href} className="card interactive">
            <strong>{item.title}</strong>
            <p className="meta-line">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
