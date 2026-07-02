import './globals.css'
import { Providers } from './providers'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com'),
  title: {
    default: 'Online Spirits Club \u2014 Learn spirits, cocktails & hospitality',
    template: '%s',
  },
  description: 'The free, science-based platform to learn spirits, cocktails, beer and hospitality. Evidence-based lessons in 3\u20135 minutes.',
  keywords: ['spirits', 'cocktails', 'whiskey', 'gin', 'bartending', 'hospitality', 'online course', 'flashcards'],
  applicationName: 'Online Spirits Club',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Online Spirits Club',
    description: 'The free, science-based platform to learn spirits, cocktails, beer and hospitality.',
    type: 'website',
    siteName: 'Online Spirits Club',
  },
  twitter: { card: 'summary_large_image', title: 'Online Spirits Club' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'OSC' },
}

export const viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OSC" />
        <meta name="format-detection" content="telephone=no" />
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
        <script dangerouslySetInnerHTML={{__html:'if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").then(function(r){console.log("[OSC] SW registered, scope:",r.scope)}).catch(function(e){console.warn("[OSC] SW registration failed:",e)})})}'}} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
