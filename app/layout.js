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
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Online Spirits Club' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Spirits Club',
    description: 'The free, science-based platform to learn spirits, cocktails, beer and hospitality.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
        {/* Icons + manifest are auto-injected by Next.js metadata (see icons + manifest fields above). */}
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
