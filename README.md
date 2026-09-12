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
up to 10x as much — the rarer tile is worth chasing. Each player digs their
**own independently random, private board**: nobody sees what tiles the
others have revealed, or is influenced by their layout.

**It's a strict, automatic three-player match**, not free player-switching:
Player One, Two, and Three each get exactly **one turn of up to 10 picks per
game**, in that order. A **"Best of 1, 3, or 5"** selector picks how many
games the match runs — one full Player One → Two → Three cycle is one game,
and it repeats for however many games were chosen, tallying every player's
score across all of them. A "Now Playing" indicator shows whose turn it is
and which game the match is on (e.g. "Game 2 of 3") — there's no dropdown,
because nobody chooses; control just isn't given to anyone but the active
player. The instant that player uses their 10th pick (or you use **Show
All** to fill the rest of their turn at once), it **automatically hands off
to the next player** — a brief banner announces the pass, and names the new
game number when one starts — with no button to click and no way to skip
someone or go out of order. Picking a "Best of" value while a match already
has progress asks for confirmation first, since it starts a brand new match;
picking it before anything's been played just applies immediately.
**Reset Turn** lets the *active* player only redo their own turn from
scratch (0/10 picks, fresh board); **Reset Grid** just reshuffles their
current board without touching picks used.

Once Player Three's turn ends in the final game, **the match is over**: the
board and controls disappear, replaced by a **Final Results** screen ranking
all three players by their *combined* total across every game played,
highest first, with a **Play Again** button that wipes everyone's history
and starts a brand new match (same "Best of" length, unless you pick a
different one) at Player One, Game 1.

Reachable from the title screen's Play button, at `dig-grid.html`.

- `dig-grid.html` — page markup, the "Best of" selector, active-player
  display, and game container
- `css/dig-grid.css` — grid, tile, turn-bar, and final-results styling
- `js/dig-grid.js` — grid generation (weighted spawn, per-type payout),
  digging, and the automatic Player One → Two → Three → (next game) hand-off

## Collection & Database

Every dig is recorded against the active player's *current turn*, one per
game they've played: a count and resource subtotal per type (Dirt, Rock, Oil
Well). The **Collection** panel sums *every game's* turn into a grand total
per player — shown as **one card per player, side by side**, so all three
are visible at once regardless of whose turn it currently is. Each card has
its own **Reset This Player** (clears that player's history, with a
confirmation prompt); **Reset Game (All Players)** does the same for all
three at once and restarts the match at Player One, Game 1 (the same action
as **Play Again** on the Final Results screen, and as picking a "Best of"
value mid-match). **Turn History** lists every game the active player has
played so far — picks used and that game's total — so results can be
compared game by game, not just as one combined figure.

Records live in a flat-file JSON database — one object keyed by player, each
holding an ordered array of turn records — persisted to `localStorage`, and
portable via **Export Database** / **Import Database** on the Dig Grid page,
which write and read that same JSON structure as an actual `.json` file.

**Collection never carries over from one deployment to the next.**
`js/database.js` stamps every saved game with a `BUILD_ID` constant; on
load, if a visitor's stored stamp doesn't match the `BUILD_ID` currently
running, their saved game is wiped before anything else touches it — Player
One, Two, and Three all start over at Turn 1, 0/10 picks, Collection at
zero. Progress still persists normally *within* one deployment (a reload
without a new deploy keeps your picks); it just can never survive past the
deployment it was saved under. **Whoever ships a future update that should
reset every player's progress must change `BUILD_ID` in `js/database.js`** —
that's the one thing that has to be remembered by hand; everything else
about the reset is automatic. Game rules (payouts, spawn ratio, the 10-pick
cap) live in the code itself, never in storage, so no reset ever touches
them.

- `js/database.js` — the flat-file database: load/save, per-turn digs,
  the Player One → Two → Three → next-game match state and advancement,
  resetting the current turn, per-player reset, resetting the whole match
  (optionally choosing a new "Best of" length), lifetime aggregation, file
  export/import

## Biggest Gusher

A per-turn high score, themed to the drilling setting rather than a generic
"high score": the active player's best single turn total is tracked and
shown as a **🛢️ Biggest Gusher** badge — the total and which turn hit it
(e.g. "Biggest Gusher: 512 (Turn 1)"). It sits next to the Dig Grid's stats,
and appears inside each player's own card in the title screen's Collection
modal. The Dig Grid badge gives a brief "blowout" pulse the moment a turn
actually beats that player's previous record.

## Notes on past bugs

Two CSS/behavior bugs surfaced and were fixed while building this: an early
version of a status banner set `display: flex` directly on its class, at the
same specificity as the browser's default `[hidden] { display: none }`,
which meant it could show regardless of its `hidden` property — fixed by
adding a permanent, page-wide `[hidden] { display: none !important; }` rule
in both stylesheets, so no future component style can make that mistake
again. Separately, the page used to persist and reopen on whichever player
was last selected, which (combined with independent per-player turn caps)
made a returning, already-capped player look like the whole game was
broken — moot now that there's no manual player selection at all, only the
automatic one-turn-each match described above.
