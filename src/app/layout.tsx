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
  title: "Plugpass - AI Plugin Trust Registry",
  description: "Scan, score, and verify AI plugins before you install them",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100" suppressHydrationWarning>
        <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-emerald-400">Plugpass</span>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">BETA</span>
              </a>
              <nav className="flex items-center gap-6 text-sm">
                <a href="/" className="text-gray-400 hover:text-white transition">Dashboard</a>
                <a href="/developers" className="text-gray-400 hover:text-white transition">Developers</a>
              </nav>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
