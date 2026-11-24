/* Developer harness script for noid.html (SQUISHOID - soft-body arkanoid).
   Loaded by the page loader when the URL has ?debug=dbg/noid.js, after dbg/_harness.js.
   noid.html wraps its game in one strict IIFE and exports a single window.TLHOOK handle
   (end of that IIFE) with the names this script needs. */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  var H = window.TLHOOK || {};
  function C() { return H.CFG || {} }
  function gs() { return H.G || null }
  function bls() { return H.balls || [] }
  function num(v) { return (typeof v === "number" && isFinite(v)) ? v : 0 }
  function ensureRun() {
    if (H.paddle) return;
    var b = document.getElementById("startBtn");
    if (b) b.click();
  }
  var stepSave = null;

  function freeze(on) {
    var c = C();
    if (!c.physics) { TLDBG.toast("CFG.physics missing"); return }
    if (on) { if (stepSave === null) stepSave = c.physics.step; c.physics.step = 0 }
    else { if (stepSave !== null) { c.physics.step = stepSave; stepSave = null } }
  }
  function slowmo(on) {
    var c = C();
    if (!c.physics) { TLDBG.toast("CFG.physics missing"); return }
    if (on) { if (stepSave === null) stepSave = c.physics.step; c.physics.step = stepSave / 3 }
    else { if (stepSave !== null) { c.physics.step = stepSave; stepSave = null } }
  }
  function setLevel(n) {
    var gg = gs(); if (!gg) return;
    gg.level = n; gg.level0 = n;
    if (typeof H.buildLevel === "function") H.buildLevel(n);
    TLDBG.toast("level " + n + " rebuilt from the seed");
  }
  function givePrize(t) {
    if (typeof H.applyPrize !== "function") { TLDBG.toast("applyPrize() not reachable"); return false }
    var list = H.PRIZES || [], idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].k === t) { idx = i; break }
    if (idx < 0) {
      if (typeof t === "number" && list[t]) idx = t;
      else { TLDBG.toast("no prize '" + t + "' — names: " + list.map(function (p) { return p.k }).join(", ")); return false }
    }
    H.applyPrize(idx); TLDBG.toast("prize " + t + " applied");
    return true;
  }
  function addLife(n) {
    var gg = gs(); if (!gg) return;
    var max = C().lives ? C().lives.max : 6;
    gg.lives = Math.min(max, gg.lives + n);
    TLDBG.toast("lives " + gg.lives);
  }
  function spawnBall() {
    if (typeof H.makeBall !== "function") { TLDBG.toast("makeBall() not reachable"); return }
    var c = C(), cx = gs() ? num(gs().tx) : (c.screen ? c.screen.W / 2 : 240);
    H.makeBall(cx, (c.paddle ? c.paddle.y : 646) - (c.ball ? c.ball.r : 10) - 2, true);
    TLDBG.toast("ball spawned stuck to the paddle");
  }
  function clearField() {
    var gr = H.grid;
    if (!gr) { TLDBG.toast("grid not reachable"); return }
    for (var i = 0; i < gr.length; i++) gr[i] = 0;
    TLDBG.toast("brick grid zeroed");
  }
  function volley() { if (typeof H.fireBullet === "function") H.fireBullet(); else TLDBG.toast("fireBullet() not reachable") }
  function liveBricks() {
    var gr = H.grid || [], k = 0;
    for (var i = 0; i < gr.length; i++) if (gr[i]) k++;
    return k;
  }

  /* text tables: applyLang() re-assigns TEXTS from TLANGS[lang], and the English
     reference table is the original TEXTS object captured as TEXTS_EN */
  function table(l) {
    if (l === "en") return H.TEXTS_EN || H.TEXTS || {};
    return (H.TLANGS && H.TLANGS[l]) ? H.TLANGS[l] : {};
  }

  TLDBG.register({
    game: "noid",
    file: "noid.html",
    state: function () {
      var gg = gs(), c = C(), arr = bls(), gr = H.grid || [];
      var live = 0;
      for (var i = 0; i < gr.length; i++) if (gr[i]) live++;
      var onPrize = gg ? Object.keys(gg.fx || {}).filter(function (k) { return num(gg.fx[k]) > 0 }) : [];
      return {
        mode: gg ? gg.mode : "-",
        paused: gg ? !!gg.paused : false,
        seed: gg ? gg.seed : "-",
        level: gg ? gg.level : 0,
        score: gg ? gg.score : 0,
        best: gg ? gg.best : 0,
        lives: gg ? gg.lives : 0,
        chain: gg ? gg.chain : 0,
        bricks: live,
        balls: arr.length,
        bullets: H.bullets ? H.bullets.length : 0,
        stuckToPaddle: H.attached != null ? H.attached : 0,
        ff: gg ? num(gg.ffCurrent).toFixed(2) : "1",
        gravScale: gg ? num(gg.gravScale).toFixed(2) : "1",
        paddleX: H.paddle ? Math.round(num(H.paddle.x)) : 0,
        prizes: onPrize.join(",") || "-",
        lang: (typeof window.TLI18N !== "undefined") ? window.TLI18N.lang() : "?",
        step: c.physics ? num(c.physics.step) : 0
      };
    },
    params: [
      { id: "step", label: "Physics step", unit: "s", min: 0, max: 0.02, step: 0.0005,
        get: function () { return num(C().physics ? C().physics.step : 0) },
        set: function (v) { if (C().physics) C().physics.step = v },
        code: { file: "noid.html", line: 210, name: "CFG.physics.step" },
        doc: "Integration step (shipped 1/120). 0 freezes the simulation; larger values make it coarse and fast" },
      { id: "grav", label: "Ball gravity", unit: "px/s2", min: 0, max: 3000, step: 10,
        get: function () { return num(C().physics ? C().physics.grav : 0) },
        set: function (v) { if (C().physics) C().physics.grav = v },
        code: { file: "noid.html", line: 210, name: "CFG.physics.grav" },
        doc: "Downward pull on every free ball; 0 lets them drift straight" },
      { id: "air", label: "Air drag per step", unit: "x", min: 0.9, max: 1, step: 0.0005,
        get: function () { return num(C().physics ? C().physics.air : 0) },
        set: function (v) { if (C().physics) C().physics.air = v },
        code: { file: "noid.html", line: 210, name: "CFG.physics.air" },
        doc: "Velocity retained each step; below 0.99 the ball bleeds speed visibly" },
      { id: "iter", label: "Collision iterations", unit: "passes", min: 1, max: 8, step: 1,
        get: function () { return num(C().physics ? C().physics.iter : 0) },
        set: function (v) { if (C().physics) C().physics.iter = v },
        code: { file: "noid.html", line: 210, name: "CFG.physics.iter" },
        doc: "Sub-steps per frame when resolving ball/brick/paddle hits; raise it to stop tunnelling at high speed" },
      { id: "ballBase", label: "Ball speed base", unit: "px/s", min: 1, max: 9, step: 0.05,
        get: function () { return num(C().ball ? C().ball.base : 0) },
        set: function (v) { if (C().ball) C().ball.base = v },
        code: { file: "noid.html", line: 209, name: "CFG.ball.base" },
        doc: "Launch speed of a new ball (perLevel ramp and the cap below limit it)" },
      { id: "ballMax", label: "Ball speed cap", unit: "px/s", min: 2, max: 12, step: 0.05,
        get: function () { return num(C().ball ? C().ball.max : 0) },
        set: function (v) { if (C().ball) C().ball.max = v },
        code: { file: "noid.html", line: 209, name: "CFG.ball.max" },
        doc: "Hard ceiling on ball speed as levels ramp up" },
      { id: "paddleW", label: "Paddle width", unit: "px", min: 30, max: 240, step: 1,
        get: function () { return num(C().paddle ? C().paddle.width : 0) },
        set: function (v) { if (C().paddle) C().paddle.width = v },
        code: { file: "noid.html", line: 208, name: "CFG.paddle.width" },
        doc: "Neutral paddle width; the WIDE and THIN prizes scale from this value" },
      { id: "paddleCurve", label: "Paddle curve", unit: "x", min: 0, max: 3, step: 0.05,
        get: function () { return num(C().paddle ? C().paddle.curve : 0) },
        set: function (v) { if (C().paddle) C().paddle.curve = v },
        code: { file: "noid.html", line: 208, name: "CFG.paddle.curve" },
        doc: "How strongly the convex paddle bends reflections by hit offset; 0 = flat mirror" },
      { id: "brickScore", label: "Brick score", unit: "points", min: 5, max: 500, step: 5,
        get: function () { return num(C().score ? C().score.brick : 0) },
        set: function (v) { if (C().score) C().score.brick = v },
        code: { file: "noid.html", line: 214, name: "CFG.score.brick" },
        doc: "Points per normal brick; metal bricks use CFG.score.metal on the same line" },
      { id: "chainMul", label: "Chain multiplier step", unit: "x10", min: 1, max: 40, step: 1,
        get: function () { return num(C().score ? C().score.chainMul : 0) },
        set: function (v) { if (C().score) C().score.chainMul = v },
        code: { file: "noid.html", line: 214, name: "CFG.score.chainMul" },
        doc: "Bonus added per consecutive hit without touching the paddle" },
      { id: "livesStart", label: "Starting lives", unit: "balls", min: 1, max: 9, step: 1,
        get: function () { return num(C().lives ? C().lives.start : 0) },
        set: function (v) { if (C().lives) C().lives.start = v },
        code: { file: "noid.html", line: 216, name: "CFG.lives.start" },
        doc: "Lives a new run starts with; G.lives is already set for the run in progress, so use the life cheats for that" },
      { id: "bulletSpeed", label: "Bullet speed", unit: "px/s", min: 4, max: 40, step: 0.5,
        get: function () { return num(C().bullets ? C().bullets.speed : 0) },
        set: function (v) { if (C().bullets) C().bullets.speed = v },
        code: { file: "noid.html", line: 217, name: "CFG.bullets.speed" },
        doc: "Gun/laser projectile speed; CFG.bullets.max (same line) caps the volley count" },
      { id: "ffMax", label: "Fast-forward max", unit: "x", min: 1, max: 8, step: 0.1,
        get: function () { return num(C().ff ? C().ff.max : 0) },
        set: function (v) { if (C().ff) C().ff.max = v },
        code: { file: "noid.html", line: 213, name: "CFG.ff.max" },
        doc: "Top time multiplier the hold-to-FF control ramps to; rampUp/rampDown on the same line shape the ramp" },
      { id: "metalChance", label: "Metal brick chance", unit: "base", min: 0, max: 0.6, step: 0.005,
        get: function () { return num(C().grid ? C().grid.metalChanceBase : 0) },
        set: function (v) { if (C().grid) C().grid.metalChanceBase = v },
        code: { file: "noid.html", line: 207, name: "CFG.grid.metalChanceBase" },
        doc: "Base probability of an indestructible brick; metalChancePerLevel and metalChanceMax sit on the same line" },
      { id: "topBar", label: "Top bar height", unit: "px", min: 0, max: 120, step: 1,
        get: function () { return num(C().ui ? C().ui.topbar : 0) },
        set: function (v) { if (C().ui) C().ui.topbar = v },
        code: { file: "noid.html", line: 206, name: "CFG.ui.topbar" },
        doc: "Reserved strip above the play field; it shifts the HUD and the grid's top offset" }
    ],
    cheats: [
      { id: "freeze", label: "Freeze simulation", doc: "writes CFG.physics.step = 0 and restores the previous step when switched off",
        toggle: true, on: function (v) { freeze(v) } },
      { id: "slowmo", label: "Slow motion (1/3)", doc: "writes CFG.physics.step / 3 while on; restores when off",
        toggle: true, on: function (v) { slowmo(v) } },
      { id: "life", label: "+1 life", doc: "adds one life, capped at CFG.lives.max", run: function () { addLife(1) } },
      { id: "livesFull", label: "Fill lives to max", doc: "sets G.lives to CFG.lives.max",
        run: function () { var gg = gs(); if (gg) { gg.lives = C().lives ? C().lives.max : 6; TLDBG.toast("lives " + gg.lives) } } },
      { id: "prizeGun", label: "Grant GUN", doc: "runs the page's own applyPrize('shoot') - real pickup path, banner and timer", run: function () { givePrize("shoot") } },
      { id: "prizeSticky", label: "Grant STICKY", doc: "applyPrize('sticky') so the ball catches where it lands", run: function () { givePrize("sticky") } },
      { id: "prizeField", label: "Grant FORCE FIELD", doc: "applyPrize('field') - the floor becomes a bounce", run: function () { givePrize("field") } },
      { id: "prizeLife", label: "Grant EXTRA LIFE", doc: "applyPrize('life') exactly like hitting a gold brick", run: function () { givePrize("life") } },
      { id: "spawn", label: "Spawn a stuck ball", doc: "calls the page's own makeBall() above the paddle, stuck", run: spawnBall },
      { id: "levelNext", label: "Rebuild next level", doc: "sets G.level+1 and calls buildLevel() on the current seed",
        run: function () { var gg = gs(); if (gg) setLevel(gg.level + 1) } },
      { id: "clearGrid", label: "Zero the brick grid", doc: "writes every grid cell to 0 to drive the level-clear/bonus path", run: clearField },
      { id: "ffOn", label: "Fast-forward on", doc: "sets G.ffTarget = CFG.ff.max, the same state as holding the FF key",
        run: function () { var gg = gs(); if (gg) gg.ffTarget = C().ff ? C().ff.max : 3 } },
      { id: "ffOff", label: "Fast-forward off", doc: "sets G.ffTarget back to 1",
        run: function () { var gg = gs(); if (gg) gg.ffTarget = 1 } },
      { id: "volley", label: "Fire a volley", doc: "calls the page's own fireBullet()", run: volley }
    ],
    hooks: [
      { label: "log CFG (full balance)", doc: "the whole balance table as it now stands", run: function () { console.log(C()) } },
      { label: "log G (run state)", doc: "mode, seed, level, lives, chain, prize timers, paddle bounds, fast-forward", run: function () { console.log(gs()) } },
      { label: "console.table(balls)", doc: "every live ball: position, velocity, radius, stuck flag",
        run: function () { console.table(bls().map(function (b) { return { x: Math.round(num(b.x)), y: Math.round(num(b.y)), vx: Math.round(num(b.vx)), vy: Math.round(num(b.vy)), r: num(b.r), stuck: !!b.stuck } })) } },
      { label: "log bricks per row", doc: "how many bricks are left in each of the 12 rows",
        run: function () {
          var gr = H.grid;
          if (!gr) { console.log("grid not reachable"); return }
          var cols = H.COLS || 9, rows = [];
          for (var r = 0; r < 12; r++) { var n = 0; for (var c = 0; c < cols; c++) if (gr[r * cols + c]) n++; rows.push(n) }
          console.log("bricks per row", rows);
        } }
    ],
    layout: [
      { sel: "#cvwrap", label: "canvas wrapper" },
      { sel: "#cv", label: "game canvas" },
      { sel: "#banner", label: "banner line" },
      { sel: "#fx", label: "active prize strip" },
      { sel: "#lblScore", label: "SCORE caption" },
      { sel: "#lblLevelHud", label: "LEVEL caption in the HUD" },
      { sel: "#lblLives", label: "LIVES caption" },
      { sel: "#score", label: "score value" },
      { sel: "#level", label: "level value" },
      { sel: "#lives", label: "lives value" },
      { sel: "#best", label: "best value" },
      { sel: "#chain", label: "chain xN badge" },
      { sel: "#lblSeed", label: "SEED caption" },
      { sel: "#hashTag", label: "seed tag" },
      { sel: "#logoTitle", label: "title logo" },
      { sel: "#flavor", label: "title flavour line" },
      { sel: "#pauseOv", label: "pause overlay" },
      { sel: "#overOv", label: "game-over overlay" },
      { sel: "#overStats", label: "game-over stats block" },
      { sel: "#helpOv", label: "help overlay" },
      { sel: "#helpScroll", label: "help scroll area" },
      { sel: "#ffBtn", label: "fast-forward button" },
      { sel: "#muteBtn", label: "mute button" },
      { sel: "#diceBtn", label: "random-seed button" },
      { sel: "#pauseBtn", label: "pause button" },
      { sel: "#lvlVal", label: "level stepper value" }
    ],
    texts: {
      langs: function () { return H.TLANGS ? ["en"].concat(Object.keys(H.TLANGS)) : ["en"] },
      keys: function (l) { return Object.keys(table(l)) },
      get: function (l, k) { var t = table(l), e = table("en"); return t[k] != null ? t[k] : (e[k] != null ? e[k] : "") },
      set: function (l, k, v) {
        if (l === "en") {
          if (H.TEXTS_EN) H.TEXTS_EN[k] = v;
          if (H.TEXTS) H.TEXTS[k] = v;
        } else if (H.TLANGS) { H.TLANGS[l] = H.TLANGS[l] || table(l); H.TLANGS[l][k] = v }
      },
      apply: function () { if (typeof H.applyLang === "function") H.applyLang() }
    },
    control: [
      { id: "paddleTo", label: "Move the paddle", args: "[x] canvas pixels", argDefault: "[400]",
        doc: "Sets paddle.x (clamped by the page on the next step) — position the paddle under a falling ball without the mouse.",
        run: function (a) { ensureRun(); var p = H.paddle; if (!p) return "no paddle"; p.x = Number(Array.isArray(a) ? a[0] : a); return { paddleX: Math.round(num(p.x, 1)), balls: bls().length }; } },
      { id: "ball", label: "Spawn a ball", args: "[x, y] or unused for above-paddle", argDefault: "",
        doc: "makeBall(x, y, stuck) — stuck = true when no coordinates are given, so the ball waits on the paddle like a normal launch.",
        run: function (a) {
          ensureRun();
          var p = H.paddle, x = Array.isArray(a) ? Number(a[0]) : (p ? p.x : 400), y = Array.isArray(a) ? Number(a[1]) : 120;
          spawnBall();
          var last = bls()[bls().length - 1];
          if (last) { last.x = x; last.y = y; }
          return { balls: bls().length, at: [Math.round(x), Math.round(y)] }
        } },
      { id: "prize", label: "Grant a prize", args: 'prize name: wide, narrow, multi, slow, fast, concave, shoot, sticky, laser, fireball, shield, disruptor, invisible, gravity, field', argDefault: "shoot",
        doc: "Looks the name up in PRIZES and calls applyPrize(index) — banner, HUD, fx timers and score behave exactly as a caught prize.",
        run: function (t) { var name = String(t || "shoot"); var ok = givePrize(name); var gg = gs(); return { applied: !!ok, prize: name, fx: gg ? Object.keys(gg.fx || {}).filter(function (k) { return num(gg.fx[k]) > 0 }) : [], lives: gg ? gg.lives : 0 }; } },
      { id: "level", label: "Rebuild a level", args: "level number", argDefault: 3,
        doc: "Sets G.level and calls buildLevel() on the current seed — deterministic layout for the same seed, so a level is reproducible.",
        run: function (n) { setLevel(Math.max(1, Math.round(Number(n) || 1))); var gg = gs(); return { level: gg ? gg.level : 0, seed: gg ? gg.seed : "-", bricks: liveBricks() } } },
      { id: "fire", label: "Fire a bullet", args: "unused", doc: "fireBullet() through the page's own path (respects the GUN prize).",
        run: function () { volley(); return { bullets: H.bullets ? H.bullets.length : 0 } } },
      { id: "probe", label: "Read the run", args: "unused",
        doc: "Mode, level, score, lives, chain, live bricks, balls with velocity, bullets, prizes active, paddle position and the physics step.",
        run: function () {
          var gg = gs();
          return { mode: gg ? gg.mode : "-", paused: gg ? !!gg.paused : false, level: gg ? gg.level : 0, score: gg ? gg.score : 0,
            lives: gg ? gg.lives : 0, chain: gg ? gg.chain : 0, bricks: liveBricks(), balls: bls().map(function (b) { return { x: num(b.x, 1), y: num(b.y, 1), vx: num(b.vx, 10), vy: num(b.vy, 10), stuck: !!b.stuck } }),
            bullets: H.bullets ? H.bullets.length : 0, stuckToPaddle: H.attached != null ? H.attached : 0,
            prizes: gg ? Object.keys(gg.fx || {}).filter(function (k) { return num(gg.fx[k]) > 0 }) : "-",
            paddleX: H.paddle ? Math.round(num(H.paddle.x)) : 0 }
        } },
      { id: "watch", label: "Log the field every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Ball count, brick count, score line each interval; window.__tllField holds the timer.",
        run: function (s) {
          if (window.__tllField) { clearInterval(window.__tllField); window.__tllField = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllField = setInterval(function () {
            var gg = gs();
            console.log("level", gg && gg.level, "bricks", liveBricks(), "balls", bls().length, "bullets", H.bullets ? H.bullets.length : 0, "score", gg && gg.score, "chain", gg && gg.chain);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Auto-rally: paddle chases the lowest ball",
        doc: "A tiny tracker that keeps the paddle under the fastest-descending ball, so rallies run hands-free and you can measure brick clear rate.",
        js: 'var H = window.TLHOOK;\nif (window.__tllRally) clearInterval(window.__tllRally);\nwindow.__tllRally = setInterval(function () {\n  var b = (H.balls || []).filter(function (x) { return !x.stuck; }).sort(function (a, c) { return c.vy - a.vy; })[0];\n  if (b && H.paddle) H.paddle.x = Math.max(40, Math.min(H.W - 40, b.x));\n}, 16);\nsetInterval(function () { var g = H.G; console.log("bricks left", (H.grid || []).filter(function (v) { return v; }).length, "score", g && g.score, "balls", (H.balls || []).length); }, 1000);' },
      { label: "Prize stack test",
        doc: "Grants every prize in one go and logs the active effect timers — the fast way to check prize interaction (sticky + field + gun).",
        js: 'var apply = window.TLHOOK.applyPrize;\n["shoot", "sticky", "field", "life"].forEach(function (t) { apply(t); });\nvar g = window.TLHOOK.G;\nconsole.log("fx", Object.keys(g.fx || {}).filter(function (k) { return g.fx[k] > 0 }), "lives", g.lives, "balls", window.TLHOOK.balls.length);' }
    ],

    docs: [
      { topic: "What this panel is", text: "SQUISHOID driven live: STATE polls the page's own G (mode, seed, level, score, lives, chain, active prizes), the ball and bullet arrays and the brick grid every 700 ms." },
      { topic: "How it reaches the game", text: "noid.html wraps its game in one strict IIFE and exports a single window.TLHOOK handle (end of that IIFE): CFG, G, paddle, balls, bullets, grid, attached, TEXTS/TEXTS_EN/TLANGS, W/H/COLS and the page's own makeBall/buildLevel/applyPrize/fireBullet/applyLang/resize/syncHUD/makeStars. The panel edits the CFG sub-objects in place through that handle; the page behaves identically with or without ?debug." },
      { topic: "Balance table", text: "CFG is one object (noid.html lines 205-221) with ui, screen, grid, paddle, ball, physics, field, fx, ff, score, lives, bullets and prizeZone groups. Every row here writes into it live; the physics loop re-reads CFG each frame, and buildLevel() reads the grid numbers when the next level is built." },
      { topic: "Freeze and slow motion", text: "Both write CFG.physics.step (1/120 shipped): freeze sets it to 0, slow motion divides it by 3, and switching off restores the exact value that was there before." },
      { topic: "Cheats", text: "Life cheats rewrite G.lives. Prize cheats call the page's own applyPrize() so the real pickup path runs (banner, HUD chip, timer). Spawn uses makeBall() (stuck to the paddle, launch it with the normal tap/Space). Rebuild-level calls buildLevel() on the current seed; zero-grid drives the clear bonus; the FF cheats set G.ffTarget exactly like holding the key." },
      { topic: "Layout and texts", text: "LAYOUT resizes and repositions the canvas wrapper, HUD captions, prize strip, overlays and control buttons per screen mode (portrait/landscape, mobile/desktop). The page ships its own TEXTS (English reference, kept as TEXTS_EN) plus TLANGS for the other languages and re-renders everything with applyLang(); TEXTS edits those tables live. The language button itself comes from the shared i18n.js kit." }
    ]
  });
})();
