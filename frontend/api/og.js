import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

// Draws the preview image for a post that has no photo of its own.
//
// Until now every text post shared the one site-wide banner, so a link to
// someone's hardest week arrived looking exactly like a link to the
// homepage. This renders the words themselves onto a card.
//
// Called only from middleware.js, and only for posts the backend already
// served to an anonymous request, so everything arriving here is public.
// No post is looked up and nothing is fetched from the API: the text comes
// in the query string already vetted, and this file only draws it.
//
// satori + resvg rather than @vercel/og, which wraps exactly these two:
// its edge build is rejected by this project's function validator, and its
// Node build does require("fs") inside an ESM package and dies on every
// invocation. These are the same renderer without the broken wrapper.

const WIDTH = 1200
const HEIGHT = 630
const PAD_X = 84
const PAD_Y = 72
const INNER = WIDTH - PAD_X * 2
// Short on purpose. 300 characters at 38px fills the card edge to edge and
// turns to mush the moment anything shrinks it -- and plenty of places do:
// Snapchat's link sticker crops it to a strip barely a third of its width.
// Fewer words set larger survive that; the full post is one tap away.
const MAX_CHARS = 150

// Longer posts step down in size rather than overflowing. Satori has no
// auto-fit, so the size is chosen before anything is laid out.
function fontSizeFor(length) {
  if (length <= 60) return 72
  if (length <= 110) return 62
  return 54
}

function el(type, style, children) {
  return { type, props: { style, children } }
}

let cachedFonts = null
async function loadFonts(origin) {
  // Held across invocations so a warm function doesn't refetch them.
  if (cachedFonts) return cachedFonts
  const [semibold, bold] = await Promise.all([
    fetch(`${origin}/fonts/PlusJakartaSans-SemiBold.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/PlusJakartaSans-Bold.ttf`).then((r) => r.arrayBuffer()),
  ])
  cachedFonts = [
    { name: 'Jakarta', data: Buffer.from(semibold), weight: 600, style: 'normal' },
    { name: 'Jakarta', data: Buffer.from(bold), weight: 700, style: 'normal' },
  ]
  return cachedFonts
}

export default async function handler(req, res) {
  try {
    // One base64url parameter holding { t: text, w: who } -- see the note
    // in middleware.js about why this isn't two plain query parameters.
    const packed = String(req.query.q || '')
    const json = Buffer.from(packed.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const { t, w } = JSON.parse(json)
    const raw = String(t || '').replace(/\s+/g, ' ').trim()
    const who = String(w || '').trim().slice(0, 40) || 'Inspire'
    const text =
      (raw.length > MAX_CHARS ? `${raw.slice(0, MAX_CHARS - 1).trimEnd()}…` : raw) ||
      'A story on Inspire'

    const proto = req.headers['x-forwarded-proto'] || 'https'
    const origin = `${proto}://${req.headers.host}`
    const fonts = await loadFonts(origin)

    // Explicit pixel sizes, no percentages and no padding on the root.
    // Satori lays padding OUTSIDE the declared width, so width:100% plus
    // padding made the box 168px wider than the canvas: text ran off the
    // right edge mid-word and the footer was pushed out of frame.
    const card = el(
      'div',
      {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        background: 'linear-gradient(135deg, #313A5F 0%, #242A44 55%, #171C2F 100%)',
        fontFamily: 'Jakarta',
      },
      [
        el(
          'div',
          {
            width: INNER,
            height: HEIGHT - PAD_Y * 2,
            marginTop: PAD_Y,
            marginBottom: PAD_Y,
            marginLeft: PAD_X,
            marginRight: PAD_X,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
          [
            el('div', { display: 'flex', width: INNER, flexGrow: 1, alignItems: 'center' }, [
              el(
                'div',
                {
                  width: INNER,
                  fontSize: fontSizeFor(text.length),
                  fontWeight: 700,
                  color: '#EDECF6',
                  lineHeight: 1.3,
                  letterSpacing: '-0.02em',
                },
                text,
              ),
            ]),
            el('div', { display: 'flex', width: INNER, alignItems: 'center' }, [
              el('div', {
                width: 34,
                height: 34,
                border: '3px solid #8FA2E8',
                transform: 'rotate(45deg)',
                marginRight: 34,
              }),
              el('div', { fontSize: 28, fontWeight: 600, color: '#C3CBE8' }, who),
              el('div', { display: 'flex', flexGrow: 1 }),
              el(
                'div',
                { fontSize: 24, fontWeight: 600, color: '#7E89AE' },
                'inspirerealexperiences.com',
              ),
            ]),
          ],
        ),
      ],
    )

    const svg = await satori(card, { width: WIDTH, height: HEIGHT, fonts })
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng()

    res.setHeader('content-type', 'image/png')
    // The text is baked into the URL, so a given URL always renders the
    // same image and can be cached hard.
    res.setHeader('cache-control', 'public, max-age=0, s-maxage=86400, immutable')
    res.status(200).send(png)
  } catch (e) {
    // A broken image is worse than the plain banner, so fail over to it.
    res.redirect(302, '/og-image.png')
  }
}
