// The brand mark (two overlapping diamonds, serif "i") as an inline SVG
// using currentColor -- unlike the static /logo.svg file (hardcoded navy,
// meant only for a light background) or /favicon.svg (its own boxed
// navy-gradient background, meant for a spot like the browser tab that's
// always on a neutral OS chrome), this one inherits color from a parent
// text-* class exactly like every icon component already does, so it's
// navy in light mode and light in dark mode automatically -- no box.
export default function Logo({ className }) {
  return (
    <svg viewBox="48 48 304 304" className={className} fill="none">
      <g stroke="currentColor" opacity="0.95">
        <rect x="98" y="98" width="204" height="204" strokeWidth="3" transform="rotate(45 200 200)" />
        <rect x="110" y="110" width="180" height="180" strokeWidth="1.5" transform="rotate(45 200 200)" />
      </g>
      <text
        x="200"
        y="253"
        textAnchor="middle"
        fontFamily="'Times New Roman', Times, serif"
        fontWeight="700"
        fontSize="155"
        fill="currentColor"
      >
        i
      </text>
    </svg>
  )
}
