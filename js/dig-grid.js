const ICONS = {
  dirt: "🟫",
  rock: "🪨",
  oilwell: "🛢️"
};
const TYPES = Object.keys(ICONS);
const GRID_SIZE = 9;
const MAX_DIGS_PER_TURN = Database.MAX_DIGS_PER_TURN;

const grid = document.getElementById("grid");
const totalEl = document.getElementById("total");
const countEl = document.getElementById("count");
const resetBtn = document.getElementById("resetBtn");
const showAllBtn = document.getElementById("showAllBtn");
const playerSelect = document.getElementById("playerSelect");
const turnInfoEl = document.getElementById("turnInfo");
const nextTurnBtn = document.getElementById("nextTurnBtn");
const collectionList = document.getElementById("collectionList");
const collectionTotalEl = document.getElementById("collectionTotal");
const resetCollectionBtn = document.getElementById("resetCollectionBtn");
const turnHistoryList = document.getElementById("turnHistoryList");
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

function playerRecord() {
  return Database.load()[currentPlayer()];
}

// Refreshes the turn indicator and locks digging once the turn's cap is hit.
// Returns the current dig count so callers can act on it without re-reading.
function updateTurnInfo() {
  const record = playerRecord();
  const turn = Database.currentTurn(record);
  const used = Database.turnDigCount(turn);
  const limitReached = used >= MAX_DIGS_PER_TURN;
  turnInfoEl.textContent = limitReached
    ? `Turn ${turn.turnNumber} — limit reached (${used}/${MAX_DIGS_PER_TURN}). Start Next Turn to keep digging.`
    : `Turn ${turn.turnNumber} — ${used}/${MAX_DIGS_PER_TURN} picks used`;
  grid.classList.toggle("limit-reached", limitReached);
  showAllBtn.disabled = limitReached;
  return used;
}

function renderCollection() {
  const record = playerRecord();
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

function renderTurnHistory() {
  const record = playerRecord();
  turnHistoryList.innerHTML = "";
  record.turns.forEach(turn => {
    const used = Database.turnDigCount(turn);
    const row = document.createElement("li");
    row.innerHTML =
      `<span class="turn-number">Turn ${turn.turnNumber}</span>` +
      `<span class="turn-digs">${used}/${MAX_DIGS_PER_TURN} picks</span>` +
      `<span class="turn-total">${Database.turnTotal(turn)}</span>`;
    turnHistoryList.appendChild(row);
  });
}

function refreshAll() {
  updateTurnInfo();
  renderCollection();
  renderTurnHistory();
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
      if (Database.turnDigCount(Database.currentTurn(playerRecord())) >= MAX_DIGS_PER_TURN) return;

      cell.classList.add("revealed", "pop");
      cell.textContent = reward;
      total += reward;
      revealedCount++;
      totalEl.textContent = total;
      countEl.textContent = revealedCount;

      Database.addDig(currentPlayer(), type, reward);
      refreshAll();
    });

    grid.appendChild(cell);
  }
}

resetBtn.addEventListener("click", buildGrid);

showAllBtn.addEventListener("click", () => {
  let used = Database.turnDigCount(Database.currentTurn(playerRecord()));
  const unrevealed = Array.from(document.querySelectorAll(".cell:not(.revealed)"));
  for (const cell of unrevealed) {
    if (used >= MAX_DIGS_PER_TURN) break;
    const type = cell.dataset.type;
    const reward = Number(cell.dataset.reward);
    cell.classList.add("revealed", "pop");
    cell.textContent = reward;
    total += reward;
    revealedCount++;
    Database.addDig(currentPlayer(), type, reward);
    used++;
  }
  totalEl.textContent = total;
  countEl.textContent = revealedCount;
  refreshAll();
});

nextTurnBtn.addEventListener("click", () => {
  Database.startNewTurn(currentPlayer());
  buildGrid();
  refreshAll();
});

playerSelect.addEventListener("change", () => {
  Database.setCurrentPlayer(currentPlayer());
  refreshAll();
});

resetCollectionBtn.addEventListener("click", () => {
  if (!confirm(`Clear ${Database.PLAYER_LABELS[currentPlayer()]}'s entire history? This can't be undone.`)) return;
  Database.resetPlayer(currentPlayer());
  refreshAll();
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
    () => refreshAll(),
    () => alert("Couldn't read that file — make sure it's a Crafty Oils database export.")
  );
  importInput.value = "";
});

playerSelect.value = Database.getCurrentPlayer();
buildGrid();
refreshAll();
