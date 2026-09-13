const playerPicker = document.getElementById("playerPicker");
const itemWallet = document.getElementById("itemWallet");
const buildingGrid = document.getElementById("buildingGrid");
const builtLedger = document.getElementById("builtLedger");
const builtEmpty = document.getElementById("builtEmpty");
const prestigeValue = document.getElementById("prestigeValue");

let selectedPlayer = Database.PLAYERS[0];

function record() {
  return Database.load()[selectedPlayer];
}

function renderWallet() {
  const available = Database.availableItems(record());
  Workshop.renderWallet(itemWallet, Object.entries(Database.RECIPES).map(([itemId, recipe]) => ({
    icon: recipe.icon,
    label: recipe.label,
    count: available[itemId],
  })));
}

function renderBuildings() {
  const current = record();
  const available = Database.availableItems(current);
  buildingGrid.innerHTML = "";

  Object.entries(Database.BUILDINGS).forEach(([buildingId, building], index) => {
    const affordable = Database.canBuild(current, buildingId);

    const costs = Object.entries(building.cost).map(([itemId, needed]) =>
      Workshop.costLine({
        icon: Database.RECIPES[itemId].icon,
        label: Database.RECIPES[itemId].label,
        needed,
        have: available[itemId],
      })
    ).join("");

    const card = document.createElement("div");
    card.className = "make-card" + (affordable ? " affordable" : "");
    card.innerHTML =
      `<div class="card-head">` +
        `<span class="card-icon">${building.icon}</span>` +
        `<span class="card-title">${building.label}` +
          `<span class="card-meta">${building.prestige} prestige each</span>` +
        `</span>` +
        `<span class="card-owned">×${current.built[buildingId]}</span>` +
      `</div>` +
      `<ul class="cost-list">${costs}</ul>` +
      `<button class="make-btn" type="button" ${affordable ? "" : "disabled"}>Build</button>`;

    card.querySelector(".make-btn").addEventListener("click", () => {
      if (!Database.buildStructure(selectedPlayer, buildingId).built) return;
      refresh();
      // refresh() rebuilt the grid, so pulse whatever card now sits in this
      // building's slot rather than the detached node we just clicked.
      const rebuilt = buildingGrid.children[index];
      if (rebuilt) Workshop.flash(rebuilt);
    });

    buildingGrid.appendChild(card);
  });
}

function renderEstate() {
  const current = record();
  const standing = Object.entries(Database.BUILDINGS)
    .filter(([buildingId]) => current.built[buildingId] > 0);

  builtLedger.innerHTML = standing.map(([buildingId, building]) =>
    `<li>` +
      `<span class="ledger-icon">${building.icon}</span>` +
      `<span class="ledger-label">${building.label}` +
        `<span class="card-meta">${building.prestige * current.built[buildingId]} prestige</span>` +
      `</span>` +
      `<span class="ledger-count">×${current.built[buildingId]}</span>` +
    `</li>`
  ).join("");

  builtEmpty.hidden = standing.length > 0;
  prestigeValue.textContent = Database.prestige(current);
}

function refresh() {
  renderWallet();
  renderBuildings();
  renderEstate();
}

function selectPlayer(id) {
  selectedPlayer = id;
  Workshop.renderPlayerPicker(playerPicker, selectedPlayer, selectPlayer);
  refresh();
}

Workshop.renderPlayerPicker(playerPicker, selectedPlayer, selectPlayer);
refresh();
