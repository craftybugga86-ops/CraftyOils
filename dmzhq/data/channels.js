// DMZHQ content registry — the whole vlog lives in this one file.
//
// Plain JS rather than JSON on purpose: the rest of this repo opens its
// pages straight off disk (and ships inside an Android WebView), and a
// file:// page cannot fetch() a local JSON file without tripping CORS. A
// script tag has no such restriction, so the hub works by double-clicking
// index.html — no server, no build step.
//
// CHANNELS — the creators/accounts the hub follows.
//   id, name, platform, ref (handle or channel ID), url, blurb
//
// ENTRIES — individual things to watch.
//   id        unique key
//   platform  a platform id from js/platforms.js
//   kind      one of that platform's `kinds`
//   ref       the platform-specific ID — see that platform's refHint
//   title     what the card shows
//   channel   a channel id from CHANNELS, or a free-text name
//   handle    optional @handle, used to build the off-site link
//   published ISO date, drives sorting
//   tags      free-text, searchable and shown on the card
//   blurb     one line of context
//   poster    optional explicit thumbnail URL, overriding the platform's
//
// Any entry whose `ref` still starts with REPLACE_ renders as an
// unconfigured card that names exactly what to paste, instead of loading a
// player that would 404. Swap in real IDs as you gather them.
window.DMZHQ_DATA = {
  meta: {
    title: "DMZHQ",
    tagline: "Every channel, every platform, one wall."
  },

  channels: [
    {
      id: "dmz-main",
      name: "DMZHQ",
      platform: "youtube",
      ref: "REPLACE_WITH_CHANNEL_ID",
      url: "",
      blurb: "The main vlog feed — long-form uploads and archived streams."
    },
    {
      id: "dmz-live",
      name: "DMZHQ Live",
      platform: "twitch",
      ref: "REPLACE_WITH_CHANNEL_NAME",
      url: "",
      blurb: "Live broadcasts, with VODs mirrored to the main feed after."
    },
    {
      id: "dmz-clips",
      name: "DMZHQ Clips",
      platform: "tiktok",
      ref: "REPLACE_WITH_HANDLE",
      url: "",
      blurb: "Vertical cut-downs of the best moments from the week."
    }
  ],

  entries: [
    {
      id: "yt-latest",
      platform: "youtube",
      kind: "video",
      ref: "REPLACE_WITH_VIDEO_ID",
      title: "Latest upload",
      channel: "dmz-main",
      published: "2026-09-12",
      tags: ["vlog", "long-form"],
      blurb: "Newest long-form episode on the main feed."
    },
    {
      id: "yt-live",
      platform: "youtube",
      kind: "live",
      ref: "REPLACE_WITH_CHANNEL_ID",
      title: "YouTube live channel",
      channel: "dmz-main",
      published: "2026-09-13",
      tags: ["live"],
      blurb: "Auto-resolves to whatever is streaming right now, or goes dark."
    },
    {
      id: "yt-short",
      platform: "youtube",
      kind: "short",
      ref: "REPLACE_WITH_VIDEO_ID",
      title: "Short of the week",
      channel: "dmz-main",
      published: "2026-09-11",
      tags: ["short", "vertical"],
      blurb: "Vertical cut, embedded in its native 9:16 frame."
    },
    {
      id: "tw-live",
      platform: "twitch",
      kind: "live",
      ref: "REPLACE_WITH_CHANNEL_NAME",
      title: "Twitch channel — live",
      channel: "dmz-live",
      published: "2026-09-13",
      tags: ["live", "stream"],
      blurb: "Shows the offline card when the channel is not broadcasting."
    },
    {
      id: "tw-clip",
      platform: "twitch",
      kind: "clip",
      ref: "REPLACE_WITH_CLIP_SLUG",
      title: "Clip of the week",
      channel: "dmz-live",
      published: "2026-09-10",
      tags: ["clip", "highlight"],
      blurb: "A single clip, playable without leaving the wall."
    },
    {
      id: "kick-live",
      platform: "kick",
      kind: "live",
      ref: "REPLACE_WITH_CHANNEL_SLUG",
      title: "Kick channel — live",
      channel: "DMZHQ on Kick",
      published: "2026-09-13",
      tags: ["live", "stream"],
      blurb: "Simulcast mirror of the Twitch broadcast."
    },
    {
      id: "tiktok-clip",
      platform: "tiktok",
      kind: "short",
      ref: "REPLACE_WITH_VIDEO_ID",
      title: "TikTok cut-down",
      channel: "dmz-clips",
      handle: "@dmzhq",
      published: "2026-09-12",
      tags: ["short", "vertical", "clip"],
      blurb: "Vertical clip pulled from this week's stream."
    },
    {
      id: "ig-reel",
      platform: "instagram",
      kind: "short",
      ref: "REPLACE_WITH_SHORTCODE",
      title: "Instagram reel",
      channel: "DMZHQ on Instagram",
      published: "2026-09-09",
      tags: ["short", "vertical"],
      blurb: "Reels embed publicly; private accounts will not render."
    },
    {
      id: "fb-video",
      platform: "facebook",
      kind: "video",
      ref: "REPLACE_WITH_POST_URL",
      title: "Facebook video post",
      channel: "DMZHQ on Facebook",
      published: "2026-09-08",
      tags: ["vlog"],
      blurb: "Takes the full public permalink rather than a bare ID."
    },
    {
      id: "x-post",
      platform: "x",
      kind: "post",
      ref: "REPLACE_WITH_STATUS_ID",
      title: "Post on X",
      channel: "DMZHQ on X",
      handle: "@dmzhq",
      published: "2026-09-13",
      tags: ["update"],
      blurb: "Announcements and schedule changes."
    },
    {
      id: "trovo-live",
      platform: "trovo",
      kind: "live",
      ref: "REPLACE_WITH_STREAMER_NAME",
      title: "Trovo channel — live",
      channel: "DMZHQ on Trovo",
      published: "2026-09-13",
      tags: ["live", "stream"],
      blurb: "Third simulcast target."
    },
    {
      id: "vimeo-cut",
      platform: "vimeo",
      kind: "video",
      ref: "REPLACE_WITH_VIDEO_ID",
      title: "Director's cut",
      channel: "DMZHQ on Vimeo",
      published: "2026-09-05",
      tags: ["long-form", "edit"],
      blurb: "Higher-bitrate edit, embedded with Do Not Track on."
    },
    {
      id: "spotify-pod",
      platform: "spotify",
      kind: "podcast",
      ref: "REPLACE_WITH_EPISODE_ID",
      title: "Companion podcast",
      channel: "DMZHQ Audio",
      published: "2026-09-07",
      tags: ["audio", "podcast"],
      blurb: "Audio-only companion to the week's vlog."
    },
    {
      id: "discord-hq",
      platform: "discord",
      kind: "community",
      ref: "REPLACE_WITH_SERVER_ID",
      title: "DMZHQ Discord",
      channel: "DMZHQ Community",
      published: "2026-09-13",
      tags: ["community", "chat"],
      blurb: "Live member list and voice channels — needs the server widget enabled.",
      invite: ""
    }
  ]
};
