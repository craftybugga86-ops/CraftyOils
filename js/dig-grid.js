const ICONS = {
  dirt: "🟫",
  rock: "🪨",
  oilwell: "🛢️"
};
const TYPES = Object.keys(ICONS);
const GRID_SIZE = 9;

const grid = document.getElementById("grid");
const totalEl = document.getElementById("total");
const countEl = document.getElementById("count");
const resetBtn = document.getElementById("resetBtn");
const showAllBtn = document.getElementById("showAllBtn");
const playerSelect = document.getElementById("playerSelect");
const collectionList = document.getElementById("collectionList");
const collectionTotalEl = document.getElementById("collectionTotal");
const resetCollectionBtn = document.getElementById("resetCollectionBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");

let total = 0;
let revealedCount = 0;

// Cryptographically strong random integer in [min, max], with
// rejection sampling to avoid modulo bias — gives a much more
// uniform/high-quality spread than Math.random().
function randInt(min, max) {
  const range = max - min + 1;
  const maxUint32 = 0xFFFFFFFF;
  const limit = maxUint32 - (maxUint32 % range);
  const buf = new Uint32Array(1);
  let x;
  do {
    window.crypto.getRandomValues(buf);
    x = buf[0];
  } while (x > limit);
  return min + (x % range);
}

function currentPlayer() {
  return playerSelect.value;
}

function renderCollection() {
  const db = Database.load();
  const record = db[currentPlayer()];
  collectionList.innerHTML = "";
  Object.entries(Database.TYPE_INFO).forEach(([type, info]) => {
    const entry = record[type];
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

function buildGrid() {
  grid.innerHTML = "";
  total = 0;
  revealedCount = 0;
  totalEl.textContent = total;
  countEl.textContent = revealedCount;

  const cellCount = GRID_SIZE * GRID_SIZE;
  for (let i = 0; i < cellCount; i++) {
    const type = TYPES[randInt(0, TYPES.length - 1)];
    const reward = randInt(0, 89);

    const cell = document.createElement("div");
    cell.className = "cell " + type;
    cell.textContent = ICONS[type];
    cell.dataset.reward = reward;
    cell.dataset.type = type;

    cell.addEventListener("click", () => {
      if (cell.classList.contains("revealed")) return;
      cell.classList.add("revealed", "pop");
      cell.textContent = reward;
      total += reward;
      revealedCount++;
      totalEl.textContent = total;
      countEl.textContent = revealedCount;

      Database.add(currentPlayer(), type, reward);
      renderCollection();
    });

    grid.appendChild(cell);
  }
}

resetBtn.addEventListener("click", buildGrid);

showAllBtn.addEventListener("click", () => {
  document.querySelectorAll(".cell:not(.revealed)").forEach(cell => {
    const type = cell.dataset.type;
    const reward = Number(cell.dataset.reward);
    cell.classList.add("revealed", "pop");
    cell.textContent = reward;
    total += reward;
    revealedCount++;
    Database.add(currentPlayer(), type, reward);
  });
  totalEl.textContent = total;
  countEl.textContent = revealedCount;
  renderCollection();
});

playerSelect.addEventListener("change", () => {
  Database.setCurrentPlayer(currentPlayer());
  renderCollection();
});

resetCollectionBtn.addEventListener("click", () => {
  if (!confirm(`Clear ${Database.PLAYER_LABELS[currentPlayer()]}'s entire resource collection? This can't be undone.`)) return;
  Database.resetPlayer(currentPlayer());
  renderCollection();
});

exportBtn.addEventListener("click", () => {
  Database.exportFile();
});

importBtn.addEventListener("click", () => {
  importInput.click();
});

importInput.addEventListener("change", () => {
  const file = importInput.files[0];
  if (!file) return;
  Database.importFile(
    file,
    () => renderCollection(),
    () => alert("Couldn't read that file — make sure it's a Crafty Oils database export.")
  );
  importInput.value = "";
});

playerSelect.value = Database.getCurrentPlayer();
buildGrid();
renderCollection();
