// Serves /ads.txt for Google AdSense. Content comes from lib/adsense.js.
import { ADSENSE_PUBLISHER_ID, adsenseEnabled } from '@/lib/adsense';

export const dynamic = 'force-static';

export function GET() {
  if (!adsenseEnabled()) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  // f08c47fec0942fa0 is Google's fixed certification authority id.
  const body = `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
