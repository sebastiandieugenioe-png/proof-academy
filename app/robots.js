const site = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
