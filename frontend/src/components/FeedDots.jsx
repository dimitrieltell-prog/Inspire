// Position indicator for the Stories scroll-snap feed. Purely
// presentational -- not click-to-jump, matching the approved mockup.
// Anchored off the feed card's own right edge (the card is centered via
// max-w-[480px], so half its width is 240px) rather than the scroll
// pane's right edge -- the pane extends all the way to the sidebar, so
// right-anchoring there hugged the sidebar boundary instead of sitting
// in the gap next to the post.
export default function FeedDots({ count, activeIndex }) {
  if (count <= 1) return null
  return (
    <div className="absolute left-[calc(50%+240px+24px)] top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full transition-all ${i === activeIndex ? 'h-3.5 bg-indigo' : 'h-1.5 bg-navy/15'}`}
        />
      ))}
    </div>
  )
}
