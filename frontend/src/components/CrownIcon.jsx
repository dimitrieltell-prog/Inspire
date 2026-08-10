export default function CrownIcon({ className = 'w-4 h-4 text-navy', title = 'Founder' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M4 19V9l4 4 4-7 4 7 4-4v10a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
      <rect x="3" y="19" width="18" height="2.4" rx="1.2" />
    </svg>
  )
}
