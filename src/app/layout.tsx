import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "โครงการทันตกรรมเคลื่อนที่ | Pattaya Aviation",
  description: "ระบบจองคิวทันตกรรมเคลื่อนที่ สำหรับพนักงานบริษัท Pattaya Aviation",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-4 text-center text-xs text-slate-400 bg-slate-50">
          © 2026 ผู้พัฒนา นายปิติ สายยศ - V.1
        </footer>
      </body>
    </html>
  );
}
