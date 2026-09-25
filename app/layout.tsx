import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "免疫细胞交互图谱",
  description: "从缩写进入细胞功能、谱系关系与完整免疫学术语库。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
