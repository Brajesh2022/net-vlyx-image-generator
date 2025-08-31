import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import QueryProvider from "@/components/query-provider"
import { BugReport } from "@/components/bug-report"
import { DonationPopup } from "@/components/donation-popup"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export const metadata: Metadata = {
  title: "NetVlyx - Movie Streaming Platform",
  description: "Stream and download your favorite movies and TV shows",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  keywords: ['movies', 'streaming', 'entertainment', 'tv shows', 'netvlyx'],
  authors: [{ name: 'Netvlyx Team' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Netvlyx',
    startupImage: '/icon-512x512.png',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Netvlyx',
    title: 'Netvlyx - Movie Streaming Platform',
    description: 'Stream and download your favorite movies and TV shows',
  },
  twitter: {
    card: 'summary',
    title: 'Netvlyx - Movie Streaming Platform',
    description: 'Stream and download your favorite movies and TV shows',
  },
  icons: {
    icon: '/icon-192x192.png',
    shortcut: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="Netvlyx" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Netvlyx" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="mask-icon" href="/icon-192x192.png" color="#000000" />
        <link rel="shortcut icon" href="/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <BugReport />
          <DonationPopup />
          <PWAInstallPrompt />
        </QueryProvider>
      </body>
    </html>
  )
}
