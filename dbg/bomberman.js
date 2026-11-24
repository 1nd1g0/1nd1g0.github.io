/* dbg/bomberman.js — developer harness for bomberman.html
 *
 * Load with:  bomberman.html?debug=dbg/bomberman.js
 * Everything here reads/writes the live game through `window.TLHOOK`
 * (bomberman.html, the bridge block at the end of the game IIFE).
 * The page behaves identically when the ?debug parameter is absent.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK); }
  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }

  /* Enemy speeds live in a table the game reads at spawn time. We scale the
     table itself and keep the untouched originals, so setting 2 means exactly
     twice the shipped speeds and setting it twice does not compound. */
  var baseSpeed = null;
  function snapshot() {
    var t = h().ETYPES;
    if (!baseSpeed) baseSpeed = t.map(function (e) { return e.speed });
  }
  function enemyScale() {
    snapshot();
    return baseSpeed[0] ? h().ETYPES[0].speed / baseSpeed[0] : 1;
  }
  function setScale(v) {
    snapshot();
    var t = h().ETYPES, i;
    for (i = 0; i < t.length; i++) t[i].speed = baseSpeed[i] * v;
  }

  /* Freeze / slow motion wrap the game's own update(): the game loop calls it
     by name, so replacing the binding is enough, and the restore puts the
     original function back exactly. */
  var realUpdate = null;
  function wrap(scale) {
    var T = h();
    if (!realUpdate) realUpdate = T.update;
    if (scale === null) { T.update = realUpdate; return; }
    T.update = function (dt) { realUpdate(dt * scale); };
  }

  var godOn = false, realKill = null;
  function setGod(v) {
    var T = h();
    if (v) {
      if (!realKill) realKill = T.killPlayer;
      T.killPlayer = function () { };
      T.players.forEach(function (p) { p.invuln = 9e9; });
      godOn = true;
    } else {
      if (realKill) T.killPlayer = realKill;
      T.players.forEach(function (p) { if (p.invuln > 1e8) p.invuln = 0; });
      godOn = false;
    }
  }

  function pl() { var p = h().players; return p && p[0]; }
  function each(fn) { var p = h().players; if (p) p.forEach(fn); }

  TLDBG.register({
    game: "bomberman", file: "bomberman.html",

    state: function () {
      var T = h(), p = pl();
      return {
        phase: T.state, level: T.level, elapsed: Math.round(T.time * 10) / 10,
        players: T.players.length, enemies: T.enemies.length,
        bombs: T.bombs.length, blasts: T.blasts.length,
        powerupsOnField: T.powerups.length,
        exitOpen: !!(T.exit && T.exit.active),
        frozen: Math.round(T.frozen * 100) / 100,
        grid: T.GW + "x" + T.GH, levelSize: T.levelSize, mode: T.playerMode,
        hostile: T.hostile, split: T.splitOn,
        score: p ? p.score : 0, lives: p ? p.lives : 0, hearts: p ? p.hearts : 0,
        speed: p ? Math.round(p.speed * 100) / 100 : 0,
        maxBombs: p ? p.maxBombs : 0, fire: p ? p.fire : 0,
        activeBombs: p ? p.activeBombs : 0,
        hasKey: p ? !!p.hasKey : false, remote: p ? !!p.remoteControl : false
      };
    },

    params: [
      { id: "fuse", label: "Bomb fuse", unit: "s", min: 0.2, max: 8, step: 0.1,
        get: function () { return h().BOMB_FUSE },
        set: function (v) { h().BOMB_FUSE = v },
        code: { file: "bomberman.html", line: 421, name: "BOMB_FUSE" },
        doc: "Seconds before a placed bomb explodes. Applies to bombs placed from now on." },
      { id: "blast", label: "Blast visible time", unit: "s", min: 0.1, max: 2, step: 0.05,
        get: function () { return h().BLAST_TIME },
        set: function (v) { h().BLAST_TIME = v },
        code: { file: "bomberman.html", line: 421, name: "BLAST_TIME" },
        doc: "How long the explosion flame stays drawn after the bomb goes off." },
      { id: "pspeed", label: "Player move speed", unit: "tiles/s", min: 1, max: 12, step: 0.1,
        get: function () { var p = pl(); return p ? p.speed : 4.4 },
        set: function (v) { each(function (p) { p.speed = v }) },
        code: { file: "bomberman.html", line: 1091, name: "makePlayer().speed" },
        doc: "Movement speed of every player. Power-ups add to it (+0.55 each, cap 8.5 by the game's own rule)." },
      { id: "maxbombs", label: "Bombs per player", unit: "live", min: 1, max: 12, step: 1,
        get: function () { var p = pl(); return p ? p.maxBombs : 1 },
        set: function (v) { each(function (p) { p.maxBombs = v }) },
        code: { file: "bomberman.html", line: 1091, name: "makePlayer().maxBombs" },
        doc: "How many bombs one player may have placed at once." },
      { id: "fire", label: "Bomb blast range", unit: "tiles", min: 1, max: 16, step: 1,
        get: function () { var p = pl(); return p ? p.fire : 2 },
        set: function (v) { each(function (p) { p.fire = v }) },
        code: { file: "bomberman.html", line: 1091, name: "makePlayer().fire" },
        doc: "Arm length of that player's explosions, in tiles per direction." },
      { id: "lives", label: "Player lives", unit: "lives", min: 0, max: 9, step: 1,
        get: function () { var p = pl(); return p ? p.lives : 3 },
        set: function (v) { each(function (p) { p.lives = v }) },
        code: { file: "bomberman.html", line: 1091, name: "makePlayer().lives" },
        doc: "Respawns left. 0 and a death ends the run (the HUD hearts are a separate pool, `hearts`)." },
      { id: "enemyScale", label: "Enemy speed scale", unit: "x", min: 0.1, max: 4, step: 0.1,
        get: function () { return enemyScale() },
        set: function (v) { setScale(v) },
        code: { file: "bomberman.html", line: 465, name: "ETYPES[i].speed" },
        doc: "Multiplies every enemy type's shipped speed (types run 1.0-3.0 tiles/s). Absolute: 1 restores the file values, 2 doubles them. Enemies already on the field keep the speed they spawned with (the game adds a +2% per level bonus at spawn)." },
      { id: "gw", label: "Grid width", unit: "tiles", min: 9, max: 31, step: 2,
        get: function () { return h().GW },
        set: function (v) { h().GW = v },
        code: { file: "bomberman.html", line: 499, name: "GW" },
        doc: "Level width. Takes effect on the next level (CHEATS: next level), because the maze is built at level start." },
      { id: "gh", label: "Grid height", unit: "tiles", min: 9, max: 31, step: 2,
        get: function () { return h().GH },
        set: function (v) { h().GH = v },
        code: { file: "bomberman.html", line: 499, name: "GH" },
        doc: "Level height. Takes effect on the next level." },
      { id: "frozen", label: "Clock power freeze", unit: "s", min: 0, max: 60, step: 1,
        get: function () { return h().frozen },
        set: function (v) { h().frozen = v },
        code: { file: "bomberman.html", line: 503, name: "frozen" },
        doc: "Remaining seconds where enemies stand still (a clock power-up sets 5). Set it yourself to study mazes." },
      { id: "tile", label: "Tile atlas size", unit: "px", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().TS },
        code: { file: "bomberman.html", line: 419, name: "TS" },
        doc: "Read-only: the sprite atlas and every blit are baked at 32 px during buildAtlas(), so changing it after load would desync the art." },
      { id: "partcap", label: "Particle pool", unit: "particles", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().PART },
        code: { file: "bomberman.html", line: 513, name: "PART" },
        doc: "Read-only: the pool array is allocated once at load (90 desktop, 60 mobile); raising the cap afterwards would read empty slots." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "Stops update() entirely (drawing continues, so you can inspect the field). Off restores the original update.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.35", toggle: true,
        doc: "Multiplies the frame delta handed to update(); physics, bombs and AI all run slower.",
        on: function (v) { wrap(v ? 0.35 : null) } },
      { id: "god", label: "God mode", toggle: true,
        doc: "Replaces killPlayer with a no-op and sets invulnerability. Blast flames still draw; the player simply cannot die.",
        on: function (v) { setGod(v) } },
      { id: "megabombs", label: "9 bombs, max fire",
        doc: "Gives every player 9 live bombs and blast range 12 — for testing maze clearing and chain reactions.",
        run: function () { each(function (p) { p.maxBombs = 9; p.fire = 12 }); TLDBG.toast("9 bombs / range 12"); } },
      { id: "allpowers", label: "Give every power-up",
        doc: "Applies all 15 prize definitions to the player through the game's own applyPU, so flags (key, remote, mine, spike, shield, power) are set the way the game sets them.",
        run: function () {
          var T = h(), p = pl(); if (!p) return TLDBG.toast("no player yet");
          T.PU.forEach(function (def) { T.applyPU(p, { def: def }); });
          TLDBG.toast("all power-ups applied");
        } },
      { id: "clearEnemies", label: "Kill all enemies",
        doc: "Empties the enemy list. With the last enemy gone the game opens the exit portal itself, so this is also the quick way to reach the level end.",
        run: function () { var T = h(); T.enemies.length = 0; TLDBG.toast("enemies cleared"); } },
      { id: "openExit", label: "Open exit portal",
        doc: "Sets exit.active — the portal sprite lights up and walking onto it finishes the level.",
        run: function () { h().exit.active = true; TLDBG.toast("exit open"); } },
      { id: "nextLevel", label: "Jump to next level",
        doc: "Runs the game's own level-advance path (level++, buildLevel, hide panel, state=playing).",
        run: function () {
          var T = h(); T.level++; T.buildLevel(null); T.hidePanel();
          T.state = "playing";
          TLDBG.toast("level " + T.level);
        } },
      { id: "dropPrize", label: "Drop a prize near the player",
        doc: "Pushes one random weighted prize onto the field at the player's tile, using pickPrize() and the game's own powerup record shape.",
        run: function () {
          var T = h(), p = pl(); if (!p) return TLDBG.toast("no player yet");
          T.powerups.push({ i: Math.floor(p.px), j: Math.floor(p.py), def: T.pickPrize(), grace: 0 });
          TLDBG.toast("prize dropped");
        } },
      { id: "teleportExit", label: "Teleport to exit",
        doc: "Moves the player onto the portal tile (does not open it — use Open exit first).",
        run: function () {
          var T = h(), p = pl(); if (!p) return TLDBG.toast("no player yet");
          p.px = p.tx = T.exit.i + 0.5; p.py = p.ty = T.exit.j + 0.5; p.moving = false;
          TLDBG.toast("player at exit");
        } },
      { id: "detonateAll", label: "Detonate every bomb now",
        doc: "Calls the game's detonate() on each placed bomb, chains included — the fast way to test blast handling.",
        run: function () {
          var T = h(); T.bombs.slice().forEach(function (b) { try { T.detonate(b) } catch (e) { } });
          TLDBG.toast("detonated " + T.blasts.length + " blasts");
        } },
      { id: "forceOver", label: "Force game over",
        doc: "Zeroes lives and calls the real killPlayer, so the game-over panel and passcode appear exactly as in play.",
        run: function () {
          var T = h(); if (godOn) setGod(false);
          each(function (p) { p.lives = 0; p.hearts = 0; });
          var p = pl(); if (p) { p.alive = true; T.killPlayer(p); }
          TLDBG.toast("game over forced");
        } },
      { id: "hostile", label: "CPU players hostile", toggle: true,
        doc: "Turns the CPU opponents against the human players (the game's own `hostile` flag).",
        on: function (v) { h().hostile = v } },
      { id: "hideHud", label: "Hide HUD cards", toggle: true,
        doc: "Display:none on the player-card strip, for clean screenshots.",
        on: function (v) { var el = document.getElementById("hud"); if (el) el.style.display = v ? "none" : "" } }
    ],

    hooks: [
      { label: "Console: players", doc: "One table row per player: position, lives, hearts, bombs, fire, speed, flags.",
        run: function () {
          var T = h();
          console.table(T.players.map(function (p) {
            return { id: p.id, cpu: !!p.cpu, x: Math.round(p.px * 100) / 100, y: Math.round(p.py * 100) / 100,
              lives: p.lives, hearts: p.hearts, bombs: p.activeBombs + "/" + p.maxBombs, fire: p.fire,
              speed: Math.round(p.speed * 100) / 100, score: p.score, alive: p.alive,
              key: !!p.hasKey, remote: !!p.remoteControl, mine: !!p.landMine, spike: !!p.spikeBomb };
          }));
        } },
      { label: "Console: enemies", doc: "Every enemy with type index, tile, its spawn speed (base x level bonus), hp and the AI flags taken from the type table.",
        run: function () {
          var T = h();
          console.table(T.enemies.map(function (e) {
            return { typeIdx: e.typeIdx, i: Math.floor(e.px), j: Math.floor(e.py),
              speed: Math.round(e.speed * 100) / 100, hp: e.hp, alive: e.alive,
              wallAware: !!(e.type && e.type.wall), bombAware: !!(e.type && e.type.bomb),
              smart: !!(e.type && e.type.smart), err: !!(e.type && e.type.err) };
          }));
        } },
      { label: "Console: bombs", doc: "Placed bombs: tile, owner id, remaining fuse, blast length for this bomb, remote/spike/mine/danger flags.",
        run: function () {
          var T = h();
          console.table(T.bombs.map(function (b) {
            return { i: b.i, j: b.j, owner: b.owner ? b.owner.id : "-",
              fuse: Math.round(b.t * 100) / 100, fire: b.fire, dead: !!b.dead,
              remote: !!b.remote, spike: !!b.spike, mine: !!b.mine, danger: !!b.danger };
          }));
        } },
      { label: "Console: grid", doc: "Prints the maze as text: # wall, x destructible brick, + open pillar cell (even/even, never filled), . floor; the header line names the exit tile.",
        run: function () {
          var T = h(), g = T.grid, rows = [], i, j, line;
          if (!g) return console.log("no grid built yet");
          for (j = 0; j < T.GH; j++) {
            line = "";
            for (i = 0; i < T.GW; i++) {
              var c = g[j * T.GW + i];
              line += c === 1 ? "#" : c === 2 ? "x" : (i % 2 === 0 && j % 2 === 0) ? "+" : ".";
            }
            rows.push(line);
          }
          console.log("level " + T.level + "  exit " + T.exit.i + "," + T.exit.j + (T.exit.active ? " (open)" : "") + "\n" + rows.join("\n"));
        } },
      { label: "Console: prizes on field", doc: "Every prize currently on the board with its id and drop weight.",
        run: function () {
          var T = h();
          console.table(T.powerups.map(function (p) {
            return { i: p.i, j: p.j, id: p.def && p.def.id, weight: p.def && p.def.w, grace: Math.round(p.grace * 100) / 100 };
          }));
        } }
    ],

    layout: [
      { sel: "#c", label: "Game canvas" },
      { sel: "#hud", label: "HUD strip (player cards)" },
      { sel: "#hud .card", label: "One player card" },
      { sel: "#hud .card .head", label: "Card header row" },
      { sel: "#hud .name", label: "Player name in card" },
      { sel: "#hud .lv", label: "Level badge in card" },
      { sel: "#hud .hp", label: "Lives/hearts in card" },
      { sel: "#hud .b", label: "Bomb counter in card" },
      { sel: "#hud .f", label: "Fire counter in card" },
      { sel: "#hud .score", label: "Score in card" },
      { sel: "#hud .icons", label: "Owned-power-up icon row" },
      { sel: "#hud #total", label: "Total-score block" },
      { sel: "#overlay", label: "Menu / pause / game-over scrim" },
      { sel: "#panel", label: "Dialog panel" },
      { sel: "#panelBody", label: "Dialog body (JS-built content)" },
      { sel: "#touch", label: "Touch controls layer" },
      { sel: "#dpad1", label: "P1 directional pad" },
      { sel: "#dpad2", label: "P2 directional pad" },
      { sel: "#rightCol", label: "P1 action column" },
      { sel: "#p2Col", label: "P2 action column" },
      { sel: "#b1", label: "P1 bomb button" },
      { sel: "#b2", label: "P2 bomb button" },
      { sel: "#b1remote", label: "P1 remote-detonate button" },
      { sel: "#b2remote", label: "P2 remote-detonate button" },
      { sel: ".helpRow", label: "Help manual row inside the panel" },
      { sel: ".hint", label: "Small hint line" }
    ],

    control: [
      { id: "mode", label: "Player mode with CPU seats", args: '"1p" | "2p" | "cpu1" | "cpu2" | "cpu3"', argDefault: "cpu2",
        doc: "playerMode decides how many seats are CPU-driven at level build (humans=1, cpus=n). startNew() rebuilds the maze, corners, enemy layout and the seats — the same path the New Game button uses.",
        run: function (m) {
          var name = String(m || "1p");
          if (["1p", "2p", "cpu1", "cpu2", "cpu3"].indexOf(name) < 0) return "unknown mode " + name;
          h().playerMode = name; h().startNew();
          return { mode: name, players: h().players.map(function (p) { return { id: p.id, cpu: !!p.cpu, px: num(p.px, 10), py: num(p.py, 10) }; }), enemies: h().enemies.length };
        } },
      { id: "start", label: "New game", args: "seed string (optional)", argDefault: "",
        doc: "startNew(seed) — fresh level 1 with the current playerMode and hostile flag.",
        run: function (seed) {
          h().startNew(seed && String(seed).trim() ? String(seed).trim() : undefined);
          return { state: h().state, level: h().level, players: h().players.length, enemies: h().enemies.length, mode: h().playerMode };
        } },
      { id: "seat", label: "Hand a seat to the bot", args: '[playerIndex, "human" | "cpu"]', argDefault: '[0, "cpu"]',
        doc: "update() calls updateCPU(pl,dt) whenever pl.cpu, so flipping the flag mid-level switches that seat between the keyboard and the path planner.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, human|cpu]";
          var p = h().players[+a[0]]; if (!p) return "no player " + a[0];
          p.cpu = a[1] === "cpu"; p.aiT = 0; p.aiStuck = 0; p.aiLastDir = -1;
          return { id: p.id, cpu: !!p.cpu, px: num(p.px, 10), py: num(p.py, 10) };
        } },
      { id: "aiProbe", label: "Read a bot's planner state", args: "player index", argDefault: 0,
        doc: "The planner fields updateCPU keeps: aiT (tick countdown, AI_TICK .05), aiLastDir, aiRev, aiStuck (time spent failing to move — the wall-hugging detector), plus position and facing.",
        run: function (i) {
          var p = h().players[+i || 0]; if (!p) return "no player " + i;
          return { id: p.id, cpu: !!p.cpu, px: num(p.px, 10), py: num(p.py, 10), tx: num(p.tx, 10), ty: num(p.ty, 10),
            dir: p.dir, moving: !!p.moving, aiT: num(p.aiT, 100), aiLastDir: p.aiLastDir, aiRev: p.aiRev,
            aiStuck: num(p.aiStuck, 100), bombs: p.activeBombs, lives: p.lives, dead: !!p.dead };
        } },
      { id: "aiWatch", label: "Watch every bot every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "console.table of the CPU seats' planner state plus the enemy list — the trace for debugging stuck bots or enemy path choices.",
        run: function (s) {
          if (window.__tllAI) { clearInterval(window.__tllAI); window.__tllAI = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllAI = setInterval(function () {
            console.table(h().players.map(function (p, i) {
              return { seat: i, cpu: !!p.cpu, px: num(p.px, 10), py: num(p.py, 10), dir: p.dir,
                aiT: num(p.aiT, 100), aiStuck: num(p.aiStuck, 100), aiRev: p.aiRev, bombs: p.activeBombs, lives: p.lives };
            }));
            console.table(h().enemies.map(function (e, i) {
              return { i: i, type: e.type, px: num(e.px, 10), py: num(e.py, 10), dir: e.dir, dying: !!e.dying, speed: num(e.speed, 100) };
            }));
          }, sec * 1000);
          return "watching every " + sec + "s";
        } },
      { id: "enemyType", label: "Tune an enemy archetype", args: '[typeIndex, "speed"|"hp"|"wall"|"bomb"|"smart"|"err", value]', argDefault: '[2, "smart", 1]',
        doc: "ETYPES rows: speed (tiles/s), hp, wall (breaks bricks), bomb (avoids its own blast), smart (runs from the player / picks safe tiles), err (deliberate mistakes). New spawns copy the row; existing enemies keep theirs.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [type, field, value]";
          var t = h().ETYPES[+a[0]]; if (!t) return "no archetype " + a[0];
          var f = String(a[1]); if (!(f in t)) return "no field " + f;
          t[f] = Number(a[2]);
          return { type: +a[0], field: f, value: t[f], live: h().enemies.length };
        } },
      { id: "enemyField", label: "Edit one live enemy", args: '[enemyIndex, "speed"|"type"|"px"|"py", value]', argDefault: '[0, "speed", 3]',
        doc: "Writes straight into the live enemy object — force a chase, retarget a tile, or speed a monster up mid-level.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, field, value]";
          var e = h().enemies[+a[0]]; if (!e) return "no enemy " + a[0];
          var f = String(a[1]);
          if (f === "px" || f === "py") { e[f] = Number(a[2]); e.tx = e.px; e.ty = e.py; e.moving = false; }
          else if (f in e) e[f] = Number(a[2]);
          else return "no field " + f;
          return { i: +a[0], field: f, value: num(e[f], 100), px: num(e.px, 10), py: num(e.py, 10) };
        } },
      { id: "teleport", label: "Teleport a seat", args: "[playerIndex, tileI, tileJ]", argDefault: '[0, 1, 1]',
        doc: "Sets both the interpolated position and the target tile, so the seat snaps instantly instead of walking.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, tileI, tileJ]";
          var p = h().players[+a[0]]; if (!p) return "no player " + a[0];
          p.px = p.tx = Number(a[1]) + 0.5; p.py = p.ty = Number(a[2]) + 0.5; p.moving = false;
          return { id: p.id, px: num(p.px, 10), py: num(p.py, 10) };
        } },
      { id: "bomb", label: "Seat drops a bomb now", args: "player index", argDefault: 0,
        doc: "placeBomb(player) through the page's own path — respects the live-bomb cap and the fuse value.",
        run: function (i) {
          var p = h().players[+i || 0]; if (!p) return "no player " + i;
          h().placeBomb(p);
          return { bombs: h().bombs.length, activeBombs: p.activeBombs, fuse: num(h().BOMB_FUSE, 100) };
        } }
    ],

    recipes: [
      { label: "CPU-only run with hostile bots",
        doc: "Three CPU seats plus hostile=true: nobody is on the keyboard, so you can watch the planners race to the exit while enemies hunt them.",
        js: 'var H = window.TLHOOK;\nH.playerMode = "cpu3"; H.hostile = true; H.startNew();\nconsole.table(H.players.map(function (p, i) { return { seat: i, cpu: !!p.cpu, px: p.px, py: p.py }; }));\nsetInterval(function () {\n  console.table(H.players.map(function (p, i) { return { seat: i, px: +p.px.toFixed(2), py: +p.py.toFixed(2), stuck: +p.aiStuck.toFixed(2), lives: p.lives }; }));\n}, 1000);' },
      { label: "Stuck detector",
        doc: "Logs any CPU seat whose aiStuck passes half a second — the planner's reverse-and-retry path is misbehaving there.",
        js: 'var H = window.TLHOOK;\nif (window.__tllStuck) clearInterval(window.__tllStuck);\nwindow.__tllStuck = setInterval(function () {\n  var bad = H.players.filter(function (p) { return p.cpu && p.aiStuck > 0.5; });\n  if (bad.length) console.warn("stuck seats", bad.map(function (p) { return p.id + "@" + p.px.toFixed(1) + "," + p.py.toFixed(1) + " stuck " + p.aiStuck.toFixed(2); }));\n}, 500);' },
      { label: "Bomb-avoidance test (smart flag)",
        doc: "Drops a bomb next to a chosen enemy, then toggles its archetype's smart/bomb bits to see whether it escapes the blast.",
        js: 'var H = window.TLHOOK;\nif (!H.players.length) H.startNew();\nvar e = H.enemies[0];\nif (e) { var seat = H.players[0]; seat.px = seat.tx = Math.round(e.px); seat.py = seat.ty = Math.round(e.py); H.placeBomb(seat); }\nconsole.log("bomb placed near", e ? e.type : "no enemy");\nsetTimeout(function () { console.table(H.enemies.map(function (x, i) { return { i: i, type: x.type, px: +x.px.toFixed(2), py: +x.py.toFixed(2), dir: x.dir }; })); }, 800);' },
      { label: "Difficulty sweep over ETYPES",
        doc: "Prints every archetype, then makes all of them faster and smarter — the shipped table is the tuning reference.",
        js: 'var H = window.TLHOOK;\nconsole.table(H.ETYPES.map(function (t, i) { return { i: i, speed: t.speed, hp: t.hp, wall: t.wall, bomb: t.bomb, smart: t.smart, err: t.err }; }));\nH.ETYPES.forEach(function (t) { t.speed *= 1.25; t.smart = 1; });\nH.startNew();\nconsole.log("rebuilt with scaled archetypes; enemies", H.enemies.length);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE shows the live run (phase, level, counts, the first player's power-ups). BALANCE edits gameplay numbers. CHEATS changes the run for debugging. LAYOUT resizes/repositions elements per screen mode. ELEMENTS lists every selector with its classes, attributes and computed box." },
      { topic: "Bridge", text: "bomberman.html wraps its game in a strict IIFE. The last block of that IIFE publishes window.TLHOOK with names only (state, level, players, enemies, bombs, powerups, exit, grid, ETYPES, PU, BOMB_FUSE, BLAST_TIME, GW/GH, ctx, buildLevel, applyPU, pickPrize, detonate, killPlayer, respawn, hidePanel, showPanel, startNew, showGameOver plus accessors for the re-assigned ones). No game code runs in that block." },
      { topic: "Freeze and slow motion", text: "Both wrap TLHOOK.update: the rAF loop calls update(dt) by name, so the harness substitutes a thinner-dt version or a no-op, then puts the original function back. The Clock power-up's own `frozen` counter is a separate, editable parameter." },
      { topic: "God mode", text: "killPlayer is replaced by a no-op while god mode is on. Blast flames, bombs and enemy AI keep running; a touch costs nothing. Off restores the real killPlayer and clears the 9e9 invulnerability." },
      { topic: "Not reachable", text: "Inside the IIFE: the audio synth (Audio closure), the sprite atlas builder, the AI look-ahead helpers (aiSafeFuture, timedBFSDir, findEscapeDir), the passcode encode/decode and the particle pool internals. Those are deliberately not exposed; they are console-visible via the hooks above." },
      { topic: "Texts", text: "This page uses the shared i18n.js kit (TLI18N with en/es/pt/ru/zh), so the TEXTS tab is driven by the kit: pick a language, edit a key, and the page re-translates through TLI18N.apply. HUD and panel strings are built by JS from that table, not hard-coded HTML." }
    ]
  });
})();
