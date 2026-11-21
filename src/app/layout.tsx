import type { Metadata, Viewport } from "next";
import { Anton, Playball, Poppins } from "next/font/google";
import { SHARE_DESCRIPTION, SHARE_TITLE, siteUrl } from "@/lib/site";
import "./globals.css";

const playball = Playball({ weight: "400", subsets: ["latin"], variable: "--font-playball", display: "swap" });
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: SHARE_TITLE,
  description: SHARE_DESCRIPTION,
  alternates: { canonical: "/" },
  applicationName: "WashFam HQ",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "WashFam HQ",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/og/invite-1200x630.jpg",
        width: 1200,
        height: 630,
        alt: "The Washingtons' Christmas Eve Pajama Game Night flyer: the family in matching red plaid pajamas by the tree",
      },
      {
        url: "/og/invite-square.jpg",
        width: 1200,
        height: 1200,
        alt: "Save the Date flyer for the Washingtons' Christmas Eve Pajama Game Night",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: ["/og/invite-1200x630.jpg"],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#6e0b12",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playball.variable} ${anton.variable} ${poppins.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
