// Small pieces shared by Crafty Crafting and Crafty Housing, which are the
// same shape as each other: pick a player, read a wallet, spend it on cards.
const Workshop = (() => {
  // Neither page is turn-based, so unlike the Dig Grid nobody is handed
  // control automatically — whoever's spending just picks themselves here.
  function renderPlayerPicker(el, selectedId, onSelect) {
    el.innerHTML = "";
    Database.PLAYERS.forEach(id => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "player-btn" + (id === selectedId ? " active" : "");
      btn.textContent = Database.PLAYER_LABELS[id];
      btn.addEventListener("click", () => onSelect(id));
      el.appendChild(btn);
    });
  }

  // A "you hold this much" pill, dimmed once the balance runs dry.
  function renderWallet(el, entries) {
    el.innerHTML = entries.map(({ icon, label, count }) =>
      `<span class="wallet-chip${count > 0 ? "" : " empty"}">` +
        `<span>${icon}</span>` +
        `<span>${label}</span>` +
        `<span class="wallet-count">${count}</span>` +
      `</span>`
    ).join("");
  }

  // One line of a recipe's price, marked short when the wallet can't cover it.
  function costLine({ icon, label, needed, have }) {
    return `<li class="cost-line${have >= needed ? "" : " short"}">` +
      `<span class="ledger-icon">${icon}</span>` +
      `<span class="cost-label">${label} ×${needed}</span>` +
      `<span class="cost-have">${have}/${needed}</span>` +
    `</li>`;
  }

  // Briefly pulses a card so a successful craft/build is visible even when
  // the only thing that changed is a number further down the page.
  function flash(el) {
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }

  return { renderPlayerPicker, renderWallet, costLine, flash };
})();
