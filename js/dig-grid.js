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
const resetTurnBtn = document.getElementById("resetTurnBtn");
const nextTurnBtn = document.getElementById("nextTurnBtn");
const collectionList = document.getElementById("collectionList");
const collectionTotalEl = document.getElementById("collectionTotal");
const resetCollectionBtn = document.getElementById("resetCollectionBtn");
const turnHistoryList = document.getElementById("turnHistoryList");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const resetGameBtn = document.getElementById("resetGameBtn");
const gusherBadge = document.getElementById("gusherBadge");
const gusherTotalEl = document.getElementById("gusherTotal");
const gusherTurnEl = document.getElementById("gusherTurn");

// Tracks each player's last-rendered biggest-gusher total, so we only
// celebrate the moment a turn actually beats their previous record.
const lastGusherByPlayer = {};

// Each player digs their own private board: a fresh, independently random
// layout nobody else can see or is influenced by. Keyed by player id, kept
// only in memory for this session (a reload starts everyone over).
const gridsByPlayer = {};

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

function createGridData() {
  const cells = [];
  const cellCount = GRID_SIZE * GRID_SIZE;
  for (let i = 0; i < cellCount; i++) {
    cells.push({
      type: TYPES[randInt(0, TYPES.length - 1)],
      reward: randInt(0, 89),
      revealed: false,
    });
  }
  return cells;
}

function getGridData(playerId) {
  if (!gridsByPlayer[playerId]) {
    gridsByPlayer[playerId] = createGridData();
  }
  return gridsByPlayer[playerId];
}

function currentPlayer() {
  return playerSelect.value;
}

function playerRecord() {
  return Database.load()[currentPlayer()];
}

// Refreshes the turn indicator and locks digging once the turn's cap is hit.
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

// The player's best single turn so far — their "biggest gusher" — with a
// brief celebration the moment a turn actually beats their old record.
function renderGusher() {
  const playerId = currentPlayer();
  const best = Database.bestTurn(playerRecord());

  gusherTotalEl.textContent = best.total;
  gusherTurnEl.textContent = best.turnNumber ? ` (Turn ${best.turnNumber})` : "";

  const previousBest = lastGusherByPlayer[playerId] ?? 0;
  gusherBadge.classList.remove("new-record");
  if (best.total > 0 && best.total > previousBest) {
    void gusherBadge.offsetWidth; // restart the animation if it's already mid-play
    gusherBadge.classList.add("new-record");
  }
  lastGusherByPlayer[playerId] = best.total;
}

function refreshAll() {
  updateTurnInfo();
  renderCollection();
  renderTurnHistory();
  renderGusher();
}

// Renders the current player's own board from its stored cell data,
// restoring whatever they'd already revealed rather than reshuffling it.
function renderGrid() {
  const playerId = currentPlayer();
  const cellsData = getGridData(playerId);

  grid.innerHTML = "";
  let total = 0;
  let revealedCount = 0;

  cellsData.forEach(cellData => {
    const cell = document.createElement("div");
    cell.className = "cell " + cellData.type;

    if (cellData.revealed) {
      cell.classList.add("revealed");
      cell.textContent = cellData.reward;
      total += cellData.reward;
      revealedCount++;
      if (cellData.justRevealed) {
        cell.classList.add("pop");
        cellData.justRevealed = false;
      }
    } else {
      cell.textContent = ICONS[cellData.type];
      cell.addEventListener("click", () => {
        if (Database.turnDigCount(Database.currentTurn(playerRecord())) >= MAX_DIGS_PER_TURN) return;
        cellData.revealed = true;
        cellData.justRevealed = true;
        Database.addDig(playerId, cellData.type, cellData.reward);
        renderGrid();
        refreshAll();
      });
    }

    grid.appendChild(cell);
  });

  totalEl.textContent = total;
  countEl.textContent = revealedCount;
}

resetBtn.addEventListener("click", () => {
  gridsByPlayer[currentPlayer()] = createGridData();
  renderGrid();
});

showAllBtn.addEventListener("click", () => {
  const playerId = currentPlayer();
  const cellsData = getGridData(playerId);
  let used = Database.turnDigCount(Database.currentTurn(playerRecord()));

  for (const cellData of cellsData) {
    if (used >= MAX_DIGS_PER_TURN) break;
    if (cellData.revealed) continue;
    cellData.revealed = true;
    cellData.justRevealed = true;
    Database.addDig(playerId, cellData.type, cellData.reward);
    used++;
  }

  renderGrid();
  refreshAll();
});

resetTurnBtn.addEventListener("click", () => {
  if (!confirm(`Redo Turn ${Database.currentTurn(playerRecord()).turnNumber} for ${Database.PLAYER_LABELS[currentPlayer()]} from scratch (0/${MAX_DIGS_PER_TURN} picks)?`)) return;
  Database.resetCurrentTurn(currentPlayer());
  gridsByPlayer[currentPlayer()] = createGridData();
  renderGrid();
  refreshAll();
});

nextTurnBtn.addEventListener("click", () => {
  Database.startNewTurn(currentPlayer());
  gridsByPlayer[currentPlayer()] = createGridData();
  renderGrid();
  refreshAll();
});

playerSelect.addEventListener("change", () => {
  Database.setCurrentPlayer(currentPlayer());
  renderGrid();
  refreshAll();
});

resetCollectionBtn.addEventListener("click", () => {
  if (!confirm(`Clear ${Database.PLAYER_LABELS[currentPlayer()]}'s entire history? This can't be undone.`)) return;
  Database.resetPlayer(currentPlayer());
  gridsByPlayer[currentPlayer()] = createGridData();
  renderGrid();
  refreshAll();
});

resetGameBtn.addEventListener("click", () => {
  if (!confirm("Reset the whole game? This wipes Player One, Two, and Three's entire history. This can't be undone.")) return;
  Database.resetAll();
  Object.keys(gridsByPlayer).forEach(id => delete gridsByPlayer[id]);
  renderGrid();
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
renderGrid();
refreshAll();
