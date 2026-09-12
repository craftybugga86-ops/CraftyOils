// Flat-file database for Crafty Oils: one JSON record per player, holding a
// turn-by-turn history of dug-resource counts and totals by type. Persisted
// to localStorage as a single blob for the browser session, and
// exportable/importable as an actual .json file for portability.
const Database = (() => {
  const STORAGE_KEY = "craftyoils.db";
  const EXPORT_FILENAME = "craftyoils-database.json";

  // Bump this on every deployment that should start every player over
  // (a new commit changes it automatically — see ensureFreshBuild below).
  // Collection/turn data never survives past a build it wasn't saved under,
  // so a code deployment can never inherit a previous deployment's state.
  const BUILD_ID = "2026-09-12T03";
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

  function emptyTurn(turnNumber) {
    const turn = { turnNumber };
    Object.keys(TYPE_INFO).forEach(type => {
      turn[type] = { count: 0, total: 0 };
    });
    return turn;
  }

  function emptyPlayerRecord() {
    return { turns: [emptyTurn(1)] };
  }

  // Whose turn it is right now (Player One -> Two -> Three, repeating for
  // `totalGames` rounds), which round that is, and whether every round has
  // finished for every player.
  function emptyMatch(totalGames) {
    return {
      activeIndex: 0,
      round: 1,
      totalGames: VALID_GAME_COUNTS.includes(totalGames) ? totalGames : 1,
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
        Object.keys(TYPE_INFO).forEach(type => {
          if (rawTurn[type]) {
            turn[type] = {
              count: Number(rawTurn[type].count) || 0,
              total: Number(rawTurn[type].total) || 0,
            };
          }
        });
        return turn;
      }),
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

  // The player's single best turn by total — their "biggest gusher" — so a
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

  function startNewTurn(playerId) {
    const db = load();
    const nextNumber = db[playerId].turns.length + 1;
    db[playerId].turns.push(emptyTurn(nextNumber));
    save(db);
    return db;
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

  function resetPlayer(playerId) {
    const db = load();
    db[playerId] = emptyPlayerRecord();
    save(db);
    return db;
  }

  // Starts a completely new match. Pass 1, 3, or 5 to pick how many rounds
  // it runs; omit it to keep whatever was selected last.
  function resetAll(totalGames) {
    const previous = load().__match__.totalGames;
    const db = emptyDb(totalGames || previous);
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
    load, save,
    currentTurn, turnDigCount, turnTotal, bestTurn,
    activePlayer, isMatchOver, advanceMatch,
    addDig, startNewTurn, resetCurrentTurn, resetPlayer, resetAll,
    aggregate, grandTotal,
    exportFile, importFile,
  };
})();
