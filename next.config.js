const isProd = process.env.NODE_ENV === 'production';
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
// Derive origin (protocol + host) for CORS. In dev / when unset, allow same-origin only.
let allowedOrigin = 'null';
try {
  if (baseUrl) allowedOrigin = new URL(baseUrl).origin;
} catch { /* fall through */ }

// Content Security Policy.
// script-src includes 'unsafe-inline' because Next.js 15 App Router streams RSC
// payloads through inline <script> tags (self.__next_f.push). A stricter,
// nonce-based CSP is possible via a middleware.js that injects a per-request
// nonce — tracked as a follow-up. 'unsafe-eval' is needed in dev for HMR only.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "media-src 'self' https:",
  "object-src 'none'",
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
].join('; ');

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
    ],
  },
  // Renamed from experimental.serverComponentsExternalPackages in Next 15
  serverExternalPackages: ['mongodb'],
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    // Note: CORS for /api/* is same-origin by default (browser blocks other origins because
    // we do NOT send Access-Control-Allow-Origin: *). If you truly need cross-origin API
    // access from another domain, set NEXT_PUBLIC_BASE_URL to that origin.
    const commonSecurityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=()' },
      { key: 'Content-Security-Policy', value: csp },
      ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
    ];
    return [
      {
        source: '/(.*)',
        headers: commonSecurityHeaders,
      },
      {
        // API-scoped: same-origin CORS. If NEXT_PUBLIC_BASE_URL is set, mirror that origin.
        source: '/api/(.*)',
        headers: [
          ...(allowedOrigin && allowedOrigin !== 'null'
            ? [{ key: 'Access-Control-Allow-Origin', value: allowedOrigin }]
            : []),
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
