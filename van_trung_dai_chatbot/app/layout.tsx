import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wenlume 文露明",
  description: "Nền tảng học tiếng Trung có AI — Scan, Speaking, Tutor, Translator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
