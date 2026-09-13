// Flat-file database shared by every Crafty game: one JSON record per
// player, holding a turn-by-turn history of resources dug in Crafty Oils,
// plus what Crafty Crafting has turned those into and what Crafty Housing
// has built out of that. Persisted to localStorage as a single blob for the
// browser session, and exportable/importable as an actual .json file.
const Database = (() => {
  const STORAGE_KEY = "craftyoils.db";
  const EXPORT_FILENAME = "craftyoils-database.json";

  // Bump this on every deployment that should start every player over
  // (a new commit changes it automatically — see ensureFreshBuild below).
  // Collection/turn data never survives past a build it wasn't saved under,
  // so a code deployment can never inherit a previous deployment's state.
  const BUILD_ID = "2026-09-13T02";
  const BUILD_KEY = "craftyoils.buildId";

  // Wipes any saved game data the instant it's from a different build than
  // the one currently running, before anything else in this module reads
  // or writes localStorage.
  function ensureFreshBuild() {
    let storedBuild;
    try {
      storedBuild = localStorage.getItem(BUILD_KEY);
    } catch {
      return;
    }
    if (storedBuild === BUILD_ID) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(BUILD_KEY, BUILD_ID);
    } catch {
      // storage unavailable (private mode, quota, etc.) — nothing to clean up
    }
  }
  ensureFreshBuild();

  const MAX_DIGS_PER_TURN = 10;
  const VALID_GAME_COUNTS = [1, 3, 5];
  const PLAYERS = ["player1", "player2", "player3"];
  const PLAYER_LABELS = {
    player1: "Player One",
    player2: "Player Two",
    player3: "Player Three",
  };
  const TYPE_INFO = {
    dirt: { icon: "🟫", label: "Dirt" },
    rock: { icon: "🪨", label: "Rock" },
    oilwell: { icon: "🛢️", label: "Oil Well" },
  };

  // What Crafty Crafting can turn raw resources into. Costs stay small on
  // purpose: one Crafty Oils game only gives each player ten picks, so a
  // recipe priced in dozens would never actually be reachable.
  const RECIPES = {
    brick:  { icon: "🧱", label: "Brick",      cost: { dirt: 1, rock: 1 } },
    gear:   { icon: "⚙️", label: "Gear",       cost: { rock: 2 } },
    barrel: { icon: "🛢️", label: "Barrel",     cost: { oilwell: 3 } },
    window: { icon: "🪟", label: "Window",     cost: { dirt: 1, oilwell: 2 } },
    beam:   { icon: "🔩", label: "Steel Beam", cost: { rock: 2, oilwell: 3 } },
  };

  // What Crafty Housing can build out of those crafted goods, and the
  // prestige each finished building is worth.
  const BUILDINGS = {
    tent:   { icon: "🏕️", label: "Tent",   prestige: 50,   cost: { brick: 2 } },
    shack:  { icon: "🛖", label: "Shack",  prestige: 120,  cost: { brick: 3, window: 1 } },
    house:  { icon: "🏠", label: "House",  prestige: 300,  cost: { brick: 5, window: 2, beam: 1 } },
    villa:  { icon: "🏡", label: "Villa",  prestige: 650,  cost: { brick: 8, window: 3, beam: 2, gear: 2 } },
    estate: { icon: "🏰", label: "Estate", prestige: 1200, cost: { brick: 12, window: 5, beam: 4, gear: 3, barrel: 2 } },
  };

  const RESOURCE_IDS = Object.keys(TYPE_INFO);
  const ITEM_IDS = Object.keys(RECIPES);
  const BUILDING_IDS = Object.keys(BUILDINGS);

  function emptyTally(keys) {
    const tally = {};
    keys.forEach(key => { tally[key] = 0; });
    return tally;
  }

  // Rebuilds a counter map from possibly-untrusted storage: unknown keys are
  // dropped and every value lands as a non-negative whole number, so a
  // hand-edited or corrupt import can't push a balance negative.
  function sanitizeTally(raw, keys) {
    const tally = emptyTally(keys);
    keys.forEach(key => {
      const n = Math.floor(Number(raw && raw[key]));
      if (Number.isFinite(n) && n > 0) tally[key] = n;
    });
    return tally;
  }

  function emptyTurn(turnNumber) {
    const turn = { turnNumber };
    RESOURCE_IDS.forEach(type => {
      turn[type] = { count: 0, total: 0 };
    });
    return turn;
  }

  // Beyond the dig history, a player carries three running ledgers: raw
  // resources already consumed by crafting, goods crafted (and how many of
  // those housing has since consumed), and buildings standing.
  function emptyPlayerRecord() {
    return {
      turns: [emptyTurn(1)],
      spent: emptyTally(RESOURCE_IDS),
      crafted: emptyTally(ITEM_IDS),
      itemsSpent: emptyTally(ITEM_IDS),
      built: emptyTally(BUILDING_IDS),
    };
  }

  // Whose turn it is right now (Player One -> Two -> Three, repeating for
  // `totalGames` rounds), which round that is, whether a match length has
  // actually been chosen and started yet, whether the next player still has
  // to tap Start Turn before their board appears, and whether every round
  // has finished for every player.
  function emptyMatch(totalGames) {
    return {
      activeIndex: 0,
      round: 1,
      totalGames: VALID_GAME_COUNTS.includes(totalGames) ? totalGames : 1,
      started: false,
      awaitingStart: false,
      over: false,
    };
  }

  function emptyDb(totalGames) {
    const db = { __match__: emptyMatch(totalGames) };
    PLAYERS.forEach(id => { db[id] = emptyPlayerRecord(); });
    return db;
  }

  function sanitizeMatch(raw) {
    const idx = Number(raw && raw.activeIndex);
    const round = Number(raw && raw.round);
    const totalGames = Number(raw && raw.totalGames);
    return {
      activeIndex: Number.isInteger(idx) && idx >= 0 && idx < PLAYERS.length ? idx : 0,
      round: Number.isInteger(round) && round >= 1 ? round : 1,
      totalGames: VALID_GAME_COUNTS.includes(totalGames) ? totalGames : 1,
      started: !!(raw && raw.started),
      awaitingStart: !!(raw && raw.awaitingStart),
      over: !!(raw && raw.over),
    };
  }

  // Rebuild a raw (possibly untrusted/imported) player record into a clean
  // shape, keeping only recognized fields and coercing numbers.
  function sanitizePlayerRecord(raw) {
    if (!raw || !Array.isArray(raw.turns) || raw.turns.length === 0) {
      return emptyPlayerRecord();
    }
    return {
      turns: raw.turns.map((rawTurn, i) => {
        const turn = emptyTurn(Number(rawTurn.turnNumber) || i + 1);
        RESOURCE_IDS.forEach(type => {
          if (rawTurn[type]) {
            turn[type] = {
              count: Number(rawTurn[type].count) || 0,
              total: Number(rawTurn[type].total) || 0,
            };
          }
        });
        return turn;
      }),
      spent: sanitizeTally(raw.spent, RESOURCE_IDS),
      crafted: sanitizeTally(raw.crafted, ITEM_IDS),
      itemsSpent: sanitizeTally(raw.itemsSpent, ITEM_IDS),
      built: sanitizeTally(raw.built, BUILDING_IDS),
    };
  }

  function load() {
    const db = emptyDb();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored) {
        PLAYERS.forEach(id => {
          if (stored[id]) db[id] = sanitizePlayerRecord(stored[id]);
        });
        db.__match__ = sanitizeMatch(stored.__match__);
      }
    } catch {
      // ignore corrupt storage, fall back to empty db
    }
    return db;
  }

  function save(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function currentTurn(playerRecord) {
    return playerRecord.turns[playerRecord.turns.length - 1];
  }

  function turnDigCount(turn) {
    return Object.keys(TYPE_INFO).reduce((sum, type) => sum + turn[type].count, 0);
  }

  function turnTotal(turn) {
    return Object.keys(TYPE_INFO).reduce((sum, type) => sum + turn[type].total, 0);
  }

  // The player's single best turn by total — their "biggest riser" — so a
  // strong turn stands out rather than getting buried in the lifetime sum.
  function bestTurn(playerRecord) {
    return playerRecord.turns.reduce((best, turn) => {
      const total = turnTotal(turn);
      return total > best.total ? { turnNumber: turn.turnNumber, total } : best;
    }, { turnNumber: null, total: 0 });
  }

  // Whose turn it is, in Player One -> Two -> Three order.
  function activePlayer(db) {
    return PLAYERS[db.__match__.activeIndex];
  }

  function isMatchOver(db) {
    return db.__match__.over;
  }

  // Whether a match length has actually been chosen and begun — before
  // this, there's nothing to dig; the player still needs to pick 1, 3, or 5.
  function isMatchStarted(db) {
    return db.__match__.started;
  }

  // Whether the board is held back waiting for the player who's up to tap
  // Start Turn. Control has already passed to them at this point — this is
  // the pause that lets the device actually change hands.
  function isAwaitingStart(db) {
    return db.__match__.awaitingStart && !db.__match__.over;
  }

  // The player who's up has taken the device and tapped Start Turn.
  function beginTurn() {
    const db = load();
    db.__match__.awaitingStart = false;
    save(db);
    return db;
  }

  // Hands control to the next player once the active player's turn is
  // done. After Player Three finishes a round, either the next round starts
  // (back to Player One) or, once totalGames rounds are complete, the match
  // is over for everyone.
  function advanceMatch() {
    const db = load();
    const m = db.__match__;

    if (m.activeIndex < PLAYERS.length - 1) {
      m.activeIndex += 1;
    } else if (m.round < m.totalGames) {
      m.round += 1;
      m.activeIndex = 0;
    } else {
      m.over = true;
      save(db);
      return db;
    }

    // The player now up may not have played this round yet — give them a
    // fresh turn for it if not.
    const nextId = PLAYERS[m.activeIndex];
    if (db[nextId].turns.length < m.round) {
      db[nextId].turns.push(emptyTurn(m.round));
    }
    // Hold the board until they say they're ready, so the device can change
    // hands without the next player's board already being on screen.
    m.awaitingStart = true;
    save(db);
    return db;
  }

  // Records one dig against the player's current turn. No-ops (returns
  // added: false) once that turn has reached MAX_DIGS_PER_TURN — callers
  // should check turnDigCount() before offering the player another pick.
  function addDig(playerId, type, reward) {
    const db = load();
    const turn = currentTurn(db[playerId]);
    if (turnDigCount(turn) >= MAX_DIGS_PER_TURN) return { db, added: false };
    turn[type].count += 1;
    turn[type].total += reward;
    save(db);
    return { db, added: true };
  }

  // Redo the player's current turn from scratch — its digs go back to 0/
  // MAX_DIGS_PER_TURN — without touching earlier turns or the turn number.
  function resetCurrentTurn(playerId) {
    const db = load();
    const turns = db[playerId].turns;
    turns[turns.length - 1] = emptyTurn(turns[turns.length - 1].turnNumber);
    save(db);
    return db;
  }

  // A total wipe for one player — unlike resetAll, this clears their
  // workshop and estate too.
  function resetPlayer(playerId) {
    const db = load();
    db[playerId] = emptyPlayerRecord();
    save(db);
    return db;
  }

  // A fresh dig season laid on top of what everyone has already made: dig
  // history and the raw-resource ledger it feeds both reset (they have to
  // move together — clearing turns while keeping `spent` would leave a
  // player owing resources they no longer have), while crafted goods and
  // finished buildings carry across, so an estate is built up over several
  // seasons rather than having to be funded out of a single match.
  function freshSeason(totalGames) {
    const previous = load();
    const db = emptyDb(totalGames || previous.__match__.totalGames);
    PLAYERS.forEach(id => {
      db[id].crafted = { ...previous[id].crafted };
      db[id].itemsSpent = { ...previous[id].itemsSpent };
      db[id].built = { ...previous[id].built };
    });
    return db;
  }

  // Starts a fresh dig season and returns to the pre-game setup step
  // (started: false) — nothing to dig until a match length is chosen again
  // via startNewMatch(). Keeps whatever length was last selected as the
  // pre-highlighted default, unless a new one is given.
  function resetAll(totalGames) {
    const db = freshSeason(totalGames);
    save(db);
    return db;
  }

  // Actually begins play at the given length (1, 3, or 5 games) — this is
  // the only thing that ever makes the board and controls appear. Like
  // resetAll, it opens a new dig season without touching the workshop or
  // estate those earlier seasons paid for.
  function startNewMatch(totalGames) {
    const db = freshSeason(totalGames);
    db.__match__.started = true;
    // Even the opening turn waits on Start Turn — whoever sets the match
    // length isn't necessarily Player One.
    db.__match__.awaitingStart = true;
    save(db);
    return db;
  }

  // Lifetime per-type totals for a player, summed across every turn.
  function aggregate(playerRecord) {
    const agg = {};
    Object.keys(TYPE_INFO).forEach(type => { agg[type] = { count: 0, total: 0 }; });
    playerRecord.turns.forEach(turn => {
      Object.keys(TYPE_INFO).forEach(type => {
        agg[type].count += turn[type].count;
        agg[type].total += turn[type].total;
      });
    });
    return agg;
  }

  function grandTotal(playerRecord) {
    return Object.values(aggregate(playerRecord)).reduce((sum, t) => sum + t.total, 0);
  }

  // Raw resources dug but not yet consumed by crafting — the wallet Crafty
  // Crafting spends from. Dug totals only ever grow, so a balance is
  // always "everything mined so far, minus everything already used".
  function availableResources(playerRecord) {
    const agg = aggregate(playerRecord);
    const available = {};
    RESOURCE_IDS.forEach(type => {
      available[type] = agg[type].count - playerRecord.spent[type];
    });
    return available;
  }

  // Crafted goods not yet consumed by housing — the wallet Crafty Housing
  // spends from.
  function availableItems(playerRecord) {
    const available = {};
    ITEM_IDS.forEach(id => {
      available[id] = playerRecord.crafted[id] - playerRecord.itemsSpent[id];
    });
    return available;
  }

  // Whether every line of a cost is covered by the matching wallet.
  function canAfford(cost, wallet) {
    return Object.entries(cost).every(([id, needed]) => wallet[id] >= needed);
  }

  function canCraft(playerRecord, itemId) {
    return !!RECIPES[itemId] && canAfford(RECIPES[itemId].cost, availableResources(playerRecord));
  }

  function canBuild(playerRecord, buildingId) {
    return !!BUILDINGS[buildingId] && canAfford(BUILDINGS[buildingId].cost, availableItems(playerRecord));
  }

  // Spends the recipe's raw resources and adds one of the item. No-ops
  // (crafted: false) if the player can't currently afford it, so a stale
  // button in an open tab can never overdraw a wallet.
  function craftItem(playerId, itemId) {
    const db = load();
    const record = db[playerId];
    if (!canCraft(record, itemId)) return { db, crafted: false };

    Object.entries(RECIPES[itemId].cost).forEach(([type, needed]) => {
      record.spent[type] += needed;
    });
    record.crafted[itemId] += 1;
    save(db);
    return { db, crafted: true };
  }

  // Spends the building's crafted goods and raises one of the building.
  function buildStructure(playerId, buildingId) {
    const db = load();
    const record = db[playerId];
    if (!canBuild(record, buildingId)) return { db, built: false };

    Object.entries(BUILDINGS[buildingId].cost).forEach(([itemId, needed]) => {
      record.itemsSpent[itemId] += needed;
    });
    record.built[buildingId] += 1;
    save(db);
    return { db, built: true };
  }

  // What a player's standing buildings are worth all together.
  function prestige(playerRecord) {
    return BUILDING_IDS.reduce(
      (sum, id) => sum + playerRecord.built[id] * BUILDINGS[id].prestige,
      0
    );
  }

  function totalBuilt(playerRecord) {
    return BUILDING_IDS.reduce((sum, id) => sum + playerRecord.built[id], 0);
  }

  function exportFile() {
    const blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = EXPORT_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importFile(file, onComplete, onError) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const db = emptyDb();
        PLAYERS.forEach(id => {
          if (parsed[id]) db[id] = sanitizePlayerRecord(parsed[id]);
        });
        if (parsed.__match__) db.__match__ = sanitizeMatch(parsed.__match__);
        save(db);
        if (onComplete) onComplete(db);
      } catch (err) {
        if (onError) onError(err);
      }
    };
    reader.readAsText(file);
  }

  return {
    PLAYERS, PLAYER_LABELS, TYPE_INFO, MAX_DIGS_PER_TURN,
    RECIPES, BUILDINGS,
    load, save,
    currentTurn, turnDigCount, turnTotal, bestTurn,
    activePlayer, isMatchOver, isMatchStarted, isAwaitingStart,
    advanceMatch, beginTurn,
    addDig, resetCurrentTurn, resetPlayer, resetAll, startNewMatch,
    aggregate, grandTotal,
    availableResources, availableItems, canCraft, canBuild,
    craftItem, buildStructure, prestige, totalBuilt,
    exportFile, importFile,
  };
})();
