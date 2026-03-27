import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./page/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'EasyRecall',
  description: '...',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* CRITICAL: Run theme detection synchronously before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('theme');
                  const html = document.documentElement;
                  
                  if (saved === 'light') {
                    html.classList.remove('dark');
                  } else if (saved === 'dark') {
                    html.classList.add('dark');
                  } else {
                    // Use system preference if no saved theme
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      html.classList.add('dark');
                    } else {
                      html.classList.remove('dark');
                    }
                  }
                } catch(e) {
                  console.error('Theme script error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      {/* Suppress hydration warnings on body to avoid noise from extensions (e.g. Grammarly) */}
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}