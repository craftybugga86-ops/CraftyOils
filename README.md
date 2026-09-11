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
a running total as more tiles are revealed. Reachable from the title screen's
Play button, at `dig-grid.html`.

- `dig-grid.html` — page markup and game container
- `css/dig-grid.css` — grid and tile styling
- `js/dig-grid.js` — grid generation, digging, and scoring logic

## Collection

Every tile dug up (on any grid, across any number of resets) is tallied by
type into a persistent collection: a count and a resource subtotal for Dirt,
Rock, and Oil Well, plus a grand total. It's stored in `localStorage`, so it
survives page reloads and grid resets — "Reset Grid" starts a new board
without touching it. It's shown live under the Dig Grid and is viewable
anytime from the title screen's Collection button. "Reset Collection" clears
it for good (with a confirmation prompt).

- `js/collection.js` — shared module: load/add/reset the persisted totals
