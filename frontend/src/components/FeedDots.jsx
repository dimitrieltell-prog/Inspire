// Position indicator for the Stories scroll-snap feed. Purely
// presentational -- not click-to-jump, matching the approved mockup.
export default function FeedDots({ count, activeIndex }) {
  if (count <= 1) return null
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIndex ? 'bg-indigo' : 'bg-white/60'}`}
        />
      ))}
    </div>
  )
}
