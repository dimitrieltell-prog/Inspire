// The box-and-arrow share glyph, not a paper plane: MessagesIcon is already
// a paper plane in the nav, and the same shape meaning two different things
// one row apart is the kind of thing nobody reports but everybody misreads.
export default function ShareIcon({ className = 'w-[18px] h-[18px]', title = 'Share' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M12 3.4v11" />
      <path d="M8.2 7.2 12 3.4l3.8 3.8" />
      <path d="M8 10.6H6a2 2 0 0 0-2 2v6.4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6.4a2 2 0 0 0-2-2h-2" />
    </svg>
  )
}
