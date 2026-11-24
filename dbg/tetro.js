/* dbg/tetro.js — developer harness for tetro.html (WebGL procedural tetris)
 *
 * Load with:  tetro.html?debug=dbg/tetro.js
 * tetro.html keeps everything in one strict-ish IIFE. Its last statement already
 * publishes window.TETRIS; the block right after it adds window.TLHOOK (names
 * only, no logic, no listeners), which everything here reads: G, DAS, A, SFX, R,
 * COLS/ROWS, PIECES/ROT/CELLS/COL, kick tables, grid, MODE, loop (settable),
 * at, collides, grav, stackH, danger, energy, reset, spawn, canMove, move,
 * bounceLock, doRotate, tSpin, hardDrop, lock, collapse, doHold, gameOver,
 * updFx, applyMode, syncLayout, drawPreviews, render, stepPlay, hud, toast,
 * showOverlay, togglePause, toggleHelp, toggleSound, act, spark, startDAS,
 * stopDAS, getT, setT, syncToggles, setDAS, setARR, syncTune, layoutPanels,
 * onResize, musicStart, musicDuck, canvas(), glCtx().
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK) }
  function G() { return h().G }
  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 1000)) / (r || 1000) : 0 }
  function iv(v, lo, hi) { return isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null }
  function snap() {
    var T = h(), g = T.grid, out = [];
    for (var y = 0; y < T.ROWS; y++) {
      var line = "";
      for (var x = 0; x < T.COLS; x++) line += g[y * T.COLS + x] ? "#" : ".";
      out.push(line);
    }
    return out;
  }
  function occupied() {
    var T = h(), g = T.grid, n = 0;
    for (var i = 0; i < g.length; i++) if (g[i]) n++;
    return n;
  }

  var realLoop = null, frozen = false;
  function freezeMode(v) {
    var T = h();
    frozen = !!v;
    if (frozen) { if (!realLoop) realLoop = T.loop; T.loop = function () { }; }
    else if (realLoop) {
      T.loop = realLoop;
      window.requestAnimationFrame(function (t) { realLoop(t) });
    }
  }
  function restartChain() { if (frozen) return; window.requestAnimationFrame(function (t) { h().loop(t) }) }

  TLDBG.register({
    game: "tetro", file: "tetro.html",

    state: function () {
      var T = h(), g = G();
      return {
        state: g.state, mode: T.MODE, touch: T.isTouch(),
        piece: g.piece ? { t: g.piece.t, name: "IJLOSTZ"[g.piece.t], rot: g.piece.rot, x: g.piece.x, y: g.piece.y } : null,
        hold: g.hold >= 0 ? "IJLOSTZ"[g.hold] : null, holdUsed: !!g.holdUsed,
        queue: (g.queue || []).map(function (t) { return "IJLOSTZ"[t] }),
        bag: (g.bag || []).map(function (t) { return "IJLOSTZ"[t] }),
        score: g.score, lines: g.lines, level: g.level, combo: g.combo, b2b: g.b2b,
        pieces: g.pieces, time: num(g.time), best: g.best,
        lastAction: g.lastAct, lastPoints: g.lastPts,
        gravity: num(T.grav()), gravitySecondsPerRow: num(T.grav()),
        gAcc: num(g.gAcc), lockT: num(g.lockT), kicks: g.kicks,
        rotLast: !!g.rotLast, rot180: !!g.rot180, kickIdx: g.kickIdx,
        soft: !!g.soft, softAcc: num(g.softAcc),
        das: g.das, arr: g.arr, dasActive: !!T.DAS.active, dasDir: T.DAS.dir, dasTimer: num(T.DAS.timer),
        ghost: !!g.ghost, shake: !!g.shake, shakeAmt: num(g.shakeAmt),
        clearRows: (g.clearRows || []).slice(), clearT: num(g.clearT),
        particles: g.parts ? g.parts.length : 0, fx: g.fx ? g.fx.length : 0, rings: g.rings ? g.rings.length : 0,
        stackHeight: T.stackH(), danger: num(T.danger()), energy: num(T.energy()),
        boardRows: T.ROWS, boardCols: T.COLS, occupiedCells: occupied(), boardSnapshot: snap(),
        boardRect: { bx: num(T.R.bx), by: num(T.R.by), bw: num(T.R.bw), bh: num(T.R.bh), cw: num(T.R.cw), ch: num(T.R.ch) },
        frozen: frozen,
        audio: { ok: !!T.A.ok, tempo: num(T.A.tempo), step: T.A.step, gstep: T.A.gstep, musOn: !!T.A.musOn, sfxOn: !!T.A.sfxOn, level: T.A.level },
        glAvailable: !!T.glCtx()
      };
    },

    params: [
      { id: "das", label: "DAS delay", unit: "ms", min: 30, max: 240, step: 5,
        get: function () { return G().das }, set: function (v) { var n = iv(v, 30, 240); if (n !== null) h().setDAS(n) },
        code: { file: "tetro.html", line: 1901, name: "setDAS / G.das" },
        doc: "Hold-before-repeat delay (120). Same path the on-screen tuner uses: setDAS clamps to 30..240 and refreshes #dasV/#dasOV." },
      { id: "arr", label: "ARR rate", unit: "ms", min: 0, max: 90, step: 1,
        get: function () { return G().arr }, set: function (v) { var n = iv(v, 0, 90); if (n !== null) h().setARR(n) },
        code: { file: "tetro.html", line: 1904, name: "setARR / G.arr" },
        doc: "Auto-repeat period (18 ms). 0 means every DAS tick moves one cell without a timer loop." },
      { id: "level", label: "Level", unit: "level", min: 1, max: 30, step: 1,
        get: function () { return G().level }, set: function (v) { var n = iv(v, 1, 30); if (n === null) return; G().level = n; h().A.level = n; h().hud() },
        code: { file: "tetro.html", line: 1144, name: "G.level" },
        doc: "Drives grav(): seconds per row = max(.03, (.8-(level-1)*.007)^(level-1)). Also mirrors into A.level so the music follows." },
      { id: "score", label: "Score", unit: "points", min: 0, max: 999999, step: 100,
        get: function () { return G().score }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; G().score = n; h().hud() },
        code: { file: "tetro.html", line: 1144, name: "G.score" },
        doc: "Soft drop adds 1 per row; lock/clear scoring is applied by lock() and collapse()." },
      { id: "lines", label: "Lines cleared", unit: "lines", min: 0, max: 400, step: 1,
        get: function () { return G().lines }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; G().lines = n; h().hud() },
        code: { file: "tetro.html", line: 1144, name: "G.lines" },
        doc: "Line counter feeding the level ladder and the #ln readout." },
      { id: "combo", label: "Combo counter", unit: "combo", min: 0, max: 99, step: 1,
        get: function () { return G().combo }, set: function (v) { var n = iv(v, 0, 99); if (n !== null) G().combo = n; h().hud() },
        code: { file: "tetro.html", line: 1144, name: "G.combo" },
        doc: "Consecutive clears. Also raises energy(), which drives the procedural music intensity." },
      { id: "b2b", label: "Back-to-back chain", unit: "chains", min: 0, max: 40, step: 1,
        get: function () { return G().b2b }, set: function (v) { var n = iv(v, 0, 40); if (n !== null) G().b2b = n; h().hud() },
        code: { file: "tetro.html", line: 1144, name: "G.b2b" },
        doc: "Consecutive difficult clears (tetris/spin); feeds energy() and the b2b multiplier." },
      { id: "tempo", label: "Music tempo", unit: "bpm", min: 60, max: 180, step: 2,
        get: function () { return h().A.tempo }, set: function (v) { var n = iv(v, 60, 180); if (n !== null) h().A.tempo = n },
        code: { file: "tetro.html", line: 817, name: "A.tempo" },
        doc: "Procedural soundtrack tempo (104). Scheduler reads it each beat; audible only once audio is unlocked by a key/click." },
      { id: "time", label: "Run time", unit: "s", min: 0, max: 9999, step: 1,
        get: function () { return G().time }, set: function (v) { var n = num(v, 1000); if (isFinite(v)) G().time = n; h().hud() },
        code: { file: "tetro.html", line: 1144, name: "G.time" },
        doc: "Elapsed seconds accumulated by loop() while state is 'playing'." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze physics", toggle: true,
        doc: "Replaces loop with a no-op so gravity, DAS, soft drop, lock timer, clear animation, particles and rendering all stop; off restores the original loop and re-arms requestAnimationFrame.",
        on: function (v) { freezeMode(v) } },
      { id: "pause", label: "Game pause (P)", toggle: true,
        doc: "togglePause(): state 'playing'->'paused' with the pause overlay and musicDuck(); off resumes.",
        on: function (v) { var T = h(); if (v) { if (G().state === "playing") T.togglePause() } else if (G().state === "paused") T.togglePause() } },
      { id: "start", label: "Start / resume run",
        doc: "act('start'): from menu or game-over this calls reset() and starts a fresh run.",
        run: function () { h().act("start"); TLDBG.toast(G().state) } },
      { id: "restart", label: "Restart (R)",
        doc: "act('restart'): unlocks audio and resets the run immediately.",
        run: function () { h().act("restart"); TLDBG.toast("restarted") } },
      { id: "hardDrop", label: "Hard drop (Space)",
        doc: "act('drop') → hardDrop(): slams the piece down and locks it.",
        run: function () { h().act("drop"); TLDBG.toast("dropped") } },
      { id: "rotateCW", label: "Rotate clockwise (X)",
        doc: "act('cw') → doRotate(1) with SRS kicks.",
        run: function () { h().act("cw"); TLDBG.toast("rot " + (G().piece ? G().piece.rot : "-")) } },
      { id: "rotateCCW", label: "Rotate counter-clockwise (Z)",
        doc: "act('ccw') → doRotate(-1).",
        run: function () { h().act("ccw"); TLDBG.toast("rot " + (G().piece ? G().piece.rot : "-")) } },
      { id: "rotate180", label: "Flip 180 (Q/E)",
        doc: "act('flip') → doRotate(2) with the K_180 kick list; sets G.rot180 for spin detection.",
        run: function () { h().act("flip"); TLDBG.toast("rot " + (G().piece ? G().piece.rot : "-")) } },
      { id: "softDrop", label: "Soft drop held (Down)",
        doc: "turns G.soft on (32 ms per row, +1 point each); off clears it like keyup.",
        toggle: true,
        on: function (v) { G().soft = !!v; G().softAcc = 0 } },
      { id: "holdPiece", label: "Hold piece (C)",
        doc: "doHold(): swaps the active piece with the held one, once per piece.",
        run: function () { h().doHold(); TLDBG.toast("hold=" + (G().hold >= 0 ? "IJLOSTZ"[G().hold] : "none")) } },
      { id: "left", label: "Move left", doc: "move(-1,0) one cell.",
        run: function () { h().move(-1, 0); TLDBG.toast("x=" + (G().piece ? G().piece.x : "-")) } },
      { id: "right", label: "Move right", doc: "move(1,0) one cell.",
        run: function () { h().move(1, 0); TLDBG.toast("x=" + (G().piece ? G().piece.x : "-")) } },
      { id: "dasLeft", label: "Hold DAS left", toggle: true,
        doc: "startDAS(-1)/stopDAS(-1): exactly what holding the left key does, incl. ARR repeat.",
        on: function (v) { if (v) h().startDAS(-1); else h().stopDAS(-1) } },
      { id: "dasRight", label: "Hold DAS right", toggle: true,
        doc: "startDAS(1)/stopDAS(1).",
        on: function (v) { if (v) h().startDAS(1); else h().stopDAS(1) } },
      { id: "spawnPiece", label: "Force a spawn",
        doc: "spawn(manual=true): puts a new piece at the top right now.",
        run: function () { h().spawn(true); TLDBG.toast(G().piece ? "IJLOSTZ"[G().piece.t] : "no piece") } },
      { id: "lockPiece", label: "Lock the piece now",
        doc: "lock(): the same path the 500 ms lock timer uses — scoring, spin detection, clear animation.",
        run: function () { h().lock(); TLDBG.toast("locked, lines " + G().lines) } },
      { id: "fillBottom", label: "Fill the bottom 3 rows",
        doc: "Writes a mostly-full bottom band with one gap column straight into the grid buffer, so a clear is one piece away.",
        run: function () {
          var T = h(), rows2 = [];
          for (var y = 0; y < T.ROWS; y++) {
            var r = [];
            for (var x = 0; x < T.COLS; x++) r.push(y >= T.ROWS - 3 && x !== 3 ? 1 : 0);
            rows2.push(r);
          }
          T.setGrid(rows2); T.render(); TLDBG.toast("occupied " + occupied())
        } },
      { id: "clearBoard", label: "Clear the board",
        doc: "Empties the grid buffer (no scoring) and redraws.",
        run: function () { var T = h(); T.setGrid(new Array(T.ROWS).fill(new Array(T.COLS).fill(0))); T.render(); TLDBG.toast("board empty") } },
      { id: "gameOver", label: "End the run now",
        doc: "gameOver(): writes the best-score record and shows the final overlay.",
        run: function () { h().gameOver(); TLDBG.toast("over, score " + G().score) } },
      { id: "ghost", label: "Ghost piece", toggle: true,
        doc: "setT('ghost') — the landing preview; flips the page's own data-t toggle button state.",
        on: function (v) { h().setT("ghost", v) } },
      { id: "shake", label: "Screen shake", toggle: true,
        doc: "setT('shake') — camera shake on clears and hard drops.",
        on: function (v) { h().setT("shake", v) } },
      { id: "music", label: "Music", toggle: true,
        doc: "setT('music'): starts/ducks the procedural soundtrack (musicStart/musicDuck).",
        on: function (v) { h().setT("music", v) } },
      { id: "sound", label: "Sound effects", toggle: true,
        doc: "setT('sfx'): master SFX gain (.5 or 0).",
        on: function (v) { h().setT("sfx", v) } },
      { id: "toggleAllSound", label: "Toggle all sound (M)",
        doc: "toggleSound(): the page's own M key handler, with toast.",
        run: function () { h().toggleSound(); TLDBG.toast("sound toggled") } },
      { id: "help", label: "Help overlay (/)",
        doc: "toggleHelp(): shows/hides the controls card.",
        toggle: true,
        on: function (v) { h().showOverlay(v ? "help" : "") } },
      { id: "relayout", label: "Re-apply layout mode",
        doc: "applyMode(true) + onResize(): recomputes portrait/landscape layout and the board rectangle.",
        run: function () { h().applyMode(true); h().onResize(); TLDBG.toast("mode " + h().MODE) } },
      { id: "spark", label: "Spark particle burst",
        doc: "spark(): particles + ring at the active piece centre.",
        run: function () { h().spark(); TLDBG.toast("particles " + (G().parts ? G().parts.length : 0)) } }
    ],

    hooks: [
      { label: "Console: piece and queue", doc: "Active piece (index, letter, rotation, position), next queue, remaining bag and held piece.",
        run: function () {
          var T = h(), g = G();
          console.log({ piece: g.piece ? { t: g.piece.t, letter: "IJLOSTZ"[g.piece.t], rot: g.piece.rot, x: g.piece.x, y: g.piece.y } : null,
            queue: (g.queue || []).map(function (t) { return "IJLOSTZ"[t] }), bag: (g.bag || []).map(function (t) { return "IJLOSTZ"[t] }),
            hold: g.hold >= 0 ? "IJLOSTZ"[g.hold] : null, holdUsed: g.holdUsed, lastAct: g.lastAct, lastPts: g.lastPts });
        } },
      { label: "Console: board", doc: "Grid as ASCII rows plus occupied cells, stack height, danger and energy.",
        run: function () {
          var T = h();
          console.log({ occupied: occupied(), stackHeight: T.stackH(), danger: num(T.danger()), energy: num(T.energy()), rows: snap() });
        } },
      { label: "Console: timing", doc: "Gravity, gravity accumulator, lock timer, kick count, DAS state and soft-drop state.",
        run: function () {
          var T = h(), g = G();
          console.log({ gravity: num(T.grav()), gAcc: num(g.gAcc), lockT: num(g.lockT), kicks: g.kicks,
            das: g.das, arr: g.arr, dasActive: T.DAS.active, dasDir: T.DAS.dir, dasTimer: num(T.DAS.timer),
            soft: g.soft, softAcc: num(g.softAcc), frozen: frozen, state: g.state });
        } },
      { label: "Console: scoring", doc: "Score, level, lines, combo, back-to-back, pieces placed, time and best.",
        run: function () {
          var g = G();
          console.log({ score: g.score, level: g.level, lines: g.lines, combo: g.combo, b2b: g.b2b,
            pieces: g.pieces, time: num(g.time), best: g.best, storedBest: localStorage.getItem("tetris.best") });
        } },
      { label: "Console: shapes and kicks", doc: "Base piece matrices, rotation tables, cell lists, colours and the SRS kick tables.",
        run: function () {
          var T = h();
          console.log({ pieces: T.PIECES, rotations: T.ROT.length, cells: T.CELLS.map(function (r) { return r.map(function (c) { return c.length }) }),
            colors: T.COL, kicksJLSTZ: T.K_JLSTZ, kicksI: T.K_I, kicks180: T.K_180 });
        } },
      { label: "Console: layout and audio", doc: "Board rectangle in canvas units, layout mode, device pixel ratio, WebGL context state and audio engine fields.",
        run: function () {
          var T = h(), gl = T.glCtx();
          console.log({ mode: T.MODE, touch: T.isTouch(), rect: { bx: num(T.R.bx), by: num(T.R.by), bw: num(T.R.bw), bh: num(T.R.bh), cw: num(T.R.cw), ch: num(T.R.ch) },
            canvas: (function () { var c = T.canvas(); return c ? c.width + "x" + c.height : "none" })(),
            dpr: window.devicePixelRatio, glAvailable: !!gl,
            audio: { ok: T.A.ok, ctx: T.A.ctx ? T.A.ctx.state : "none", tempo: T.A.tempo, step: T.A.step, gstep: T.A.gstep, musOn: T.A.musOn, sfxOn: T.A.sfxOn, gain: T.A.sg ? T.A.sg.gain.value : null } });
        } }
    ],

    layout: [
      { sel: "#app", label: "Root element" },
      { sel: "#gl", label: "WebGL canvas" },
      { sel: "#boardWrap", label: "Board wrapper" },
      { sel: "#boardBox", label: "Board box" },
      { sel: "#strip", label: "Stripe filler" },
      { sel: "#stripNext", label: "Next strip (landscape)" },
      { sel: "#stripHold", label: "Hold strip (landscape)" },
      { sel: "#hudLeft", label: "Left HUD column" },
      { sel: "#hudRight", label: "Right HUD column" },
      { sel: "#nextBox", label: "Next box" },
      { sel: "#holdBox", label: "Hold box" },
      { sel: "#miniNext", label: "Next preview canvas" },
      { sel: "#miniHold", label: "Hold preview canvas" },
      { sel: "#miniStats", label: "Mini stats block" },
      { sel: "#pnlNext", label: "Next panel" },
      { sel: "#pnlHold", label: "Hold panel" },
      { sel: "#pnlScore", label: "Score panel" },
      { sel: "#pnlRun", label: "Run panel" },
      { sel: "#pnlStack", label: "Stack panel" },
      { sel: "#pnlTune", label: "Tuning panel" },
      { sel: "#pnlAct", label: "Last-action panel" },
      { sel: "#pcs", label: "Piece list block" },
      { sel: "#pbox", label: "Piece boxes" },
      { sel: "#stateChip", label: "State chip" },
      { sel: "#score", label: "Score readout" },
      { sel: "#lv", label: "Level readout" },
      { sel: "#lvSmall", label: "Level (compact)" },
      { sel: "#ln", label: "Lines readout" },
      { sel: "#lnSmall", label: "Lines (compact)" },
      { sel: "#combo", label: "Combo readout" },
      { sel: "#b2b", label: "Back-to-back readout" },
      { sel: "#stk", label: "Stack height readout" },
      { sel: "#tm", label: "Time readout" },
      { sel: "#actName", label: "Last action name" },
      { sel: "#actPts", label: "Last action points" },
      { sel: "#holdState", label: "Hold state line" },
      { sel: "#segs", label: "Segment meter" },
      { sel: "#marquee", label: "Marquee" },
      { sel: "#title", label: "Title block" },
      { sel: "#das", label: "DAS slider" },
      { sel: "#dasV", label: "DAS value label" },
      { sel: "#dasO", label: "DAS slider (landscape)" },
      { sel: "#dasOV", label: "DAS value label (landscape)" },
      { sel: "#arr", label: "ARR slider" },
      { sel: "#arrV", label: "ARR value label" },
      { sel: "#arrO", label: "ARR slider (landscape)" },
      { sel: "#arrOV", label: "ARR value label (landscape)" },
      { sel: "#btnPause", label: "Pause button" },
      { sel: "#btnSound", label: "Sound button" },
      { sel: "#pad", label: "Touch pad" },
      { sel: "#padA", label: "Pad group A" },
      { sel: "#padB", label: "Pad group B" },
      { sel: "#deck", label: "Control deck" },
      { sel: "#keys", label: "Key legend" },
      { sel: "#overlay", label: "Overlay" },
      { sel: "#fatal", label: "Fatal (no WebGL) panel" },
      { sel: "#toasts", label: "Toast container" },
      { sel: "#chipScore", label: "Score chip" },
      { sel: "#chipLn", label: "Lines chip" },
      { sel: "#chipLv", label: "Level chip" },
      { sel: "#chipBest", label: "Best chip" },
      { sel: "#chipPps", label: "Pieces-per-second chip" },
      { sel: "#pScore", label: "Overlay score line" },
      { sel: "#pLn", label: "Overlay lines line" },
      { sel: "#pLv", label: "Overlay level line" },
      { sel: "#pBest", label: "Overlay best line" },
      { sel: "#pState", label: "Overlay state line" },
      { sel: "#pAct", label: "Overlay action line" },
      { sel: "#lScore", label: "Landscape score line" },
      { sel: "#lLn", label: "Landscape lines line" },
      { sel: "#lLv", label: "Landscape level line" },
      { sel: "#lBest", label: "Landscape best line" },
      { sel: "#lState", label: "Landscape state line" },
      { sel: "#mScore", label: "Menu score line" },
      { sel: "#mLn", label: "Menu lines line" },
      { sel: "#mLv", label: "Menu level line" },
      { sel: "#mBest", label: "Menu best line" },
      { sel: "#landTL", label: "Landscape top-left slot" },
      { sel: "#landTR", label: "Landscape top-right slot" },
      { sel: "#landPause", label: "Landscape pause button" },
      { sel: "#landSound", label: "Landscape sound button" },
      { sel: "#landNextBox", label: "Landscape next box" },
      { sel: "#landNextPnl", label: "Landscape next panel" },
      { sel: "#landHoldBox", label: "Landscape hold box" },
      { sel: "#landHoldPnl", label: "Landscape hold panel" },
      { sel: "#ptHome", label: "Portrait home slot" },
      { sel: "#ptPause", label: "Portrait pause slot" },
      { sel: "#ptNextBox", label: "Portrait next box" },
      { sel: "#ptHoldBox", label: "Portrait hold box" },
      { sel: "#ptSideLeft", label: "Portrait side left" },
      { sel: "#ptSideRight", label: "Portrait side right" },
      { sel: ".pnl", label: "Panels" },
      { sel: ".chips", label: "Chip row" },
      { sel: ".chip", label: "Chips" },
      { sel: ".chipbtn", label: "Chip buttons" },
      { sel: ".tune", label: "Tuner block" },
      { sel: ".sl", label: "Slider rows" },
      { sel: ".sld", label: "Slider tracks" },
      { sel: ".tg", label: "Toggle buttons" },
      { sel: ".toggles", label: "Toggle group" },
      { sel: ".opt", label: "Option rows" },
      { sel: ".popts", label: "Overlay option rows" },
      { sel: ".prompt", label: "Overlay prompt" },
      { sel: ".finals", label: "Final stat rows" },
      { sel: ".hgrid", label: "HUD grid" },
      { sel: ".hcol", label: "HUD columns" },
      { sel: ".pv", label: "Preview canvases" },
      { sel: ".pvBox", label: "Preview boxes" },
      { sel: ".rows", label: "Stat row sets" },
      { sel: ".row", label: "Stat rows" },
      { sel: ".lbl", label: "Labels" },
      { sel: ".hlbl", label: "Highlighted labels" },
      { sel: ".num", label: "Numbers" },
      { sel: ".rail", label: "Rail container" },
      { sel: ".meter", label: "Meters" },
      { sel: ".msg", label: "Overlay message" },
      { sel: ".warn", label: "Warning state" },
      { sel: ".on", label: "Active toggle state" },
      { sel: ".off", label: "Inactive toggle state" },
      { sel: ".hide", label: "Hidden hook" },
      { sel: ".live", label: "Live region" }
    ],

    control: [
      { id: "game", label: "Reset or pause", args: '"reset" | "pause"', argDefault: "reset",
        doc: "reset() rebuilds the run, togglePause() flips the pause flag — the same paths the keys and buttons use.",
        run: function (which) { var T = h(); if (String(which) === "pause") T.togglePause(); else T.reset(); return { phase: G().state, mode: T.MODE, score: G().score }; } },
      { id: "spawn", label: "Force the next piece", args: "piece index 0-6 (I J L O S T Z)", argDefault: 3,
        doc: "spawn() takes the queued piece; set g.queue or g.bag first to pick the shape. Index maps to \"IJLOSTZ\".",
        run: function (i) {
          var T = h(), g = G();
          if (i !== undefined && i !== "" && !Array.isArray(i)) { g.queue = [Math.max(0, Math.min(6, Math.round(Number(i))))].concat((g.queue || []).slice(1)); }
          T.spawn();
          return { piece: g.piece ? "IJLOSTZ"[g.piece.t] : null, queue: (g.queue || []).map(function (t) { return "IJLOSTZ"[t] }), bag: (g.bag || []).map(function (t) { return "IJLOSTZ"[t] }) };
        } },
      { id: "drop", label: "Hard drop", args: "unused", doc: "hardDrop() — slams the piece down and locks it, exercising the collapse path.",
        run: function () { var T = h(); T.hardDrop(); return { lines: G().lines, score: G().score, stackHeight: T.stackH(), danger: T.danger() }; } },
      { id: "rotate", label: "Rotate", args: '"cw" | "ccw" | "180"', argDefault: "cw",
        doc: "doRotate(dir) with the page's own SRS kick tables (K_JLSTZ, K_I, K_180) — reports which kick index won.",
        run: function (dir) {
          var T = h(), g = G(), d = String(dir || "cw");
          var delta = d === "ccw" ? -1 : (d === "180" ? 2 : 1);
          T.doRotate(delta);
          return { rot: g.piece ? g.piece.rot : null, kickIdx: g.kickIdx, kicks: g.kicks, rot180: !!g.rot180 };
        } },
      { id: "hold", label: "Hold swap", args: "unused", doc: "doHold() — swaps the active piece with the hold slot, respecting the one-use-per-piece rule.",
        run: function () { var T = h(); T.doHold(); return { hold: G().hold >= 0 ? "IJLOSTZ"[G().hold] : null, holdUsed: !!G().holdUsed, piece: G().piece ? "IJLOSTZ"[G().piece.t] : null }; } },
      { id: "paintStack", label: "Paint the stack", args: "rows of COLS cells, e.g. [[0,1,1,...],...]", argDefault: "",
        doc: "setGrid(rows) overwrites the whole field — build a specific overhang or a one-line-away gap and test the clear/collapse physics against it.",
        run: function (rows) {
          var T = h();
          if (!Array.isArray(rows) || !Array.isArray(rows[0])) return "want an array of rows, each an array of " + T.COLS + " cell values";
          T.setGrid(rows); T.render();
          return { stackHeight: T.stackH(), danger: T.danger(), lines: G().lines };
        } },
      { id: "tuning", label: "Set DAS and ARR", args: "[dasMs, arrMs]", argDefault: "[80, 15]",
        doc: "setDAS / setARR — the horizontal repeat delay and rate; the two numbers that decide how fast you can slide pieces.",
        run: function (a) { if (!Array.isArray(a)) return "want [dasMs, arrMs]"; h().setDAS(Number(a[0])); h().setARR(Number(a[1])); return { das: G().das, arr: G().arr }; } },
      { id: "mode", label: "Switch the game mode", args: "mode index (applyMode)", argDefault: 0,
        doc: "applyMode(i) changes the rule set (the panel prints MODE); modes differ in goal and scoring pressure.",
        run: function (i) { var T = h(); T.applyMode(Math.max(0, Math.round(Number(i) || 0))); return { mode: T.MODE, score: G().score, lines: G().lines, level: G().level }; } },
      { id: "probe", label: "Read the field", args: "unused",
        doc: "Piece (name/rotation/position), hold, queue, bag, score/lines/level/combo/back-to-back, gravity seconds per row, lock timer, kick state, DAS state, stack height and danger.",
        run: function () {
          var T = h(), g = G();
          return { phase: g.state, mode: T.MODE, piece: g.piece ? { name: "IJLOSTZ"[g.piece.t], rot: g.piece.rot, x: g.piece.x, y: g.piece.y } : null,
            hold: g.hold >= 0 ? "IJLOSTZ"[g.hold] : null, queue: (g.queue || []).map(function (t) { return "IJLOSTZ"[t] }),
            bag: (g.bag || []).map(function (t) { return "IJLOSTZ"[t] }),
            score: g.score, lines: g.lines, level: g.level, combo: g.combo, b2b: g.b2b, pieces: g.pieces, time: num(g.time),
            gravitySecondsPerRow: num(T.grav()), lockT: num(g.lockT), kicks: g.kicks, kickIdx: g.kickIdx,
            das: { active: !!T.DAS.active, dir: T.DAS.dir, timer: num(T.DAS.timer) }, stackHeight: T.stackH(), danger: T.danger(), energy: num(T.energy()) };
        } },
      { id: "watch", label: "Log the run every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Piece, stack height, danger, lines and score each interval; window.__tllRun holds the timer.",
        run: function (s) {
          if (window.__tllRun) { clearInterval(window.__tllRun); window.__tllRun = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllRun = setInterval(function () {
            var T = h(), g = G();
            console.log("piece", g.piece ? "IJLOSTZ"[g.piece.t] : "-", "at", g.piece ? g.piece.x + "," + g.piece.y : "-",
              "stack", T.stackH(), "danger", T.danger(), "lines", g.lines, "score", g.score, "phase", g.state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Four-line setup in one shot",
        doc: "Paints a stack with four gaps on the right column, then drops O pieces into it — verifies the tetris clear and scoring bonus.",
        js: 'var T = window.TLHOOK, g = T.G, W = T.COLS, H = T.ROWS;\nvar rows = [];\nfor (var y = 0; y < H; y++) {\n  var row = [];\n  for (var x = 0; x < W; x++) row.push(x === W - 1 && y >= H - 4 ? 0 : 1);\n  rows.push(row);\n}\nrows[0] = new Array(W).fill(0); rows[1] = new Array(W).fill(0);\nT.setGrid(rows);\nT.spawn();\ng.queue = [3];\nT.hardDrop();\nconsole.log("lines after drop", g.lines, "score", g.score, "stack", T.stackH());' },
      { label: "Repeat-rate sweep for slide speed",
        doc: "Sets several DAS/ARR pairs and prints them — the numbers behind how snappy left/right holding feels.",
        js: 'var T = window.TLHOOK;\n[[160, 40], [100, 20], [60, 8], [30, 2]].forEach(function (p) {\n  T.setDAS(p[0]); T.setARR(p[1]);\n  console.log("das", p[0], "arr", p[1], "live", T.G.das + "/" + T.G.arr);\n});' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live run (piece, queue, board snapshot, gravity, lock timer, DAS, particles, layout rect, audio). BALANCE edits DAS/ARR, level, score, lines, combo, b2b, tempo, time. CHEATS drives input, spawning, locking and board surgery. LAYOUT resizes and repositions the WebGL canvas, HUD columns, panels, sliders and overlays. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "Bridge", text: "tetro.html keeps its whole engine in one IIFE. Its last statement publishes window.TETRIS (g, reset, pause); the block right after adds window.TLHOOK with names only — G, DAS, A, SFX, R, grid, MODE, the shape/kick tables and every control function, with loop as a getter/setter pair so freeze can swap it. No engine logic runs in that block." },
      { topic: "Freeze restarts the frame chain", text: "While frozen, loop is a no-op and the pending requestAnimationFrame callback runs one last frame that schedules nothing — the chain goes dead. Turning freeze off restores the original loop and re-arms requestAnimationFrame, so play resumes from the same state." },
      { topic: "Gravity and lock", text: "grav() returns seconds per row: max(.03, (.8-(level-1)*.007)^(level-1)). Soft drop overrides gravity at 32 ms per row and scores +1 per row. When the piece can no longer move down, lockT accumulates and lock() fires at .5 s, or at .10 s once 15 rotations/kicks have been used (SPR)." },
      { topic: "Board surgery", text: "setGrid() writes the raw Int8Array column-major buffer; fillBottom/clearBoard then call render() so the WebGL mesh rebuilds. Lines written this way are not detected until a piece locks (lock() scans for full rows)." },
      { topic: "Music follows play", text: "energy() combines combo, back-to-back, stack danger and level and drives the procedural soundtrack; A.tempo and A.level are read by the scheduler. Audio needs a real user gesture (keydown/click) before the AudioContext runs — CHEATS toggles flip the flags even when audio is silent." },
      { topic: "Layout mode", text: "MODE is 'landscape' or 'portrait', chosen by applyMode() from viewport and pointer type; R holds the board rectangle in canvas units (bx, by, bw, bh, cw, ch). CHEATS: re-apply layout recomputes both after a window resize." },
      { topic: "Not reachable", text: "WebGL shader programs and buffers stay private; the context object is visible through glCtx(). Grid contents, piece state, timing, audio flags and layout are all live." }
    ]
  });
})();
