'use client'

// AttributionTracker — tiny first-party beacon.
//
// On page load, POSTs { url, referrer } to /api/tracking/ingest so the server
// can materialise a `tracking_visits` row for the current page view AND upsert
// tracking_visitors / tracking_sessions.
//
// Runs at most once per full page load. The attribution cookies (osc_vid,
// osc_sid, osc_ft, osc_lt) are already set by middleware.js and read on the
// server — this component doesn't touch them.
//
// No third-party scripts. No client-side tracking libraries. Errors are
// swallowed silently — attribution must never break the app.

import { useEffect } from 'react'

export default function AttributionTracker() {
  useEffect(() => {
    // Only fire on real navigations, not on hydration of prerendered content.
    if (typeof window === 'undefined') return
    const controller = new AbortController()
    // Delay slightly so we don't compete with the initial paint.
    const timer = setTimeout(() => {
      try {
        fetch('/api/tracking/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          keepalive: true,
          signal: controller.signal,
          body: JSON.stringify({
            url: window.location.pathname + window.location.search,
            referrer: document.referrer || null,
          }),
        }).catch(() => { /* silently ignore */ })
      } catch { /* silently ignore */ }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [])
  return null
}
