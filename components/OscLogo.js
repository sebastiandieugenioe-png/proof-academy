// Shared OSC brand mark. Uses SVG paths (not <img>) so it inherits color,
// stays crisp at any zoom, and adds ~500 bytes to any page it appears on.
//
// Variants:
//   symbol         — just the 5-node mark
//   full           — symbol + "Online Spirits Club" horizontal wordmark
//   compact        — symbol + "OSC" wordmark
//   mono           — symbol only, single-color (inherits `text-*` via currentColor)
// Props:
//   size (px)      — controls symbol height. Wordmark scales proportionally.
//   accent         — include the tiny gold core dot (default true). Off for tiny sizes.

import React from 'react'

const NAVY = '#1E3A8A'
const GOLD = '#C8A44D'

function Symbol({ color = NAVY, accent = true }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-full w-auto shrink-0">
      <g stroke={color} strokeWidth={3} strokeLinecap="round">
        <line x1="32" y1="23" x2="32" y2="14" />
        <line x1="41" y1="32" x2="50" y2="32" />
        <line x1="32" y1="41" x2="32" y2="50" />
        <line x1="23" y1="32" x2="14" y2="32" />
      </g>
      <g fill={color}>
        <circle cx="32" cy="10" r="4" />
        <circle cx="54" cy="32" r="4" />
        <circle cx="32" cy="54" r="4" />
        <circle cx="10" cy="32" r="4" />
      </g>
      <circle cx="32" cy="32" r="8" fill={color} />
      {accent && <circle cx="32" cy="32" r="2" fill={GOLD} />}
    </svg>
  )
}

export default function OscLogo({
  variant = 'symbol',
  size = 32,
  color,             // optional — override the symbol color (else NAVY, unless mono then currentColor)
  labelClass = '',   // additional classes for the wordmark span
  className = '',    // additional classes for the wrapper
  title,             // aria-label / visually-hidden text for accessibility (default from variant)
}) {
  const isMono = variant === 'mono'
  const symbolColor = color || (isMono ? 'currentColor' : NAVY)
  const showAccent = !isMono && size >= 24
  const wrapperStyle = { height: size, lineHeight: `${size}px` }

  if (variant === 'symbol' || variant === 'mono') {
    return (
      <span
        role={title ? 'img' : undefined}
        aria-label={title || 'Online Spirits Club'}
        style={wrapperStyle}
        className={`inline-flex items-center ${className}`}
      >
        <Symbol color={symbolColor} accent={showAccent} />
      </span>
    )
  }

  const label = variant === 'compact' ? 'OSC' : 'Online Spirits Club'
  const labelSize = variant === 'compact' ? size * 0.78 : size * 0.62
  const labelWeight = variant === 'compact' ? 'font-extrabold' : 'font-bold'

  return (
    <span
      role="img"
      aria-label={title || label}
      style={wrapperStyle}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <Symbol color={symbolColor} accent={showAccent} />
      <span
        className={`${labelWeight} text-slate-900 whitespace-nowrap ${labelClass}`}
        style={{
          fontSize: labelSize,
          letterSpacing: variant === 'compact' ? '0.06em' : '-0.015em',
          fontFamily: "var(--font-manrope), Manrope, 'Inter', -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        {label}
      </span>
    </span>
  )
}
