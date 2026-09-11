// Flat-file database for Crafty Oils: one JSON record per player, holding
// their dug-resource counts and totals by type. Persisted to localStorage
// as a single blob for the browser session, and exportable/importable as an
// actual .json file so the data is portable between browsers or machines.
const Database = (() => {
  const STORAGE_KEY = "craftyoils.db";
  const CURRENT_PLAYER_KEY = "craftyoils.currentPlayer";
  const EXPORT_FILENAME = "craftyoils-database.json";

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

  function emptyPlayerRecord() {
    const record = {};
    Object.keys(TYPE_INFO).forEach(type => {
      record[type] = { count: 0, total: 0 };
    });
    return record;
  }

  function emptyDb() {
    const db = {};
    PLAYERS.forEach(id => { db[id] = emptyPlayerRecord(); });
    return db;
  }

  function load() {
    const db = emptyDb();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored) {
        PLAYERS.forEach(id => {
          if (!stored[id]) return;
          Object.keys(TYPE_INFO).forEach(type => {
            if (stored[id][type]) db[id][type] = stored[id][type];
          });
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

  function getCurrentPlayer() {
    const stored = localStorage.getItem(CURRENT_PLAYER_KEY);
    return PLAYERS.includes(stored) ? stored : PLAYERS[0];
  }

  function setCurrentPlayer(playerId) {
    localStorage.setItem(CURRENT_PLAYER_KEY, playerId);
  }

  function add(playerId, type, reward) {
    const db = load();
    db[playerId][type].count += 1;
    db[playerId][type].total += reward;
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

  function grandTotal(playerRecord) {
    return Object.values(playerRecord).reduce((sum, t) => sum + t.total, 0);
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
          if (!parsed[id]) return;
          Object.keys(TYPE_INFO).forEach(type => {
            if (parsed[id][type]) db[id][type] = parsed[id][type];
          });
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
    PLAYERS, PLAYER_LABELS, TYPE_INFO,
    load, save, getCurrentPlayer, setCurrentPlayer,
    add, resetPlayer, resetAll, grandTotal,
    exportFile, importFile,
  };
})();
