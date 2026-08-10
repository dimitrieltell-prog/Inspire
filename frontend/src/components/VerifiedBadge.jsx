const SUNBURST_POINTS = [
  '12,1', '14.2,3.79', '17.5,2.47', '18.01,5.99', '21.53,6.5', '20.21,9.8',
  '23,12', '20.21,14.2', '21.53,17.5', '18.01,18.01', '17.5,21.53', '14.2,20.21',
  '12,23', '9.8,20.21', '6.5,21.53', '5.99,18.01', '2.47,17.5', '3.79,14.2',
  '1,12', '3.79,9.8', '2.47,6.5', '5.99,5.99', '6.5,2.47', '9.8,3.79',
].join(' ')

export default function VerifiedBadge({ className = 'w-4 h-4', title = 'Premium' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <polygon points={SUNBURST_POINTS} fill="var(--color-indigo)" stroke="var(--color-indigo)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 12.5l3 3 6-6.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
