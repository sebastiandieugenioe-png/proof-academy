// Google AdSense configuration — the ONE place to set the publisher ID.
//
// When ADSENSE_PUBLISHER_ID is empty:
//   - no AdSense script is loaded,
//   - /ads.txt returns 404.
// When it is set (format: 'pub-1234567890123456'):
//   - the AdSense script is added to <head> on every page (app/layout.js),
//   - /ads.txt serves the line Google expects (app/ads.txt/route.js).
//
// Consent (EU/Ireland): enable Google's own consent banner in the AdSense
// account → Privacy & messaging → European regulations message. It loads
// through the same script, so no extra code is needed here.
//
// Can be overridden per environment with NEXT_PUBLIC_ADSENSE_PUBLISHER_ID.
export const ADSENSE_PUBLISHER_ID =
  (process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || '').trim() ||
  'pub-2820097090491107'; // Online Spirits Club AdSense publisher ID

const VALID = /^pub-\d{10,20}$/;

export function adsenseEnabled() {
  return VALID.test(ADSENSE_PUBLISHER_ID);
}

// "ca-pub-…" is the client id used by the ad script.
export function adsenseClientId() {
  return adsenseEnabled() ? `ca-${ADSENSE_PUBLISHER_ID}` : null;
}
