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
Clicking a tile digs it, revealing a reward value from 0–89. A "Playing as"
dropdown picks which of Player One / Two / Three the digging counts toward —
each player digs their **own independently random, private board**: nobody
sees what tiles the others have revealed, or is influenced by their layout.
Switching players restores whatever that player had already dug on their own
board; it doesn't reshuffle it.

Digging is turn-based: **each turn caps out at 10 picks** per player. The
turn bar shows picks used (e.g. "Turn 2 — 6/10 picks used"); once the cap is
hit, remaining tiles dim and stop responding, and **Show All** only reveals
up to however many picks are left in the turn (never more than 10 total).
**Next Turn** starts a fresh turn — a new grid and a reset 10-pick
allowance — without touching picks used or resources dug in earlier turns.
Reachable from the title screen's Play button, at `dig-grid.html`.

- `dig-grid.html` — page markup, player and turn controls, game container
- `css/dig-grid.css` — grid, tile, and turn-bar styling
- `js/dig-grid.js` — grid generation, digging, turn-limit enforcement

## Collection & Database

Every dig is recorded against the player's *current turn*: a count and
resource subtotal per type (Dirt, Rock, Oil Well) for that turn alone. The
**Collection** panel sums every turn played so far into lifetime totals per
type, plus a grand total, for whichever player is selected. **Turn History**
lists each turn played — picks used and that turn's total — so results can
be compared turn by turn, not just as one lifetime figure. Switching the
"Playing as" / "Viewing" dropdown (on the Dig Grid or the title screen's
Collection modal) switches whose data you're adding to or looking at.
"Reset This Player" clears a player's entire turn history (with a
confirmation prompt).

Records live in a flat-file JSON database — one object keyed by player, each
holding an ordered array of turn records — persisted to `localStorage` for
the browser session, and portable via **Export Database** / **Import
Database** on the Dig Grid page, which write and read that same JSON
structure as an actual `.json` file.

- `js/database.js` — the flat-file database: load/save, per-turn digs,
  starting new turns, per-player reset, lifetime aggregation, file
  export/import
