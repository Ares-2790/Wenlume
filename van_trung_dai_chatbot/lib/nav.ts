export type NavItem = {
  href: string;
  label: string;
  ready: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Học",
    items: [
      { href: "/", label: "Trang chủ", ready: true },
      { href: "/chinese", label: "Tiếng Trung", ready: true },
      { href: "/english", label: "Tiếng Anh", ready: false },
      { href: "/literature", label: "Văn học", ready: true },
    ],
  },
  {
    title: "Công cụ",
    items: [
      { href: "/tutor", label: "AI Tutor", ready: true },
      { href: "/scan", label: "Scan & Learn", ready: true },
      { href: "/speaking", label: "Speaking Coach", ready: true },
      { href: "/shadow", label: "Listen & Shadow", ready: true },
      { href: "/character", label: "Character Lens", ready: true },
      { href: "/translate", label: "Translator", ready: true },
      { href: "/conversation", label: "Conversation", ready: true },
    ],
  },
  {
    title: "Ôn tập",
    items: [
      { href: "/vocab", label: "Từ vựng", ready: true },
      { href: "/flashcards", label: "Flashcards", ready: true },
      { href: "/progress", label: "Tiến độ", ready: true },
    ],
  },
];
