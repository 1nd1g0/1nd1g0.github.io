/* Developer harness script for tilt.html (TILT - gravity maze, tilt/gyro/camera control).
   Loaded by the page loader when the URL has ?debug=dbg/tilt.js, after dbg/_harness.js.
   tilt.html keeps its names at the top level of its script (window.step, G, OPT, CTLX,
   GRAV/MAXTILT/VMAX/CELL, TR/applyLang/setLang), so this script reads and patches them
   directly - no window.TLHOOK bridge is needed here. */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  function g() { return (typeof G !== "undefined") ? G : null }
  function num(v) { return (typeof v === "number" && isFinite(v)) ? v : 0 }
  var stepSave = null;

  /* wrap the page's own step(dt): freeze or slow motion, restorable */
  function physicsWrap(m) {
    if (typeof window.step !== "function") { TLDBG.toast("step() not reachable"); return }
    if (m === 1) { if (stepSave) { window.step = stepSave; stepSave = null } return }
    if (!stepSave) stepSave = window.step;
    var orig = stepSave;
    window.step = function (dt) { if (m === 0) return; orig(dt * 0.35) };
  }
  function opt(k, v) {
    if (typeof OPT === "undefined") return;
    if (v === undefined) return OPT[k];
    OPT[k] = v;
    if (typeof optSave === "function") optSave();
    if (typeof syncOpts === "function") syncOpts();
  }
  function ctl(kind, k, v) {
    if (typeof CTLX === "undefined" || !CTLX[kind]) return;
    if (v === undefined) return CTLX[kind][k];
    CTLX[kind][k] = v;
    if (typeof ctlSave === "function") ctlSave();
    if (typeof syncCtl === "function") syncCtl();
  }
  function nudge(x, y) { var gg = g(); if (gg) { gg.tilt.x = x; gg.tilt.y = y } }
  function setSeed(s) {
    var gg = g(); if (!gg) return;
    var inp = document.getElementById("seed"); if (inp) inp.value = s;
    gg.seed = s;
    if (typeof loadLevel === "function") loadLevel(gg.L ? gg.L.idx : 1, s);
    TLDBG.toast("level rebuilt from seed " + s);
  }
  function collectStars() {
    var gg = g(); if (!gg || !gg.L || !gg.L.stars) { TLDBG.toast("no level loaded"); return }
    gg.L.stars.length = 0;
    gg.starsGot = gg.totalStars;
    TLDBG.toast("all stars of this level collected (" + gg.totalStars + ")");
  }

  TLDBG.register({
    game: "tilt",
    file: "tilt.html",
    state: function () {
      var gg = g(), L = gg ? gg.L : null;
      return {
        state: gg ? gg.state : "-",
        seed: L ? L.seed : (gg ? gg.seed : "-"),
        level: L ? L.idx : 0,
        cells: L ? (L.cw + "x" + L.ch) : "-",
        stars: gg ? (gg.starsGot + "/" + gg.totalStars) : "0/0",
        falls: gg ? gg.deaths : 0,
        time: gg ? Math.round(num(gg.time)) : 0,
        ball: gg ? (Math.round(num(gg.bx)) + "," + Math.round(num(gg.by))) : "0,0",
        vel: gg ? (Math.round(num(gg.vx)) + "," + Math.round(num(gg.vy))) : "0,0",
        speed: gg ? Math.round(Math.hypot(num(gg.vx), num(gg.vy))) : 0,
        falling: gg ? num(gg.fall) > 0 : false,
        invincible: gg ? num(gg.inv) > 0 : false,
        tilt: gg ? (num(gg.tilt.x).toFixed(3) + "," + num(gg.tilt.y).toFixed(3)) : "0,0",
        gyroOn: gg ? !!gg.gyroOn : false,
        camOn: gg ? !!gg.camOn : false,
        autoNext: gg ? num(gg.autoNext) > 0 : false,
        vol: (typeof OPT !== "undefined") ? num(OPT.vol).toFixed(2) : "0",
        gfx: (typeof OPT !== "undefined") ? OPT.gfx : "-",
        res: (typeof OPT !== "undefined") ? num(OPT.res) : 1,
        lang: (typeof LANG !== "undefined") ? LANG : "?"
      };
    },
    params: [
      { id: "grav", label: "Gravity", unit: "px/s2", min: 0, max: 6000, step: 10,
        get: function () { return num(typeof GRAV !== "undefined" ? GRAV : 0) },
        set: function (v) { if (typeof GRAV !== "undefined") GRAV = v },
        code: { file: "tilt.html", line: 1034, name: "GRAV" },
        doc: "Downhill pull on the marble. 0 floats it; very high values slam it into the walls" },
      { id: "maxTilt", label: "Max tilt", unit: "x grav", min: 0, max: 0.8, step: 0.005,
        get: function () { return num(typeof MAXTILT !== "undefined" ? MAXTILT : 0) },
        set: function (v) { if (typeof MAXTILT !== "undefined") MAXTILT = v },
        code: { file: "tilt.html", line: 1034, name: "MAXTILT" },
        doc: "How far the tilt input (keys, gyro, camera) can lean the board" },
      { id: "vmax", label: "Speed cap", unit: "px/s", min: 60, max: 2000, step: 10,
        get: function () { return num(typeof VMAX !== "undefined" ? VMAX : 0) },
        set: function (v) { if (typeof VMAX !== "undefined") VMAX = v },
        code: { file: "tilt.html", line: 1034, name: "VMAX" },
        doc: "Velocity ceiling; raise it for faster runs, lower it to keep the marble controllable" },
      { id: "cell", label: "Cell size", unit: "px", min: 16, max: 90, step: 1,
        get: function () { return num(typeof CELL !== "undefined" ? CELL : 0) },
        set: function (v) { if (typeof CELL !== "undefined") CELL = v },
        code: { file: "tilt.html", line: 684, name: "CELL" },
        doc: "Maze cell size; the level geometry is generated from it, so it takes effect on the next level" },
      { id: "wallT", label: "Wall thickness", unit: "px", min: 0, max: 24, step: 1,
        get: function () { return num(typeof WALLT !== "undefined" ? WALLT : 0) },
        set: function (v) { if (typeof WALLT !== "undefined") WALLT = v },
        code: { file: "tilt.html", line: 684, name: "WALLT" },
        doc: "Drawn wall thickness, next level" },
      { id: "wallH", label: "Wall height", unit: "px", min: 0, max: 40, step: 1,
        get: function () { return num(typeof WALLH !== "undefined" ? WALLH : 0) },
        set: function (v) { if (typeof WALLH !== "undefined") WALLH = v },
        code: { file: "tilt.html", line: 684, name: "WALLH" },
        doc: "Extruded wall height for the 3D look, next level" },
      { id: "ballR", label: "Marble radius", unit: "px", min: 4, max: 30, step: 0.5,
        get: function () { return num(g() ? g().r : 0) },
        set: function (v) { var gg = g(); if (gg) gg.r = v },
        code: { file: "tilt.html", line: 1031, name: "G.r (CELL*0.30)" },
        doc: "Live marble radius; raise it to see how tight the corridors really are" },
      { id: "noiseRows", label: "Noise rows", unit: "rows", min: 8, max: 200, step: 1,
        get: function () { return num(typeof RN !== "undefined" ? RN : 0) },
        set: function (v) { if (typeof RN !== "undefined") RN = v },
        code: { file: "tilt.html", line: 1415, name: "RN" },
        doc: "Resolution of the procedural background texture, next redraw" },
      { id: "vol", label: "Sound volume", unit: "0..1", min: 0, max: 1, step: 0.01,
        get: function () { return num(typeof OPT !== "undefined" ? OPT.vol : 0) },
        set: function (v) { opt("vol", v) },
        code: { file: "tilt.html", line: 238, name: "OPT.vol" },
        doc: "Master audio level; OPT.muted on the same line silences everything" },
      { id: "res", label: "Render resolution", unit: "x", min: 0.4, max: 2, step: 0.05,
        get: function () { return num(typeof OPT !== "undefined" ? OPT.res : 1) },
        set: function (v) { opt("res", v) },
        code: { file: "tilt.html", line: 238, name: "OPT.res" },
        doc: "Internal render scale - the cheap way to test frame rate on a weak GPU" },
      { id: "gyroGain", label: "Gyro sensitivity", unit: "%", min: 10, max: 400, step: 5,
        get: function () { return num(ctl("gyro", "s")) },
        set: function (v) { ctl("gyro", "s", v) },
        code: { file: "tilt.html", line: 245, name: "CTLX.gyro.s" },
        doc: "Gain for device tilt; CTLX.gyro.fx/fy flip the axes and ad re-levels the neutral point" },
      { id: "camGain", label: "Camera sensitivity", unit: "%", min: 10, max: 400, step: 5,
        get: function () { return num(ctl("cam", "s")) },
        set: function (v) { ctl("cam", "s", v) },
        code: { file: "tilt.html", line: 245, name: "CTLX.cam.s" },
        doc: "Gain for the facing-camera tilt control (same flip/anti-drift keys as gyro)" },
      { id: "keyGain", label: "Keyboard sensitivity", unit: "%", min: 10, max: 400, step: 5,
        get: function () { return num(ctl("key", "s")) },
        set: function (v) { ctl("key", "s", v) },
        code: { file: "tilt.html", line: 245, name: "CTLX.key.s" },
        doc: "Gain for arrow/WASD tilt input" },
      { id: "degrade", label: "Degrade level", unit: "steps", min: 0, max: 4, step: 1,
        get: function () { return num(typeof DEGRADE !== "undefined" ? DEGRADE : 0) },
        set: function (v) { if (typeof DEGRADE !== "undefined") DEGRADE = v },
        code: { file: "tilt.html", line: 272, name: "DEGRADE" },
        doc: "Forced quality drop the auto performance monitor can dial in; set it by hand to test the low path" }
    ],
    cheats: [
      { id: "freeze", label: "Freeze physics", doc: "wraps the page's own window.step(dt) as a no-op while on; restores it when off",
        toggle: true, on: function (v) { physicsWrap(v ? 0 : 1) } },
      { id: "slowmo", label: "Slow motion (35%)", doc: "wraps window.step(dt) at 0.35x while on; restores when off",
        toggle: true, on: function (v) { physicsWrap(v ? 0.35 : 1) } },
      { id: "inv", label: "Never fall", doc: "keeps G.inv high so the pit/hole loss path cannot trigger; restores on off",
        toggle: true, on: function (v) { var gg = g(); if (gg) gg.inv = v ? 1e9 : 0 } },
      { id: "start", label: "Start run", doc: "calls the page's own startGame()",
        run: function () { if (typeof startGame === "function") startGame(); else TLDBG.toast("startGame() not reachable") } },
      { id: "win", label: "Win this level", doc: "calls winLevel() - drives the win overlay, best-time store and next-level path",
        run: function () { if (typeof winLevel === "function") winLevel(); else TLDBG.toast("winLevel() not reachable") } },
      { id: "next", label: "Jump to next level", doc: "calls nextLevel(): loads level index + 1 on the same seed",
        run: function () { if (typeof nextLevel === "function") nextLevel(); else TLDBG.toast("nextLevel() not reachable") } },
      { id: "respawn", label: "Respawn marble", doc: "calls the page's own respawn() (picks the nearest safe cell)",
        run: function () { if (typeof respawn === "function") respawn(); else TLDBG.toast("respawn() not reachable") } },
      { id: "stars", label: "Collect every star", doc: "empties the level's star list and sets starsGot to totalStars", run: collectStars },
      { id: "zeroFalls", label: "Reset fall counter", doc: "G.deaths = 0 (the number printed on the win screen)",
        run: function () { var gg = g(); if (gg) { gg.deaths = 0; TLDBG.toast("falls reset") } } },
      { id: "tiltLeft", label: "Force tilt left", doc: "writes G.tilt directly, no input device needed",
        run: function () { nudge(-num(typeof MAXTILT !== "undefined" ? MAXTILT : 0.235), 0) } },
      { id: "tiltDown", label: "Force tilt down", doc: "writes G.tilt.y to the maximum lean",
        run: function () { nudge(0, num(typeof MAXTILT !== "undefined" ? MAXTILT : 0.235)) } },
      { id: "tiltOff", label: "Level the board", doc: "G.tilt = 0,0", run: function () { nudge(0, 0) } },
      { id: "autoNext", label: "Auto-advance levels", doc: "keeps G.autoNext high so winning loads the next level by itself",
        toggle: true, on: function (v) { var gg = g(); if (gg) gg.autoNext = v ? 1e9 : 0 } },
      { id: "newSeed", label: "Rebuild from a random seed", doc: "rolls a new seed into #seed and reloads the level",
        run: function () { setSeed("DBG-" + Math.random().toString(36).slice(2, 8).toUpperCase()) } }
    ],
    hooks: [
      { label: "log G (run state)", doc: "state, seed, marble, velocity, tilt, gyro/camera flags, timers", run: function () { console.log(g()) } },
      { label: "log G.L (the maze)", doc: "generated level: seed, index, size, start, goal, hole and star counts",
        run: function () {
          var gg = g();
          if (!gg || !gg.L) { console.log("no level loaded"); return }
          var L = gg.L;
          console.log({ seed: L.seed, idx: L.idx, cw: L.cw, ch: L.ch, start: L.start, goal: L.goal, stars: L.stars.length, holes: L.holes ? L.holes.length : undefined });
        } },
      { label: "log OPT / CTLX", doc: "graphics and audio options plus the per-device control tuning",
        run: function () { console.log((typeof OPT !== "undefined") ? OPT : null, (typeof CTLX !== "undefined") ? CTLX : null) } },
      { label: "log physics constants", doc: "GRAV, MAXTILT, VMAX, CELL, WALLT, WALLH, DEGRADE as they now stand",
        run: function () {
          console.log({
            GRAV: typeof GRAV !== "undefined" ? GRAV : null, MAXTILT: typeof MAXTILT !== "undefined" ? MAXTILT : null,
            VMAX: typeof VMAX !== "undefined" ? VMAX : null, CELL: typeof CELL !== "undefined" ? CELL : null,
            WALLT: typeof WALLT !== "undefined" ? WALLT : null, WALLH: typeof WALLH !== "undefined" ? WALLH : null,
            DEGRADE: typeof DEGRADE !== "undefined" ? DEGRADE : null
          });
        } }
    ],
    layout: [
      { sel: "#cv", label: "game canvas" },
      { sel: "#vig", label: "vignette layer" },
      { sel: "#tiltT", label: "tilt indicator" },
      { sel: "#hud", label: "HUD strip" },
      { sel: "#hLv", label: "HUD level" },
      { sel: "#hSeed", label: "HUD seed" },
      { sel: "#hStars", label: "HUD stars" },
      { sel: "#hTime", label: "HUD timer" },
      { sel: "#hBest", label: "HUD best time" },
      { sel: "#hint", label: "hint line" },
      { sel: "#camT", label: "camera indicator" },
      { sel: "#mbc", label: "mobile control block" },
      { sel: "#menu", label: "title menu panel" },
      { sel: "#seed", label: "seed field" },
      { sel: "#dice", label: "random seed button" },
      { sel: "#lv", label: "level stepper" },
      { sel: "#play", label: "play button" },
      { sel: "#optB", label: "options button" },
      { sel: "#helpB", label: "help button" },
      { sel: "#gyro", label: "gyro toggle" },
      { sel: "#camB", label: "camera toggle" },
      { sel: "#langB2", label: "language button in game" },
      { sel: "#homeB", label: "home button" },
      { sel: "#pause", label: "pause overlay" },
      { sel: "#optP", label: "options panel" },
      { sel: "#ctlsP", label: "controls panel" },
      { sel: "#calW1", label: "calibration widget" },
      { sel: "#win", label: "win overlay" },
      { sel: "#wInfo", label: "win info lines" },
      { sel: "#gfxP", label: "graphics panel" },
      { sel: "#senKeyP", label: "keyboard sensitivity row" },
      { sel: "#senGyroP", label: "gyro sensitivity row" },
      { sel: "#senCamP", label: "camera sensitivity row" }
    ],
    texts: {
      langs: function () { return (typeof TR !== "undefined") ? Object.keys(TR) : ["en"] },
      keys: function (l) { var t = (typeof TR !== "undefined") ? (TR[l] || TR.en) : {}; return Object.keys(t) },
      get: function (l, k) { var t = (typeof TR !== "undefined") ? TR : {}; return (t[l] && t[l][k] != null) ? t[l][k] : ((t.en && t.en[k] != null) ? t.en[k] : "") },
      set: function (l, k, v) { if (typeof TR === "undefined") return; TR[l] = TR[l] || {}; TR[l][k] = v },
      apply: function () { if (typeof applyLang === "function") applyLang() }
    },
    control: [
      { id: "level", label: "Load a level", args: "[index, seed] — seed optional", argDefault: "[1, \"tll\"]",
        doc: "loadLevel(idx, seed) generates the maze from the seed, puts the ball on the start tile and starts play — the exact path the Start button uses.",
        run: function (a) {
          var idx = 1, seed = "";
          if (Array.isArray(a)) { idx = Number(a[0]) || 1; seed = a[1] ? String(a[1]) : (G.seed || "tll"); }
          else if (a !== "" && a !== undefined) { idx = Number(a) || 1; seed = G.seed || "tll"; }
          else seed = G.seed || "tll";
          G.seed = seed; loadLevel(idx, seed);
          var L = G.L;
          return { level: L.idx, seed: L.seed, cells: L.cw + "x" + L.ch, stars: L.stars.length, start: [num(L.start.x, 1), num(L.start.y, 1)], phase: G.state };
        } },
      { id: "flow", label: "Restart, pause, resume, win or menu", args: '"restart" | "pause" | "resume" | "win" | "menu"', argDefault: "restart",
        doc: "restartLevel() / pause() / resumeGame() / winLevel() / toMenu() — every run transition the keys and buttons reach.",
        run: function (w) {
          var s = String(w || "restart");
          if (s === "pause") pause(); else if (s === "resume") resumeGame(); else if (s === "win") winLevel(); else if (s === "menu") toMenu(true); else restartLevel();
          return { phase: G.state, stars: G.starsGot + "/" + G.totalStars, time: Math.round(G.time), falls: G.deaths };
        } },
      { id: "teleport", label: "Move the ball", args: "[x, y]", argDefault: "",
        doc: "Writes G.bx/G.by — drop the ball past a trap, onto a star, or into a killer tile to test the death and respawn rules.",
        run: function (a) { if (!Array.isArray(a)) return "want [x, y]"; G.bx = Number(a[0]); G.by = Number(a[1]); G.vx = G.vy = 0; G.fall = 0; G.inv = 0.8; return { ball: [num(G.bx, 1), num(G.by, 1)], cells: G.L ? G.L.cw + "x" + G.L.ch : "-" }; } },
      { id: "velocity", label: "Set velocity", args: "[vx, vy]", argDefault: "[200, 0]",
        doc: "Writes G.vx/G.vy directly — launch the ball at a corner to see whether a gap is passable at speed.",
        run: function (a) { if (!Array.isArray(a)) return "want [vx, vy]"; G.vx = Number(a[0]); G.vy = Number(a[1]); return { vel: [num(G.vx, 10), num(G.vy, 10)], speed: num(Math.hypot(G.vx, G.vy), 10), vmax: VMAX }; } },
      { id: "tilt", label: "Force the tilt", args: "[x, y] in -1..1", argDefault: "[0.5, 0]",
        doc: "Writes the tilt target G.tiltT — the value the gyro or camera calibration produces; gravity applies MAXTILT * tilt each step, so this simulates tilting the device without moving it.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [x, y]";
          var cl = function (v) { return Math.max(-1, Math.min(1, Number(v) || 0)); };
          G.tiltT.x = cl(a[0]); G.tiltT.y = cl(a[1]);
          return { target: [num(G.tiltT.x, 100), num(G.tiltT.y, 100)], current: [num(G.tilt.x, 100), num(G.tilt.y, 100)], maxTilt: MAXTILT };
        } },
      { id: "tuning", label: "Set gravity, tilt and speed caps", args: "[GRAV, MAXTILT, VMAX]", argDefault: "[2350, 0.235, 620]",
        doc: "These three top-level constants define the feel: how hard the tilt pulls, and the speed ceiling. Live values, applied on the next step.",
        run: function (a) { if (!Array.isArray(a)) return "want [GRAV, MAXTILT, VMAX]"; GRAV = Number(a[0]); MAXTILT = Number(a[1]); VMAX = Number(a[2]); return { GRAV: GRAV, MAXTILT: MAXTILT, VMAX: VMAX }; } },
      { id: "gyro", label: "Toggle gyro / camera control", args: '"gyro" | "cam" | "off"', argDefault: "off",
        doc: "Sets G.gyroOn / G.camOn — the sensor paths; off means keyboard-only, so tilt writes come only from this control.",
        run: function (w) {
          var s = String(w || "off");
          G.gyroOn = s === "gyro"; G.camOn = s === "cam";
          if (!G.gyroOn && typeof $ === "function" && $("hint")) $("hint").textContent = G.hintT;
          return { gyroOn: !!G.gyroOn, camOn: !!G.camOn };
        } },
      { id: "probe", label: "Read the maze state", args: "unused",
        doc: "Phase, seed and level, maze size, ball position/velocity/speed, falling and invincibility timers, tilt vectors, gyro and camera flags, stars collected, falls and elapsed time.",
        run: function () {
          var L = G.L;
          return { state: G.state, seed: G.seed, level: L ? L.idx : 0, cells: L ? L.cw + "x" + L.ch : "-",
            ball: [num(G.bx, 1), num(G.by, 1)], vel: [num(G.vx, 10), num(G.vy, 10)], speed: num(Math.hypot(G.vx, G.vy), 10),
            falling: num(G.fall) > 0, invincible: num(G.inv) > 0,
            tilt: { current: [num(G.tilt.x, 1000), num(G.tilt.y, 1000)], target: [num(G.tiltT.x, 1000), num(G.tiltT.y, 1000)] },
            gyroOn: !!G.gyroOn, camOn: !!G.camOn,
            stars: G.starsGot + "/" + G.totalStars, falls: G.deaths, time: Math.round(G.time),
            physics: { GRAV: GRAV, MAXTILT: MAXTILT, VMAX: VMAX, CELL: CELL } };
        } },
      { id: "watch", label: "Log the ball every N seconds", args: "seconds (0 stops)", argDefault: 0.4,
        doc: "Position, velocity, tilt and star count each interval — the trace for tilt-feel tuning; window.__tllMaze holds the timer.",
        run: function (s) {
          if (window.__tllMaze) { clearInterval(window.__tllMaze); window.__tllMaze = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllMaze = setInterval(function () {
            console.log("ball", Math.round(G.bx) + "," + Math.round(G.by), "vel", Math.round(G.vx) + "," + Math.round(G.vy),
              "tilt", G.tilt.x.toFixed(3) + "," + G.tilt.y.toFixed(3), "stars", G.starsGot + "/" + G.totalStars, "state", G.state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Tilt response curve",
        doc: "Steps the tilt target from 0 to 1 and logs the speed the ball settles at, showing how MAXTILT and GRAV map tilt to velocity.",
        js: 'var out = [];\nvar i = 0;\nwindow.__tllMaze = setInterval(function () {\n  var t = i / 10;\n  G.tiltT.x = t; G.tiltT.y = 0;\n  out.push({ tilt: t.toFixed(1), speed: Math.hypot(G.vx, G.vy).toFixed(0), tiltNow: G.tilt.x.toFixed(3) });\n  if (++i > 10) { console.table(out); clearInterval(window.__tllMaze); }\n}, 700);' },
      { label: "Seed sweep: maze sizes and star counts",
        doc: "Loads the same level index under several seeds and prints the generated maze size, star count and start tile — a quick check that seeds produce fair layouts.",
        js: 'var out = [];\n["tll", "aaa", "zzz", "42", "maze"].forEach(function (s) {\n  loadLevel(1, s);\n  var L = G.L;\n  out.push({ seed: s, cells: L.cw + "x" + L.ch, stars: L.stars.length, checks: L.checks.length, start: Math.round(L.start.x) + "," + Math.round(L.start.y) });\n});\nconsole.table(out);' }
    ],

    docs: [
      { topic: "What this panel is", text: "TILT driven live: STATE polls the page's own G every 700 ms - run state, seed, level, maze size, stars, falls, timer, marble position/velocity/speed, tilt vector, gyro and camera flags." },
      { topic: "How it reaches the game", text: "tilt.html declares everything at the top level of its script, so no window.TLHOOK bridge is needed. The panel writes GRAV/MAXTILT/VMAX/CELL/WALLT/WALLH/DEGRADE (plain vars: live on the next frame, or the next level for geometry), OPT and CTLX sub-fields (persisted through the page's own optSave/ctlSave), and calls startGame/winLevel/nextLevel/respawn/loadLevel. Freeze and slow motion wrap window.step(dt) and put the original back when switched off." },
      { topic: "Balance rows", text: "GRAV/MAXTILT/VMAX share line 1034, CELL/WALLT/WALLH share 684, RN is 1415, DEGRADE 272, OPT 238, CTLX 245. Every row carries its exact file/line/name and the export keeps it, so an LLM can patch the source straight from the JSON." },
      { topic: "Cheats", text: "Never fall keeps G.inv huge so pits cannot end the run. Collect-every-star empties the level's star list. Win/next/respawn call the page's own functions so the real overlays and the best-time store run. Force-tilt writes G.tilt directly, the cleanest way to drive a corridor without a sensor. Random-seed rebuilds the maze through loadLevel()." },
      { topic: "Control tuning", text: "CTLX stores per-device flips (fx/fy), anti-drift re-levelling (ad) and gain (s, percent) for camera, gyro and keyboard. Editing those sensitivity rows changes live input handling and is saved by the page's own ctlSave()." },
      { topic: "Layout and texts", text: "LAYOUT resizes and repositions the HUD strip, tilt/camera indicators, mobile controls, menu/options/controls/win/pause panels and the seed row per screen mode (portrait/landscape, mobile/desktop). TEXTS edits the page's own TR table (en/es/pt/ru/zh) and re-renders with applyLang(); the language button uses setLang()." }
    ]
  });
})();
