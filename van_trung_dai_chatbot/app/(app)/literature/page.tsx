import Link from "next/link";

export default function LiteraturePage() {
  return (
    <div className="stack">
      <header className="page-header">
        <h1>Văn học</h1>
        <p>Phân tích thơ, tác phẩm, Hán Việt — dùng AI Tutor chế độ Văn học.</p>
      </header>
      <Link className="card interactive" href="/tutor">
        <strong>Mở AI Tutor · Văn Học</strong>
        <p className="meta-line">Giữ nguyên hệ thống prompt Văn Học AI Tutor</p>
      </Link>
    </div>
  );
}
