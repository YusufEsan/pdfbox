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
  title: "PDFBox - Ücretsiz Online PDF Araçları",
  description: "PDF dosyalarınızı kolayca birleştirin, bölün, şifreleyin, sayfa silin, çevirin, görsele dönüştürün ve filigran ekleyin. Tamamen ücretsiz ve güvenli, %100 tarayıcınızda çalışır.",
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider defaultTheme="system" storageKey="pdf-toolbox-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
