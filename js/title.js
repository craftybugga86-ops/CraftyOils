const SOUND_KEY = "craftyoils.soundEnabled.v2";

const modals = {
  collectionBtn: document.getElementById("collectionModal"),
  howToPlayBtn: document.getElementById("howToPlayModal"),
  settingsBtn: document.getElementById("settingsModal"),
  creditsBtn: document.getElementById("creditsModal"),
};

Object.entries(modals).forEach(([btnId, modal]) => {
  document.getElementById(btnId).addEventListener("click", () => {
    modal.hidden = false;
    if (btnId === "collectionBtn") renderCollection();
  });
});

const collectionPlayersEl = document.getElementById("collectionPlayers");

// Shows every player's lifetime totals and biggest riser side by side,
// rather than requiring a dropdown to flip between them one at a time.
function renderCollection() {
  const db = Database.load();
  collectionPlayersEl.innerHTML = "";

  Database.PLAYERS.forEach(id => {
    const record = db[id];
    const agg = Database.aggregate(record);
    const best = Database.bestTurn(record);

    const rows = Object.entries(Database.TYPE_INFO).map(([type, info]) => {
      const entry = agg[type];
      return `<li>` +
        `<span class="collection-icon">${info.icon}</span>` +
        `<span class="collection-label">${info.label}</span>` +
        `<span class="collection-count">×${entry.count}</span>` +
        `<span class="collection-value">${entry.total}</span>` +
        `</li>`;
    }).join("");

    const riserLine = best.total > 0
      ? `🛢️ Biggest Riser: ${best.total} (Turn ${best.turnNumber})`
      : `🛢️ Biggest Riser: 0`;

    const card = document.createElement("div");
    card.className = "player-collection";
    card.innerHTML =
      `<div class="player-collection-header">` +
        `<span>${Database.PLAYER_LABELS[id]}</span>` +
        `<span class="player-collection-total">${Database.grandTotal(record)}</span>` +
      `</div>` +
      `<ul class="collection-list">${rows}</ul>` +
      `<div class="player-collection-riser">${riserLine}</div>`;
    collectionPlayersEl.appendChild(card);
  });
}

document.querySelectorAll(".overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.hasAttribute("data-close")) {
      overlay.hidden = true;
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".overlay:not([hidden])").forEach(overlay => {
    overlay.hidden = true;
  });
});

const soundToggle = document.getElementById("soundToggle");

function setSoundEnabled(enabled) {
  soundToggle.classList.toggle("on", enabled);
  soundToggle.setAttribute("aria-pressed", String(enabled));
  localStorage.setItem(SOUND_KEY, String(enabled));
}

setSoundEnabled(localStorage.getItem(SOUND_KEY) !== "false");

soundToggle.addEventListener("click", () => {
  setSoundEnabled(!soundToggle.classList.contains("on"));
});
