import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, Dancing_Script } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/ui/Footer";
import { AIChatWidget } from "@/components/ui/AIChatWidget";
import { ParallaxBlobs } from "@/components/landing/ParallaxBlobs";
import { FloatingProducts } from "@/components/ui/FloatingProducts";

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dancing = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "suki.ai — Skincare that knows your skin.",
  description:
    "Build your skin profile, log products that work for you, and get AI-powered personalized skincare recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${dancing.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        <ParallaxBlobs />
        <FloatingProducts />
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <AIChatWidget />
      </body>
    </html>
  );
}
