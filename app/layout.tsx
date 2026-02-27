import React from "react"
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AnnouncementPopup } from "@/components/announcement-popup";
import { SetupCheck } from "@/components/setup-check";
import { ProfileCompletionCheck } from "@/components/profile-completion-check";
import { Toaster } from "sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Vireo AI - 创业者灵感引擎 | AI创意生成平台",
    template: "%s | Vireo AI",
  },
  description:
    "Vireo AI 是一个 AI 驱动的创业创意生成与社交平台。通过人工智能激发创业灵感，分析市场机会，连接志同道合的创业伙伴，助力创业者实现梦想。",
  keywords: [
    "AI创业",
    "创意生成",
    "创业点子",
    "人工智能",
    "创业平台",
    "创业者社交",
    "商业创意",
    "创业灵感",
    "AI助手",
    "创业合伙人",
  ],
  authors: [{ name: "Vireo AI" }],
  creator: "Vireo AI",
  publisher: "Vireo AI",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://vireoai.cn"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "Vireo AI",
    title: "Vireo AI - 创业者灵感引擎",
    description: "AI驱动的创意生成与创业者社交平台，激发无限灵感，连接志同道合的创业伙伴",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vireo AI - 创业者灵感引擎",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vireo AI - 创业者灵感引擎",
    description: "AI驱动的创意生成与创业者社交平台",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1625",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <SetupCheck />
            <ProfileCompletionCheck />
            {children}
            <AnnouncementPopup />
          </SessionProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
