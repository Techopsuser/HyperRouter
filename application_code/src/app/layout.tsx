import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hyperrouter — Universal AI Router Platform",
  description: "Production-grade universal AI router that intelligently routes requests across 70+ free LLMs with intent detection, automatic fallback, health monitoring, benchmarking, caching, and streaming.",
  keywords: ["AI Router", "LLM", "GLM", "OpenRouter", "model routing", "fallback", "streaming", "free LLM", "Hyperrouter"],
  authors: [{ name: "Hyperrouter" }],
  icons: {
    icon: "/hyperrouter-logo.png",
    apple: "/hyperrouter-logo.png",
  },
  openGraph: {
    title: "Hyperrouter — Universal AI Router Platform",
    description: "Intelligent routing across 70+ free LLMs with fallback, streaming, and analytics.",
    url: "https://chat.z.ai",
    siteName: "Hyperrouter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyperrouter",
    description: "Universal AI Router Platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
