import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://swipegig-g.vercel.app'),
  title: {
    default: "SwipeGig — AI-Powered Web3 Job Platform",
    template: "%s | SwipeGig",
  },
  description:
    "Find your dream job in Web3. Swipe through AI-matched opportunities, get career coaching from Claude, earn G$ rewards, and build your on-chain career identity.",
  keywords: [
    "Web3 jobs",
    "crypto jobs",
    "AI job matching",
    "GoodDollar",
    "career platform",
    "blockchain jobs",
    "decentralized hiring",
    "Celo",
  ],
  authors: [{ name: "SwipeGig" }],
  creator: "SwipeGig",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://swipegig.xyz",
    title: "SwipeGig — AI-Powered Web3 Job Platform",
    description:
      "Swipe, match, and land Web3 jobs powered by AI. Earn G$ tokens for job-seeking activity.",
    siteName: "SwipeGig",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SwipeGig — Find your dream Web3 job",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SwipeGig — AI-Powered Web3 Job Platform",
    description:
      "Swipe, match, and land Web3 jobs powered by AI. Earn G$ tokens for job-seeking activity.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
    { media: "(prefers-color-scheme: light)", color: "#fafbfc" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
