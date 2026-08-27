import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthProvider";
import { GameSocketProvider } from "@/context/GameSocketProvider";
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
  title: "AIエージェント学習対戦",
  description: "「現実」か「妄想」かを読み合い、見破り／見破られで攻防するライフ制2人対戦ゲーム",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <GameSocketProvider>{children}</GameSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
