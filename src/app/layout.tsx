import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font — no external request at runtime, no
// layout-shift flash. Manrope reads as more distinctive and "product"
// than the default system/Tailwind sans stack, while staying easy to
// read at small dashboard sizes (KPI cards, table cells).
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BuildFleet — Enterprise Fleet Management",
  description: "Enterprise Fleet Management System",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={manrope.variable}>
      <head>
        {/* Apply dark class BEFORE page renders — prevents white flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('buildfleet-theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (theme === 'dark' || (!theme && prefersDark)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className={`${manrope.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}