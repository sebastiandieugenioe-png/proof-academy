export const metadata = {
  title: 'The Online Spirits Club Journal',
  description: 'A free editorial publication for hospitality professionals. Three carefully curated emails every week: hospitality insights, spirits knowledge and practical learning.',
  alternates: { canonical: '/journal' },
  openGraph: {
    title: 'The Online Spirits Club Journal',
    description: 'Become better at hospitality every week. Free, editorial, written for professionals.',
    url: '/journal',
    type: 'website',
    siteName: 'Online Spirits Club',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Online Spirits Club Journal',
    description: 'Become better at hospitality every week. Three curated emails, free forever.',
  },
}

export default function JournalLayout({ children }) {
  return children
}
