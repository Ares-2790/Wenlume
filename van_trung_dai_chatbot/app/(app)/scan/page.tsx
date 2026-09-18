"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Save, X } from "lucide-react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/States";
import type { ScanResult, ScanVocabulary } from "@/lib/ai/types";
import { vocabStorage } from "@/lib/vocab/storage";

export default function ScanPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [selected, setSelected] = useState<ScanVocabulary | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function onPick(f: File | null) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    setSavedNote(null);
    setPreview(URL.createObjectURL(f));
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/scan", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không phân tích được ảnh");
      setResult(data.result as ScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }

  function saveWord(word: ScanVocabulary, source: "camera" = "camera") {
    vocabStorage.save({
      chinese: word.word,
      pinyin: word.pinyin,
      hanViet: word.hanViet,
      vietnamese: word.meaningVi,
      english: word.meaningEn,
      exampleChinese: word.exampleZh,
      examplePinyin: word.examplePinyin,
      exampleVietnamese: word.exampleVi,
      source,
    });
    setSavedNote(`Đã lưu: ${word.word}`);
  }

  function saveAll() {
    if (!result?.vocabulary?.length) return;
    result.vocabulary.forEach((w) => saveWord(w));
    setSavedNote(`Đã lưu ${result.vocabulary.length} từ`);
  }

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Scan & Learn</h1>
        <p>Chụp hoặc tải ảnh có chữ Trung — OCR, pinyin, Hán Việt, dịch.</p>
      </header>

      <section className="panel stack">
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
            Chụp ảnh
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => uploadRef.current?.click()}
          >
            <ImagePlus size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
            Tải ảnh
          </button>
          <button
            type="button"
            className="btn jade"
            disabled={!file || loading}
            onClick={() => void analyze()}
          >
            Phân tích
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="preview-img" />
        ) : (
          <EmptyBlock text="Chưa có ảnh. Chụp menu, sách, biển hiệu hoặc bài tập." />
        )}
      </section>

      {loading ? <LoadingBlock text="Đang OCR và phân tích..." /> : null}
      {error ? (
        <ErrorBlock message={error} onRetry={() => void analyze()} />
      ) : null}
      {savedNote ? <div className="chip">{savedNote}</div> : null}

      {result ? (
        <section className="panel stack">
          <div className="row">
            <SpeakButton text={result.fullText} mode="slow" label="Nghe toàn bộ" />
            <SpeakButton text={result.fullText} mode="shadowing" label="Luyện đọc" />
            <button type="button" className="btn secondary" onClick={saveAll}>
              <Save size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              Lưu từ vựng
            </button>
          </div>

          <div>
            <div className="meta-line">中文</div>
            <div className="zh-block">{result.fullText || "—"}</div>
          </div>
          <div>
            <div className="meta-line">Tiếng Việt</div>
            <div>{result.translationVietnamese || "—"}</div>
          </div>
          <div>
            <div className="meta-line">English</div>
            <div>{result.translationEnglish || "—"}</div>
          </div>

          <h3 style={{ margin: "0.5rem 0 0" }}>Từng đoạn</h3>
          {result.segments.map((seg, i) => (
            <div key={`${seg.chinese}-${i}`} className="segment-card">
              <div className="zh-block" style={{ fontSize: "1.2rem" }}>
                {seg.chinese}
              </div>
              <div className="meta-line">Pinyin: {seg.pinyin}</div>
              <div className="meta-line">Hán Việt: {seg.hanViet || "—"}</div>
              <div>VI: {seg.vietnamese}</div>
              <div>EN: {seg.english}</div>
              {seg.explanation ? (
                <p className="meta-line">{seg.explanation}</p>
              ) : null}
              <SpeakButton text={seg.chinese} mode="slow" />
            </div>
          ))}

          <h3 style={{ margin: "0.5rem 0 0" }}>Từ vựng — bấm để xem chi tiết</h3>
          <div className="row">
            {result.vocabulary.map((word) => (
              <button
                key={word.word}
                type="button"
                className="chip"
                style={{ cursor: "pointer", border: "none" }}
                onClick={() => setSelected(word)}
              >
                {word.word}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selected ? (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal stack" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong style={{ fontSize: "1.8rem" }}>{selected.word}</strong>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelected(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div>Pinyin: {selected.pinyin}</div>
            <div>Hán Việt: {selected.hanViet || "—"}</div>
            <div>VI: {selected.meaningVi}</div>
            <div>EN: {selected.meaningEn}</div>
            {selected.partOfSpeech ? (
              <div>Từ loại: {selected.partOfSpeech}</div>
            ) : null}
            {selected.exampleZh ? (
              <div>
                <div className="zh-block" style={{ fontSize: "1.15rem" }}>
                  {selected.exampleZh}
                </div>
                <div className="meta-line">{selected.examplePinyin}</div>
                <div>{selected.exampleVi}</div>
              </div>
            ) : null}
            <div className="row">
              <SpeakButton text={selected.word} mode="slow" label="Phát âm" />
              <button
                type="button"
                className="btn"
                onClick={() => saveWord(selected)}
              >
                Lưu từ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
