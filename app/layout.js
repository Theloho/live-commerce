import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import GoogleAnalytics from './components/GoogleAnalytics';
import CookieConsent from './components/CookieConsent';
import { Providers } from './providers';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "알록 - 라이브 커머스 플랫폼",
  description: "실시간 라이브 방송으로 만나는 특별한 쇼핑 경험. 합리적인 가격의 다양한 상품을 알록에서 만나보세요.",
  keywords: "라이브커머스, 라이브쇼핑, 온라인쇼핑, 알록",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '알록'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <GoogleAnalytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        <CookieConsent />
      </body>
    </html>
  );
}
