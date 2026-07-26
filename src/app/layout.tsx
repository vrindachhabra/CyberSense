import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Anomaly Platform",
  description: "AI-powered behavioural anomaly detection platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased dark`}
    >
      <body suppressHydrationWarning className={`min-h-full flex flex-col font-sans ${outfit.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
