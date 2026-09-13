// Surfaces any uncaught JS error or promise rejection directly on the page,
// so a real bug is visible without opening the browser console. Loaded
// first, before any other script, to catch failures as early as possible.
(function () {
  const queued = [];

  function render(message) {
    let banner = document.getElementById("fatalErrorBanner");
    if (!banner) {
      if (!document.body) {
        queued.push(message);
        return;
      }
      banner = document.createElement("div");
      banner.id = "fatalErrorBanner";
      banner.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:9999;" +
        "background:#7a1f1f;color:#fff;padding:10px 14px;" +
        "font:12px/1.4 monospace;white-space:pre-wrap;" +
        "max-height:40vh;overflow:auto;";
      document.body.prepend(banner);
    }
    banner.textContent += (banner.textContent ? "\n" : "") + message;
  }

  window.addEventListener("error", (e) => {
    const file = e.filename ? e.filename.split("/").pop() : "?";
    render(`App error: ${e.message || "Unknown error"} (${file}:${e.lineno})`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    render(`Unhandled rejection: ${reason && reason.message ? reason.message : String(reason)}`);
  });

  document.addEventListener("DOMContentLoaded", () => {
    queued.splice(0).forEach(render);
  });
})();
