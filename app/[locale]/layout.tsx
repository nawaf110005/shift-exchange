import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/ui/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'تبديل الشفتات',
  description: 'منصة تبادل عروض الدوام للموظفين',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1B3A6B',
}

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()

  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Tailwind CSS — CDN version so styles work with no build-step dependency */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.tailwindcss.com" />
        {/* Extend Tailwind with app colours and Arabic font */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      primary: { DEFAULT: '#1B3A6B', 50:'#E8EEF7', 100:'#C5D3E8', 500:'#2E86AB', 600:'#1B3A6B', 700:'#142D52' },
                      accent: '#2E86AB',
                    },
                    fontFamily: {
                      arabic: ['IBM Plex Sans Arabic','Noto Sans Arabic','Arial','sans-serif'],
                    },
                  },
                },
              }
            `,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* iOS PWA status bar */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="تبديل الشفتات" />
      </head>
      <body className="bg-gray-50 font-arabic min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          {/* page-content adds bottom padding so content isn't hidden behind mobile tab bar */}
          <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 page-content">
            {children}
          </main>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { fontFamily: 'IBM Plex Sans Arabic, Arial, sans-serif', direction: 'rtl' },
              duration: 3000,
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
