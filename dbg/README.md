# Developer debug harness — `?debug=...`

Every page of this site can load an external developer script without changing how the
game behaves for players. Nothing is fetched or executed unless the URL asks for it.

## Switching it on

```
arena.html?debug=dbg/arena.js
arena.html?debug=arena.js          same thing — a bare name gets the dbg/ prefix
tilt.html?language=ru&debug=dbg/tilt.js     both parameters together
```

The page's loader (a 12-line block just before `</body>`) reads the `debug` parameter,
loads the shared engine `dbg/_harness.js`, then loads the file you named. If the
parameter is absent, the file is missing, the path contains `..`, or the load fails,
the page runs exactly as it does without the harness — one `console.warn` at most.

The engine is one file for all games (`dbg/_harness.js`); `dbg/<game>.js` holds only the
game-specific map: which variables to read, which numbers are balance knobs, which
selectors carry the interface, which cheats are useful, and what it all means.

## The panel

Opens on the right edge. `Ctrl+Shift+D` collapses it. Typing or clicking inside the
panel never reaches the game's hotkeys.

| tab | what it is |
|---|---|
| **STATE** | the game's own variables, re-read every 700 ms. Same object as `TLDBG.state()` in the console, plus the game script's one-shot debug tools. |
| **ELEMENTS** | every element with a name, class, `data-*`, or interactive tag: selector, tag, id, classes, all attributes, box size and position, computed styles, its translation key. `PICK ON PAGE` selects by clicking the game. |
| **LAYOUT** | width/height/min/max, position and offsets, display, flex direction, justify, align, gap, padding, margin, font size, letter spacing, text align, line height, radius, opacity, z-index, overflow, transform — written **per screen mode**, plus alignment presets (flex row/column center, spread, grid, absolute corners). |
| **TEXTS** | every translation key of every language the page ships, editable in place; the change repaints the live page immediately (canvas too, because the kit's redraw hooks fire). |
| **BALANCE** | the game's coefficients, each showing where it lives in the source (`file : line : name`) and its current value. |
| **CHEATS** | toggles and one-shot tools the game script registers, each with a description. |
| **CONTROL** | the game script's `control` list: named actions with an argument field and the console form (`TLDBG.do('id', arg)`) — driving bots, spawning entities, teleporting, forcing difficulty, printing state. Plus `RECIPES`: runnable multi-line snippets that set up a whole scenario. |
| **CODE** | your own CSS and JS, run against the live page. Classic scripts share the page's global scope, so the game's own names are reachable. |
| **EXPORT** | `DOWNLOAD JSON` / `COPY JSON` / `PREVIEW` for everything you changed, plus notes. `DOWNLOAD DELTA` / `COPY DELTA` / `PREVIEW DELTA` for **only** the changes, each with before/after and your comment — the form an LLM needs to make them permanent. `CLEAR STORED EDITS` undoes all of it. |
| **DOCS** | the game script's own description of its knobs and cheats. |

Edits are also kept in `localStorage` under `tll:dbg:<game>`, so a reload keeps the
tuning session, and re-applies on the next harness load. Player-facing storage keys
(`tll:lang`, game saves) are untouched.

### Screen modes

Layout edits are bucketed per screen mode and emitted as media queries, so all four
can be tuned at once and the right one applies on the right device:

`portrait-mobile`, `portrait-desktop`, `landscape-mobile`, `landscape-desktop`, `any`.

- portrait / landscape → `(orientation: portrait)` / `(orientation: landscape)`
- mobile / desktop → `(pointer: coarse)` / `(pointer: fine)` (mobile also matches ≤ 720 px)

The panel header tells you the current mode; the mode chips choose which bucket you are
editing. To see another bucket, resize the window or use the browser's device emulation.

## WYSIWYG pick-and-edit

`TLDBG.wysiwyg(true)` (or **PICK ON PAGE** in ELEMENTS) turns the live page into an editor.
Hover any element and a floating popup appears anchored to it:

- the element's selector, tag, id, classes and current box,
- one row per editable property (the LAYOUT list: size, position, offsets, display, flex,
  gap, padding, margin, font, letter spacing, alignment, radius, opacity, z-index,
  overflow, transform) — each field writes **as you type**, on the live page, in the
  current screen-mode bucket,
- `TEXT`, `CLASSES` and attribute rows for the same element,
- numeric fields nudge with ± buttons and keep their unit; transform fields apply live,
- alignment presets merge into what is already set for that selector and mode,
- a comment box per selector: free text about *why* the change exists.

Press and hold near the **middle** of an element and drag: the editor moves a highlighted
ghost copy of that element under the pointer while it reads the surroundings — the other
elements' edges, corners and centres, the container, the viewport — and proposes the rules
that fit where you are letting go:

- edge alignment (this left edge with that left edge), centre alignment (shared vertical or
  horizontal axis), viewport margins (8 px), and equal spacing (the gap to a neighbour
  matching a gap that already exists elsewhere on the axis),
- each proposal is offered as **absolute** `left`/`top` (relative to the offset parent) or,
  when the element sits in normal flow, as a `transform: translate(...)` that does not
  restructure the page; the popup lists them ranked — click a row to choose one,
- snap guides are drawn at the target line, the ghost shows the box the element will land
  in, and its label names the rule ("left edge of #search, centred in .grid"),
- releasing the mouse commits the selected proposal into the current screen-mode bucket;
  `Esc` cancels the drag and leaves nothing recorded.

Eight handles on the pinned/hovered box (four corners, four edge midpoints) resize it the
same way: the moving edge snaps to the same targets, and matching the width or height of
another element is itself a snap candidate. Elements smaller than the handle tolerance keep
their middle as a move target instead.

**Double-click** an element to edit its text where it sits on the page. The editor opens in
the language the page is showing right now (`documentElement.lang`, the kit's `lang()`, or
the TEXTS tab language) and says so in its hint: a `data-t` / `data-i18n` element writes the
translation table entry for that language, anything else writes the element's own markup
text. `Enter` keeps, `Esc` cancels, `Shift+Enter` breaks a line. Double-clicking a picture
or an icon climbs to the nearest element that actually holds text, so clicking a card's
screenshot edits the card's name.

Click pins the element (the popup stops following the pointer); `Esc` or
`TLDBG.wysiwyg(false)` releases it. Edits stay and are recorded with their original values,
exactly as in LAYOUT. A drag or a resize writes an automatic comment on that selector
("dragged into place: …", "resized by dragging the se handle: …") unless you already wrote
one, so the delta says *why*, not just *what*.

Programmatic equivalents, all recording the before value: `TLDBG.pick(sel)`,
`TLDBG.set(sel, prop, value)`, `TLDBG.elText(sel, text)`, `TLDBG.classes(sel, "a b")`,
`TLDBG.attr(sel, name, value)`, `TLDBG.align(sel, preset)`,
`TLDBG.alignTo(sel, refSel | "viewport", "left" | "right" | "centreX" | "top" | "bottom" |
"centreY")`, `TLDBG.resizeTo(sel, w, h)`, and the drag inference without a mouse:
`TLDBG.suggest(sel, dx, dy)` (ranked proposals for a move by `dx, dy`) and
`TLDBG.dragTo(sel, dx, dy, rank)` (commit one of them).

## DELTA — changes only

`TLDBG.delta()` returns only what you changed:

```json
{ "total": 3, "changes": [
  { "kind": "layout", "file": "arena.html", "screenMode": "landscape-desktop",
    "media": "@media (orientation: landscape) and (pointer: fine)",
    "selector": "#hud", "prop": "font-size", "before": "12px", "after": "14px",
    "comment": "readable at arm's length on a laptop",
    "action": "set font-size: 14px on #hud inside @media …" },
  { "kind": "balance", "param": "dieselMax", "before": 180, "after": 240,
    "source": { "file": "arena.html", "line": 412, "name": "DIESEL_MAX" },
    "comment": "…", "action": "change that constant to 240" },
  { "kind": "element-text", "selector": "#statWrap", "before": "…", "after": "…", "action": "…" }
] }
```

Kinds: `layout`, `text`, `element-text`, `class`, `attribute`, `balance`, `css`, `js`,
`control` (which CONTROL/CHEATS actions were exercised). `before` is the value captured the
moment you first touched that property; untouched things are not listed. A drag or a corner
resize lands in `layout` with the rule it snapped to in `comment`, so the patch reads as
intent, not as magic numbers. Editing an element that carries a translation key emits a
single `text` entry for the language the page shows — never the same change twice as both
`text` and `element-text`.
`TLDBG.downloadDelta()`, `TLDBG.copyDelta()` and the EXPORT tab's DELTA buttons emit it.
Hand the delta to an LLM with the page file: every entry names the file, the selector or
the `file:line`, before/after, and the intent from the comment.

## Programmatic control

Every game script registers `control` entries and `recipes` — driving bots, opponents and
whole scenarios from a script instead of a keyboard:

```js
TLDBG.control()                       // [{ id, label, args, doc }]
TLDBG.do("seat", [0, "cpu"])          // hand the seat to the CPU brain
TLDBG.do("think", 0)                  // one decision frame of cpuThink(p)
TLDBG.do("aiParam", [1, "agg", 0.95]) // tune a rival driver's aggression
TLDBG.do("probe")                     // read the state the action just changed
TLDBG.do("watch", 1)                  // console trace every second (0 stops)
TLDBG.recipes()                       // runnable scenario snippets
```

`do(id, arg)` matches an id or a label and parses a JSON-looking string argument, so
`TLDBG.do("seat", '[0, "cpu"]')` works from a shell as well; with no argument it uses the
entry's `argDefault`. The return value is the honest result — a state object, or a string
such as `"no seat 1"` when that seat does not exist — never a silent success. Entries that
need a live run start one through the page's own button (`#btnDeploy`, `#btnLaunch`,
`#start`, `#startBtn`, `#play`) when nothing is running, so a cold page still answers.

Recipes run in **page scope** (`new Function`): they may use the page's globals and
`window.TLHOOK`, never the debug script's locals. Usual shapes — deterministic physics
tests with a fixed bag or seed, threshold sweeps over difficulty rows, per-entity heat
maps, watch timers.

Every `dbg/<game>.js` follows the same conventions: `probe` reports the state an AI
question is answered from, `watch` logs it over time, and difficulty is written through the
page's live tables (`DIFFS`, `DIFF_PARAMS`, `EDEF`) rather than by editing source.

## Export JSON

`<game>-debug-edits.json`, schema version `tllDebugExport: 1`:

```json
{
  "tllDebugExport": 1, "harnessVersion": "2026.11.23.2",
  "generated": "2026-11-22T10:00:00.000Z",
  "game": "arena", "page": "arena.html", "harness": "dbg/arena.js",
  "url": "...", "language": "en", "screenMode": "landscape-desktop",
  "viewport": { "w": 1280, "h": 720, "dpr": 1 },
  "edits": {
    "layout": { "portrait-mobile": { "#hud": { "font-size": "14px", "left": "8px" } } },
    "texts":  { "ru": { "startBtn": "В БОЙ" } },
    "balance": { "dieselMax": 240 },
    "css": "#hud{outline:1px solid red}", "js": "score=999999",
    "notes": "what you intended", "cheatsUsed": ["godMode"]
  },
  "applyHints": [
    { "kind": "layout",  "file": "arena.html", "screenMode": "portrait-mobile",
      "selector": "#hud", "props": { "font-size": "14px" },
      "action": "set these CSS declarations on the selector, inside the media query for that screen mode" },
    { "kind": "texts",   "file": "arena.html", "language": "ru", "keys": { "startBtn": "В БОЙ" },
      "kit": true, "action": "update these translation keys in that language's table ..." },
    { "kind": "balance", "file": "arena.html", "param": "dieselMax", "value": 240,
      "source": { "file": "arena.html", "line": 412, "name": "DIESEL_MAX" },
      "action": "change that constant/expression to the new value" }
  ],
  "balance":  [ { "id": "dieselMax", "label": "Tank capacity", "value": 180, "unit": "L",
                  "min": 0, "max": 900, "code": { "file": "arena.html", "line": 412, "name": "DIESEL_MAX" },
                  "doc": "...", "edited": true } ],
  "cheats":   [ { "id": "godMode", "doc": "..." } ],
  "elements": [ { "selector": "#hud", "tag": "DIV", "id": "hud", "classes": ["hud"],
                  "attrs": { "data-t": "hud" }, "dataT": "hud", "text": "FUEL",
                  "rect": { "x": 12, "y": 12, "w": 200, "h": 44 },
                  "computed": { "position": "absolute", "display": "flex", "font-size": "12px" },
                  "screenMode": "landscape-desktop" } ],
  "state":    { "...live snapshot of the game's variables..." },
  "docs":     [ { "topic": "...", "text": "..." } ]
}
```

### Folding an export back into the source

`applyHints` is the work list; each entry names the file and where to change it. The
DELTA file (`TLDBG.delta()`) is the same list filtered to what actually changed, with
`before`/`after` and your comment on each entry — apply the DELTA, not the full export,
when you only want the session's edits.

1. **layout** → in `<file>`'s `<style>` block, add or amend the rule for that selector
   inside the matching `@media (orientation: …) and (pointer: …)` query (or plainly, for
   `any`). Keep the page's existing breakpoints and never write `!important` into the page.
2. **texts** → with `"kit": true` the key belongs to the shared vocabulary in `i18n.js`
   (`COMMON` / the page's `TLI18N.add` block); otherwise it lives in the page's own table
   (`TR` for billiards and tilt, `I18N` for bk). Edit that language's value only, keep
   every `{placeholder}` token, and keep the key present in all languages.
3. **balance** → change the named constant/expression at the reported `file:line`. If the
   export's `source` is missing, locate the value by `balance[].label` and current `value`.
4. **css / js** → intentional developer experiments; fold them into the page where they
   were meant to land, or drop them. `notes` says which.

## Console API

```js
TLDBG.state()                 // live game object
TLDBG.edits                   // everything you have changed
TLDBG.screenMode()            // "portrait-mobile" | ...
TLDBG.info("#hud")            // element report (also TLDBG.info(element))
TLDBG.pick("#hud")            // inspect + highlight
TLDBG.set("#hud", "width", "240px")            // one layout property, current mode
TLDBG.align("#menu", "flex column center")
TLDBG.alignTo("#hud", "#menu", "left")      // snap an edge/centre to another element, or "viewport"
TLDBG.resizeTo("#hud", 240, 140)
TLDBG.suggest("#hud", 30, -6)               // ranked proposals for dragging it by 30,-6
TLDBG.dragTo("#hud", 30, -6, 2)             // commit proposal 2 of that drag
TLDBG.elText("#hud", "FUEL")                   // element text, recorded with the old text
TLDBG.classes("#hud", "hud wide")              // class attribute
TLDBG.attr("#hud", "data-t", "hudFuel")        // any attribute
TLDBG.text("ru", "startBtn", "В БОЙ")
TLDBG.param("dieselMax")      // read;  TLDBG.param("dieselMax", 240)  write
TLDBG.wysiwyg(true)           // hover pick-and-edit popup on the live page
TLDBG.pick("#hud")            // inspect + highlight (click pins it)
TLDBG.delta()                 // changes only, with before/after and comments
TLDBG.downloadDelta(); TLDBG.copyDelta()
TLDBG.control(); TLDBG.do("seat", [0, "cpu"])   // game actions; JSON-string args accepted
TLDBG.recipes()               // runnable scenario snippets (page scope)
TLDBG.hook                    // window.TLHOOK / window.DBHOOKS, for get()/call()
TLDBG.get("AI.aggression")    // read a bridge path; setPath(path, v) writes it
TLDBG.call("spawnEnemy", 3)   // call a bridge function with arguments
TLDBG.key("Space"); TLDBG.tap(420, 300)        // synthetic keyboard / pointer
TLDBG.exportJson()            // the object above
TLDBG.download(); TLDBG.copy(); TLDBG.refresh()
TLDBG.modes; TLDBG.props      // the buckets and the editable property list
```

## Writing a game script

A game script calls `TLDBG.register({...})` and nothing else. Read `dbg/noid.js` and
`dbg/tilt.js` as the two shapes: one page that needs a bridge object, one page whose
names are already global. The full contract is `local://dbg-api.md`.

```js
TLDBG.register({
  game: "noid", file: "noid.html",
  state: function () { return { score: ..., phase: ... } },   // polled every 700 ms
  params: [ { id: "gravity", label: "Gravity", unit: "px/s2", min: 0, max: 2000, step: 10,
              get: ..., set: ..., code: { file: "noid.html", line: 214, name: "GRAV" },
              doc: "what this number changes in play" } ],     // readonly:true for const rows
  cheats: [ { id: "god", label: "God mode", doc: "...", toggle: true, on: function (v) {} },
            { id: "win", label: "Win level", doc: "...", run: function () {} } ],
  control: [ { id: "seat", label: "Seat mode", args: '[index, "human"|"cpu"]', argDefault: '[0, "cpu"]',
              doc: "why this matters and what the return value means", run: function (arg) { ... return state } } ],
  recipes: [ { label: "Deterministic stack test", doc: "...", js: "page-scope snippet, \\n newlines" } ],
  hooks:  [ { label: "log enemies", doc: "...", run: function () { console.table(...) } } ],
  layout: [ { sel: "#hud", label: "HUD" }, { sel: ".menu", label: "title panel" } ],
  texts:  { langs: ["en","ru"], keys: fn, get: fn, set: fn, apply: fn },  // omit for kit pages
  docs:   [ { topic: "...", text: "..." } ]
})
```

Rules that keep it honest: never read a game name at load time (only inside
`get`/`set`/`state`/`run`/`on`), `code:{file,line,name}` must be the real line, a `const`
binding is readable but not assignable so its row is `readonly:true` with the reason in
`doc`, and `texts` is only for pages with a page-local table (`langs` may be an array or a
getter function). Pages that load the shared `i18n.js` kit need no `texts` block at all.
Each game page embeds that kit (and `fs.js`, the shared fullscreen control) inline, so the
page runs standalone; `i18n.js` and `fs.js` stay the source of truth — edit them, then
re-inline the blocks marked `<!-- inlined i18n.js -->` / `<!-- inlined fs.js -->`. Only the
debug loader and `dbg/*.js` remain external, exactly as above.

For `control` entries: the return value is the answer, not a success flag — return the
state you read (`{ seat: 0, cpu: true }`) or a plain string when the request cannot be
satisfied (`"no seat 1"`). Do not swallow a missing entity into `{ ok: true }`. A
single-line entry ends `... }; } },` — a stray `;` before the closing brace (`} }; } },`)
is a syntax error in an object literal, and `node --check dbg/<game>.js` catches it.
Anything that needs the game running clicks the page's own start button first; never
fabricate a game object.

## The TLHOOK bridge

Most pages wrap the whole game in a strict IIFE, so `dbg/<game>.js` could reach nothing.
Those pages carry ONE tiny handle at the end of the game IIFE — names only, no logic, no
listeners, nothing that runs:

```js
window.TLHOOK = {
  get state(){return state}, set state(v){state=v},   // re-assigned vars: accessors
  balls: balls, CFG: CFG,                              // tables: plain properties
  get hurt(){return hurt}, set hurt(f){hurt=f}         // fns a cheat must wrap
};
```

The page behaves identically with and without `?debug`; the handle is just a window
property. Pages whose names are top level (`tilt.html`, `bk.html`, `asteroids.html`,
`index.html`'s grid, `oilstorm.html`'s `var`/`function` engine) need no handle, and
`bowling100.html` uses `window.DBHOOKS` for the same purpose. Everything the handle does
not expose stays closure-private, and the game script's DOCS tab says what that is.

One caveat: a top-level `const`/`let` in a classic script is a script-scope lexical
binding, not a `window` property — `window.game` is `undefined` in `tetris.html` while
bare `game` resolves in any script or inline handler. Scripts for such pages
(`dbg/tetris.js`, `dbg/tetris2.js`) refer to the names directly.

## Game scripts on this site

| script | page | bridge | texts |
|---|---|---|---|
| `dbg/bowling100.js` | bowling100.html | `window.DBHOOKS` | kit |
| `dbg/arena.js` | arena.html | `TLHOOK` | kit |
| `dbg/asteroids.js` | asteroids.html | none (globals) | kit |
| `dbg/billiards.js` | billiards.html | `TLHOOK` | page `TR` |
| `dbg/bk.js` | bk.html (bench kit) | none (`BENCHKIT` global) | page `I18N` |
| `dbg/noid.js` | noid.html | `TLHOOK` | page table |
| `dbg/tilt.js` | tilt.html | none (globals) | page `TR` |
| `dbg/index.js` | index.html (catalogue) | `TLHOOK` (i18n block) | page `TR`, incl. `tags.<name>` |
| `dbg/bomberman.js` | bomberman.html | `TLHOOK` | kit |
| `dbg/bullethell.js` | bullethell.html | none (globals) | kit |
| `dbg/defender.js` | defender.html | none (globals) | kit |
| `dbg/earth.js` | earth.html | none (globals) | kit |
| `dbg/jeltris.js` | jeltris.html | `TLHOOK` | kit |
| `dbg/lander.js` | lander.html | none (globals) | kit |
| `dbg/lemmings.js` | lemmings.html | `TLHOOK` | kit |
| `dbg/minigolf3D.js` | minigolf3D.html | none (globals) | kit |
| `dbg/moto.js` | moto.html | none (globals) | kit |
| `dbg/pinball.js` | pinball.html | `TLHOOK` | kit |
| `dbg/pinball32.js` | pinball32.html | `TLHOOK` | none (single language) |
| `dbg/quad.js` | quad.html | `TLHOOK` | kit |
| `dbg/stuntcarracer.js` | stuntcarracer.html | none (globals) | kit |
| `dbg/tanks.js` | tanks.html | `TLHOOK` | kit |
| `dbg/tanks_editor.js` | tanks_editor.html | `TLHOOK` | kit |
| `dbg/tetris.js` | tetris.html | none (script-scope `const`) | none (single language) |
| `dbg/tetris2.js` | tetris2.html | none (script-scope `const`) | kit |
| `dbg/tetro.js` | tetro.html | `TLHOOK` (next to `window.TETRIS`) | kit |
| `dbg/oilstorm.js` | oilstorm.html | none (`var`/`function` globals) | none (single language) |

The catalogue is not a game: its BALANCE rows are CSS numbers (min card width inside
`.grid`'s `minmax()`, gap, card padding/radius, text sizes, screenshot height, dialog and
flag-button widths), its CHEATS drive the real `#search` input so filtering behaves as
when a person types, and its ELEMENTS/LAYOUT tabs cover header, stats pill, cards and the
language dialog. `Columns now` is read-only because the grid is `auto-fill`.

## Reloading your edits

Chromium caches `dbg/_harness.js` and `dbg/<game>.js` aggressively. After editing a debug
script, hard-reload (`Ctrl+Shift+R`) or open DevTools → Network → "Disable cache",
otherwise the panel keeps running the previous version of the file.

## Engine behaviour worth knowing

- The bucket you are editing is applied to the live page **unwrapped**, so you see a
  portrait edit while your window is landscape. `applyHints` — and therefore the JSON and
  the final patch — always wraps each bucket in its own media query.
- An alignment preset **merges** into the props already set for that selector and mode; it
  does not clear width/position/font edits. Clearing one property is done by emptying its
  field in LAYOUT.
- `texts.langs` may be an array or a getter function; the engine calls it if it is one.
- `state()` runs on a timer inside a `try/catch`: a thrown game access shows up as
  `{ "error": "..." }` in STATE instead of breaking the page.
- While WYSIWYG is engaged, presses, clicks and keys do not reach the game — that is what
  makes dragging over a canvas safe. `Esc` exits and the game takes input again.
- The native `dblclick` cannot be used to open the text editor: cancelling the default on
  `pointerdown` (needed so a drag does not select page text) also suppresses Chromium's
  compatibility mouse sequence. The editor therefore opens on the second press within 450 ms
  on the same element, which behaves the same for a person.
- Handle hit-testing is computed from the element's own edges with a 6 px tolerance and the
  middle of the box is excluded, so grabbing a small element's centre is a move, not a
  resize.
- The editor box stops key events in capture only when the target is not its `textarea`, and
  the textarea stops the event itself after handling `Enter`/`Esc`. A blanket capture-phase
  `stopPropagation` on the box would keep the `textarea` from ever seeing `Enter`.

