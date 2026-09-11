const SOUND_KEY = "craftyoils.soundEnabled";

const modals = {
  howToPlayBtn: document.getElementById("howToPlayModal"),
  settingsBtn: document.getElementById("settingsModal"),
  creditsBtn: document.getElementById("creditsModal"),
};

Object.entries(modals).forEach(([btnId, modal]) => {
  document.getElementById(btnId).addEventListener("click", () => {
    modal.hidden = false;
  });
});

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
