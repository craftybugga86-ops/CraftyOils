// Flat-file database for Crafty Oils: one JSON record per player, holding a
// turn-by-turn history of dug-resource counts and totals by type. Persisted
// to localStorage as a single blob for the browser session, and
// exportable/importable as an actual .json file for portability.
const Database = (() => {
  // Bumping this key forces every visitor to start clean: any data saved
  // under an older key is simply never read again, which is exactly what a
  // hard reset needs — no leftover turn/pick state can survive it.
  const STORAGE_KEY = "craftyoils.db.v2";
  const EXPORT_FILENAME = "craftyoils-database.json";

  const MAX_DIGS_PER_TURN = 10;
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

  function emptyDb() {
    const db = {};
    PLAYERS.forEach(id => { db[id] = emptyPlayerRecord(); });
    return db;
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

  function resetAll() {
    const db = emptyDb();
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
    addDig, startNewTurn, resetCurrentTurn, resetPlayer, resetAll,
    aggregate, grandTotal,
    exportFile, importFile,
  };
})();
