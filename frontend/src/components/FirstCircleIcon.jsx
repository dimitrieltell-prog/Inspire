// The First Circle badge: a ring (the circle of a hundred) around Inspire's
// own diamond mark.
//
// It has to be unmistakable next to the two marks already sitting beside
// names -- the solid navy crown that means the founder, and the indigo
// sunburst check that means Premium -- so this one is an outline in bronze,
// a colour nothing else in the app uses. The bronze is a theme token, not a
// literal, so it swaps with the rest of the palette under data-theme="dark"
// -- the app never uses Tailwind's `dark:` variant, which keys off the OS
// setting Inspire deliberately ignores.
//
// The thin inner ring is dropped below 16px. At the 12-14px this renders at
// in a comment row, a 0.9px stroke lands on less than a device pixel and
// smears the middle of the badge into a grey blob; the outer ring thickens
// slightly instead so the shape still reads. Same size-aware treatment the
// other icons use.
export default function FirstCircleIcon({ size = 16, className = '', title = 'First Circle' }) {
  const small = size < 16
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label={title}
      className={`flex-shrink-0 text-bronze ${className}`}
    >
      <title>{title}</title>
      {small ? (
        <>
          <circle cx="12" cy="12" r="8.7" stroke="currentColor" strokeWidth="1.9" />
          <rect x="9.4" y="9.4" width="5.2" height="5.2" transform="rotate(45 12 12)" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="5.9" stroke="currentColor" strokeWidth="0.9" />
          <rect x="9.8" y="9.8" width="4.4" height="4.4" transform="rotate(45 12 12)" fill="currentColor" />
        </>
      )}
    </svg>
  )
}
