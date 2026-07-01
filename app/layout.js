import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Online Spirits Club \u2014 Learn spirits, cocktails & hospitality',
  description: 'The free, science-based platform to learn spirits, cocktails, beer and hospitality. Evidence-based lessons in 3\u20135 minutes.',
  keywords: 'spirits, cocktails, whiskey, gin, bartending, hospitality, online course, flashcards',
  applicationName: 'Online Spirits Club',
  themeColor: '#1e3a8a',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Online Spirits Club',
    description: 'The free, science-based platform to learn spirits, cocktails, beer and hospitality.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E\ud83e\udd43%3C/text%3E%3C/svg%3E" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
