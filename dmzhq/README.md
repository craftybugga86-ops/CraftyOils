# DMZHQ

A vlog wall: every social channel and video in one place, embedded straight
from the platform that already hosts it.

Open `dmzhq/index.html` in a browser. No server, no build step, no
dependencies — same as the rest of this repo.

```
dmzhq/
  index.html          the wall, and the Content-Security-Policy
  css/dmzhq.css       all styling (no webfont — that'd be a 3rd-party request)
  js/platforms.js     platform registry: embed URLs, colours, iframe policy
  js/dmzhq.js         rendering, filtering, the player
  data/channels.js    the content — this is the file you edit
```

## The bandwidth design

The whole point of the build: **DMZHQ never pays for the media it shows.**

| | |
| --- | --- |
| **Nothing is re-hosted** | This site serves HTML, CSS, one script and one data file — about 55 KB. No video, audio, thumbnail or player code is stored here or proxied through here. |
| **Cards are facades** | Every tile is drawn locally from a hash of the entry's own id: a CSS gradient, zero network requests. The `<iframe>` does not exist in the DOM until you press play. Browsing the entire wall costs this host nothing *and* costs the platforms nothing. |
| **One player at a time** | Starting a second video removes the first iframe from the page. Removing the node is what actually closes the connection — hiding it would leave the stream running and still downloading. A long session never accumulates live players. |
| **Poster art is opt-in** | Real thumbnails come from platform CDNs, so they're third-party requests too. The toggle is off by default and remembered per browser in `localStorage`. |
| **Playback is direct** | When you do press play, bytes travel from the platform's CDN to the viewer's browser. They never touch this server's bandwidth bill. |

The ledger at the top of the page reports this live. The "served by this
site" figure is exact, because same-origin resources report their real
transfer size. Third-party players deliberately don't expose theirs (no
`Timing-Allow-Origin` header), so the page counts *streams opened* rather
than inventing a byte total it can't measure. Opened from `file://` there
are no timings at all and the figure reads `—`.

## Platforms

One entry per platform in the Elgato ecosystem that exposes a public,
embeddable player:

| Platform | Kinds | What `ref` holds |
| --- | --- | --- |
| YouTube | video, short, live, playlist | video ID, or channel ID for a live entry |
| Twitch | live, video, clip | channel name / VOD ID / clip slug |
| Kick | live | channel slug |
| TikTok | short, video | numeric video ID |
| Facebook | video, live | the full public permalink URL |
| Instagram | short, post | the shortcode from `/reel/<code>` or `/p/<code>` |
| X | post, video | numeric status ID |
| Trovo | live | streamer name |
| Vimeo | video | numeric video ID |
| Spotify | podcast | episode ID |
| Discord | community | server ID, with the server widget enabled |

Elgato's integration list moves — plugins get added and retired on the
Marketplace — so treat this as a snapshot, not a contract. Adding or
removing a platform is one object in `js/platforms.js` plus its origin in
the CSP in `index.html`; nothing in `js/dmzhq.js` knows any platform by
name.

Two embed quirks worth knowing, both already handled:

- **Twitch** refuses to render unless the embed declares the exact hostname
  framing it. `platforms.js` fills `parent=` from `location.hostname` at
  runtime, falling back to `localhost` when the page is opened from disk.
- **YouTube** embeds use `youtube-nocookie.com`, which holds back tracking
  cookies until playback actually starts.

## Adding something to the wall

Edit `data/channels.js`. An entry looks like:

```js
{
  id: "yt-ep-41",              // unique
  platform: "youtube",         // an id from js/platforms.js
  kind: "video",               // one of that platform's kinds
  ref: "dQw4w9WgXcQ",          // see the table above
  title: "Episode 41",
  channel: "dmz-main",         // a channel id, or free text
  handle: "@dmzhq",            // optional, builds the off-site link
  published: "2026-09-12",     // ISO date, drives sorting
  tags: ["vlog", "long-form"], // searchable
  blurb: "One line of context.",
  poster: ""                   // optional explicit thumbnail URL
}
```

The sample data ships with every `ref` set to a `REPLACE_…` placeholder, so
the wall renders as a complete scaffold out of the box. Any entry still
holding a placeholder draws an **unconfigured** card naming exactly what to
paste, instead of loading a player that would 404. Fill them in as you
gather the real IDs.

It's a plain `.js` file rather than JSON on purpose: a `file://` page can't
`fetch()` local JSON without tripping CORS, and this repo's pages are meant
to open by double-clicking (and to run inside the Android WebView, which
has no network permission at all).

## Security

`index.html` carries a Content-Security-Policy that pins `default-src`,
`script-src` and `style-src` to `'self'`, sets `object-src`, `base-uri` and
`form-action` to `'none'`, and allowlists `frame-src` to exactly the player
origins the registry declares. `js/dmzhq.js` re-checks the two against each
other at startup and warns in the console if a platform's origin is missing
from the policy — otherwise the only symptom is a silently blank player,
which is miserable to debug.

`img-src` allows any `https:` host, so a curator can point an entry's
`poster` at whatever CDN holds it. Images can't execute, and poster loading
is off by default.

Each iframe gets a deliberately narrow `allow` policy — autoplay,
fullscreen, picture-in-picture, encrypted media. Never camera, microphone,
geolocation or payment: a video player has no use for them, and granting
them to a third-party frame is how an embed turns into a privacy problem.
`referrerpolicy="strict-origin-when-cross-origin"` sends the origin, which
Twitch and others validate against, but never the full page path.

Embeds are *not* sandboxed. `sandbox` on a cross-origin player needs
`allow-scripts allow-same-origin` to work at all, which together defeat the
isolation it's meant to provide — so `frame-src` is the real boundary here,
and it's the one the CSP enforces. All DOM text is written with
`textContent` and all URLs are built by the registry, so a hand-edited data
file can't inject markup.

## Verified

Driven in headless Chromium: all 11 platforms produce correct embed URLs
and load without a single CSP violation; the one-player-at-a-time rule
holds across all 14 sample cards; Escape tears the player down; filters,
search and the poster toggle all work; no console errors or warnings; and
no horizontal overflow at 390px wide.
