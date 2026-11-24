/* dbg/lemmings.js — developer harness for lemmings.html
 *
 * Load with:  lemmings.html?debug=dbg/lemmings.js
 * lemmings.html wraps its game in an arrow IIFE; the last block of it publishes
 * window.TLHOOK (names only), which everything here reads.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK); }

  var realAdvance = null;
  function wrap(scale) {
    var T = h();
    if (!realAdvance) realAdvance = T.advance;
    if (scale === null) { T.advance = realAdvance; return; }
    T.advance = function () { var n = T.speed; T.speed = n * scale; realAdvance(); T.speed = n };
  }

  var CELL = { 0: ".", 1: "d", 2: "#", 3: "b", 4: "x" };   /* EMPTY DIRT ROCK BRICK HAZARD */

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }
  function terrainLegend() {
    var T = h(), rows = [], y, x, line;
    if (!T.terrain) return "no terrain";
    for (y = 0; y < T.ROWS; y++) {
      line = "";
      for (x = 0; x < T.COLS; x++) {
        var mark = CELL[T.terrain[y * T.COLS + x]] || "?";
        if (x === T.spawn.tx && y === T.spawn.groundRow) mark = "S";
        if (x === T.exit.tx && y === T.exit.groundRow) mark = "E";
        line += mark;
      }
      rows.push(line);
    }
    return rows.join("\n");
  }

  TLDBG.register({
    game: "lemmings", file: "lemmings.html",

    state: function () {
      var T = h();
      return {
        phase: T.gameState, level: T.levelNum, seed: T.levelSeed,
        paused: T.paused, speed: T.speed, fastForward: T.fastForward,
        spawned: T.spawned, total: T.total, alive: T.lems.length,
        saved: T.saved, lost: T.lost,
        goalPercent: T.goalPercent, goalSaved: T.goalSaved,
        timeLeft: num(T.timeLeft, 10), timerEnabled: T.timerEnabled,
        gameTime: num(T.gameTime, 10), spawnTimer: num(T.spawnTimer, 10),
        spawnInterval: num(T.spawnInterval, 10), spawnRate: num(T.spawnRate, 100),
        selectedSkill: T.selectedSkill, skills: T.skillCounts,
        grid: T.COLS + "x" + T.ROWS + " @ " + T.TILE + "px",
        walkSpeed: T.WALK_PPS, gravity: T.GRAVITY, maxFall: T.MAX_FALL,
        floatFall: T.FLOAT_FALL, lethalFall: T.LETHAL_FALL,
        spawnTile: T.spawn.tx + "," + T.spawn.groundRow,
        exitTile: T.exit.tx + "," + T.exit.groundRow
      };
    },

    params: [
      { id: "walk", label: "Walk speed", unit: "px/s", min: 2, max: 60, step: 1,
        get: function () { return h().WALK_PPS }, set: function (v) { h().WALK_PPS = v },
        code: { file: "lemmings.html", line: 423, name: "WALK_PPS" },
        doc: "Horizontal speed of a walking lemming (12 px/s). Steps are computed per 30 Hz tick." },
      { id: "gravity", label: "Gravity", unit: "px/s2", min: 20, max: 800, step: 10,
        get: function () { return h().GRAVITY }, set: function (v) { h().GRAVITY = v },
        code: { file: "lemmings.html", line: 424, name: "GRAVITY" },
        doc: "Acceleration while falling (224)." },
      { id: "maxFall", label: "Terminal fall speed", unit: "px/s", min: 20, max: 600, step: 5,
        get: function () { return h().MAX_FALL }, set: function (v) { h().MAX_FALL = v },
        code: { file: "lemmings.html", line: 425, name: "MAX_FALL" },
        doc: "Cap on downward speed (128)." },
      { id: "floatFall", label: "Parachute fall speed", unit: "px/s", min: 5, max: 200, step: 1,
        get: function () { return h().FLOAT_FALL }, set: function (v) { h().FLOAT_FALL = v },
        code: { file: "lemmings.html", line: 426, name: "FLOAT_FALL" },
        doc: "Descent speed of a floating lemming (28) — also what makes a long drop survivable." },
      { id: "lethalFall", label: "Lethal fall distance", unit: "px", min: 10, max: 1200, step: 5,
        get: function () { return h().LETHAL_FALL }, set: function (v) { h().LETHAL_FALL = v },
        code: { file: "lemmings.html", line: 427, name: "LETHAL_FALL" },
        doc: "Fall distance that kills on landing (96). Raise it to make any drop survivable while you tune terrain." },
      { id: "spawnInterval", label: "Release interval", unit: "ticks", min: 5, max: 300, step: 5,
        get: function () { return h().spawnInterval }, set: function (v) { h().spawnInterval = v },
        code: { file: "lemmings.html", line: 1322, name: "spawnInterval" },
        doc: "Ticks between lemmings appearing (70 at rate 1, recomputed from baseSpawnInterval and the release-rate multiplier)." },
      { id: "spawnRate", label: "Release rate multiplier", unit: "x", min: 0.25, max: 4, step: 0.25,
        get: function () { return h().spawnRate }, set: function (v) { h().spawnRate = v },
        code: { file: "lemmings.html", line: 1347, name: "spawnRate / rateOptions" },
        doc: "The page cycles 1, 1.5, 2, 3 with its RATE button. Setting it here shortens the interval immediately." },
      { id: "simSpeed", label: "Simulation speed", unit: "x", min: 1, max: 8, step: 1,
        get: function () { return h().speed }, set: function (v) { h().speed = v },
        code: { file: "lemmings.html", line: 1338, name: "speed / speedOptions" },
        doc: "The SPEED button cycles 1, 2, 4; fast-forward uses 8. Anything in that range works here." },
      { id: "timeLeft", label: "Level time left", unit: "s", min: 0, max: 600, step: 5,
        get: function () { return h().timeLeft }, set: function (v) { h().timeLeft = v },
        code: { file: "lemmings.html", line: 1329, name: "timeLeft" },
        doc: "Countdown while the timer is on; reaching 0 ends the level through endLevel(true)." },
      { id: "goalPercent", label: "Goal percent", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return h().goalPercent }, set: function (v) { h().goalPercent = v },
        code: { file: "lemmings.html", line: 1331, name: "goalPercent" },
        doc: "Percent of the released lemmings that must reach exit; goalSaved is derived from it when the level loads." },
      { id: "goalSaved", label: "Goal saved count", unit: "lemmings", min: 0, max: 100, step: 1,
        get: function () { return h().goalSaved }, set: function (v) { h().goalSaved = Math.max(0, Math.round(v)) },
        code: { file: "lemmings.html", line: 1332, name: "goalSaved" },
        doc: "The number endLevel() compares `saved` against. Lower it to test the win banner quickly." },
      { id: "total", label: "Lemmings in level", unit: "lemmings", min: 1, max: 200, step: 1,
        get: function () { return h().total }, set: function (v) { h().total = Math.max(1, Math.round(v)) },
        code: { file: "lemmings.html", line: 1317, name: "total" },
        doc: "How many will be released. Raising it mid-level lets the spawner keep going; the goal count does not recompute until the next loadLevel()." },
      { id: "saved", label: "Saved so far", unit: "lemmings", min: 0, max: 200, step: 1,
        get: function () { return h().saved }, set: function (v) { h().saved = Math.max(0, Math.round(v)) },
        code: { file: "lemmings.html", line: 1317, name: "saved" },
        doc: "Count that already reached the exit. Set it to goalSaved and CHEATS: end level now to see the win path." },
      { id: "skillCount", label: "Count of selected skill", unit: "uses", min: 0, max: 200, step: 1,
        get: function () { var T = h(); return T.skillCounts[T.selectedSkill] != null ? T.skillCounts[T.selectedSkill] : 0 },
        set: function (v) { var T = h(); T.skillCounts[T.selectedSkill] = Math.max(0, Math.round(v)) },
        code: { file: "lemmings.html", line: 1349, name: "skillCounts[selectedSkill]" },
        doc: "Ammo of the skill currently selected in the skill bar (see STATE.skills for the whole table)." },
      { id: "cols", label: "Grid columns", unit: "tiles", min: 10, max: 120, step: 2,
        get: function () { return h().COLS }, set: function (v) { h().COLS = Math.max(10, Math.round(v)) },
        code: { file: "lemmings.html", line: 409, name: "COLS" },
        doc: "Terrain width. The page rebuilds the terrain and canvas when you press its Apply size button (ids colsInput/rowsInput/tileInput + applySizeBtn); editing here changes the value the next rebuild uses." },
      { id: "rows", label: "Grid rows", unit: "tiles", min: 8, max: 80, step: 1,
        get: function () { return h().ROWS }, set: function (v) { h().ROWS = Math.max(8, Math.round(v)) },
        code: { file: "lemmings.html", line: 410, name: "ROWS" },
        doc: "Terrain height, same rebuild rule as columns." },
      { id: "tile", label: "Tile size", unit: "px", min: 4, max: 48, step: 1,
        get: function () { return h().TILE }, set: function (v) { h().TILE = Math.max(4, Math.round(v)) },
        code: { file: "lemmings.html", line: 411, name: "TILE" },
        doc: "Tile edge in world pixels. Applies through the page's Apply size button (computeMetrics/updateCanvasSize), which recomputes GW/GH and the canvas box." },
      { id: "bodyHeight", label: "Lemming body height", unit: "px", min: 4, max: 32, step: 1, readonly: true,
        get: function () { return h().BODY_H },
        code: { file: "lemmings.html", line: 419, name: "BODY_H / BODY_W" },
        doc: "Read-only: collision and drawing use BODY_H 12 / BODY_W 4 with HALF_W baked in; the physics helpers read these consts directly." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze simulation", toggle: true,
        doc: "advance() becomes a no-op — lemmings, particles and the spawn timer stop while the canvas keeps drawing.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.35", toggle: true,
        doc: "Multiplies the simulation speed for one tick at a time, so you can watch a dig or bash frame by frame.",
        on: function (v) { wrap(v ? 0.35 : null) } },
      { id: "ff", label: "Fast forward (8x)", toggle: true,
        doc: "Sets the page's own fast-forward flag — the same button as FF on the toolbar.",
        on: function (v) { h().fastForward = v } },
      { id: "pause", label: "Pause", toggle: true,
        doc: "Sets the page's paused flag directly (the PAUSE button keeps its own label in sync on the next tick).",
        on: function (v) { h().paused = v } },
      { id: "releaseAll", label: "Release every lemming now",
        doc: "Shortens the release interval to 2 ticks so the whole group comes out fast.",
        run: function () { var T = h(); T.spawnInterval = 2; T.spawnTimer = 0; TLDBG.toast("releasing fast"); } },
      { id: "spawnExtra", label: "Spawn an extra lemming",
        doc: "Pushes createLem() onto the field regardless of the release counter — handy for testing a skill on a spare lemming.",
        run: function () { var T = h(); T.lems.push(T.createLem()); TLDBG.toast("alive " + T.lems.length); } },
      { id: "giveSkills", label: "Give 99 of every skill",
        doc: "Sets the whole skill table to 99 uses so any assignment succeeds.",
        run: function () { var T = h(); T.SKILLS.forEach(function (s) { T.skillCounts[s] = 99 }); TLDBG.toast("skills 99 each"); } },
      { id: "applySkillAll", label: "Assign the selected skill to all",
        doc: "Runs assignSkill() on every living lemming with the currently selected skill, the same call the mouse click makes.",
        run: function () {
          var T = h(), n = 0;
          T.lems.forEach(function (L) { if ((T.skillCounts[T.selectedSkill] ?? 0) > 0) { T.assignSkill(L, T.selectedSkill); n++ } });
          TLDBG.toast("assigned " + T.selectedSkill + " to " + n);
        } },
      { id: "teleportExit", label: "Move all lemmings to the exit",
        doc: "Places every lemming at the exit tile so the saved counter climbs through the normal exit check on the next ticks.",
        run: function () {
          var T = h();
          T.lems.forEach(function (L) { L.x = T.exit.tx * T.TILE + Math.floor(T.TILE / 2); L.y = T.exit.groundRow * T.TILE; L.st = 0; L.vx = 0; L.vy = 0 });
          TLDBG.toast("moved " + T.lems.length + " to exit");
        } },
      { id: "winNow", label: "Win this level",
        doc: "Fills the saved counter to the goal and runs endLevel(): the complete banner, rank text and NEXT LEVEL button.",
        run: function () { var T = h(); T.saved = Math.max(T.saved, T.goalSaved); T.endLevel(false); TLDBG.toast("level complete"); } },
      { id: "failNow", label: "Fail this level",
        doc: "Runs endLevel(true) with the current saved count, so the fail banner and RETRY button appear.",
        run: function () { var T = h(); if (T.saved >= T.goalSaved) T.saved = Math.max(0, T.goalSaved - 1); T.endLevel(true); TLDBG.toast("level failed"); } },
      { id: "nextLevel", label: "Load next level",
        doc: "levelNum++ then loadLevel(n, true) — the page's own advance.",
        run: function () { var T = h(); T.levelNum += 1; T.loadLevel(T.levelNum, true); TLDBG.toast("level " + T.levelNum); } },
      { id: "restartLevel", label: "Restart this level",
        doc: "loadLevel(levelNum, true) regenerates the terrain from the current seed.",
        run: function () { var T = h(); T.loadLevel(T.levelNum, true); TLDBG.toast("level " + T.levelNum + " rebuilt"); } },
      { id: "hideHud", label: "Hide HUD layer", toggle: true,
        doc: "Display:none on #hud (counters, skill bar, timer) for clean captures of the play field.",
        on: function (v) { var el = document.getElementById("hud"); if (el) el.style.display = v ? "none" : ""; } }
    ],

    hooks: [
      { label: "Console: lemmings", doc: "Every living lemming: position, state code (0 walk, 1 fall, 2 dig, 3 bash, 4 mine, ...), velocity, fall distance and its skill flags.",
        run: function () {
          var T = h();
          console.table(T.lems.map(function (L, i) {
            return { i: i, x: num(L.x, 1), y: num(L.y, 1), st: L.st, dir: L.dir,
              vx: num(L.vx, 10), vy: num(L.vy, 10), fallDist: num(L.fallDist, 1),
              canClimb: !!L.canClimb, canFloat: !!L.canFloat, cool: num(L.cool, 10) };
          }));
        } },
      { label: "Console: terrain map", doc: "The terrain as text: . empty, d dirt, # rock, b brick (built), x hazard, S spawn tile, E exit tile.",
        run: function () { console.log(terrainLegend()); } },
      { label: "Console: skill table", doc: "skillCounts for every skill name, plus the skill currently selected.",
        run: function () {
          var T = h();
          console.table(T.SKILLS.map(function (s) { return { skill: s, left: T.skillCounts[s] != null ? T.skillCounts[s] : "-", selected: s === T.selectedSkill } }));
        } },
      { label: "Console: timing summary", doc: "Phase, level, seed, timers, spawn counters, speed flags and the goal numbers.",
        run: function () {
          var T = h();
          console.log({ gameState: T.gameState, levelNum: T.levelNum, levelSeed: T.levelSeed,
            gameTime: num(T.gameTime, 10), timeLeft: num(T.timeLeft, 10), timerEnabled: T.timerEnabled,
            spawnTimer: num(T.spawnTimer, 10), spawnInterval: num(T.spawnInterval, 10), baseSpawnInterval: T.baseSpawnInterval,
            spawnRate: num(T.spawnRate, 100), speedOptions: T.speedOptions.slice(), rateOptions: T.rateOptions.slice(),
            speed: T.speed, fastForward: T.fastForward, FAST_SPEED: T.FAST_SPEED, paused: T.paused,
            spawned: T.spawned, total: T.total, saved: T.saved, lost: T.lost, alive: T.lems.length,
            goalPercent: T.goalPercent, goalSaved: T.goalSaved });
        } },
      { label: "Console: geometry and camera", doc: "Grid size in tiles and pixels, canvas dimensions, spawn/exit tiles and the body dimensions used by collision.",
        run: function () {
          var T = h();
          console.log({ COLS: T.COLS, ROWS: T.ROWS, TILE: T.TILE, GW: T.GW, GH: T.GH,
            canvas: T.canvas ? T.canvas.width + "x" + T.canvas.height : "-",
            spawn: { tx: T.spawn.tx, groundRow: T.spawn.groundRow },
            exit: { tx: T.exit.tx, groundRow: T.exit.groundRow },
            BODY_H: T.BODY_H, BODY_W: T.BODY_W,
            terrainCells: T.terrain ? T.terrain.length : "-" });
        } }
    ],

    layout: [
      { sel: "#c", label: "Play canvas" },
      { sel: "#stage", label: "Canvas wrapper" },
      { sel: "#hud", label: "HUD layer" },
      { sel: "#top", label: "HUD top row" },
      { sel: "#bar", label: "Skill bar" },
      { sel: "#lv", label: "Level readout" },
      { sel: "#tm", label: "Timer readout" },
      { sel: "#sv", label: "Saved readout" },
      { sel: "#tt", label: "Total readout" },
      { sel: "#lo", label: "Lost readout" },
      { sel: "#lf", label: "Left (unreleased) readout" },
      { sel: "#goal", label: "Goal readout" },
      { sel: "#msg", label: "Message banner" },
      { sel: "#cheat", label: "In-page cheat panel" },
      { sel: "#cheatHtml", label: "Cheat panel body" },
      { sel: "#playGroup", label: "Play buttons group" },
      { sel: "#skillGroup", label: "Skill buttons group" },
      { sel: "#pauseBtn", label: "Pause button" },
      { sel: "#speedBtn", label: "Speed button" },
      { sel: "#rateBtn", label: "Release rate button" },
      { sel: "#timerBtn", label: "Timer toggle button" },
      { sel: "#ffBtn", label: "Fast-forward button" },
      { sel: "#restartBtn", label: "Restart button" },
      { sel: "#nextBtn", label: "Next level button" },
      { sel: "#helpBtn", label: "Help button" },
      { sel: "#muteBtn", label: "Mute button" },
      { sel: "#fsBtn", label: "Fullscreen button" },
      { sel: "#homeBtn", label: "Home button" },
      { sel: "#overlay", label: "Overlay screen" },
      { sel: "#seedInput", label: "Seed input" },
      { sel: "#seedRnd", label: "Random seed button" },
      { sel: "#colsInput", label: "Columns input" },
      { sel: "#rowsInput", label: "Rows input" },
      { sel: "#tileInput", label: "Tile size input" },
      { sel: "#applySizeBtn", label: "Apply size button" },
      { sel: "#musicSeedInput", label: "Music seed input" },
      { sel: "#musicSeedRnd", label: "Music seed random button" },
      { sel: "#tlHost", label: "Language button host" }
    ],

    control: [
      { id: "level", label: "Load a level", args: "[level number, playNow true|false]", argDefault: "[1, true]",
        doc: "loadLevel(n, playNow) builds terrain, sets the skill allocation and goal, and optionally starts play immediately.",
        run: function (a) {
          var T = h(), n = 1, play = true;
          if (Array.isArray(a)) { n = Number(a[0]) || 1; play = a[1] !== false; } else if (a !== "" && a !== undefined) n = Number(a) || 1;
          T.loadLevel(n, play);
          return { level: T.levelNum, total: T.total, goalSaved: T.goalSaved, goalPercent: T.goalPercent, phase: T.gameState, timeLeft: num(T.timeLeft, 10) };
        } },
      { id: "flow", label: "Play, pause or end the level", args: '"play" | "pause" | "win" | "fail"', argDefault: "play",
        doc: "Writes gameState/paused and calls endLevel() — `win` ends with the current saved count, `fail` ends it as a timeout.",
        run: function (w) {
          var T = h(), s = String(w || "play");
          if (s === "pause") T.paused = true;
          else if (s === "play") { T.gameState = "play"; T.paused = false; }
          else if (s === "win") T.endLevel(false);
          else if (s === "fail") T.endLevel(true);
          return { phase: T.gameState, paused: !!T.paused, saved: T.saved, lost: T.lost, total: T.total };
        } },
      { id: "skill", label: "Assign a skill to a lemming", args: '["lem index", "climb|float|bomb|block|bash|dig|mine|build"]', argDefault: '[0, "build"]',
        doc: "assignSkill(lem, skill) through the page's own path — it honours the remaining skill counts, so it fails when that skill is exhausted.",
        run: function (a) {
          var T = h();
          if (!Array.isArray(a)) return 'want ["lem index", "skill"]';
          var lems = T.lems || [], lem = lems[Math.max(0, Math.min(lems.length - 1, Math.round(Number(a[0]) || 0)))];
          if (!lem) return "no lemmings alive";
          var ok = T.assignSkill(lem, String(a[1]));
          return { assigned: !!ok, index: Math.max(0, Math.min(lems.length - 1, Math.round(Number(a[0]) || 0))), skill: String(a[1]), counts: T.skillCounts, alive: lems.length };
        } },
      { id: "spawn", label: "Set spawn rate and interval", args: "[spawnInterval, spawnRate]", argDefault: "[60, 2]",
        doc: "spawnInterval (frames between spawns) and spawnRate (how many at once) control the release queue — the pressure the plan must absorb.",
        run: function (a) { if (!Array.isArray(a)) return "want [spawnInterval, spawnRate]"; var T = h(); T.spawnInterval = Number(a[0]); T.spawnRate = Number(a[1]); return { interval: T.spawnInterval, base: T.baseSpawnInterval, rate: T.spawnRate, spawned: T.spawned, total: T.total }; } },
      { id: "time", label: "Set the level clock", args: "seconds left", argDefault: 60,
        doc: "Writes timeLeft — jump to the endgame to test the timeout path, or give yourself room to try a plan.",
        run: function (n) { var T = h(); T.timeLeft = Number(n); return { timeLeft: num(T.timeLeft, 10), gameTime: num(T.gameTime, 10), defaultForLevel: num(T.defaultTimeForLevel ? T.defaultTimeForLevel(T.levelNum) : 0, 10) }; } },
      { id: "goal", label: "Set the goal percentage", args: "percent (0-100)", argDefault: 50,
        doc: "Writes goalPercent and recomputes goalSaved — changes how hard the level is to pass without touching terrain.",
        run: function (n) { var T = h(); T.goalPercent = Math.max(0, Math.min(100, Number(n) || 0)); T.goalSaved = Math.max(1, Math.round(T.total * T.goalPercent / 100)); return { goalPercent: T.goalPercent, goalSaved: T.goalSaved, saved: T.saved, total: T.total }; } },
      { id: "teleport", label: "Move a lemming", args: "[lem index, x, y]", argDefault: "[0, 100, 100]",
        doc: "Writes the lemming's position — drop it onto a ledge, into water or off the map to test fall, drowning and out-of-bounds rules.",
        run: function (a) {
          var T = h(), lems = T.lems || [];
          if (!Array.isArray(a)) return "want [lem index, x, y]";
          var lem = lems[Math.max(0, Math.min(lems.length - 1, Math.round(Number(a[0]) || 0)))];
          if (!lem) return "no lemmings alive";
          lem.x = Number(a[1]); lem.y = Number(a[2]);
          return { index: Math.max(0, Math.min(lems.length - 1, Math.round(Number(a[0]) || 0))), x: num(lem.x, 1), y: num(lem.y, 1), skill: lem.skill || lem.state || "?" };
        } },
      { id: "speed", label: "Fast-forward the simulation", args: '"on" | "off"', argDefault: "on",
        doc: "The `advance` multiplier the fast-forward button drives — run the level at several times speed while the watch logs.",
        run: function (v) { var T = h(); T.advance = String(v || "on") === "off" ? 1 : 4; return { advance: T.advance, phase: T.gameState }; } },
      { id: "probe", label: "Read the level state", args: "unused",
        doc: "Phase, level and paused flag, spawned/saved/lost/total, goal percent and saved target, spawn interval/rate and the base interval, time left and elapsed, alive lemmings, remaining skill counts, selected skill and the skill list.",
        run: function () {
          var T = h(), lems = T.lems || [];
          return { phase: T.gameState, level: T.levelNum, paused: !!T.paused, advance: T.advance,
            spawned: T.spawned, saved: T.saved, lost: T.lost, total: T.total,
            goalPercent: T.goalPercent, goalSaved: T.goalSaved,
            spawnInterval: T.spawnInterval, baseInterval: T.baseSpawnInterval, spawnRate: T.spawnRate,
            timeLeft: num(T.timeLeft, 10), gameTime: num(T.gameTime, 10),
            alive: lems.length, skills: T.SKILLS, skillCounts: T.skillCounts, selectedSkill: T.selectedSkill };
        } },
      { id: "watch", label: "Log the level every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Spawned/saved/lost, time left and alive count each interval — the trace for solving a level; window.__tllLems holds the timer.",
        run: function (s) {
          if (window.__tllLems) { clearInterval(window.__tllLems); window.__tllLems = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllLems = setInterval(function () {
            var T = h();
            console.log("spawned", T.spawned + "/" + T.total, "saved", T.saved, "lost", T.lost,
              "goal", T.goalSaved, "timeLeft", (T.timeLeft || 0).toFixed(1), "alive", (T.lems || []).length, "phase", T.gameState);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Skill allocation table for the current level",
        doc: "Prints every skill's remaining count against the lemmings alive and the spawn total — the resource budget for solving the level.",
        js: 'var T = window.TLHOOK, c = T.skillCounts || {};\nvar rows = (T.SKILLS || []).map(function (s) { return { skill: s, remaining: c[s] !== undefined ? c[s] : 0 }; });\nconsole.table(rows);\nconsole.log("total", T.total, "spawned", T.spawned, "saved", T.saved, "goalSaved", T.goalSaved, "alive", (T.lems || []).length);' },
      { label: "Par sweep across levels",
        doc: "Loads the first levels and prints terrain size, lemming count, goal and default time — the difficulty curve in numbers.",
        js: 'var T = window.TLHOOK, out = [];\nfor (var n = 1; n <= Math.min(10, 20); n++) {\n  T.loadLevel(n, false);\n  out.push({ level: T.levelNum, total: T.total, goalSaved: T.goalSaved, goalPercent: T.goalPercent,\n    time: T.defaultTimeForLevel ? T.defaultTimeForLevel(T.levelNum) : T.timeLeft,\n    spawnInterval: T.spawnInterval, spawnRate: T.spawnRate, skills: JSON.stringify(T.skillCounts) });\n}\nconsole.table(out);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live level (phase, release counters, goal, time, physics numbers, skill table). BALANCE edits walk speed, gravity, fall limits, release timing, goal, grid size and the selected skill's count. CHEATS changes the run. LAYOUT resizes and repositions the HUD, skill bar and overlay per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "Bridge", text: "lemmings.html wraps its game in an arrow IIFE. Its last block publishes window.TLHOOK: the tick entry (advance), the level functions (loadLevel, genLevel, createLem, endLevel, endLevelIfNeeded, assignSkill, commitLevelSeed, defaultTimeForLevel), the counters (spawned, saved, lost, total, timeLeft, spawnTimer, spawnInterval, spawnRate), the grid (COLS/ROWS/TILE/terrain/spawn/exit), the physics numbers (WALK_PPS, GRAVITY, MAX_FALL, FLOAT_FALL, LETHAL_FALL) and SKILLS/speedOptions/rateOptions. No game code runs in that block." },
      { topic: "Two speed knobs", text: "The page has its own SPEED cycle (1, 2, 4) and an 8x fast-forward flag; the simulation runs a fixed 30 Hz tick, so those are multipliers of ticks per frame. The harness freeze/slow rows wrap advance() and restore the original, independent of the page's buttons." },
      { topic: "Grid edits need a rebuild", text: "COLS/ROWS/TILE are readable and writable here, but the terrain array, canvas size and camera metrics are recomputed by the page's own Apply size button (computeMetrics + updateCanvasSize). Change the numbers, then press that button." },
      { topic: "Win and fail", text: "endLevel() compares saved with goalSaved and shows the complete/fail banner plus rank text. CHEATS: win this level fills the counter first; fail this level drops it below the goal — both use the page's real path, including the NEXT LEVEL / RETRY button label." },
      { topic: "Not reachable", text: "The audio synth and procedural music scheduler, the terrain noise generator internals and the particle pool stay inside the IIFE. Terrain structure is visible as a text map through the console hook; the sound graph is controlled by the page's own mute and music-seed controls." },
      { topic: "Texts", text: "The page uses the shared i18n.js kit (en/es/pt/ru/zh), so the TEXTS tab is kit-driven. Level-complete, fail and rank strings are built through TLI18N.t with placeholder values, so editing those keys changes the banners live." }
    ]
  });
})();
