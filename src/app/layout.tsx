import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildFleet — Enterprise Fleet Management",
  description: "Enterprise Fleet Management System by Ultimate Tech Lab",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}