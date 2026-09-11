// Persistent record of resources dug up across all play sessions,
// broken down by tile type. Shared by the Dig Grid and the title screen.
const Collection = (() => {
  const STORAGE_KEY = "craftyoils.collection";
  const TYPE_INFO = {
    dirt: { icon: "🟫", label: "Dirt" },
    rock: { icon: "🪨", label: "Rock" },
    oilwell: { icon: "🛢️", label: "Oil Well" },
  };

  function load() {
    const empty = {};
    Object.keys(TYPE_INFO).forEach(type => {
      empty[type] = { count: 0, total: 0 };
    });
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored) return empty;
      Object.keys(TYPE_INFO).forEach(type => {
        if (stored[type]) empty[type] = stored[type];
      });
      return empty;
    } catch {
      return empty;
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function add(type, reward) {
    const data = load();
    if (!data[type]) data[type] = { count: 0, total: 0 };
    data[type].count += 1;
    data[type].total += reward;
    save(data);
    return data;
  }

  function reset() {
    const data = {};
    Object.keys(TYPE_INFO).forEach(type => {
      data[type] = { count: 0, total: 0 };
    });
    save(data);
    return data;
  }

  function grandTotal(data) {
    return Object.values(data).reduce((sum, t) => sum + t.total, 0);
  }

  return { TYPE_INFO, load, add, reset, grandTotal };
})();
