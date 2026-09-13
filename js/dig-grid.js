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
// = 1 : 3 : 5, so an oil well turns up roughly 5x as often as dirt, making
// dirt the scarce one that crafting bottlenecks on.
const SPAWN_WEIGHTS = [
  { type: "dirt", weight: 1 },
  { type: "rock", weight: 3 },
  { type: "oilwell", weight: 5 },
];
const SPAWN_TOTAL_WEIGHT = SPAWN_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
const MAX_DIGS_PER_TURN = Database.MAX_DIGS_PER_TURN;

const grid = document.getElementById("grid");
const controlsEl = document.getElementById("controls");
const statsBox = document.getElementById("statsBox");
const totalEl = document.getElementById("total");
const countEl = document.getElementById("count");
const resetBtn = document.getElementById("resetBtn");
const showAllBtn = document.getElementById("showAllBtn");
const gamesButtons = document.querySelectorAll(".games-btn");
const pregamePanel = document.getElementById("pregamePanel");
const nowPlayingBox = document.getElementById("nowPlayingBox");
const activePlayerLabelEl = document.getElementById("activePlayerLabel");
const roundLabelEl = document.getElementById("roundLabel");
const totalGamesLabelEl = document.getElementById("totalGamesLabel");
const turnBarEl = document.querySelector(".turn-bar");
const turnInfoEl = document.getElementById("turnInfo");
const resetTurnBtn = document.getElementById("resetTurnBtn");
const passBanner = document.getElementById("passBanner");
const passText = document.getElementById("passText");
const collectionPlayersEl = document.getElementById("collectionPlayers");
const turnHistoryList = document.getElementById("turnHistoryList");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const resetGameBtn = document.getElementById("resetGameBtn");
const gameOverPanel = document.getElementById("gameOverPanel");
const gameOverSummary = document.getElementById("gameOverSummary");
const finalResultsList = document.getElementById("finalResultsList");
const playAgainBtn = document.getElementById("playAgainBtn");
const riserBadge = document.getElementById("riserBadge");
const riserTotalEl = document.getElementById("riserTotal");
const riserTurnEl = document.getElementById("riserTurn");

// Tracks each player's last-rendered biggest-riser total, so we only
// celebrate the moment a turn actually beats their previous record.
const lastRiserByPlayer = {};

// Each player digs their own private board: a fresh, independently random
// layout nobody else can see or is influenced by. Keyed by player id, kept
// only in memory for this session (a reload starts everyone over).
const gridsByPlayer = {};

let passBannerTimer = null;

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

// Whose turn it is right now — Player One, Two, and Three go in strict
// order, one turn each; nobody picks who's playing, it's automatic.
function activePlayerId() {
  return Database.activePlayer(Database.load());
}

function playerRecord() {
  return Database.load()[activePlayerId()];
}

function showPassBanner(message) {
  passText.textContent = message;
  passBanner.hidden = false;
  clearTimeout(passBannerTimer);
  passBannerTimer = setTimeout(() => { passBanner.hidden = true; }, 3500);
}

// Refreshes the turn indicator and locks digging once the turn's cap is hit.
function updateTurnInfo() {
  const record = playerRecord();
  const turn = Database.currentTurn(record);
  const used = Database.turnDigCount(turn);
  const limitReached = used >= MAX_DIGS_PER_TURN;
  turnInfoEl.textContent = `Turn ${turn.turnNumber} — ${used}/${MAX_DIGS_PER_TURN} picks used`;
  grid.classList.toggle("limit-reached", limitReached);
  showAllBtn.disabled = limitReached;
  activePlayerLabelEl.textContent = Database.PLAYER_LABELS[activePlayerId()];

  const match = Database.load().__match__;
  roundLabelEl.textContent = match.round;
  totalGamesLabelEl.textContent = match.totalGames;
}

// Highlights whichever "Best of" option matches the current match.
function renderGamesSelector() {
  const totalGames = Database.load().__match__.totalGames;
  gamesButtons.forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.games) === totalGames);
  });
}

// Shows every player's lifetime totals side by side, instead of only
// whoever happens to be playing right now.
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
      if (!confirm(`Clear ${Database.PLAYER_LABELS[id]}'s entire history — digs, crafted goods and buildings? This can't be undone.`)) return;
      Database.resetPlayer(id);
      if (id === activePlayerId()) {
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

// The player's best single turn so far — their "biggest riser" — with a
// brief celebration the moment a turn actually beats their old record.
function renderRiser() {
  const playerId = activePlayerId();
  const best = Database.bestTurn(playerRecord());

  riserTotalEl.textContent = best.total;
  riserTurnEl.textContent = best.turnNumber ? ` (Turn ${best.turnNumber})` : "";

  const previousBest = lastRiserByPlayer[playerId] || 0;
  riserBadge.classList.remove("new-record");
  if (best.total > 0 && best.total > previousBest) {
    void riserBadge.offsetWidth; // restart the animation if it's already mid-play
    riserBadge.classList.add("new-record");
  }
  lastRiserByPlayer[playerId] = best.total;
}

// Three states: nothing chosen yet (pre-game setup), a live match in
// progress, or every game finished (final results).
function applyMatchVisibility() {
  const db = Database.load();
  const started = Database.isMatchStarted(db);
  const over = Database.isMatchOver(db);
  const inProgress = started && !over;

  pregamePanel.hidden = started;
  nowPlayingBox.hidden = !inProgress;
  turnBarEl.hidden = !inProgress;
  statsBox.hidden = !inProgress;
  riserBadge.hidden = !inProgress;
  grid.hidden = !inProgress;
  controlsEl.hidden = !inProgress;
  gameOverPanel.hidden = !(started && over);
  if (started && over) renderGameOver();
}

function renderGameOver() {
  const db = Database.load();
  const totalGames = db.__match__.totalGames;
  gameOverSummary.textContent = totalGames === 1
    ? "Final results:"
    : `Every player has played ${totalGames} games. Final results:`;

  const results = Database.PLAYERS
    .map(id => ({ id, label: Database.PLAYER_LABELS[id], total: Database.grandTotal(db[id]) }))
    .sort((a, b) => b.total - a.total);

  finalResultsList.innerHTML = "";
  results.forEach((r, i) => {
    const li = document.createElement("li");
    if (i === 0) li.classList.add("winner");
    li.innerHTML =
      `<span class="rank">#${i + 1}</span>` +
      `<span class="final-name">${r.label}</span>` +
      `<span class="final-total">${r.total}</span>`;
    finalResultsList.appendChild(li);
  });
}

// If the active player has just used their last pick, hand control to the
// next player in order; once Player Three finishes, the match ends. Calls
// refreshAll() again after advancing so every panel reflects the new state
// (bounded recursion — at most two more players to advance through).
function maybeAdvanceMatch() {
  if (Database.isMatchOver(Database.load())) return;

  const playerId = activePlayerId();
  const used = Database.turnDigCount(Database.currentTurn(playerRecord()));
  if (used < MAX_DIGS_PER_TURN) return;

  const finishedLabel = Database.PLAYER_LABELS[playerId];
  const roundBefore = Database.load().__match__.round;
  Database.advanceMatch();
  const after = Database.load();

  if (after.__match__.over) {
    showPassBanner(`${finishedLabel}'s turn is over. Game over!`);
  } else {
    const nextLabel = Database.PLAYER_LABELS[activePlayerId()];
    showPassBanner(
      after.__match__.round > roundBefore
        ? `Game ${roundBefore} complete! Starting Game ${after.__match__.round} — now playing ${nextLabel}.`
        : `${finishedLabel}'s turn is over — now playing ${nextLabel}.`
    );
    renderGrid();
  }
  refreshAll();
}

function refreshAll() {
  updateTurnInfo();
  renderGamesSelector();
  renderCollection();
  renderTurnHistory();
  renderRiser();
  applyMatchVisibility();
  maybeAdvanceMatch();
}

// Renders the active player's own board from its stored cell data,
// restoring whatever they'd already revealed rather than reshuffling it.
function renderGrid() {
  const playerId = activePlayerId();
  const cellsData = getGridData(playerId);

  grid.innerHTML = "";
  let total = 0;
  let revealedCount = 0;

  cellsData.forEach(cellData => {
    const cell = document.createElement("div");

    if (cellData.revealed) {
      // Only now does the tile's real type ever touch the DOM — nothing
      // about it (class, dataset, or content) is exposed before this.
      cell.className = "cell " + cellData.type + " revealed";
      cell.innerHTML =
        `<span class="cell-icon">${ICONS[cellData.type]}</span>` +
        `<span class="cell-value">${cellData.reward}</span>`;
      total += cellData.reward;
      revealedCount++;
      if (cellData.justRevealed) {
        cell.classList.add("pop");
        cellData.justRevealed = false;
      }
    } else {
      // Anonymous until picked: just a "?", with no class or attribute
      // anywhere that would let inspecting the page reveal its type.
      cell.className = "cell hidden";
      cell.textContent = "?";
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
  gridsByPlayer[activePlayerId()] = createGridData();
  renderGrid();
});

showAllBtn.addEventListener("click", () => {
  const playerId = activePlayerId();
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
  const playerId = activePlayerId();
  if (!confirm(`Redo Turn ${Database.currentTurn(playerRecord()).turnNumber} for ${Database.PLAYER_LABELS[playerId]} from scratch (0/${MAX_DIGS_PER_TURN} picks)?`)) return;
  Database.resetCurrentTurn(playerId);
  gridsByPlayer[playerId] = createGridData();
  renderGrid();
  refreshAll();
});

// Starts a fresh dig season and drops back to the pre-game setup step, so
// the next match always starts with an explicit "Best of" choice rather
// than silently resuming the old length.
function resetGame() {
  const db = Database.load();
  const hasProgress = Database.PLAYERS.some(id =>
    db[id].turns.some(turn => Database.turnDigCount(turn) > 0)
  );
  if (hasProgress && !confirm("Start a new dig season? Player One, Two, and Three's dig history and unspent resources all go back to zero. Crafted goods and buildings are kept.")) {
    return;
  }
  Database.resetAll();
  Object.keys(gridsByPlayer).forEach(id => delete gridsByPlayer[id]);
  passBanner.hidden = true;
  refreshAll();
}

resetGameBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);

// The only thing that actually begins play — picking a length here is what
// makes the board and controls appear.
gamesButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    Database.startNewMatch(Number(btn.dataset.games));
    Object.keys(gridsByPlayer).forEach(id => delete gridsByPlayer[id]);
    passBanner.hidden = true;
    renderGrid();
    refreshAll();
  });
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
    () => {
      const db = Database.load();
      if (Database.isMatchStarted(db) && !Database.isMatchOver(db)) {
        gridsByPlayer[activePlayerId()] = createGridData();
        renderGrid();
      }
      refreshAll();
    },
    () => alert("Couldn't read that file — make sure it's a Crafty Oils database export.")
  );
  importInput.value = "";
});

const initialDb = Database.load();
if (Database.isMatchStarted(initialDb) && !Database.isMatchOver(initialDb)) {
  renderGrid();
}
refreshAll();
