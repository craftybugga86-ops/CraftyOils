const playerPicker = document.getElementById("playerPicker");
const resourceWallet = document.getElementById("resourceWallet");
const recipeGrid = document.getElementById("recipeGrid");
const craftedLedger = document.getElementById("craftedLedger");
const craftedEmpty = document.getElementById("craftedEmpty");

let selectedPlayer = Database.PLAYERS[0];

function record() {
  return Database.load()[selectedPlayer];
}

function renderWallet() {
  const available = Database.availableResources(record());
  Workshop.renderWallet(resourceWallet, Object.entries(Database.TYPE_INFO).map(([type, info]) => ({
    icon: info.icon,
    label: info.label,
    count: available[type],
  })));
}

function renderRecipes() {
  const current = record();
  const available = Database.availableResources(current);
  recipeGrid.innerHTML = "";

  Object.entries(Database.RECIPES).forEach(([itemId, recipe], index) => {
    const affordable = Database.canCraft(current, itemId);

    const costs = Object.entries(recipe.cost).map(([type, needed]) =>
      Workshop.costLine({
        icon: Database.TYPE_INFO[type].icon,
        label: Database.TYPE_INFO[type].label,
        needed,
        have: available[type],
      })
    ).join("");

    const card = document.createElement("div");
    card.className = "make-card" + (affordable ? " affordable" : "");
    card.innerHTML =
      `<div class="card-head">` +
        `<span class="card-icon">${recipe.icon}</span>` +
        `<span class="card-title">${recipe.label}</span>` +
        `<span class="card-owned">×${current.crafted[itemId]}</span>` +
      `</div>` +
      `<ul class="cost-list">${costs}</ul>` +
      `<button class="make-btn" type="button" ${affordable ? "" : "disabled"}>Craft</button>`;

    card.querySelector(".make-btn").addEventListener("click", () => {
      if (!Database.craftItem(selectedPlayer, itemId).crafted) return;
      refresh();
      // refresh() rebuilt the grid, so pulse whatever card now sits in this
      // recipe's slot rather than the detached node we just clicked.
      const rebuilt = recipeGrid.children[index];
      if (rebuilt) Workshop.flash(rebuilt);
    });

    recipeGrid.appendChild(card);
  });
}

// Everything made so far, noting how much of it housing hasn't claimed yet.
function renderCraftedLedger() {
  const current = record();
  const unbuilt = Database.availableItems(current);
  const made = Object.entries(Database.RECIPES).filter(([itemId]) => current.crafted[itemId] > 0);

  craftedLedger.innerHTML = made.map(([itemId, recipe]) =>
    `<li>` +
      `<span class="ledger-icon">${recipe.icon}</span>` +
      `<span class="ledger-label">${recipe.label}` +
        `<span class="card-meta">${unbuilt[itemId]} still unbuilt</span>` +
      `</span>` +
      `<span class="ledger-count">×${current.crafted[itemId]}</span>` +
    `</li>`
  ).join("");
  craftedEmpty.hidden = made.length > 0;
}

function refresh() {
  renderWallet();
  renderRecipes();
  renderCraftedLedger();
}

function selectPlayer(id) {
  selectedPlayer = id;
  Workshop.renderPlayerPicker(playerPicker, selectedPlayer, selectPlayer);
  refresh();
}

Workshop.renderPlayerPicker(playerPicker, selectedPlayer, selectPlayer);
refresh();
