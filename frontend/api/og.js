import { ImageResponse } from '@vercel/og'

// Draws the preview image for a post that has no photo of its own.
//
// Until now every text post shared the one site-wide banner, so a link to
// someone's hardest week and a link to the homepage arrived looking
// identical. This renders the words themselves onto a card, which is the
// difference between a link that gets opened and one that doesn't.
//
// Called only from middleware.js, and only for posts the backend already
// served to an anonymous request -- so everything reaching here is public.
// Nothing is fetched here and no post is looked up: the text arrives in
// the query string already vetted, and this file just draws it.

// Node, not edge. @vercel/og is not an allowed module in this project's
// edge bundle -- the deploy step rejected it with "The Edge Function
// 'middleware' is referencing unsupported modules: @vercel", taking the
// whole deployment down rather than just this function. The Node runtime
// has no such restriction and @vercel/og ships a build for it.
export const config = { runtime: 'nodejs' }

const WIDTH = 1200
const HEIGHT = 630
const PAD_X = 84
const PAD_Y = 72
const INNER = WIDTH - PAD_X * 2
const MAX_CHARS = 300

// Longer posts step down in size rather than overflowing the card. Satori
// has no auto-fit, so the size has to be chosen before laying anything out.
function fontSizeFor(length) {
  if (length <= 70) return 62
  if (length <= 140) return 52
  if (length <= 220) return 44
  return 38
}

function el(type, style, children) {
  return { type, props: { style, children } }
}

export default async function handler(request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const raw = (searchParams.get('text') || '').replace(/\s+/g, ' ').trim()
    const who = (searchParams.get('who') || '').trim().slice(0, 40)
    const text = raw.length > MAX_CHARS ? `${raw.slice(0, MAX_CHARS - 1).trimEnd()}…` : raw

    // Fonts are fetched from the site's own public directory rather than
    // imported as bundled assets. The import.meta.url form is what the
    // Next.js examples use, and it does not survive this project's
    // function build -- it took the whole deployment down with it.
    const [semibold, bold] = await Promise.all([
      fetch(`${origin}/fonts/PlusJakartaSans-SemiBold.ttf`).then((r) => r.arrayBuffer()),
      fetch(`${origin}/fonts/PlusJakartaSans-Bold.ttf`).then((r) => r.arrayBuffer()),
    ])

    // Explicit pixel sizes, no percentages and no padding on the root.
    // Satori lays padding OUTSIDE the declared width, so width:100% plus
    // padding made the box 168px wider than the canvas and the text ran
    // clean off the right edge with the footer pushed out of frame.
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
            // The words, centred in whatever room the footer leaves.
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
                text || 'A story on Inspire',
              ),
            ]),
            // The mark, who wrote it, and where it lives.
            el('div', { display: 'flex', width: INNER, alignItems: 'center' }, [
              el('div', {
                width: 34,
                height: 34,
                border: '3px solid #8FA2E8',
                transform: 'rotate(45deg)',
                marginRight: 34,
              }),
              el('div', { fontSize: 28, fontWeight: 600, color: '#C3CBE8' }, who || 'Inspire'),
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

    return new ImageResponse(card, {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Jakarta', data: semibold, weight: 600, style: 'normal' },
        { name: 'Jakarta', data: bold, weight: 700, style: 'normal' },
      ],
      headers: {
        // The text is baked into the URL, so a given URL always renders the
        // same image and can be cached hard.
        'cache-control': 'public, max-age=0, s-maxage=86400, immutable',
      },
    })
  } catch (e) {
    // A broken image is worse than the plain banner, so fail over to it.
    return Response.redirect(new URL('/og-image.png', request.url), 302)
  }
}
