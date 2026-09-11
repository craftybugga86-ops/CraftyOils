const SOUND_KEY = "craftyoils.soundEnabled";

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

const collectionPlayerSelect = document.getElementById("playerSelect");
collectionPlayerSelect.value = Database.getCurrentPlayer();
collectionPlayerSelect.addEventListener("change", () => {
  Database.setCurrentPlayer(collectionPlayerSelect.value);
  renderCollection();
});

function renderCollection() {
  const collectionList = document.getElementById("collectionList");
  const collectionTotalEl = document.getElementById("collectionTotal");
  const record = Database.load()[collectionPlayerSelect.value];
  const agg = Database.aggregate(record);
  collectionList.innerHTML = "";
  Object.entries(Database.TYPE_INFO).forEach(([type, info]) => {
    const entry = agg[type];
    const row = document.createElement("li");
    row.innerHTML =
      `<span class="collection-icon">${info.icon}</span>` +
      `<span class="collection-label">${info.label}</span>` +
      `<span class="collection-count">×${entry.count}</span>` +
      `<span class="collection-value">${entry.total}</span>`;
    collectionList.appendChild(row);
  });
  collectionTotalEl.textContent = Database.grandTotal(record);
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
