# Crafty Works

Three linked games sharing one stash, run by opening `index.html` in a
browser — it's the title screen and entry point.

| Game | What it does |
| --- | --- |
| ⛏️ **Crafty Oils** (`dig-grid.html`) | Dig a 9×9 grid for 🟫 dirt, 🪨 rock and 🛢️ oil |
| 🔨 **Crafty Crafting** (`crafting.html`) | Spend those resources on building goods |
| 🏘️ **Crafty Housing** (`housing.html`) | Spend those goods on buildings worth prestige |

Each one feeds the next: nothing can be crafted that wasn't dug, and
nothing can be built that wasn't crafted. All three read and write the same
per-player record described under **Collection & Database**.

Also ships as a native Android app (a WebView wrapper around these same
pages, no network permission needed) — see `android/README.md`. The GitHub
Actions workflow at `.github/workflows/build-android-apk.yml` builds an
installable debug APK automatically, signed with the checked-in
`android/app/debug.keystore` so successive builds install over each other
instead of being rejected as a signature mismatch.

## Title Screen

The hub: the three games get their own tall buttons at the top, and
**Collection** / **How To Play** / **Settings** / **Credits** open in-place
modals below them. Collection shows every player's dug resources, biggest
riser, and crafted/built/prestige totals side by side. Settings currently
holds a sound on/off toggle (persisted via `localStorage`).

- `index.html` — title screen markup
- `css/title.css` — title screen and modal styling
- `js/title.js` — menu button wiring, modal open/close, sound toggle

## Crafty Oils (the Dig Grid)

A drilling mini-game mechanic: a 9x9 grid of tiles that are all anonymous
**"?"** until picked — no class, attribute, or content in the DOM gives a
tile's type away before it's clicked, so inspecting the page can't be used
to find the oil. Clicking a tile digs it, revealing its icon and a
highlighted reward. Each type has its own payout multiplier on a 1–9 base
roll, and its own rarity:

| Tile | Multiplier | Payout | Spawn ratio |
| --- | --- | --- | --- |
| 🟫 Dirt | 10× | 10–90 | 5 |
| 🪨 Rock | 3× | 3–27 | 3 |
| 🛢️ Oil Well | 1× | 1–9 | 1 |

Payout runs the *opposite* way to the usual rarity instinct: dirt is both
the commonest tile and the biggest payout, while an oil well is the rare
find worth almost nothing on the board. So a Crafty Oils score climbs on
dirt, and what's actually scarce is **oil** — turning up roughly a fifth as
often as dirt, and the ingredient every barrel, window and steel beam in
Crafty Crafting needs. A high dig score and a full workshop are therefore
two different goals, and oil is what trades between them.

Each player digs their **own independently random, private board**: nobody
sees what tiles the others have revealed, or is influenced by their layout.

**It's a strict, automatic three-player match**, not free player-switching,
and **no tile is ever shown until a match length is chosen**. Landing on the
page (or resetting) shows a "Choose Your Match" setup step — just a **"Best
of 1, 3, or 5"** button group, no board, no stats, nothing else — and
picking one is what actually starts play: only then does the grid, turn
info, and everything else appear. One full Player One → Two → Three cycle is
one game, repeated for however many games were chosen, tallying every
player's score across all of them.

Once started, a "Now Playing" indicator shows whose turn it is and which
game the match is on (e.g. "Game 2 of 3") — there's no dropdown, because
nobody chooses; control just isn't given to anyone but the active player.
The instant that player uses their 10th pick (or you use **Show All** to
fill the rest of their turn at once), it **automatically hands off to the
next player** — a brief banner announces the pass, and names the new game
number when one starts — with no button to click and no way to skip someone
or go out of order. **Reset Turn** lets the *active* player only redo their
own turn from scratch (0/10 picks, fresh board); **Reset Grid** just
reshuffles their current board without touching picks used.

Once Player Three's turn ends in the final game, **the match is over**: the
board and controls disappear, replaced by a **Final Results** screen ranking
all three players by their *combined* total across every game played,
highest first. Its **Play Again** button — like **New Dig Season (All
Players)** in the Collection panel — starts a fresh season and drops back to
the "Choose Your Match" setup step (the last-picked length stays
pre-highlighted, but nothing plays again until it's confirmed). See
**Seasons** below for exactly what a season reset does and doesn't clear.

Reachable from the title screen's Crafty Oils button, at `dig-grid.html`.

- `dig-grid.html` — page markup, the "Best of" selector, active-player
  display, and game container
- `css/dig-grid.css` — grid, tile, turn-bar, and final-results styling
- `js/dig-grid.js` — grid generation (weighted spawn, per-type payout),
  digging, and the automatic Player One → Two → Three → (next game) hand-off

## Crafty Crafting

Spends raw resources on building goods. Unlike the Dig Grid there's no turn
order here — nobody is handed control, so the page just has a **player
picker** and whoever is spending selects themselves.

| Good | Costs |
| --- | --- |
| 🧱 Brick | 1 dirt + 1 rock |
| ⚙️ Gear | 2 rock |
| 🛢️ Barrel | 3 oil |
| 🪟 Window | 1 dirt + 2 oil |
| 🔩 Steel Beam | 2 rock + 3 oil |

Costs are deliberately tiny, because a single game only gives each player
ten picks — and with oil at a 1-in-9 spawn, a ten-pick turn yields only
about one of it, so anything priced in oil is the real investment. Every
card shows a per-line `have/needed` readout that turns red on whichever
ingredient is short, and its **Craft** button stays disabled until the whole
recipe is covered. Crafting **consumes** its resources: a
dug tile can only ever be spent once, tracked as a running `spent` ledger
against what the player's turns dug.

- `crafting.html` / `js/crafting.js` — recipe cards, wallet, workshop ledger
- `css/workshop.css` — shared styling for this page and Crafty Housing
- `js/workshop.js` — the player picker, wallet chips, and cost lines both
  spending pages use

## Crafty Housing

Spends crafted goods on somewhere to live, the same shape as Crafting — a
player picker, a wallet of what's unbuilt, and cards that only enable once
affordable.

| Building | Costs | Prestige |
| --- | --- | --- |
| 🏕️ Tent | 2 bricks | 50 |
| 🛖 Shack | 3 bricks + 1 window | 120 |
| 🏠 House | 5 bricks + 2 windows + 1 beam | 300 |
| 🏡 Villa | 8 bricks + 3 windows + 2 beams + 2 gears | 650 |
| 🏰 Estate | 12 bricks + 5 windows + 4 beams + 3 gears + 2 barrels | 1200 |

Buildings stand permanently and never refund. Because windows, beams and
barrels all cost scarce oil, the upper tiers run to far more oil than one
match yields — an Estate needs roughly 28 of it against the ~5 a best-of-5
turns up — so the big builds are funded across several **seasons**.

- `housing.html` / `js/housing.js` — building cards, wallet, estate ledger

## Seasons

Starting a new match (**Play Again**, **New Dig Season**, or just picking a
"Best of" length) opens a new *dig season*. A season reset clears every
player's turn history **and** the raw-resource ledger those turns fed —
those two have to move together, since clearing dug totals while keeping
`spent` would leave a player owing resources they no longer have. What it
deliberately keeps is **crafted goods and finished buildings**, so a Villa
or Estate can be funded over several matches instead of needing to come out
of one.

For a genuinely total wipe there's **Reset This Player** on each Collection
card, which clears that player's digs, workshop, and estate alike.

## Collection & Database

Every dig is recorded against the active player's *current turn*, one per
game they've played: a count and resource subtotal per type (Dirt, Rock, Oil
Well). The **Collection** panel sums *every game's* turn into a grand total
per player — shown as **one card per player, side by side**, so all three
are visible at once regardless of whose turn it currently is. Each card has
its own **Reset This Player** (a total wipe for that player — digs, workshop
and estate — with a confirmation prompt); **New Dig Season (All Players)**
starts a fresh season for all three at once and restarts the match at Player
One, Game 1 (the same action as **Play Again** on the Final Results screen,
and as picking a "Best of" value mid-match). **Turn History** lists every
game the active player has played so far — picks used and that game's
total — so results can be compared game by game, not just as one combined
figure.

Records live in a flat-file JSON database — one object keyed by player —
persisted to `localStorage`, and portable via **Export Database** / **Import
Database** on the Dig Grid page, which write and read that same JSON
structure as an actual `.json` file. Each player record holds an ordered
array of turn records plus four counter ledgers that make the three games
add up:

| Field | Holds |
| --- | --- |
| `turns` | every dig, by game, by type |
| `spent` | raw resources consumed by crafting |
| `crafted` | goods made, ever |
| `itemsSpent` | goods consumed by housing |
| `built` | buildings standing |

A wallet is always a subtraction over those — available resources are
`aggregate(turns) − spent`, available goods are `crafted − itemsSpent` — so
no balance is ever stored directly and none can drift. Both spending calls
re-check affordability against the freshly loaded record before writing, so
a stale button in a second tab can't overdraw a wallet into the negative,
and anything read back from storage is rebuilt through `sanitizeTally()`,
which drops unknown keys and clamps every count to a non-negative whole
number.

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
cap, recipe and building costs) live in the code itself, never in storage,
so no reset ever touches them.

- `js/database.js` — the flat-file database: load/save, per-turn digs,
  the Player One → Two → Three → next-game match state and advancement,
  the recipe and building tables, crafting/building and their wallet
  arithmetic, resetting the current turn, per-player reset, starting a new
  season (optionally choosing a new "Best of" length), lifetime aggregation,
  file export/import

## Biggest Riser

A per-turn high score, themed to the drilling setting rather than a generic
"high score": the active player's best single turn total is tracked and
shown as a **🛢️ Biggest Riser** badge — the total and which turn hit it
(e.g. "Biggest Riser: 512 (Turn 1)"). It sits next to the Dig Grid's stats,
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
