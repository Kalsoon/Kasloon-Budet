import "./kalsoon-logo.css";

/** A shared Kalsoon wordmark: a clear, forward-moving K monogram. */
export function KalsoonLogo({ className = "", compact = false, tagline = false }) {
  return <span className={`kalsoon-logo ${compact ? "is-compact" : ""} ${className}`.trim()}>
    <span className="kalsoon-logo-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" focusable="false">
        <path d="M15 13.5v21" />
        <path d="m18 24 14-10.5" />
        <path d="m18 24 14 10.5" />
        <circle cx="18" cy="24" r="2.25" fill="currentColor" stroke="none" />
      </svg>
    </span>
    {!compact ? <span className="kalsoon-logo-copy"><strong>Kalsoon</strong>{tagline ? <small>Every franc, with purpose</small> : null}</span> : null}
  </span>;
}
