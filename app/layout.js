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
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231e3a8a'/%3E%3Ctext x='50%25' y='68%25' font-family='Inter, system-ui, sans-serif' font-size='16' text-anchor='middle' fill='white' font-weight='700'%3EOS%3C/text%3E%3C/svg%3E" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OSC" />
        <meta name="format-detection" content="telephone=no" />
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
