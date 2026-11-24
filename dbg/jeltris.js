/* dbg/jeltris.js — developer harness for jeltris.html (jelly-physics Tetris)
 *
 * Load with:  jeltris.html?debug=dbg/jeltris.js
 * jeltris.html wraps its game in a strict IIFE; the last block of that IIFE
 * publishes window.TLHOOK (names only), which is what everything here reads.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK); }

  var realStep = null;
  function wrap(scale) {
    var T = h();
    if (!realStep) realStep = T.step;
    if (scale === null) { T.step = realStep; return; }
    T.step = function (dt) { realStep(dt * scale) };
  }

  var realEnd = null;
  function setNoTopOut(v) {
    var T = h();
    if (v) {
      if (!realEnd) realEnd = T.endGame;
      T.endGame = function (win, reasonKey) { if (win) realEnd(win, reasonKey); };
    } else if (realEnd) T.endGame = realEnd;
  }

  /* Difficulty and mode are const tables; the live rows are mutable pointers,
     so an edit publishes a modified copy, exactly as the page's own selectors do. */
  function editRow(which, key, v) {
    var T = h(), src = (which === "diff" ? T.DIFFS : T.MODES)[which === "diff" ? T.diffIndex : T.modeIndex] || {};
    var copy = {}; for (var p in src) copy[p] = src[p];
    copy[key] = v;
    if (which === "diff") T.currentDiff = copy; else T.currentMode = copy;
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }

  TLDBG.register({
    game: "jeltris", file: "jeltris.html",

    state: function () {
      var T = h();
      return {
        phase: T.state, overlay: T.overlayMode,
        difficulty: T.currentDiff ? T.currentDiff.name : "?", mode: T.currentMode ? T.currentMode.name : "?",
        score: T.score, lines: T.lines, level: T.level,
        lastClearRows: T.lastClearRows, activePiece: T.activePiece, nextType: T.nextType,
        bag: T.bag ? T.bag.join(",") : "", spawnDelay: num(T.spawnDelay, 100),
        imbalance: num(T.activeImbalance, 100), supportCount: T.activeSupportCount,
        fallFactor: num(T.activeFallFactor, 100), grounded: num(T.activeGrounded, 100),
        clock: num(T.clock, 10), timeLimit: num(T.timeLimit, 10), targetLines: T.targetLines,
        particles: T.particleLimit + "/" + T.MAX_PARTICLES, shake: num(T.shake, 100),
        fallMul: T.currentDiff ? num(T.currentDiff.fallMul) : 0,
        ctrlLoss: T.currentDiff ? num(T.currentDiff.ctrlLoss) : 0,
        lockDelay: T.currentDiff ? num(T.currentDiff.lockDelay, 100) : 0,
        scoreMul: T.currentDiff ? num(T.currentDiff.scoreMul) : 0
      };
    },

    params: [
      { id: "fallMul", label: "Difficulty: fall multiplier", unit: "x", min: 0.2, max: 4, step: 0.05,
        get: function () { return h().currentDiff ? h().currentDiff.fallMul : 1 },
        set: function (v) { editRow("diff", "fallMul", v) },
        code: { file: "jeltris.html", line: 530, name: "DIFFS[i].fallMul" },
        doc: "How fast the jelly stack sinks. EASY 1.0, NORMAL 1.28, HARD higher." },
      { id: "ctrlLoss", label: "Difficulty: control loss", unit: "0-1", min: 0, max: 1, step: 0.01,
        get: function () { return h().currentDiff ? h().currentDiff.ctrlLoss : 0.6 },
        set: function (v) { editRow("diff", "ctrlLoss", v) },
        code: { file: "jeltris.html", line: 531, name: "DIFFS[i].ctrlLoss" },
        doc: "How much steering authority the active piece loses as it settles into the jelly." },
      { id: "fallRange", label: "Difficulty: fall range", unit: "cells/s", min: 1, max: 20, step: 0.1,
        get: function () { return h().currentDiff ? h().currentDiff.fallRange : 7.5 },
        set: function (v) { editRow("diff", "fallRange", v) },
        code: { file: "jeltris.html", line: 532, name: "DIFFS[i].fallRange" },
        doc: "Spread of per-cell fall speeds inside the piece — the wobble band." },
      { id: "jitter", label: "Difficulty: position jitter", unit: "px", min: 0, max: 8, step: 0.1,
        get: function () { return h().currentDiff ? h().currentDiff.jitter : 1.9 },
        set: function (v) { editRow("diff", "jitter", v) },
        code: { file: "jeltris.html", line: 533, name: "DIFFS[i].jitter" },
        doc: "Random wobble applied to jelly cells. 0 makes the physics deterministic for screenshotting." },
      { id: "rotJitter", label: "Difficulty: rotation jitter", unit: "rad/s", min: 0, max: 8, step: 0.1,
        get: function () { return h().currentDiff ? h().currentDiff.rotJitter : 2.8 },
        set: function (v) { editRow("diff", "rotJitter", v) },
        code: { file: "jeltris.html", line: 534, name: "DIFFS[i].rotJitter" },
        doc: "Tilt noise on the pieces. Zero it to test rotation handling without wobble." },
      { id: "slideGain", label: "Difficulty: slide gain", unit: "x", min: 0.5, max: 12, step: 0.1,
        get: function () { return h().currentDiff ? h().currentDiff.slideGain : 4.2 },
        set: function (v) { editRow("diff", "slideGain", v) },
        code: { file: "jeltris.html", line: 535, name: "DIFFS[i].slideGain" },
        doc: "How strongly an unbalanced stack slides sideways." },
      { id: "slideThreshold", label: "Difficulty: slide threshold", unit: "imbalance", min: 0.005, max: 0.4, step: 0.005,
        get: function () { return h().currentDiff ? h().currentDiff.slideThreshold : 0.055 },
        set: function (v) { editRow("diff", "slideThreshold", v) },
        code: { file: "jeltris.html", line: 536, name: "DIFFS[i].slideThreshold" },
        doc: "Imbalance needed before sliding starts." },
      { id: "lockDelay", label: "Difficulty: lock delay", unit: "s", min: 0, max: 1, step: 0.01,
        get: function () { return h().currentDiff ? h().currentDiff.lockDelay : 0.18 },
        set: function (v) { editRow("diff", "lockDelay", v) },
        code: { file: "jeltris.html", line: 537, name: "DIFFS[i].lockDelay" },
        doc: "Grace period after grounding before the piece locks (lockActive, jeltris.html line 1507)." },
      { id: "cellFill", label: "Difficulty: cell fill need", unit: "0-1", min: 0.05, max: 1, step: 0.01,
        get: function () { return h().currentDiff ? h().currentDiff.cellFill : 0.26 },
        set: function (v) { editRow("diff", "cellFill", v) },
        code: { file: "jeltris.html", line: 538, name: "DIFFS[i].cellFill" },
        doc: "Coverage a cell needs to count as filled for line clearing." },
      { id: "rowMember", label: "Difficulty: row membership", unit: "0-1", min: 0.05, max: 1, step: 0.01,
        get: function () { return h().currentDiff ? h().currentDiff.rowMember : 0.26 },
        set: function (v) { editRow("diff", "rowMember", v) },
        code: { file: "jeltris.html", line: 539, name: "DIFFS[i].rowMember" },
        doc: "How much of a row must be filled before clearLines() (jeltris.html line 1331) takes it." },
      { id: "spawnGap", label: "Difficulty: spawn gap", unit: "s", min: 0, max: 2, step: 0.02,
        get: function () { return h().currentDiff ? h().currentDiff.spawnDelay : 0.12 },
        set: function (v) { editRow("diff", "spawnDelay", v) },
        code: { file: "jeltris.html", line: 540, name: "DIFFS[i].spawnDelay" },
        doc: "Pause between a lock and the next piece appearing. The live countdown is the `Spawn gap left` row below." },
      { id: "scoreMul", label: "Difficulty: score multiplier", unit: "x", min: 0.2, max: 6, step: 0.1,
        get: function () { return h().currentDiff ? h().currentDiff.scoreMul : 1 },
        set: function (v) { editRow("diff", "scoreMul", v) },
        code: { file: "jeltris.html", line: 541, name: "DIFFS[i].scoreMul" },
        doc: "Multiplies cleared-line points for this difficulty." },
      { id: "spawnLeft", label: "Spawn gap left", unit: "s", min: 0, max: 3, step: 0.05,
        get: function () { return h().spawnDelay },
        set: function (v) { h().spawnDelay = v },
        code: { file: "jeltris.html", line: 743, name: "spawnDelay" },
        doc: "The live countdown to the next piece. Set it to 0 to spawn immediately, or raise it to freeze the queue briefly." },
      { id: "level", label: "Level", unit: "level", min: 1, max: 30, step: 1,
        get: function () { return h().level },
        set: function (v) { h().level = Math.max(1, Math.round(v)) },
        code: { file: "jeltris.html", line: 739, name: "level" },
        doc: "Raises fall speed through FALL_LEVEL (0.26 per level, a const). #level repaints on the next HUD pass." },
      { id: "timeLimit", label: "Mode time limit", unit: "s", min: 0, max: 600, step: 5,
        get: function () { return h().timeLimit },
        set: function (v) { h().timeLimit = Math.max(0, Math.round(v)) },
        code: { file: "jeltris.html", line: 767, name: "timeLimit" },
        doc: "0 means untimed (marathon). Timed modes end through endGame(false,'timeUp') when the clock runs out." },
      { id: "targetLines", label: "Mode target lines", unit: "lines", min: 0, max: 200, step: 1,
        get: function () { return h().targetLines },
        set: function (v) { h().targetLines = Math.max(0, Math.round(v)) },
        code: { file: "jeltris.html", line: 768, name: "targetLines" },
        doc: "Lines needed to win the mode; #target shows it." },
      { id: "gravity", label: "Jelly gravity", unit: "u/s2", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().GRAVITY },
        code: { file: "jeltris.html", line: 494, name: "GRAVITY" },
        doc: "Read-only const (26): a const binding cannot be assigned, so a debug value could not reach the solver." },
      { id: "moveSpeed", label: "Piece move speed", unit: "cells/s", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().MOVE_SPEED },
        code: { file: "jeltris.html", line: 482, name: "MOVE_SPEED" },
        doc: "Read-only const (8). The editable tuning surface is the difficulty row, not these consts." },
      { id: "particleCap", label: "Particle pool", unit: "used/max", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().particleLimit },
        code: { file: "jeltris.html", line: 634, name: "particleLimit / MAX_PARTICLES" },
        doc: "Read-only: how many of the 1024 particle slots are allocated. It is a pool cursor, not a gameplay setting." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "step() becomes a no-op: the fixed 1/60 s simulation stops, the renderer keeps drawing.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "Every simulation step receives 0.3 of its delta — the jelly settles in slow motion.",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "noTopOut", label: "Cannot lose", toggle: true,
        doc: "endGame() ignores losses (top-out, time-up) but still allows a win, so you can stack freely.",
        on: function (v) { setNoTopOut(v) } },
      { id: "clearLines", label: "Clear full rows now",
        doc: "Calls the game's clearLines(): scoring, level rise and the clear animation run exactly as in play.",
        run: function () { h().clearLines(); TLDBG.toast("cleared " + h().lastClearRows + " rows"); } },
      { id: "lockNow", label: "Lock the active piece",
        doc: "lockActive() drops the piece into the stack immediately.",
        run: function () { h().lockActive(); TLDBG.toast("piece locked"); } },
      { id: "nextPiece", label: "Cycle the next piece type",
        doc: "Advances nextType (0-6) so the following spawn is a different piece.",
        run: function () { var T = h(); T.nextType = (T.nextType + 1) % 7; TLDBG.toast("next type " + T.nextType); } },
      { id: "emptyBag", label: "Reset the 7-bag",
        doc: "Rebuilds the random-bag queue takeNext() draws from, so the preview sequence restarts.",
        run: function () { h().bag = [0, 1, 2, 3, 4, 5, 6]; TLDBG.toast("bag reset"); } },
      { id: "spawnNow", label: "Spawn the next piece now",
        doc: "spawnNext() immediately, ignoring the spawn gap.",
        run: function () { h().spawnNext(); TLDBG.toast("piece spawned"); } },
      { id: "plusLines", label: "Add 10 lines",
        doc: "Bumps the line counter to test the HUD, the target readout and the win threshold.",
        run: function () { var T = h(); T.lines += 10; TLDBG.toast("lines " + T.lines); } },
      { id: "score100k", label: "Add 100000 score",
        doc: "Adds score directly; #score and the best-score record on the next game over follow it.",
        run: function () { var T = h(); T.score += 100000; TLDBG.toast("score " + T.score); } },
      { id: "winNow", label: "Win the mode",
        doc: "endGame(true,'targetReached') runs the win path: overlay, stats panel and the stored record.",
        run: function () { h().endGame(true, "targetReached"); TLDBG.toast("win"); } },
      { id: "loseNow", label: "Force game over",
        doc: "endGame(false,'topOut') runs the loss path exactly as a real top-out does.",
        run: function () { setNoTopOut(false); h().endGame(false, "topOut"); TLDBG.toast("game over"); } },
      { id: "restart", label: "Restart the run",
        doc: "resetGame() then startGame(): new field, same difficulty and mode selections.",
        run: function () { h().resetGame(); h().startGame(); TLDBG.toast("run restarted"); } },
      { id: "hideHud", label: "Hide HUD panels", toggle: true,
        doc: "Display:none on the stats panel (#panelStats) for clean captures of the play field.",
        on: function (v) { var el = document.getElementById("panelStats"); if (el) el.style.display = v ? "none" : ""; } }
    ],

    hooks: [
      { label: "Console: difficulty row", doc: "The live difficulty row (after any BALANCE edit) against the shipped DIFFS entry it came from.",
        run: function () { var T = h(); console.log("live currentDiff:", T.currentDiff); console.log("shipped DIFFS[" + T.diffIndex + "]:", T.DIFFS[T.diffIndex]); } },
      { label: "Console: mode row", doc: "The live mode row (target/time) against the shipped MODES entry, plus the runtime timers.",
        run: function () { var T = h(); console.log("live currentMode:", T.currentMode); console.log("shipped MODES[" + T.modeIndex + "]:", T.MODES[T.modeIndex]);
          console.log("runtime:", { timeLimit: num(T.timeLimit, 10), targetLines: T.targetLines, clock: num(T.clock, 10) }); } },
      { label: "Console: active piece physics", doc: "What the solver reports for the piece in play: imbalance, support count and x, centre, fall factor, grounded state, spawn countdown, bag.",
        run: function () {
          var T = h();
          console.log({ activePiece: T.activePiece, nextType: T.nextType, bag: T.bag ? T.bag.slice() : null,
            imbalance: num(T.activeImbalance, 1000), supportCount: T.activeSupportCount, supportX: num(T.activeSupportX, 100),
            center: num(T.activeCenterX, 100), fallFactor: num(T.activeFallFactor, 1000),
            grounded: num(T.activeGrounded, 1000), groundedPrev: num(T.activeGroundedPrev, 1000),
            spawnDelay: num(T.spawnDelay, 1000) });
        } },
      { label: "Console: run summary", doc: "Score, lines, level, phase, overlay mode, particle usage and screen shake.",
        run: function () { var T = h();
          console.log({ state: T.state, overlayMode: T.overlayMode, score: T.score, lines: T.lines, level: T.level,
            lastClearRows: T.lastClearRows, particles: T.particleLimit + "/" + T.MAX_PARTICLES, freeParticles: T.freeCount,
            shake: num(T.shake, 100), shakeX: num(T.shakeX, 10), shakeY: num(T.shakeY, 10) }); } },
      { label: "Console: physics constants", doc: "Every shipped const the jelly solver uses, so you can see what a readonly row would have changed.",
        run: function () {
          var T = h();
          console.log({ FIELD: T.FIELD_W + "x" + T.FIELD_H, DT: T.DT, MOVE_SPEED: T.MOVE_SPEED, FALL_BASE: T.FALL_BASE,
            FALL_LEVEL: T.FALL_LEVEL, SOFT_DROP: T.SOFT_DROP, HARD_DROP: T.HARD_DROP, ROT_ACCEL: T.ROT_ACCEL,
            ROT_MAX: T.ROT_MAX, ROT_DAMP: T.ROT_DAMP, ACTIVE_CTRL_BASE: T.ACTIVE_CTRL_BASE, GRAVITY: T.GRAVITY,
            ACTIVE_DAMP: T.ACTIVE_DAMP, FALL_DAMP: T.FALL_DAMP, CONS_STIFF: T.CONS_STIFF, MAXV: T.MAXV,
            HARD_LOCK_SPEED: T.HARD_LOCK_SPEED, SLEEP_SPEED: T.SLEEP_SPEED, SLEEP_DELAY: T.SLEEP_DELAY,
            SUPPORT_DIST: T.SUPPORT_DIST, WAKE_OVERLAP: T.WAKE_OVERLAP, MASS_MIN: T.MASS_MIN,
            LOAD_TRANSFER: T.LOAD_TRANSFER, MAX_PARTICLES: T.MAX_PARTICLES });
        } }
    ],

    layout: [
      { sel: "#game", label: "Page root" },
      { sel: "#playWrap", label: "Play field wrapper" },
      { sel: "#stage", label: "Canvas stage" },
      { sel: "#controls", label: "Control panel" },
      { sel: ".panel", label: "Panel boxes" },
      { sel: "#panelStats", label: "Score / lines / level panel" },
      { sel: "#panelSys", label: "System panel (sound, volume)" },
      { sel: ".statTop", label: "Panel caption line" },
      { sel: ".statMain", label: "Primary stat value" },
      { sel: ".statSub", label: "Secondary stat line" },
      { sel: ".statClock", label: "Clock line" },
      { sel: "#score", label: "Score value" },
      { sel: "#lines", label: "Lines value" },
      { sel: "#level", label: "Level value" },
      { sel: "#target", label: "Target lines readout" },
      { sel: "#timer", label: "Timer readout" },
      { sel: "#slot", label: "Hold / next slot" },
      { sel: "#nextMini", label: "Next-piece mini canvas" },
      { sel: "#diffRow", label: "Difficulty selector row" },
      { sel: "#modeRow", label: "Mode selector row" },
      { sel: ".ctl", label: "Labeled control rows" },
      { sel: ".row1", label: "Button row 1" },
      { sel: ".row2", label: "Button row 2" },
      { sel: ".miniBtn", label: "Small buttons (move, rotate, pause)" },
      { sel: "#btnLeft", label: "Move left button" },
      { sel: "#btnRight", label: "Move right button" },
      { sel: "#btnDown", label: "Soft drop button" },
      { sel: "#btnHard", label: "Hard drop button" },
      { sel: "#btnCCW", label: "Rotate counter-clockwise button" },
      { sel: "#btnCW", label: "Rotate clockwise button" },
      { sel: "#btnPause", label: "Pause button" },
      { sel: "#soundBtn", label: "Sound toggle button" },
      { sel: "#volSlider", label: "Volume slider" },
      { sel: "#volVal", label: "Volume readout" },
      { sel: "#overlay", label: "Fullscreen overlay" },
      { sel: "#ovTitle", label: "Overlay title" },
      { sel: "#ovText", label: "Overlay body text" },
      { sel: "#ovBtn", label: "Overlay button" },
      { sel: "#restartBtn", label: "Restart button" },
      { sel: "#tlHost", label: "Language button host" }
    ],

    control: [
      { id: "game", label: "Start, reset or pause", args: '"start" | "reset" | "pause"', argDefault: "start",
        doc: "startGame() / resetGame() / pauseGame() through the page's own paths — reset keeps the mode and difficulty, start re-reads them.",
        run: function (which) {
          var T = h(), w = String(which || "start");
          if (w === "reset") T.resetGame(); else if (w === "pause") T.pauseGame(); else T.startGame();
          return { phase: T.state, overlay: T.overlayMode, mode: T.currentMode ? T.currentMode.name : "?", difficulty: T.currentDiff ? T.currentDiff.name : "?" };
        } },
      { id: "next", label: "Force the next piece", args: "piece type index", argDefault: 0,
        doc: "Sets the queue's next type, so the piece that spawns is exactly the one you want to test against the current stack.",
        run: function (i) { var T = h(); T.nextType = Math.max(0, Math.round(Number(i) || 0)); return { nextType: T.nextType, bag: T.bag ? T.bag.join(",") : "", active: T.activePiece }; } },
      { id: "bag", label: "Replace the piece bag", args: "array of type indices", argDefault: "[0,0,0,0]",
        doc: "Writes the bag array itself — a deterministic sequence for reproducible physics tests (no random draw).",
        run: function (a) { if (!Array.isArray(a)) return "want an array of indices"; h().bag = a.map(function (v) { return Math.max(0, Math.round(Number(v))) }); return { bag: h().bag.join(",") }; } },
      { id: "spawn", label: "Spawn the next piece now", args: "unused",
        doc: "spawnNext() — ignores spawnDelay and drops the queued piece into the field.",
        run: function () { var T = h(); T.spawnNext(); return { active: T.activePiece, spawnDelay: num(T.spawnDelay, 100), stack: T.activeGrounded }; } },
      { id: "lock", label: "Lock the active piece", args: "unused",
        doc: "lockActive() — ends the piece's settling immediately, exercising the collapse and line-clear path.",
        run: function () { var T = h(); T.lockActive(); return { lines: T.lines, lastClearRows: T.lastClearRows, score: T.score, phase: T.state }; } },
      { id: "clear", label: "Clear full lines", args: "unused",
        doc: "clearLines() — the page's own clear routine with scoring, shake and physics settle.",
        run: function () { var T = h(); T.clearLines(); return { lines: T.lines, score: T.score, lastClearRows: T.lastClearRows }; } },
      { id: "diffRow", label: "Edit a difficulty row", args: '[index, "fallMul"|"ctrlLoss"|"lockDelay"|"scoreMul", value]', argDefault: '[1, "fallMul", 1.8]',
        doc: "DIFFS rows drive the jelly behaviour: how fast the stack sinks, how much horizontal control you keep while falling, the settling grace and the score multiplier. The row you edit applies to the live run if it is the selected one.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, field, value]";
          var T = h(), row = T.DIFFS[+a[0]]; if (!row) return "no difficulty " + a[0];
          var f = String(a[1]); if (!(f in row)) return "no field " + f;
          row[f] = Number(a[2]);
          return { difficulty: row.name, field: f, value: row[f], active: T.currentDiff === row };
        } },
      { id: "mode", label: "Switch the game mode", args: "index into MODES", argDefault: 0,
        doc: "modeIndex + currentMode — modes change the goal (line target or time limit), which the state panel prints.",
        run: function (i) {
          var T = h(), m = T.MODES[+i || 0]; if (!m) return "no mode " + i;
          T.modeIndex = +i || 0; T.currentMode = m;
          return { mode: m.name, targetLines: T.targetLines, timeLimit: num(T.timeLimit, 10) };
        } },
      { id: "probe", label: "Read the physics state", args: "unused",
        doc: "Phase, mode, difficulty, score/lines/level, active piece, its imbalance/support/centre/fall factor/grounding, bag, clock, particle budget and shake.",
        run: function () {
          var T = h();
          return { phase: T.state, overlay: T.overlayMode, mode: T.currentMode ? T.currentMode.name : "?",
            difficulty: T.currentDiff ? T.currentDiff.name : "?", score: T.score, lines: T.lines, level: T.level,
            activePiece: T.activePiece, nextType: T.nextType, bag: T.bag ? T.bag.join(",") : "",
            imbalance: num(T.activeImbalance, 100), support: T.activeSupportCount, supportX: num(T.activeSupportX, 1),
            centreX: num(T.activeCenterX, 1), fallFactor: num(T.activeFallFactor, 100), grounded: num(T.activeGrounded, 100),
            spawnDelay: num(T.spawnDelay, 100), clock: num(T.clock, 10), timeLimit: num(T.timeLimit, 10),
            targetLines: T.targetLines, particles: T.particleLimit + "/" + T.MAX_PARTICLES, shake: num(T.shake, 100) };
        } },
      { id: "watch", label: "Log the stack every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Active piece, imbalance, grounding, lines and clock each interval — the trace for jelly-stability debugging; window.__tllStack holds the timer.",
        run: function (s) {
          if (window.__tllStack) { clearInterval(window.__tllStack); window.__tllStack = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllStack = setInterval(function () {
            var T = h();
            console.log("piece", T.activePiece, "imbalance", num(T.activeImbalance, 100), "grounded", num(T.activeGrounded, 100),
              "fall", num(T.activeFallFactor, 100), "lines", T.lines, "clock", num(T.clock, 10), "phase", T.state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Deterministic stack test: fixed bag, forced pieces",
        doc: "Replaces the bag with one shape and locks piece after piece, so the jelly settling sequence is reproducible frame by frame.",
        js: 'var T = window.TLHOOK;\nT.resetGame(); T.startGame();\nT.bag = [0, 0, 0, 0, 0, 0];\nvar n = 0;\nwindow.__tllStackTest = setInterval(function () {\n  T.spawnNext();\n  setTimeout(function () { T.lockActive(); }, 500);\n  console.log("drop", ++n, "lines", T.lines, "score", T.score, "phase", T.state);\n}, 1200);' },
      { label: "Sink-rate comparison across difficulties",
        doc: "Prints each difficulty's fall multiplier and control loss, then runs the live stack under each for a few seconds.",
        js: 'var T = window.TLHOOK;\nconsole.table(T.DIFFS.map(function (d, i) { return { i: i, name: d.name, fallMul: d.fallMul, ctrlLoss: d.ctrlLoss, lockDelay: d.lockDelay, scoreMul: d.scoreMul }; }));\nvar i = 0;\nwindow.__tllSink = setInterval(function () {\n  T.diffIndex = i; T.currentDiff = T.DIFFS[i];\n  console.log("difficulty", T.currentDiff.name, "fallFactor", T.activeFallFactor.toFixed(2), "imbalance", T.activeImbalance.toFixed(2), "grounded", T.activeGrounded.toFixed(2));\n  i = (i + 1) % T.DIFFS.length;\n}, 3000);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live run (phase, mode, score, lines, level, the active piece's physics numbers). BALANCE edits the difficulty row, the spawn gap, level and mode targets. CHEATS changes the run. LAYOUT resizes and repositions the stage and control panels per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "Bridge", text: "jeltris.html wraps its game in a strict IIFE. The last block of that IIFE publishes window.TLHOOK: the lifecycle functions (step, endGame, clearLines, lockActive, spawnNext, takeNext, resetGame, startGame, pauseGame, render), the counters (score, lines, level, clock, bag, nextType, spawnDelay, shake) the solver readouts (imbalance, support, fall factor, grounded), the difficulty/mode pointers and the shipped const table. No game code runs in that block." },
      { topic: "Editable vs const numbers", text: "Physics lives in const bindings (GRAVITY, MOVE_SPEED, FALL_BASE, HARD_DROP, ROT_ACCEL...) which cannot be assigned — those rows are read-only and the constants hook lists them all. The tunable surface is the difficulty row and the mode row: DIFFS/MODES are const tables but currentDiff/currentMode are mutable, so editing publishes a modified copy like the page's own selectors do." },
      { topic: "Freeze and slow motion", text: "Both wrap TLHOOK.step, the fixed-timestep entry the loop drives at 1/60 s. Restoring installs the original function, so the simulation continues unchanged." },
      { topic: "Cannot lose", text: "The toggle wraps TLHOOK.endGame and lets only win=true through. Top-out and time-up are suppressed; a forced win still finishes the run normally." },
      { topic: "Not reachable", text: "The jelly solver's arrays (particle pool storage, per-cell springs, the field buffers) and the audio graph stay inside the IIFE and are deliberately not exposed; the harness reads the aggregate numbers the solver publishes instead (imbalance, support count, fall factor)." },
      { topic: "Texts", text: "The page uses the shared i18n.js kit (en/es/pt/ru/zh), so the TEXTS tab is kit-driven: pick a language, edit a key, and TLI18N re-applies it. Overlay titles and messages come from the same table." }
    ]
  });
})();
