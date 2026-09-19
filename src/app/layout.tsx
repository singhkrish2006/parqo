import type { Metadata, Viewport } from "next";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Parqo",
    template: "%s · Parqo",
  },
  description:
    "Find parking across Delhi: public lots, private driveways and EV charging, ranked by distance and price, with live availability from drivers.",
  applicationName: "Parqo",
  openGraph: {
    title: "Parqo",
    description:
      "Find parking across Delhi, ranked by distance and price, with live availability from drivers.",
    siteName: "Parqo",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Parqo",
    description:
      "Find parking across Delhi, ranked by distance and price, with live availability from drivers.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171717",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden">
        {children}
      </body>
    </html>
  );
}
