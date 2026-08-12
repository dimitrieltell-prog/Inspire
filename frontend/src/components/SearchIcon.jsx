export default function SearchIcon({ className = 'w-5 h-5', title = 'Search' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  )
}
