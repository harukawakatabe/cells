import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "免疫术语与细胞知识图谱",
  description: "从缩写进入细胞功能、谱系关系与完整免疫学术语库。",
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
