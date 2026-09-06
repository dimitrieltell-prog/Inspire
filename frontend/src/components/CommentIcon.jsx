// Outline speech bubble, sized and stroked to sit level with HeartIcon and
// RepostIcon in the action row.
export default function CommentIcon({ className = 'w-[18px] h-[18px]' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.6a8.4 8.4 0 0 1-8.4 8.4 8.6 8.6 0 0 1-3.9-.9L3.4 21l1.9-4.9A8.4 8.4 0 0 1 12.6 3.2a8.4 8.4 0 0 1 8.4 8.4z" />
    </svg>
  )
}
