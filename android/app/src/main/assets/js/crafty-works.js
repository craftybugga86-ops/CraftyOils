// Crafty Works in the Crafty ecosystem: the shared app switcher and, once this
// device is connected to a Crafty account, credits for finished buildings.
// crafty-bar.js and crafty-catalog.js are synced from Crafty Enterprises.
(() => {
  if (!window.Crafty) return;
  window.Crafty.init({ app: "works", button: false });
  const btn = document.getElementById("craftyBtn");
  if (btn) btn.addEventListener("click", () => window.Crafty.open());
})();
