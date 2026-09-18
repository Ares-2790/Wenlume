"use client";

import { useEffect, useState } from "react";
import { progressStorage, type ProgressState } from "@/lib/progress/storage";
import { vocabStorage } from "@/lib/vocab/storage";
import { EmptyBlock } from "@/components/ui/States";

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [vocabCount, setVocabCount] = useState(0);

  useEffect(() => {
    setProgress(progressStorage.get());
    setVocabCount(vocabStorage.count());
  }, []);

  if (!progress) return null;

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Tiến độ</h1>
        <p>Theo dõi hoạt động học tập trên thiết bị này (local).</p>
      </header>

      <section className="stat-row">
        <div className="stat">
          <strong>{vocabCount}</strong>
          <span>Từ đã lưu</span>
        </div>
        <div className="stat">
          <strong>{progress.speakingSessions + progress.shadowSessions}</strong>
          <span>Bài speaking/shadow</span>
        </div>
        <div className="stat">
          <strong>{progress.streak}</strong>
          <span>Streak (ngày)</span>
        </div>
      </section>

      <section className="stat-row">
        <div className="stat">
          <strong>{progress.conversationSessions}</strong>
          <span>Hội thoại</span>
        </div>
        <div className="stat">
          <strong>{progress.speakingSessions}</strong>
          <span>Speaking Coach</span>
        </div>
        <div className="stat">
          <strong>{progress.shadowSessions}</strong>
          <span>Shadowing</span>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Hoạt động gần đây</h3>
        {!progress.activity.length ? (
          <EmptyBlock text="Chưa có hoạt động. Hãy luyện Speaking, Shadow hoặc Flashcards." />
        ) : (
          progress.activity.map((a) => (
            <div key={a.id} className="vocab-item">
              <strong>{a.label}</strong>
              <div className="meta-line">
                {a.type} · {new Date(a.at).toLocaleString("vi-VN")}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
