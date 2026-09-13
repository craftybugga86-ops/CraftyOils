// DMZHQ — the wall.
//
// Bandwidth model, which is the whole point of the build:
//   * This site serves HTML, CSS, JS and the data file. Nothing else.
//   * No video, audio, thumbnail or player script is ever proxied through
//     this origin. Every card is a "facade" — a cheap, locally-drawn poster
//     that costs zero network requests. The real <iframe> is not created
//     until the viewer clicks Play, and then the platform streams it
//     straight to their browser, billed to the platform's CDN.
//   * Exactly one iframe is alive at a time. Playing a second card destroys
//     the first, so a long browse never accumulates a wall of live players
//     each pulling its own stream.
//   * Poster art from platform CDNs is opt-in and off by default, because
//     even a thumbnail is a third-party request the viewer didn't ask for.
//
// All DOM text goes through textContent and all URLs are built by the
// platform registry, so a hand-edited data file can never inject markup.
(function () {
  "use strict";

  var PLATFORMS = window.DMZHQ_PLATFORMS;
  var DATA = window.DMZHQ_DATA;

  var STORE_POSTERS = "dmzhq.posters";
  var PLACEHOLDER_HINT = "Not configured yet";

  var state = {
    platform: "all",
    kind: "all",
    search: "",
    posters: false,
    activeEntryId: null,
    framesOpened: 0
  };

  var els = {};

  function $(id) {
    var node = document.getElementById(id);
    if (!node) throw new Error("DMZHQ: missing element #" + id);
    return node;
  }

  function readStoredPosters() {
    try {
      return window.localStorage.getItem(STORE_POSTERS) === "on";
    } catch (err) {
      // Private mode or blocked storage — fall back to the safer default.
      return false;
    }
  }

  function writeStoredPosters(on) {
    try {
      window.localStorage.setItem(STORE_POSTERS, on ? "on" : "off");
    } catch (err) {
      /* non-fatal: the toggle still works for this session */
    }
  }

  // ---------------------------------------------------------------- data

  // "9 / 16" -> true. Anything taller than it is wide gets the portrait
  // player treatment.
  function isPortrait(aspect) {
    var parts = String(aspect).split("/");
    if (parts.length !== 2) return false;
    return Number(parts[0]) < Number(parts[1]);
  }

  function channelName(entry) {
    var match = (DATA.channels || []).filter(function (channel) {
      return channel.id === entry.channel;
    })[0];
    return match ? match.name : (entry.channel || "");
  }

  function entriesForDisplay() {
    var needle = state.search.trim().toLowerCase();

    return (DATA.entries || []).filter(function (entry) {
      if (!PLATFORMS.get(entry.platform)) return false;
      if (state.platform !== "all" && entry.platform !== state.platform) return false;
      if (state.kind !== "all" && entry.kind !== state.kind) return false;
      if (!needle) return true;

      var haystack = [
        entry.title,
        channelName(entry),
        entry.blurb,
        entry.kind,
        (entry.tags || []).join(" ")
      ].join(" ").toLowerCase();
      return haystack.indexOf(needle) !== -1;
    }).sort(function (a, b) {
      return String(b.published || "").localeCompare(String(a.published || ""));
    });
  }

  function kindList() {
    var seen = {};
    (DATA.entries || []).forEach(function (entry) {
      if (entry.kind) seen[entry.kind] = true;
    });
    return Object.keys(seen).sort();
  }

  // ------------------------------------------------------------ building

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildFilters() {
    els.platformChips.textContent = "";

    var counts = { all: (DATA.entries || []).length };
    (DATA.entries || []).forEach(function (entry) {
      counts[entry.platform] = (counts[entry.platform] || 0) + 1;
    });

    var options = [{ id: "all", name: "All platforms", icon: "▦", accent: "#8ab4ff" }]
      .concat(PLATFORMS.all);

    options.forEach(function (platform) {
      var count = counts[platform.id] || 0;
      var chip = el("button", "chip");
      chip.type = "button";
      chip.style.setProperty("--accent", platform.accent);
      chip.appendChild(el("span", "chip-icon", platform.icon));
      chip.appendChild(el("span", "chip-name", platform.name));
      chip.appendChild(el("span", "chip-count", String(count)));

      if (count === 0 && platform.id !== "all") chip.classList.add("is-empty");
      if (state.platform === platform.id) chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", state.platform === platform.id ? "true" : "false");

      chip.addEventListener("click", function () {
        state.platform = platform.id;
        stopPlayer();
        render();
      });
      els.platformChips.appendChild(chip);
    });

    els.kindChips.textContent = "";
    ["all"].concat(kindList()).forEach(function (kind) {
      var chip = el("button", "kind-chip");
      chip.type = "button";
      chip.textContent = kind === "all" ? "Everything" : kind;
      if (state.kind === kind) chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", state.kind === kind ? "true" : "false");
      chip.addEventListener("click", function () {
        state.kind = kind;
        stopPlayer();
        render();
      });
      els.kindChips.appendChild(chip);
    });
  }

  // A poster with no network cost: a deterministic two-tone wash derived
  // from the entry's own id, tinted with the platform colour. Same entry
  // always gets the same art, so the wall looks stable between visits.
  function paintFacade(node, entry, platform) {
    var hash = 0;
    var key = String(entry.id || entry.title || "");
    for (var i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) % 360;
    }
    node.style.setProperty("--tilt", hash + "deg");
    node.style.setProperty("--accent", platform.accent);
  }

  function buildCard(entry) {
    var platform = PLATFORMS.get(entry.platform);
    var configured = PLATFORMS.hasRef(entry);

    var card = el("article", "card");
    card.style.setProperty("--accent", platform.accent);
    if (entry.kind === "short" || platform.aspect === "9 / 16") card.classList.add("is-vertical");
    if (!configured) card.classList.add("is-unconfigured");

    // Facades stay a uniform 16:9 whatever the platform's native shape —
    // a row of 9:16 tiles otherwise stretches every neighbouring row to
    // match. The player switches to the real aspect on play.
    var stage = el("div", "stage");

    var facade = el("div", "facade");
    paintFacade(facade, entry, platform);

    if (state.posters && configured) {
      // An explicit poster on the entry wins over the platform's guess.
      var posterUrl = entry.poster || platform.poster(entry);
      if (posterUrl) {
        var img = el("img", "poster");
        img.src = posterUrl;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        // A dead thumbnail must not leave a broken-image box on the wall.
        img.addEventListener("error", function () { img.remove(); });
        facade.appendChild(img);
      }
    }

    var badge = el("span", "badge");
    badge.appendChild(el("span", "badge-icon", platform.icon));
    badge.appendChild(el("span", null, platform.name));
    facade.appendChild(badge);

    facade.appendChild(el("span", "kind-tag", entry.kind || "video"));

    if (configured) {
      var play = el("button", "play");
      play.type = "button";
      play.setAttribute("aria-label", "Play " + (entry.title || "") + " on " + platform.name);
      play.appendChild(el("span", "play-glyph", "▶"));
      play.appendChild(el("span", "play-note", "Loads from " + platform.name));
      play.addEventListener("click", function () { playEntry(entry, stage, card); });
      facade.appendChild(play);
    } else {
      var notice = el("div", "unconfigured");
      notice.appendChild(el("strong", null, PLACEHOLDER_HINT));
      notice.appendChild(el("span", null, "Needs the " + platform.refHint + " in data/channels.js"));
      facade.appendChild(notice);
    }

    stage.appendChild(facade);
    card.appendChild(stage);

    var body = el("div", "card-body");
    body.appendChild(el("h3", "card-title", entry.title || "Untitled"));

    var meta = el("p", "card-meta");
    meta.appendChild(el("span", "card-channel", channelName(entry) || platform.name));
    if (entry.published) {
      meta.appendChild(el("span", "dot", "·"));
      meta.appendChild(el("span", null, entry.published));
    }
    body.appendChild(meta);

    if (entry.blurb) body.appendChild(el("p", "card-blurb", entry.blurb));

    if ((entry.tags || []).length) {
      var tags = el("div", "tags");
      entry.tags.forEach(function (tag) { tags.appendChild(el("span", "tag", tag)); });
      body.appendChild(tags);
    }

    var watchUrl = configured ? platform.watch(entry) : null;
    if (watchUrl) {
      var link = el("a", "out-link", "Open on " + platform.name + " ↗");
      link.href = watchUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      body.appendChild(link);
    }

    card.appendChild(body);
    return card;
  }

  // ------------------------------------------------------------- player

  function stopPlayer() {
    var live = document.querySelector(".stage.is-playing");
    if (!live) return;
    // Removing the iframe node is what actually tears the connection down;
    // hiding it would leave the stream running and still downloading.
    var frame = live.querySelector("iframe");
    if (frame) frame.remove();
    var bar = live.querySelector(".now-playing");
    if (bar) bar.remove();
    live.classList.remove("is-playing", "is-portrait-play");
    live.style.removeProperty("--aspect");
    var facade = live.querySelector(".facade");
    if (facade) facade.hidden = false;
    var card = live.closest(".card");
    if (card) card.classList.remove("is-live");
    state.activeEntryId = null;
    updateLedger();
  }

  function playEntry(entry, stage, card) {
    var platform = PLATFORMS.get(entry.platform);
    var src = platform.embed(entry);
    if (!src) return;

    stopPlayer();

    var frame = document.createElement("iframe");
    frame.src = src;
    frame.title = (entry.title || "Embedded player") + " — " + platform.name;
    frame.loading = "lazy";
    frame.allowFullscreen = true;
    if (platform.allow) frame.setAttribute("allow", platform.allow);
    // Send the origin (Twitch and friends validate it) but never the full
    // path of the page the viewer is on.
    frame.referrerPolicy = "strict-origin-when-cross-origin";

    var facade = stage.querySelector(".facade");
    if (facade) facade.hidden = true;

    if (isPortrait(platform.aspect)) {
      // Portrait players get a fixed-height band with the frame centred in
      // it, rather than a card twice the height of the whole wall.
      stage.classList.add("is-portrait-play");
      stage.style.setProperty("--aspect", platform.aspect);
    } else {
      stage.style.setProperty("--aspect", platform.aspect);
    }

    var bar = el("div", "now-playing");
    bar.appendChild(el("span", "np-dot", "●"));
    bar.appendChild(el("span", "np-text", "Streaming from " + platform.name));
    var stop = el("button", "np-stop", "Stop");
    stop.type = "button";
    stop.addEventListener("click", stopPlayer);
    bar.appendChild(stop);

    stage.appendChild(frame);
    stage.appendChild(bar);
    stage.classList.add("is-playing");
    card.classList.add("is-live");

    state.activeEntryId = entry.id;
    state.framesOpened += 1;
    updateLedger();
  }

  // ------------------------------------------------------------- ledger

  // Honest accounting. Same-origin resources report their real transferred
  // size, so the host figure is exact. Cross-origin players deliberately do
  // not expose theirs (no Timing-Allow-Origin header), so we count frames
  // rather than invent a byte total we cannot measure.
  function hostBytes() {
    if (!window.performance || !window.performance.getEntriesByType) return null;
    var total = 0;
    var measured = false;
    window.performance.getEntriesByType("resource").forEach(function (resource) {
      if (resource.name.indexOf(window.location.origin) !== 0) return;
      if (typeof resource.transferSize === "number") {
        total += resource.transferSize;
        measured = true;
      }
    });
    var nav = window.performance.getEntriesByType("navigation")[0];
    if (nav && typeof nav.transferSize === "number") {
      total += nav.transferSize;
      measured = true;
    }
    return measured ? total : null;
  }

  function updateLedger() {
    var bytes = hostBytes();
    if (bytes === null || bytes === 0) {
      // Opened from disk, or the browser withholds timing — say so rather
      // than printing a confident zero.
      els.ledgerHost.textContent = "—";
      els.ledgerHostNote.textContent = "not measurable when opened from disk";
    } else {
      els.ledgerHost.textContent = (bytes / 1024).toFixed(1) + " KB";
      els.ledgerHostNote.textContent = "HTML, CSS, JS and the data file";
    }

    els.ledgerFrames.textContent = String(state.framesOpened);
    els.ledgerLive.textContent = state.activeEntryId ? "1" : "0";
  }

  // -------------------------------------------------------------- render

  function renderChannels() {
    els.channelRail.textContent = "";
    (DATA.channels || []).forEach(function (channel) {
      var platform = PLATFORMS.get(channel.platform);
      if (!platform) return;

      var row = el("div", "channel");
      row.style.setProperty("--accent", platform.accent);
      row.appendChild(el("span", "channel-icon", platform.icon));

      var text = el("div", "channel-text");
      text.appendChild(el("span", "channel-name", channel.name));
      text.appendChild(el("span", "channel-blurb", channel.blurb || platform.name));
      row.appendChild(text);

      if (channel.url) {
        var link = el("a", "channel-link", "Visit ↗");
        link.href = channel.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        row.appendChild(link);
      } else {
        row.appendChild(el("span", "channel-link is-muted", "no link set"));
      }

      els.channelRail.appendChild(row);
    });
  }

  function render() {
    buildFilters();

    var list = entriesForDisplay();
    els.grid.textContent = "";

    if (!list.length) {
      var empty = el("p", "empty", "Nothing matches that filter.");
      els.grid.appendChild(empty);
    } else {
      list.forEach(function (entry) { els.grid.appendChild(buildCard(entry)); });
    }

    var total = (DATA.entries || []).length;
    els.resultCount.textContent = list.length === total
      ? total + " in the wall"
      : list.length + " of " + total;

    updateLedger();
  }

  // ---------------------------------------------------------------- init

  function init() {
    if (!PLATFORMS) throw new Error("DMZHQ: platforms.js did not load");
    if (!DATA) throw new Error("DMZHQ: data/channels.js did not load");

    els.grid = $("grid");
    els.platformChips = $("platformChips");
    els.kindChips = $("kindChips");
    els.search = $("search");
    els.resultCount = $("resultCount");
    els.channelRail = $("channelRail");
    els.posterToggle = $("posterToggle");
    els.ledgerHost = $("ledgerHost");
    els.ledgerHostNote = $("ledgerHostNote");
    els.ledgerFrames = $("ledgerFrames");
    els.ledgerLive = $("ledgerLive");

    if (DATA.meta && DATA.meta.tagline) {
      $("tagline").textContent = DATA.meta.tagline;
    }

    state.posters = readStoredPosters();
    els.posterToggle.setAttribute("aria-pressed", state.posters ? "true" : "false");
    els.posterToggle.classList.toggle("is-on", state.posters);

    els.posterToggle.addEventListener("click", function () {
      state.posters = !state.posters;
      writeStoredPosters(state.posters);
      els.posterToggle.setAttribute("aria-pressed", state.posters ? "true" : "false");
      els.posterToggle.classList.toggle("is-on", state.posters);
      stopPlayer();
      render();
    });

    els.search.addEventListener("input", function () {
      state.search = els.search.value;
      render();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") stopPlayer();
    });

    renderChannels();
    render();

    // Guard against the CSP frame-src list in index.html drifting away from
    // the registry — a missing origin silently blanks that platform's
    // player, which is miserable to debug from the symptom alone.
    var declared = (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || "";
    var missing = PLATFORMS.frameOrigins().filter(function (origin) {
      return declared.indexOf(origin) === -1;
    });
    if (missing.length && declared) {
      console.warn("DMZHQ: these player origins are missing from the page CSP frame-src:", missing);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
