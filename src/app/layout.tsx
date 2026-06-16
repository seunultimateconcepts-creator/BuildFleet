import "./globals.css";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "BuildFleet — Enterprise Fleet Management",
  description: "Enterprise Fleet Management Platform by Ultimate Tech Lab",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`font-sans ${geist.variable}`}>
      <body>{children}</body>
    </html>
  );
}