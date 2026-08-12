export default function AriaIcon({ className = 'w-5 h-5', title = 'Aria' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M11 2l1.8 5.6L18.4 9.4 12.8 11.2 11 16.8 9.2 11.2 3.6 9.4 9.2 7.6z" />
      <path d="M18.5 14l.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8z" />
    </svg>
  )
}
