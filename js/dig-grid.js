const ICONS = {
  dirt: "🟫",
  rock: "🪨",
  oilwell: "🛢️"
};
const GRID_SIZE = 9;

// Reward multiplier per tile type: dirt is common and low-value, an oil
// well is rare and pays out big.
const MULTIPLIERS = { dirt: 1, rock: 3, oilwell: 10 };

// How often each type spawns, as parts of a whole — dirt : rock : oilwell
// = 5 : 3 : 1, so dirt turns up roughly 5x as often as an oil well.
const SPAWN_WEIGHTS = [
  { type: "dirt", weight: 5 },
  { type: "rock", weight: 3 },
  { type: "oilwell", weight: 1 },
];
const SPAWN_TOTAL_WEIGHT = SPAWN_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
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
const collectionPlayersEl = document.getElementById("collectionPlayers");
const turnHistoryList = document.getElementById("turnHistoryList");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const resetGameBtn = document.getElementById("resetGameBtn");
const allCappedBanner = document.getElementById("allCappedBanner");
const allCappedResetBtn = document.getElementById("allCappedResetBtn");
const playerCappedBanner = document.getElementById("playerCappedBanner");
const playerCappedText = document.getElementById("playerCappedText");
const nextTurnBannerBtn = document.getElementById("nextTurnBannerBtn");
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

// Weighted pick honoring SPAWN_WEIGHTS (dirt:rock:oilwell = 5:3:1).
function pickType() {
  let roll = randInt(1, SPAWN_TOTAL_WEIGHT);
  for (const { type, weight } of SPAWN_WEIGHTS) {
    if (roll <= weight) return type;
    roll -= weight;
  }
  return SPAWN_WEIGHTS[SPAWN_WEIGHTS.length - 1].type; // unreachable safety net
}

function createGridData() {
  const cells = [];
  const cellCount = GRID_SIZE * GRID_SIZE;
  for (let i = 0; i < cellCount; i++) {
    const type = pickType();
    cells.push({
      type,
      reward: randInt(1, 9) * MULTIPLIERS[type],
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

// Shows every player's lifetime totals side by side, instead of only
// whoever the "Playing as" dropdown happens to have selected.
function renderCollection() {
  const db = Database.load();
  collectionPlayersEl.innerHTML = "";

  Database.PLAYERS.forEach(id => {
    const record = db[id];
    const agg = Database.aggregate(record);

    const rows = Object.entries(Database.TYPE_INFO).map(([type, info]) => {
      const entry = agg[type];
      return `<li>` +
        `<span class="collection-icon">${info.icon}</span>` +
        `<span class="collection-label">${info.label}</span>` +
        `<span class="collection-count">×${entry.count}</span>` +
        `<span class="collection-value">${entry.total}</span>` +
        `</li>`;
    }).join("");

    const card = document.createElement("div");
    card.className = "player-collection";
    card.innerHTML =
      `<div class="player-collection-header">` +
        `<span>${Database.PLAYER_LABELS[id]}</span>` +
        `<span class="player-collection-total">${Database.grandTotal(record)}</span>` +
      `</div>` +
      `<ul class="collection-list">${rows}</ul>` +
      `<button class="text-btn" data-reset-player="${id}">Reset This Player</button>`;
    collectionPlayersEl.appendChild(card);
  });

  collectionPlayersEl.querySelectorAll("[data-reset-player]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.resetPlayer;
      if (!confirm(`Clear ${Database.PLAYER_LABELS[id]}'s entire history? This can't be undone.`)) return;
      Database.resetPlayer(id);
      if (id === currentPlayer()) {
        gridsByPlayer[id] = createGridData();
        renderGrid();
      }
      refreshAll();
    });
  });
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

// Surfaces the fix (Reset Game) right up top the moment every player is
// stuck at their pick cap, instead of leaving it to be found by scrolling.
// Returns whether all three are capped, so the per-player banner below can
// stay quiet rather than pile a second banner on top of this one.
function updateAllCappedBanner() {
  const db = Database.load();
  const allCapped = Database.PLAYERS.every(
    id => Database.turnDigCount(Database.currentTurn(db[id])) >= MAX_DIGS_PER_TURN
  );
  allCappedBanner.hidden = !allCapped;
  return allCapped;
}

// Puts a real, unmissable "Next Turn" button front and center the instant
// the *current* player is capped — not everyone, just them — since digging
// stopping for one player while others still can is expected, not broken.
function updatePlayerCappedBanner(allCapped) {
  const used = Database.turnDigCount(Database.currentTurn(playerRecord()));
  const capped = used >= MAX_DIGS_PER_TURN;
  playerCappedBanner.hidden = allCapped || !capped;
  if (capped) {
    playerCappedText.textContent = `${Database.PLAYER_LABELS[currentPlayer()]} has used all ${MAX_DIGS_PER_TURN} picks this turn.`;
  }
}

function resetGame() {
  if (!confirm("Reset the whole game? This wipes Player One, Two, and Three's entire history. This can't be undone.")) return;
  Database.resetAll();
  Object.keys(gridsByPlayer).forEach(id => delete gridsByPlayer[id]);
  renderGrid();
  refreshAll();
}

function nextTurn() {
  Database.startNewTurn(currentPlayer());
  gridsByPlayer[currentPlayer()] = createGridData();
  renderGrid();
  refreshAll();
}

function refreshAll() {
  updateTurnInfo();
  renderCollection();
  renderTurnHistory();
  renderGusher();
  const allCapped = updateAllCappedBanner();
  updatePlayerCappedBanner(allCapped);
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

nextTurnBtn.addEventListener("click", nextTurn);
nextTurnBannerBtn.addEventListener("click", nextTurn);

playerSelect.addEventListener("change", () => {
  renderGrid();
  refreshAll();
});

resetGameBtn.addEventListener("click", resetGame);
allCappedResetBtn.addEventListener("click", resetGame);

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

// Always start on Player One, Turn 1 — a fresh visit should never silently
// reopen on whichever player was last selected in an earlier session.
playerSelect.value = "player1";
renderGrid();
refreshAll();
