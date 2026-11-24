/* dbg/pinball32.js — developer harness for pinball32.html (canvas pinball)
 *
 * Load with:  pinball32.html?debug=dbg/pinball32.js
 * pinball32.html wraps its game in a strict IIFE; the last block publishes
 * window.TLHOOK (names only), which everything here reads.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK); }

  var realPhysics = null;
  function wrap(scale) {
    var T = h();
    if (!realPhysics) realPhysics = T.physics;
    if (scale === null) { T.physics = realPhysics; return; }
    T.physics = function (dt) { realPhysics(dt * scale) };
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }

  TLDBG.register({
    game: "pinball32", file: "pinball32.html",

    state: function () {
      var T = h();
      return {
        phase: T.state, paused: T.paused, tilted: T.tilted,
        score: T.score, highScore: T.hiScore, ballsLeft: T.ballsLeft, level: T.level,
        multiplier: T.mult, combo: T.combo, comboTimer: num(T.comboT, 10),
        ballsOnField: T.balls.length,
        plungerBall: T.balls.filter(function (b) { return b.plunger }).length,
        charging: T.charging, charge: num(T.charge, 100),
        saveCharges: T.saves,
        targetsLeft: T.targetsLeft(), targetsTotal: T.TD.length,
        lanesLit: T.lanes ? T.lanes.filter(function (l) { return l.lit }).length : 0,
        segments: T.segs.length, particles: T.parts.length, nudges: T.nudges.length,
        renderQuality: T.view.q, scale: num(T.view.k, 100),
        canvas: T.view.cw + "x" + T.view.ch, css: T.view.cssW + "x" + T.view.cssH,
        flipperLeftDeg: num(T.FL.a * 180 / Math.PI, 10), flipperRightDeg: num(T.FR.a * 180 / Math.PI, 10)
      };
    },

    params: [
      { id: "flLen", label: "Left flipper length", unit: "px", min: 40, max: 150, step: 1,
        get: function () { return h().FL.len }, set: function (v) { h().FL.len = v },
        code: { file: "pinball32.html", line: 118, name: "FL.len" },
        doc: "Left flipper arm length (86 px). Longer reaches further across the field." },
      { id: "flRest", label: "Left flipper rest angle", unit: "rad", min: -0.2, max: 1.2, step: 0.01,
        get: function () { return h().FL.rest }, set: function (v) { h().FL.rest = v },
        code: { file: "pinball32.html", line: 118, name: "FL.rest" },
        doc: "Where the left flipper sits when idle (0.48 rad, about 27 degrees). A raised rest angle aims the ball higher." },
      { id: "flFire", label: "Left flipper fire angle", unit: "rad", min: -1.5, max: 1.5, step: 0.01,
        get: function () { return h().FL.fire }, set: function (v) { h().FL.fire = v },
        code: { file: "pinball32.html", line: 118, name: "FL.fire" },
        doc: "Angle the left flipper snaps to when pressed (-0.55 rad) — this is the shot line." },
      { id: "frLen", label: "Right flipper length", unit: "px", min: 40, max: 150, step: 1,
        get: function () { return h().FR.len }, set: function (v) { h().FR.len = v },
        code: { file: "pinball32.html", line: 119, name: "FR.len" },
        doc: "Right flipper arm length (86 px)." },
      { id: "frRest", label: "Right flipper rest angle", unit: "rad", min: 2.0, max: 4.2, step: 0.01,
        get: function () { return h().FR.rest }, set: function (v) { h().FR.rest = v },
        code: { file: "pinball32.html", line: 119, name: "FR.rest" },
        doc: "Idle angle of the right flipper (PI-0.48), the mirror of the left rest angle." },
      { id: "frFire", label: "Right flipper fire angle", unit: "rad", min: 1.5, max: 5.0, step: 0.01,
        get: function () { return h().FR.fire }, set: function (v) { h().FR.fire = v },
        code: { file: "pinball32.html", line: 119, name: "FR.fire" },
        doc: "Press angle of the right flipper (PI+0.55)." },
      { id: "ballsLeft", label: "Balls left", unit: "balls", min: 0, max: 12, step: 1,
        get: function () { return h().ballsLeft }, set: function (v) { h().ballsLeft = Math.max(0, Math.round(v)) },
        code: { file: "pinball32.html", line: 163, name: "ballsLeft" },
        doc: "Remaining balls; ballEnded() decrements it and ends the game at 0." },
      { id: "level", label: "Level", unit: "level", min: 1, max: 20, step: 1,
        get: function () { return h().level }, set: function (v) { h().level = Math.max(1, Math.round(v)) },
        code: { file: "pinball32.html", line: 163, name: "level" },
        doc: "Advances when every target is cleared; raises scoring and target behaviour." },
      { id: "saves", label: "Save-kicker charges", unit: "charges", min: 0, max: 9, step: 1,
        get: function () { return h().saves }, set: function (v) { h().saves = Math.max(0, Math.round(v)) },
        code: { file: "pinball32.html", line: 167, name: "saves" },
        doc: "Charges that catch a ball heading for the drain (refilled to 2 at every ball start)." },
      { id: "score", label: "Score", unit: "points", min: 0, max: 9999999, step: 100,
        get: function () { return h().score }, set: function (v) { h().score = Math.max(0, Math.round(v)); h().hud() },
        code: { file: "pinball32.html", line: 163, name: "score" },
        doc: "Live score; hud() repaints the #hScore readout immediately. The high score is written on game over." },
      { id: "quality", label: "Render quality", unit: "0/1/2", min: 0, max: 2, step: 1,
        get: function () { return h().view.q },
        set: function (v) { var T = h(); T.view.q = Math.max(0, Math.min(2, Math.round(v))); if (typeof T.resize === "function") T.resize() },
        code: { file: "pinball32.html", line: 121, name: "QUAL[view.q] / view.q" },
        doc: "0 = low (0.8 scale, 24 particles, no trails/glow), 1 = medium, 2 = full (60 particles, trails, glow). resize() re-applies the backing-store scale." },
      { id: "gravity", label: "Gravity", unit: "px/s2", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().GRAV },
        code: { file: "pinball32.html", line: 117, name: "GRAV" },
        doc: "Read-only const (1150). For a softer fall use CHEATS: slow motion; editable knobs are the flipper geometry, run counters and quality." },
      { id: "restitution", label: "Bounce (restitution)", unit: "0-1", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().REST },
        code: { file: "pinball32.html", line: 117, name: "REST" },
        doc: "Read-only const (0.45 energy kept per hit). Individual segments carry their own rest value — the geometry hook lists them." },
      { id: "ballRadius", label: "Ball radius", unit: "px", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().R },
        code: { file: "pinball32.html", line: 117, name: "R" },
        doc: "Read-only const (11 px collision radius); the drain gap and bumper layout are built against it." },
      { id: "maxSpeed", label: "Ball speed cap", unit: "px/s", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().VMAX },
        code: { file: "pinball32.html", line: 117, name: "VMAX" },
        doc: "Read-only const (1500) that stops a strong flipper shot tunnelling through geometry." },
      { id: "flipSpeed", label: "Flipper speed", unit: "rad/s", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().FWSPD },
        code: { file: "pinball32.html", line: 120, name: "FWSPD / RWSPD" },
        doc: "Read-only const (30 left, 13 right): const bindings cannot be assigned, so a debug value could not reach stepBall. The physics-constants hook prints them all." },
      { id: "step", label: "Fixed timestep", unit: "s", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().STEP },
        code: { file: "pinball32.html", line: 117, name: "STEP" },
        doc: "Read-only const (1/120). frame() accumulates real time and calls physics(STEP) up to 6 times per frame." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "physics() becomes a no-op; the canvas keeps drawing, so you can read the ball and the geometry.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "The delta handed to physics() is scaled: ball, flippers, particles and combo timers all slow together.",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "spawnBall", label: "Drop another ball",
        doc: "spawnBall(false) into the field (not the plunger lane) — instant multiball for collision tests.",
        run: function () { h().spawnBall(false); TLDBG.toast("balls " + h().balls.length); } },
      { id: "plungerBall", label: "Put a ball in the plunger lane",
        doc: "spawnBall(true) refills the lane and the save charges, exactly like a fresh ball in play.",
        run: function () { h().spawnBall(true); TLDBG.toast("lane ball ready"); } },
      { id: "launchFull", label: "Launch at full power",
        doc: "Sets the plunger charge to 1 and calls launchBall(), so the ball enters at maximum speed.",
        run: function () { h().charge = 1; h().launchBall(); TLDBG.toast("launched"); } },
      { id: "clearTargets", label: "Clear all targets",
        doc: "Marks every target hit; the level advance follows on the next score pass.",
        run: function () { h().TD.forEach(function (t) { t.hit = true }); h().hud(); TLDBG.toast("targets cleared"); } },
      { id: "resetTargets", label: "Reset all targets",
        doc: "resetTargets() un-hits them so you can replay the clear-the-table sequence.",
        run: function () { h().resetTargets(); h().hud(); TLDBG.toast("targets reset"); } },
      { id: "litLanes", label: "Light all skill lanes",
        doc: "Sets every lane lit — the state the skill-lane bonus check expects.",
        run: function () { var T = h(); if (T.lanes) T.lanes.forEach(function (l) { l.lit = true }); TLDBG.toast("lanes lit"); } },
      { id: "plusScore", label: "Add 100000 points",
        doc: "Adds score directly and repaints the HUD; the high-score record follows on game over.",
        run: function () { var T = h(); T.score += 100000; T.hud(); TLDBG.toast("score " + T.score.toLocaleString()); } },
      { id: "maxCombo", label: "Combo to 25",
        doc: "Sets the combo counter so the multiplier reaches its cap (5x) immediately.",
        run: function () { var T = h(); T.combo = 25; T.comboT = 2; T.hud(); TLDBG.toast("combo 25"); } },
      { id: "noDrain", label: "Infinite balls", toggle: true,
        doc: "Replaces ballEnded() with a version that keeps ballsLeft at 9, so the run never ends. Off restores the real function.",
        on: function (v) {
          var T = h();
          if (v) { if (!T.__tllEnded) T.__tllEnded = T.ballEnded; T.ballEnded = function () { T.ballsLeft = 9 }; }
          else if (T.__tllEnded) { T.ballEnded = T.__tllEnded; delete T.__tllEnded; }
        } },
      { id: "unTilt", label: "Clear tilt", toggle: true,
        doc: "Forces tilted off and empties the nudge queue, so scoring works again immediately.",
        on: function (v) { var T = h(); if (v) { T.tilted = false; T.nudges.length = 0; TLDBG.toast("tilt cleared"); } } },
      { id: "newGame", label: "Start a new game",
        doc: "newGame(): score, balls, targets and lanes reset through the page's own path.",
        run: function () { h().newGame(); TLDBG.toast("new game"); } },
      { id: "hideHud", label: "Hide HUD and touch buttons", toggle: true,
        doc: "Display:none on #hud and #touchUI for clean captures of the table.",
        on: function (v) { ["hud", "touchUI"].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = v ? "none" : ""; }) } }
    ],

    hooks: [
      { label: "Console: balls", doc: "Every ball: position, velocity, speed, plunger flag, trail length.",
        run: function () {
          console.table(h().balls.map(function (b, i) {
            return { i: i, x: num(b.x, 1), y: num(b.y, 1), vx: num(b.vx, 1), vy: num(b.vy, 1),
              speed: num(Math.hypot(b.vx, b.vy), 1), plunger: !!b.plunger, trail: b.trail ? b.trail.length : 0 };
          }));
        } },
      { label: "Console: geometry", doc: "Every collision segment with endpoints, kind and its own restitution.",
        run: function () {
          console.table(h().segs.map(function (s, i) {
            return { i: i, type: s.type || "wall", x1: num(s.x1, 1), y1: num(s.y1, 1), x2: num(s.x2, 1), y2: num(s.y2, 1),
              rest: s.rest != null ? num(s.rest, 100) : "-", bounce: s.bounce != null ? num(s.bounce, 1) : "-" };
          }));
        } },
      { label: "Console: targets and lanes", doc: "Target table with hit state, plus lane lighting and the counters the win check uses.",
        run: function () {
          var T = h();
          console.table(T.TD.map(function (t, i) { return { i: i, x: num(t.x, 1), y: num(t.y, 1), hit: !!t.hit, val: t.val } }));
          console.log({ lanes: T.lanes ? T.lanes.map(function (l) { return (l.name || l.x) + ":" + (l.lit ? "lit" : "-") }).join(" ") : "-",
            targetsLeft: T.targetsLeft(), level: T.level, ballsLeft: T.ballsLeft });
        } },
      { label: "Console: physics constants", doc: "The shipped const block the solver reads, plus the flipper geometry in degrees.",
        run: function () {
          var T = h();
          console.log({ LW: T.LW, LH: T.LH, R: T.R, GRAV: T.GRAV, REST: T.REST, STEP: T.STEP, VMAX: T.VMAX,
            FWSPD: T.FWSPD, RWSPD: T.RWSPD, FRAD: T.FRAD,
            FL: { px: T.FL.px, py: T.FL.py, len: T.FL.len, rest: num(T.FL.rest, 100), fire: num(T.FL.fire, 100), a: num(T.FL.a, 100) },
            FR: { px: T.FR.px, py: T.FR.py, len: T.FR.len, rest: num(T.FR.rest, 100), fire: num(T.FR.fire, 100), a: num(T.FR.a, 100) } });
        } },
      { label: "Console: run summary", doc: "Phase, score, high score, balls, level, multiplier, saves, quality table and canvas metrics.",
        run: function () {
          var T = h();
          console.log({ state: T.state, paused: T.paused, tilted: T.tilted, score: T.score, hiScore: T.hiScore,
            ballsLeft: T.ballsLeft, level: T.level, mult: T.mult, combo: T.combo, comboT: num(T.comboT, 10),
            saves: T.saves, particles: T.parts.length, nudges: T.nudges.length,
            view: { q: T.view.q, k: num(T.view.k, 100), cw: T.view.cw, ch: T.view.ch, cssW: T.view.cssW, cssH: T.view.cssH },
            qualityTable: T.QUAL.map(function (q) { return q.ps + "/" + q.parts + (q.trail ? "+trail" : "") + (q.glow ? "+glow" : "") }) });
        } }
    ],

    layout: [
      { sel: "#wrap", label: "Page wrapper" },
      { sel: "#stage", label: "Play field wrapper" },
      { sel: "#game", label: "Canvas" },
      { sel: "#hud", label: "HUD strip" },
      { sel: "#hScore", label: "Score readout" },
      { sel: "#hBalls", label: "Balls readout" },
      { sel: "#hLevel", label: "Level readout" },
      { sel: "#hMult", label: "Multiplier readout" },
      { sel: "#hTgt", label: "Targets-left readout" },
      { sel: ".hg", label: "HUD group" },
      { sel: ".hi", label: "HUD caption" },
      { sel: ".v", label: "HUD value" },
      { sel: "#msg", label: "Message line" },
      { sel: "#keysBar", label: "Keyboard hints bar" },
      { sel: "#touchUI", label: "Touch controls layer" },
      { sel: ".ctl", label: "Touch control block" },
      { sel: "#btnL", label: "Left flipper button" },
      { sel: "#btnR", label: "Right flipper button" },
      { sel: "#btnLaunch", label: "Plunger button" },
      { sel: "#btnNudge", label: "Nudge button" },
      { sel: "#btnSave", label: "Save-kicker button" },
      { sel: "#btnPause", label: "Pause button" },
      { sel: "#btnNew", label: "New game button" },
      { sel: "#btnMusic", label: "Music toggle button" },
      { sel: ".hbtn", label: "HUD-side buttons" },
      { sel: ".tbtn", label: "Touch buttons" },
      { sel: ".coin", label: "Coin-style badge" },
      { sel: ".sp", label: "Spacer" },
      { sel: ".l", label: "Label text" },
      { sel: "#overlay", label: "Overlay screen" },
      { sel: ".hidden", label: "Hidden element hook" },
      { sel: "#homeLink", label: "Home link" },
      { sel: ".homelink", label: "Home link styling" }
    ],

    control: [
      { id: "game", label: "New game, pause or resume", args: '"new" | "pause" | "resume"', argDefault: "new",
        doc: "newGame() rebuilds the run; togglePause() flips the pause flag the frame loop checks.",
        run: function (which) {
          var T = h(), w = String(which || "new");
          if (w === "new") T.newGame(); else T.togglePause();
          return { phase: T.state, paused: !!T.paused, ballsLeft: T.ballsLeft, score: T.score, level: T.level };
        } },
      { id: "launch", label: "Launch the ball", args: "power 0-1 (optional)", argDefault: 0.8,
        doc: "launchBall(power) shoots the ball out of the lane; without a power it goes through the plunger charge path.",
        run: function (p) {
          var T = h();
          if (p === undefined || p === "" || Array.isArray(p)) { T.startCharge(); setTimeout(function () { T.endCharge(); }, 400); }
          else T.launchBall(Math.max(0, Math.min(1, Number(p))));
          return { balls: T.balls.length, charging: !!T.charging };
        } },
      { id: "spawnBall", label: "Drop a ball at a spot", args: "[x, y]", argDefault: "[R*0.5, R*0.3]",
        doc: "spawnBall() puts a ball on the field at the given coordinates — aim it at a lamp bank or a flipper gap.",
        run: function (a) {
          var T = h();
          if (!Array.isArray(a)) return "want [x, y]";
          T.spawnBall(Number(a[0]), Number(a[1]));
          return { balls: T.balls.length, ball: T.balls.length ? { x: num(T.balls[0].x, 1), y: num(T.balls[0].y, 1) } : null };
        } },
      { id: "targets", label: "Reset targets or count them", args: '"reset" | "count"', argDefault: "count",
        doc: "resetTargets() stands every drop target back up; targetsLeft() reports how many are still up.",
        run: function (w) { var T = h(); if (String(w) === "reset") T.resetTargets(); return { targetsLeft: T.targetsLeft() }; } },
      { id: "charge", label: "Charge or release the plunger", args: '"start" | "end"', argDefault: "start",
        doc: "startCharge()/endCharge() — the charge value it accumulates sets launch speed, so you can test partial pulls.",
        run: function (w) { var T = h(); if (String(w) === "end") T.endCharge(); else T.startCharge(); return { charging: !!T.charging, charge: num(T.charge, 100) }; } },
      { id: "tilt", label: "Flip tilt or nudge state", args: '"tilt" | "clear"', argDefault: "tilt",
        doc: "Writes tilted directly — the flag that freezes scoring; clear() runs the game again without a restart.",
        run: function (w) { var T = h(); T.tilted = String(w) !== "clear"; return { tilted: !!T.tilted, nudges: T.nudges, phase: T.state }; } },
      { id: "counters", label: "Set score, balls, level, multiplier", args: "[score, ballsLeft, level, mult]", argDefault: "[500000, 3, 1, 2]",
        doc: "Writes the run counters through the hook's setters — useful for landing exactly on a level-up or jackpot threshold.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [score, ballsLeft, level, mult]";
          var T = h();
          T.score = Number(a[0]); T.ballsLeft = Number(a[1]); T.level = Number(a[2]); T.mult = Number(a[3]);
          T.hud();
          return { score: T.score, ballsLeft: T.ballsLeft, level: T.level, mult: T.mult, combo: T.combo, saves: T.saves };
        } },
      { id: "probe", label: "Read the physics state", args: "unused",
        doc: "Phase, pause/tilt flags, score and high score, balls left and on field, level, multiplier and combo timers, plunger charge, saves and nudges, ball count, collider segment count, table geometry and view rect.",
        run: function () {
          var T = h();
          return { phase: T.state, paused: !!T.paused, tilted: !!T.tilted,
            score: T.score, high: T.hiScore, ballsLeft: T.ballsLeft, ballsOnField: T.balls.length,
            level: T.level, mult: T.mult, combo: T.combo, comboT: num(T.comboT, 10), charge: num(T.charge, 100), charging: !!T.charging,
            saves: T.saves, nudges: T.nudges, particles: T.parts ? T.parts.length : 0,
            segments: T.segs ? T.segs.length : 0, lanes: T.lanes ? T.lanes.length : 0, targetsLeft: T.targetsLeft(),
            geometry: { LW: T.LW, LH: T.LH, R: T.R, GRAV: T.GRAV, REST: T.REST, STEP: T.STEP, VMAX: T.VMAX },
            view: T.view ? { w: num(T.view.w, 1), h: num(T.view.h, 1) } : null, quality: T.QUAL };
        } },
      { id: "watch", label: "Log the ball every N seconds", args: "seconds (0 stops)", argDefault: 0.5,
        doc: "Ball position, velocity, multiplier, combo timer and score each interval; window.__tllBall holds the timer.",
        run: function (s) {
          if (window.__tllBall) { clearInterval(window.__tllBall); window.__tllBall = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllBall = setInterval(function () {
            var T = h(), b = T.balls[0];
            console.log("ball", b ? Math.round(b.x) + "," + Math.round(b.y) + " v" + Math.round(Math.hypot(b.vx, b.vy)) : "-",
              "mult", T.mult, "combo", T.combo, "comboT", T.comboT.toFixed(2), "score", T.score, "phase", T.state, "tilted", T.tilted);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Lane-through test: ball dropped into each lane",
        doc: "Spawns the ball above every lane entrance and logs score and lamp state, verifying each lane registers its hit.",
        js: 'var T = window.TLHOOK;\nif (T.state !== "play") T.newGame();\n(T.lanes || []).slice(0, 5).forEach(function (ln, i) {\n  var before = T.score;\n  T.spawnBall(ln.x !== undefined ? ln.x : T.R * 0.5, ln.y !== undefined ? Math.max(10, ln.y - 40) : T.R * 0.3);\n  setTimeout(function () { console.log("lane", i, "score delta", T.score - before, "targetsLeft", T.targetsLeft(), "balls", T.balls.length); }, 1500);\n});' },
      { label: "Combo decay trace",
        doc: "Sets a combo, then logs the combo and its timer each quarter second to check the decay window and multiplier ladder.",
        js: 'var T = window.TLHOOK;\nT.combo = 3; T.comboT = 4; T.mult = 2;\nvar n = 0;\nwindow.__tllBall = setInterval(function () {\n  console.log("t", (n++ * 0.25).toFixed(2), "combo", T.combo, "comboT", T.comboT.toFixed(2), "mult", T.mult, "score", T.score);\n  if (T.comboT <= 0) clearInterval(window.__tllBall);\n}, 250);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live game (phase, score, balls, multiplier, targets, flippers, quality). BALANCE edits flipper geometry, run counters and render quality. CHEATS changes the run. LAYOUT resizes and repositions the canvas, HUD strip and touch buttons per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "Bridge", text: "pinball32.html wraps its game in a strict IIFE. Its last block publishes window.TLHOOK: physics, stepBall, spawnBall, launchBall, ballEnded, newGame, resetTargets, targetsLeft, hud, togglePause, startCharge, endCharge, burst, resize; the arrays balls, segs, TD, lanes, parts, nudges; the flipper objects FL/FR; the counters state, score, ballsLeft, level, mult, combo, saves, charge; and the const block LW, LH, R, GRAV, REST, STEP, VMAX, FWSPD, RWSPD, FRAD, QUAL. No game code runs in that block." },
      { topic: "What is editable", text: "FL/FR are const OBJECTS, so their fields (length, rest angle, fire angle) can be rewritten and stepBall picks them up on the next tick. The scalar physics values (GRAV, REST, R, VMAX, STEP, FWSPD, RWSPD) are const bindings and therefore read-only rows here; the physics-constants hook prints them. Run counters and render quality are live-editable." },
      { topic: "Fixed timestep", text: "frame() accumulates real time and calls physics(STEP) up to six times per frame. Freeze and slow motion wrap physics(), so the accumulator keeps running and rendering is untouched — the frame rate stays honest while the ball stops." },
      { topic: "Infinite balls", text: "The toggle replaces TLHOOK.ballEnded with a version that pins ballsLeft at 9. Off restores the original function, so drain handling returns to normal." },
      { topic: "Not reachable", text: "Sprite canvases and cached textures (ball, flipper, bumper, glow), the audio graph and the particle pool internals stay inside the IIFE and are not exposed. Field structure is visible through the geometry, target and physics hooks." },
      { topic: "Texts", text: "This page has NO translation table (it does not load i18n.js), so the TEXTS tab has no keys to edit — its strings are hard-coded English in the markup. Localising it would mean adopting the shared i18n.js kit like the other pages." }
    ]
  });
})();
