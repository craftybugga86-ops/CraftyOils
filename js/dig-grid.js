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
    });

    grid.appendChild(cell);
  }
}

resetBtn.addEventListener("click", buildGrid);

showAllBtn.addEventListener("click", () => {
  document.querySelectorAll(".cell:not(.revealed)").forEach(cell => {
    if (cell.querySelector(".badge")) return; // already peeked
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = cell.dataset.reward;
    cell.appendChild(badge);
  });
});

buildGrid();
