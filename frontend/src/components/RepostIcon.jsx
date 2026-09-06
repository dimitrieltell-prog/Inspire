// Two arrows chasing each other -- the standard repost/retweet mark, drawn
// as an outline to match HeartIcon and CommentIcon.
export default function RepostIcon({ className = 'w-[18px] h-[18px]' }) {
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
      <path d="M17 2.5l3.5 3.5L17 9.5" />
      <path d="M20.5 6H8a4 4 0 0 0-4 4v1.5" />
      <path d="M7 21.5L3.5 18 7 14.5" />
      <path d="M3.5 18H16a4 4 0 0 0 4-4v-1.5" />
    </svg>
  )
}
