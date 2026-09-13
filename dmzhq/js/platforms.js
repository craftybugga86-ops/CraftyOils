// DMZHQ platform registry.
//
// One entry per platform in the Elgato ecosystem that exposes a public,
// embeddable player. Everything platform-specific lives here — dmzhq.js
// never hardcodes a platform name — so adding or retiring a platform is a
// single edit to this file plus its origin in the CSP allowlist in
// index.html.
//
// Contract for each platform:
//   id       stable key used by data/channels.js entries
//   name     display name
//   icon     single glyph for the chip / badge (no image request)
//   accent   CSS colour used for the card's platform stripe
//   kinds    which entry.kind values this platform can embed
//   origins  every origin its iframe can load from — these MUST also appear
//            in the frame-src list of the CSP <meta> in index.html
//   refHint  what an entry's `ref` field has to contain, shown in the UI
//            when an entry is still unconfigured
//   allow    the iframe permission policy. Deliberately narrow: no camera,
//            no microphone, no geolocation, no payment — a video player
//            never needs them, and granting them to a third-party frame is
//            how an embed turns into a privacy problem.
//   aspect   default CSS aspect-ratio for the player
//   embed()  builds the iframe src, or returns null if it can't
//   watch()  canonical off-site URL, used for the "open on platform" link
//   poster() optional thumbnail URL, or null when the platform has no
//            predictable one. Only ever requested when the viewer opts in.
(function () {
  "use strict";

  // Twitch refuses to render an embed unless it declares the exact hostname
  // framing it. Opened from disk there is no hostname at all, and Twitch
  // treats that case the same as localhost.
  function parentHost() {
    return window.location.hostname || "localhost";
  }

  function enc(value) {
    return encodeURIComponent(String(value == null ? "" : value));
  }

  // Entries arrive from a hand-edited data file, so a ref may be blank, or
  // still hold the placeholder text the sample data ships with.
  function hasRef(entry) {
    var ref = entry && entry.ref;
    return typeof ref === "string" && ref.trim() !== "" && ref.indexOf("REPLACE_") !== 0;
  }

  var PLATFORMS = [
    {
      id: "youtube",
      name: "YouTube",
      icon: "▶",
      accent: "#ff0033",
      kinds: ["video", "short", "live", "playlist"],
      // www.youtube.com is listed too: the nocookie host redirects there
      // for some live and playlist embeds.
      origins: ["https://www.youtube-nocookie.com", "https://www.youtube.com"],
      refHint: "video ID (dQw4w9WgXcQ), or the channel ID (UC…) for a live entry",
      allow: "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen",
      aspect: "16 / 9",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        // youtube-nocookie.com is the privacy-enhanced host: it skips the
        // tracking cookies until the viewer actually starts playback.
        var base = "https://www.youtube-nocookie.com/embed/";
        if (entry.kind === "live") {
          return base + "live_stream?channel=" + enc(entry.ref) + "&autoplay=1";
        }
        if (entry.kind === "playlist") {
          return base + "videoseries?list=" + enc(entry.ref) + "&rel=0";
        }
        return base + enc(entry.ref) + "?autoplay=1&rel=0&modestbranding=1";
      },
      watch: function (entry) {
        if (!hasRef(entry)) return null;
        if (entry.kind === "live") return "https://www.youtube.com/channel/" + enc(entry.ref) + "/live";
        if (entry.kind === "playlist") return "https://www.youtube.com/playlist?list=" + enc(entry.ref);
        return "https://www.youtube.com/watch?v=" + enc(entry.ref);
      },
      poster: function (entry) {
        if (!hasRef(entry) || entry.kind === "live" || entry.kind === "playlist") return null;
        return "https://i.ytimg.com/vi/" + enc(entry.ref) + "/hqdefault.jpg";
      }
    },
    {
      id: "twitch",
      name: "Twitch",
      icon: "◉",
      accent: "#9146ff",
      kinds: ["live", "video", "clip"],
      origins: ["https://player.twitch.tv", "https://clips.twitch.tv", "https://embed.twitch.tv"],
      refHint: "channel name for live, VOD ID for video, slug for a clip",
      allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      aspect: "16 / 9",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        var parent = "&parent=" + enc(parentHost());
        if (entry.kind === "clip") {
          return "https://clips.twitch.tv/embed?clip=" + enc(entry.ref) + parent;
        }
        if (entry.kind === "video") {
          return "https://player.twitch.tv/?video=" + enc(entry.ref) + parent;
        }
        return "https://player.twitch.tv/?channel=" + enc(entry.ref) + parent;
      },
      watch: function (entry) {
        if (!hasRef(entry)) return null;
        if (entry.kind === "video") return "https://www.twitch.tv/videos/" + enc(entry.ref);
        return "https://www.twitch.tv/" + enc(entry.ref);
      },
      poster: function () { return null; }
    },
    {
      id: "kick",
      name: "Kick",
      icon: "◆",
      accent: "#53fc18",
      kinds: ["live"],
      origins: ["https://player.kick.com"],
      refHint: "channel slug as it appears in kick.com/<slug>",
      allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      aspect: "16 / 9",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        return "https://player.kick.com/" + enc(entry.ref);
      },
      watch: function (entry) {
        return hasRef(entry) ? "https://kick.com/" + enc(entry.ref) : null;
      },
      poster: function () { return null; }
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: "♪",
      accent: "#25f4ee",
      kinds: ["short", "video"],
      origins: ["https://www.tiktok.com"],
      refHint: "numeric video ID from tiktok.com/@user/video/<id>",
      allow: "autoplay; encrypted-media; fullscreen",
      aspect: "9 / 16",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        return "https://www.tiktok.com/embed/v2/" + enc(entry.ref);
      },
      watch: function (entry) {
        if (!hasRef(entry)) return null;
        var handle = entry.handle ? enc(entry.handle.replace(/^@/, "")) : "placeholder";
        return "https://www.tiktok.com/@" + handle + "/video/" + enc(entry.ref);
      },
      poster: function () { return null; }
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: "f",
      accent: "#0866ff",
      kinds: ["video", "live"],
      // Facebook regionally redirects the video plugin to web.facebook.com.
      origins: ["https://www.facebook.com", "https://web.facebook.com"],
      refHint: "the full public permalink URL of the video post",
      allow: "autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen",
      aspect: "16 / 9",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        return "https://www.facebook.com/plugins/video.php?href=" + enc(entry.ref) +
          "&show_text=false&autoplay=true";
      },
      watch: function (entry) {
        return hasRef(entry) ? entry.ref : null;
      },
      poster: function () { return null; }
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: "◎",
      accent: "#e1306c",
      kinds: ["short", "post"],
      origins: ["https://www.instagram.com"],
      refHint: "the shortcode from instagram.com/reel/<code> or /p/<code>",
      allow: "autoplay; clipboard-write; encrypted-media; picture-in-picture",
      aspect: "9 / 16",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        var path = entry.kind === "post" ? "p" : "reel";
        return "https://www.instagram.com/" + path + "/" + enc(entry.ref) + "/embed/";
      },
      watch: function (entry) {
        if (!hasRef(entry)) return null;
        var path = entry.kind === "post" ? "p" : "reel";
        return "https://www.instagram.com/" + path + "/" + enc(entry.ref) + "/";
      },
      poster: function () { return null; }
    },
    {
      id: "x",
      name: "X",
      icon: "✕",
      accent: "#e7e9ea",
      kinds: ["post", "video"],
      origins: ["https://platform.twitter.com", "https://platform.x.com"],
      refHint: "numeric status ID from x.com/<user>/status/<id>",
      allow: "autoplay; encrypted-media",
      aspect: "4 / 5",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        return "https://platform.twitter.com/embed/Tweet.html?id=" + enc(entry.ref) + "&theme=dark";
      },
      watch: function (entry) {
        if (!hasRef(entry)) return null;
        var handle = entry.handle ? enc(entry.handle.replace(/^@/, "")) : "i";
        return "https://x.com/" + handle + "/status/" + enc(entry.ref);
      },
      poster: function () { return null; }
    },
    {
      id: "trovo",
      name: "Trovo",
      icon: "▰",
      accent: "#19d66b",
      kinds: ["live"],
      origins: ["https://player.trovo.live"],
      refHint: "streamer name as it appears in trovo.live/s/<name>",
      allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      aspect: "16 / 9",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        return "https://player.trovo.live/?streamerName=" + enc(entry.ref);
      },
      watch: function (entry) {
        return hasRef(entry) ? "https://trovo.live/s/" + enc(entry.ref) : null;
      },
      poster: function () { return null; }
    },
    {
      id: "vimeo",
      name: "Vimeo",
      icon: "▽",
      accent: "#19b7ea",
      kinds: ["video"],
      origins: ["https://player.vimeo.com"],
      refHint: "numeric video ID from vimeo.com/<id>",
      allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      aspect: "16 / 9",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        return "https://player.vimeo.com/video/" + enc(entry.ref) + "?autoplay=1&dnt=1";
      },
      watch: function (entry) {
        return hasRef(entry) ? "https://vimeo.com/" + enc(entry.ref) : null;
      },
      poster: function () { return null; }
    },
    {
      id: "spotify",
      name: "Spotify",
      icon: "≋",
      accent: "#1db954",
      kinds: ["podcast"],
      origins: ["https://open.spotify.com"],
      refHint: "episode ID from open.spotify.com/episode/<id>",
      allow: "autoplay; clipboard-write; encrypted-media; picture-in-picture",
      aspect: "16 / 9",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        return "https://open.spotify.com/embed/episode/" + enc(entry.ref) + "?theme=0";
      },
      watch: function (entry) {
        return hasRef(entry) ? "https://open.spotify.com/episode/" + enc(entry.ref) : null;
      },
      poster: function () { return null; }
    },
    {
      id: "discord",
      name: "Discord",
      icon: "✺",
      accent: "#5865f2",
      kinds: ["community"],
      origins: ["https://discord.com"],
      refHint: "server ID, with the server widget enabled in its settings",
      allow: "",
      aspect: "3 / 4",
      embed: function (entry) {
        if (!hasRef(entry)) return null;
        return "https://discord.com/widget?id=" + enc(entry.ref) + "&theme=dark";
      },
      watch: function (entry) {
        return entry.invite || null;
      },
      poster: function () { return null; }
    }
  ];

  var byId = {};
  PLATFORMS.forEach(function (platform) { byId[platform.id] = platform; });

  window.DMZHQ_PLATFORMS = {
    all: PLATFORMS,
    get: function (id) { return byId[id] || null; },
    hasRef: hasRef,
    // Every origin any player can load from — the exact frame-src list the
    // CSP in index.html has to carry. Logged at startup so the two can
    // never silently drift apart.
    frameOrigins: function () {
      var seen = {};
      PLATFORMS.forEach(function (platform) {
        platform.origins.forEach(function (origin) { seen[origin] = true; });
      });
      return Object.keys(seen).sort();
    }
  };
})();
