import Link from "next/link";

const LINKS = [
  { href: "/scan", title: "Scan & Learn", desc: "OCR ảnh chữ Trung" },
  { href: "/translate", title: "Translator", desc: "Dịch cho người học" },
  { href: "/speaking", title: "Speaking Coach", desc: "Luyện phát âm" },
  { href: "/shadow", title: "Listen & Shadow", desc: "Shadowing playlist" },
  { href: "/character", title: "Character Lens", desc: "Tra chữ Hán" },
  { href: "/conversation", title: "Conversation", desc: "Hội thoại tình huống" },
  { href: "/tutor", title: "Chinese Tutor", desc: "Chat AI tiếng Trung" },
  { href: "/flashcards", title: "Flashcards", desc: "Ôn từ đã lưu" },
];

export default function ChineseHubPage() {
  return (
    <div className="stack">
      <header className="page-header">
        <h1>Tiếng Trung</h1>
        <p>Lối vào nhanh các công cụ học Mandarin của Wenlume.</p>
      </header>
      <div className="card-grid">
        {LINKS.map((item) => (
          <Link key={item.href} className="card interactive" href={item.href}>
            <strong>{item.title}</strong>
            <p className="meta-line">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
