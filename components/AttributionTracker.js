'use client'

// AttributionTracker — tiny first-party beacon, gated on consent.
//
// Attribution cookies (osc_vid, osc_sid, osc_ft, osc_lt) are not strictly
// necessary, so they are only used after the visitor consents (Irish ePrivacy
// Regulations S.I. 336/2011, DPC cookie guidance).
//
// How consent is read: Google's certified consent banner (AdSense → Privacy &
// messaging) exposes the IAB TCF API as window.__tcfapi. When it reports
// consent to "store and/or access information on a device" (TCF purpose 1) —
// or that GDPR does not apply to this visitor — we set the first-party
// `osc_consent=1` cookie. middleware.js and /go only write attribution cookies
// when that cookie is present, and remove them when it is gone.
//
// No consent banner on the page (e.g. AdSense not live yet) → no tracking.
// Errors are swallowed silently — attribution must never break the app.

import { useEffect } from 'react'

const CONSENT_COOKIE = 'osc_consent'
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180 // re-ask at least every 6 months

function setConsentCookie(on) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = on
    ? `${CONSENT_COOKIE}=1; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`
    : `${CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`
}
function hasConsentCookie() {
  return document.cookie.split('; ').some((c) => c === `${CONSENT_COOKIE}=1`)
}

function sendBeacon() {
  try {
    fetch('/api/tracking/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        url: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      }),
    }).catch(() => {})
  } catch { /* ignore */ }
}

export default function AttributionTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    let done = false
    let listenerId = null

    const onConsent = async (granted) => {
      if (done) return
      done = true
      const had = hasConsentCookie()
      setConsentCookie(granted)
      if (!granted) return
      if (!had) {
        // First page with consent: let middleware mint the attribution cookies
        // for this page (it only runs on page requests), then send the beacon.
        try { await fetch(window.location.pathname + window.location.search, { method: 'HEAD', credentials: 'same-origin' }) } catch { /* ignore */ }
      }
      sendBeacon()
    }

    const listen = () => {
      if (typeof window.__tcfapi !== 'function') return false
      try {
        window.__tcfapi('addEventListener', 2, (tcData, ok) => {
          if (!ok || !tcData) return
          if (tcData.listenerId != null) listenerId = tcData.listenerId
          if (tcData.eventStatus !== 'tcloaded' && tcData.eventStatus !== 'useractioncomplete') return
          const granted = tcData.gdprApplies === false || !!tcData.purpose?.consents?.[1]
          if (tcData.eventStatus === 'useractioncomplete') done = false // a new choice always wins
          onConsent(granted)
        })
      } catch { return false }
      return true
    }

    // The consent banner script loads asynchronously: poll briefly for it.
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (listen() || tries > 20) clearInterval(timer)
      // No banner after ~10 s: no consent signal → no tracking.
    }, 500)

    return () => {
      clearInterval(timer)
      try { if (listenerId != null && window.__tcfapi) window.__tcfapi('removeEventListener', 2, () => {}, listenerId) } catch { /* ignore */ }
    }
  }, [])
  return null
}
