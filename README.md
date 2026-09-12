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

A drilling mini-game mechanic: a 9x9 grid of hidden tiles (dirt, rock, or oil
well). Clicking a tile digs it, revealing a reward. Each type has its own
payout multiplier on a 1–9 base roll, and its own rarity:

| Tile | Multiplier | Payout | Spawn ratio |
| --- | --- | --- | --- |
| 🟫 Dirt | 1× | 1–9 | 5 |
| 🪨 Rock | 3× | 3–27 | 3 |
| 🛢️ Oil Well | 10× | 10–90 | 1 |

So dirt turns up roughly 5x as often as an oil well, but an oil well pays out
up to 10x as much — the rarer tile is worth chasing. A "Playing as" dropdown
picks which of Player One / Two / Three the digging counts toward — each
player digs their **own independently random, private board**: nobody sees
what tiles the others have revealed, or is influenced by their layout.
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
- `js/dig-grid.js` — grid generation (weighted spawn, per-type payout),
  digging, turn-limit enforcement

## Collection & Database

Every dig is recorded against the player's *current turn*: a count and
resource subtotal per type (Dirt, Rock, Oil Well) for that turn alone. The
**Collection** panel sums every turn played so far into lifetime totals per
type, plus a grand total — shown as **one card per player, side by side**,
so all three players' results are visible at once rather than one at a time
behind a dropdown. Each card has its own **Reset This Player** (clears that
player's entire turn history, with a confirmation prompt); **Reset Game
(All Players)** does the same for all three at once, for starting the whole
game over. **Turn History** lists each turn played by the "Playing as"
player — picks used and that turn's total — so results can be compared turn
by turn, not just as one lifetime figure.

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
"Biggest Gusher: 512 (Turn 3)"). It sits next to the Dig Grid's stats for
whoever is "Playing as", and appears inside each player's own card in the
title screen's Collection modal. The Dig Grid badge gives a brief "blowout"
pulse the moment a turn actually beats that player's previous record.

Tiles stopping for one player while the others are still free to dig is
expected — each player's 10-pick cap is independent — but it used to be easy
to mistake for the game being broken, since the only sign was a small line
of text. Two banners now make each case obvious:

- The moment the *currently selected* player hits 10/10, a banner names
  them directly ("Player One has used all 10 picks this turn.") with a
  real, gold **Next Turn** button right in it.
- The moment *all three* players are capped, a second banner replaces it
  with **Reset Game (All Players)** — for starting the whole game over.

(An earlier version of the all-players banner had a CSS bug that let it
show even when not all players were capped, since its own `display: flex`
rule silently overrode the browser's default for a hidden element — fixed
by scoping that override to `.all-capped-banner[hidden]`.)
