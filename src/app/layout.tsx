import type { Metadata } from "next";
import { Bodoni_Moda, Noto_Sans, Noto_Serif_Hebrew } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  display: "swap",
});

const notoSerifHebrew = Noto_Serif_Hebrew({
  subsets: ["hebrew"],
  variable: "--font-serif-he",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const notoSans = Noto_Sans({
  subsets: ["hebrew", "latin"],
  variable: "--font-noto",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ניהול אירועים משפחתיים",
  description: "מערכת לניהול הזמנות ואישורי הגעה לאירועים משפחתיים",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${bodoni.variable} ${notoSerifHebrew.variable} ${notoSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
