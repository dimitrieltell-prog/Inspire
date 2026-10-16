// Per-post link previews.
//
// Inspire is a single-page app: the HTML every URL serves is one static
// index.html whose meta tags describe the site, not the post. Link preview
// crawlers don't run JavaScript, so a shared post has always previewed as
// the same generic card as the homepage -- which is most of the reason a
// shared link doesn't get opened.
//
// This runs before routing, and only for the handful of crawlers that
// actually fetch previews. Everyone else falls straight through to the app,
// untouched -- no extra request, no rendering change, nothing to break.
//
// PRIVACY: the post is fetched with NO credentials, on purpose. The backend
// already decides what an anonymous stranger may see -- a followers-only or
// blocked post 404s -- so whatever comes back is public by definition and
// safe to put on a card that anyone holding the link can read. The rules
// are not reimplemented here, which is what would eventually drift.

export const config = {
  matcher: '/stories/:id',
}

const API = process.env.VITE_API_URL || 'https://inspire-z4nn.onrender.com'
const SITE = 'https://www.inspirerealexperiences.com'
const FALLBACK_IMAGE = `${SITE}/og-image.png`

// Only the agents that actually render link previews. Deliberately not a
// general "is this a bot" test: a false positive here serves a human a page
// with no app on it.
const PREVIEW_AGENTS = /facebookexternalhit|facebookcatalog|Facebot|Twitterbot|Slackbot|Slack-ImgProxy|LinkedInBot|WhatsApp|Discordbot|TelegramBot|Applebot|SkypeUriPreview|redditbot|Pinterest|vkShare|Googlebot|bingbot|DuckDuckBot|iframely|embedly|Snapchat|Snap URL Preview|TikTok|Bytespider|Yahoo|Google-InspectionTool|Mastodon|Threads/i

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Everything the card needs in ONE parameter. Two parameters need an
// ampersand, which is correctly written &amp; inside an HTML attribute --
// correct, and one sloppy crawler away from fetching a URL where the
// author's name has silently become part of the previous value. No
// ampersand, nothing to mis-decode.
function packed(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function trim(text, max) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

function page({ title, description, image, url, generated }) {
  const t = escapeHtml(title)
  const d = escapeHtml(description)
  const i = escapeHtml(image)
  const u = escapeHtml(url)
  // A crawler reads the head and stops; it never runs the app, so this is
  // deliberately only a head. The <a> is for the rare human who lands here.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${t}</title>
<link rel="canonical" href="${u}" />
<meta name="description" content="${d}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Inspire" />
<meta property="og:url" content="${u}" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${i}" />
<meta property="og:image:alt" content="${t}" />${generated ? `
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${i}" />
</head>
<body><a href="${u}">${t}</a></body>
</html>`
}

export default async function middleware(request) {
  const agent = request.headers.get('user-agent') || ''
  // Not a preview crawler: hand it back to normal routing and the app.
  if (!PREVIEW_AGENTS.test(agent)) return

  const { pathname } = new URL(request.url)
  const id = pathname.split('/')[2]
  if (!id) return

  let story = null
  try {
    // Render's free tier sleeps, and a cold start runs far longer than any
    // crawler will wait. Better to give up quickly and let the generic card
    // through than to hang until the crawler shows nothing at all.
    const abort = AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined
    const res = await fetch(`${API}/stories/${encodeURIComponent(id)}`, {
      signal: abort,
      headers: { accept: 'application/json' },
    })
    if (res.ok) story = await res.json()
  } catch (e) {
    // Asleep, slow, or down -- fall through to the site-level card.
  }

  const url = `${SITE}/stories/${id}`

  // Not public, or we couldn't tell: say nothing about it. This is the
  // branch a private post takes, and it must stay indistinguishable from
  // the backend simply being unreachable.
  if (!story) {
    return new Response(
      page({
        title: 'Inspire — A quieter kind of social',
        description:
          'A space to be real. Share what actually happened, openly or anonymously — and get support instead of likes.',
        image: FALLBACK_IMAGE,
        url,
      }),
      { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } },
    )
  }

  // author_name is already "Anonymous" on an anonymous post, and author_id
  // is already null -- the server strips identity before it ever reaches
  // here, so naming the author is safe.
  const who = story.author_name || 'Someone'
  const body = trim(story.body, 200)
  const isImage = story.media_url && story.media_type !== 'video'

  // Photo posts preview with their own photo. Everything else gets the
  // Inspire mark.
  //
  // Text posts used to get a card drawn from their own words, which reads
  // well wide -- iMessage, WhatsApp -- and badly anywhere it is cropped to
  // a square, which is what Snapchat's link sticker does: two thirds of the
  // width is thrown away along with the logo and the author's name. The
  // mark crops to a square cleanly, so it is the safer thing to send.
  //
  // api/og.js still renders those cards and is one line from being used
  // again, either everywhere or for everyone except Snapchat.
  const image = isImage ? story.media_url : FALLBACK_IMAGE
  const generated = false

  return new Response(
    page({
      title: `${who} on Inspire`,
      description: body || 'A story on Inspire.',
      image,
      generated,
      url,
    }),
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Short cache: a post can be edited or deleted, and a stale card
        // outliving a deleted post is the failure that matters here.
        'cache-control': 'public, max-age=0, s-maxage=300',
      },
    },
  )
}
