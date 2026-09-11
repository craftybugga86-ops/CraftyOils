# Crafty Oils

Run it by opening `index.html` in a browser — it's the title screen and entry point.

## Title Screen

The main menu: **Play** heads into the Dig Grid, and **Collection** /
**How To Play** / **Settings** / **Credits** open in-place modals. Settings
currently holds a sound on/off toggle (persisted via `localStorage`). As more
game elements are added, they'll get their own menu buttons here.

- `index.html` — title screen markup
- `css/title.css` — title screen and modal styling
- `js/title.js` — menu button wiring, modal open/close, sound toggle

## Dig Grid

A drilling mini-game mechanic: a 9x9 grid of hidden tiles (dirt, rock, or oil well).
Clicking a tile digs it, revealing a reward value from 0–89. Rewards accumulate into
a running total as more tiles are revealed. A "Playing as" dropdown picks
which of Player One / Two / Three the digging counts toward. **Show All**
digs up every remaining tile at once (for whichever player is selected) —
there's no partial peek. Reachable from the title screen's Play button, at
`dig-grid.html`.

- `dig-grid.html` — page markup, player selector, and game container
- `css/dig-grid.css` — grid and tile styling
- `js/dig-grid.js` — grid generation, digging, and scoring logic

## Collection & Database

Every tile dug up is tallied by type — a count and a resource subtotal for
Dirt, Rock, and Oil Well, plus a grand total — as its own record for each of
Player One, Two, and Three, so the three keep separate results. Switching the
"Playing as" / "Viewing" dropdown (on the Dig Grid or the title screen's
Collection modal) switches whose record you're adding to or looking at.
"Reset This Player" clears just the selected player's record (with a
confirmation prompt).

Records live in a flat-file JSON database — one object keyed by player,
each holding its per-type counts and totals — persisted to `localStorage`
for the browser session, and portable via **Export Database** /
**Import Database** on the Dig Grid page, which write and read that same
JSON structure as an actual `.json` file.

- `js/database.js` — the flat-file database: load/save, per-player add and
  reset, and file export/import
