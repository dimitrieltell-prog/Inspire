// Matches BookmarkIcon.jsx's shape: outline by default, solid when `filled`,
// colour inherited from a parent text-* class so each caller decides.
export default function HeartIcon({ filled, className = 'w-[18px] h-[18px]' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.7l-1.4-1.3C5.4 14.9 2 11.9 2 8.2 2 5.4 4.2 3.2 7 3.2c1.6 0 3.1.7 4 1.9.9-1.2 2.4-1.9 4-1.9 2.8 0 5 2.2 5 5 0 3.7-3.4 6.7-8.6 11.2l-1.4 1.3z" />
    </svg>
  )
}
