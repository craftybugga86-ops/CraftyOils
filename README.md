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

- **Reset Turn** redoes the *current* turn from scratch (0/10 picks, fresh
  board) without touching earlier turns or the turn number.
- **Next Turn** starts a brand new turn — a new grid and a reset 10-pick
  allowance — leaving every earlier turn's results alone.
- **Reset Grid** just reshuffles the current board without changing picks
  used or any recorded results.

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
confirmation prompt); **Reset Game (All Players)** does the same for
Player One, Two, and Three at once, for starting the whole game over.

Records live in a flat-file JSON database — one object keyed by player, each
holding an ordered array of turn records — persisted to `localStorage` for
the browser session, and portable via **Export Database** / **Import
Database** on the Dig Grid page, which write and read that same JSON
structure as an actual `.json` file.

- `js/database.js` — the flat-file database: load/save, per-turn digs,
  starting new turns, resetting the current turn, per-player reset,
  resetting every player at once, lifetime aggregation, file export/import

## Biggest Gusher

A per-turn high score, themed to the drilling setting rather than a generic
"high score": each player's best single turn total is tracked and shown as
a **🛢️ Biggest Gusher** badge — the total and which turn hit it (e.g.
"Biggest Gusher: 512 (Turn 3)") — next to the Dig Grid's stats, and in the
title screen's Collection modal for whichever player is being viewed. The
badge gives a brief "blowout" pulse the moment a turn actually beats the
player's previous record.

If tiles ever stop responding for every player, it isn't a bug in the grid
— it means every player has used all 10 picks in their current turn. That
state now surfaces itself: a banner reading "All three players have used
their picks" appears right above the grid, with its own **Reset Game (All
Players)** button, the moment the last player hits the cap — rather than
requiring a scroll down to the smaller copy of that control in the
Collection panel.
