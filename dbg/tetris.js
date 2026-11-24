/* dbg/tetris.js — developer harness for tetris.html
 *
 * Load with:  tetris.html?debug=dbg/tetris.js
 * tetris.html declares game, music, ui, settings, COLS, ROWS, COLORS, SHAPES,
 * GRADES, GRADE_TH at script top level, so everything here reads them directly;
 * no bridge block was added to the page.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  function g() { return game }
  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 1000)) / (r || 1000) : 0 }
  function iv(v, lo, hi) { return isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null }
  function rows() { return ROWS }
  function cols() { return COLS }
  function filledRows() {
    var b = g().board; if (!b) return 0;
    var n = 0;
    for (var y = 0; y < b.length; y++) if (b[y].every(function (c) { return c !== 0 })) n++;
    return n;
  }
  function occupied() {
    var b = g().board; if (!b) return 0;
    var n = 0;
    for (var y = 0; y < b.length; y++) for (var x = 0; x < b[y].length; x++) if (b[y][x]) n++;
    return n;
  }

  var realLoop = null, frozen = false;
  function freezeMode(v) {
    frozen = !!v;
    if (frozen) {
      if (!realLoop) realLoop = g().loop;
      g().loop = function () { };
    } else if (realLoop) {
      g().loop = realLoop;
    }
  }

  TLDBG.register({
    game: "tetris", file: "tetris.html",

    state: function () {
      var G = g();
      return {
        state: G.state, mode: G.mode,
        current: G.current ? G.current.type : null,
        currentColor: G.current ? G.current.color : null,
        currentXY: G.current ? G.current.x + "," + G.current.y : null,
        rotation: G.current ? G.current.rotation : null,
        grounded: !!G.grounded, lockTimer: num(G.lockTimer), lockResets: G.lockResets || 0,
        canHold: !!G.canHold, hold: G.hold || null,
        nextQueue: (G.nextQueue || []).slice(), bag: (G.bag || []).slice(),
        score: G.score, lines: G.lines, level: G.level, combo: G.combo,
        backToBack: !!G.b2b, lastAction: G.lastAction || null,
        dropInterval: num(G.dropInterval), dropCounter: num(G.dropCounter),
        dasDelay: G.dasDelay, arrDelay: G.arrDelay, holdDir: G.holdDir,
        softHeld: !!G.softHeld, softTimer: num(G.softTimer),
        zoneMeter: num(G.zoneMeter), zoneMax: num(G.zoneMax), zoneActive: !!G.zoneActive,
        zoneTime: num(G.zoneTime), zoneClears: G.zoneClears || 0,
        elapsed: num(G.elapsed), timeRemaining: num(G.timeRemaining),
        garbageTimer: num(G.garbageTimer), garbageInterval: num(G.garbageInterval),
        gradePts: num(G.gradePts), grade: G.grade || null,
        boardRows: rows(), boardCols: cols(),
        fullRows: filledRows(), occupiedCells: occupied(),
        boardSnapshot: G.board ? G.board.map(function (r) { return r.map(function (c) { return c ? "#" : "." }).join("") }) : [],
        frozen: frozen, blockScale: G.BS, mobile: !!G.mobile,
        musicPlaying: !!(music && music.playing),
        settings: { musicOn: !!settings.musicOn, soundOn: !!settings.soundOn, ghostOn: !!settings.ghostOn, musicVol: settings.musicVol, sfxVol: settings.sfxVol }
      };
    },

    params: [
      { id: "dasDelay", label: "DAS delay", unit: "ms", min: 0, max: 400, step: 5,
        get: function () { return g().dasDelay }, set: function (v) { var n = iv(v, 0, 1e9); if (n !== null) g().dasDelay = n },
        code: { file: "tetris.html", line: 522, name: "game.dasDelay" },
        doc: "Hold time before auto-repeat kicks in when ArrowLeft/Right is held (133)." },
      { id: "arrDelay", label: "ARR rate", unit: "ms", min: 5, max: 200, step: 5,
        get: function () { return g().arrDelay }, set: function (v) { var n = iv(v, 5, 1e9); if (n !== null) g().arrDelay = n },
        code: { file: "tetris.html", line: 522, name: "game.arrDelay" },
        doc: "Horizontal repeat period once DAS has elapsed (50). Small values slide pieces across the board instantly." },
      { id: "dropInterval", label: "Gravity interval", unit: "ms", min: 0, max: 2000, step: 10,
        get: function () { return g().dropInterval }, set: function (v) { var n = iv(v, 0, 1e9); if (n !== null) g().dropInterval = n },
        code: { file: "tetris.html", line: 832, name: "game.dropInterval" },
        doc: "Milliseconds per automatic row of fall. 0 means 20G instant lock (grandmaster behaviour). GravityFor(level) overwrites it on each line clear." },
      { id: "level", label: "Level", unit: "level", min: 1, max: 30, step: 1,
        get: function () { return g().level }, set: function (v) { var n = iv(v, 1, 30); if (n === null) return; g().level = n; g().dropInterval = g().gravityFor(g().level); g().updateStats() },
        code: { file: "tetris.html", line: 826, name: "game.level" },
        doc: "Scoring multiplier; the setter recomputes gravity the same way clearLines() does (gravityFor(level))." },
      { id: "score", label: "Score", unit: "points", min: 0, max: 999999, step: 100,
        get: function () { return g().score }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; g().score = n; g().updateStats() },
        code: { file: "tetris.html", line: 826, name: "game.score" },
        doc: "Score shown in #score. Soft drop adds 1 per row, hard drop 2 per row, line clears scale with level and combo." },
      { id: "lines", label: "Lines cleared", unit: "lines", min: 0, max: 400, step: 1,
        get: function () { return g().lines }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; g().lines = n; g().updateStats() },
        code: { file: "tetris.html", line: 826, name: "game.lines" },
        doc: "Line counter; sprint ends the game at 40, level advances every 10 lines." },
      { id: "combo", label: "Combo counter", unit: "combo", min: -1, max: 99, step: 1,
        get: function () { return g().combo }, set: function (v) { var n = iv(v, -1, 99); if (n !== null) g().combo = n },
        code: { file: "tetris.html", line: 826, name: "game.combo" },
        doc: "-1 means no combo. Each clear increments it; a clear without combo resets it to -1. Bonus is 50*combo*level." },
      { id: "zoneMax", label: "Zone meter size", unit: "lines", min: 1, max: 40, step: 1,
        get: function () { return g().zoneMax }, set: function (v) { var n = iv(v, 1, 40); if (n === null) return; g().zoneMax = n; g().updateStats() },
        code: { file: "tetris.html", line: 545, name: "game.zoneMax" },
        doc: "Lines needed to fill the zone meter. When full, V/Zone triggers slow-motion scoring." },
      { id: "zoneTime", label: "Zone duration", unit: "ms", min: 500, max: 20000, step: 500,
        get: function () { return g().zoneTime }, set: function (v) { var n = iv(v, 100, 1e9); if (n !== null) g().zoneTime = n },
        code: { file: "tetris.html", line: 683, name: "game.zoneTime" },
        doc: "How long zone mode stays active once triggered (5000). While active gravity accumulates at 20%." },
      { id: "garbageInterval", label: "Garbage attack period", unit: "ms", min: 1000, max: 30000, step: 500,
        get: function () { return g().garbageInterval }, set: function (v) { var n = iv(v, 1000, 1e9); if (n !== null) g().garbageInterval = n },
        code: { file: "tetris.html", line: 831, name: "game.garbageInterval" },
        doc: "Garbage battle only: rows pushed up from the bottom every period (10000, shortening by 150 per attack, floor 4000)." },
      { id: "timeRemaining", label: "Ultra time remaining", unit: "ms", min: 0, max: 300000, step: 1000,
        get: function () { return g().timeRemaining }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; g().timeRemaining = n; g().updateStats() },
        code: { file: "tetris.html", line: 835, name: "game.timeRemaining" },
        doc: "Ultra mode countdown (120000). Reaching 0 ends the game." },
      { id: "musicVol", label: "Music volume", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return settings.musicVol }, set: function (v) { settings.musicVol = Math.max(0, Math.min(100, Math.round(v))); settings.save(); if (ui) ui.syncOptions() },
        code: { file: "tetris.html", line: 284, name: "settings.musicVol" },
        doc: "Options screen value (35); persisted to localStorage 'te3s_settings'." },
      { id: "sfxVol", label: "Sound-effect volume", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return settings.sfxVol }, set: function (v) { settings.sfxVol = Math.max(0, Math.min(100, Math.round(v))); settings.save(); if (ui) ui.syncOptions() },
        code: { file: "tetris.html", line: 284, name: "settings.sfxVol" },
        doc: "Options screen value (75); persisted with the same record." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze physics", toggle: true,
        doc: "Replaces game.loop with a no-op: gravity, DAS, soft drop, garbage, zone timers and drawing all stop; the rAF chain resumes when off.",
        on: function (v) { freezeMode(v) } },
      { id: "pause", label: "Game pause (P)", toggle: true,
        doc: "game.pause()/resume() — shows #pause-screen and stops music, exactly like the P key.",
        on: function (v) { if (v) g().pause(); else g().resume() } },
      { id: "hardDrop", label: "Hard drop",
        doc: "game.hardDrop(): slams the piece down, +2 per row, then locks it.",
        run: function () { g().hardDrop(); TLDBG.toast("dropped " + (g().current ? g().current.type : "locked")) } },
      { id: "rotateCW", label: "Rotate clockwise",
        doc: "game.rotate(1) — SRS kicks (KICKS_JLSTZ / KICKS_I).",
        run: function () { g().rotate(1); TLDBG.toast("rot " + (g().current ? g().current.rotation : "-")) } },
      { id: "rotateCCW", label: "Rotate counter-clockwise",
        doc: "game.rotate(-1).",
        run: function () { g().rotate(-1); TLDBG.toast("rot " + (g().current ? g().current.rotation : "-")) } },
      { id: "rotate180", label: "Rotate 180",
        doc: "Two clockwise rotations in a row.",
        run: function () { g().rotate(1); g().rotate(1); TLDBG.toast("rot " + (g().current ? g().current.rotation : "-")) } },
      { id: "holdPiece", label: "Hold piece (C)",
        doc: "game.holdPiece(): swaps the active piece with the held one; once per piece, as the rules require.",
        run: function () { g().holdPiece(); TLDBG.toast("hold=" + (g().hold || "none")) } },
      { id: "left", label: "Move left", doc: "game.move(-1) one cell.",
        run: function () { g().move(-1); TLDBG.toast("x=" + (g().current ? g().current.x : "-")) } },
      { id: "right", label: "Move right", doc: "game.move(1) one cell.",
        run: function () { g().move(1); TLDBG.toast("x=" + (g().current ? g().current.x : "-")) } },
      { id: "softStep", label: "Soft drop one row", doc: "game.tryDown() once (+1 point when it moves).",
        run: function () { g().tryDown(); TLDBG.toast("y=" + (g().current ? g().current.y : "-")) } },
      { id: "activateZone", label: "Trigger zone mode",
        doc: "game.zoneMeter=zoneMax then activateZone(): gravity drops to 20% accumulation for zoneTime ms.",
        run: function () { var G = g(); G.zoneMeter = G.zoneMax; G.activateZone(); TLDBG.toast(G.zoneActive ? "zone active " + G.zoneTime + "ms" : "zone refused") } },
      { id: "spawnGarbage", label: "Push garbage row",
        doc: "game.addGarbage() — garbage battle mechanic; usable in any mode.",
        run: function () { g().addGarbage(); TLDBG.toast("occupied " + occupied()) } },
      { id: "fillBottom", label: "Fill the bottom 3 rows",
        doc: "Writes a mostly-full bottom band with one gap column into game.board and redraws, so a clear is one piece away.",
        run: function () {
          var G = g(), gap = 3;
          for (var y = rows() - 3; y < rows(); y++) for (var x = 0; x < cols(); x++) G.board[y][x] = x === gap ? 0 : 8;
          G.draw(); TLDBG.toast("full rows " + filledRows())
        } },
      { id: "clearBoard", label: "Clear the board",
        doc: "Empties game.board (no scoring) and redraws.",
        run: function () { var G = g(); G.board = G.createBoard(); G.draw(); TLDBG.toast("board empty") } },
      { id: "modeMarathon", label: "Mode: marathon", toggle: true,
        doc: "game.startMode('marathon') — resets and starts; off returns to the title screen via toMenu().",
        on: function (v) { if (v) g().startMode("marathon"); else g().toMenu() } },
      { id: "modeSprint", label: "Mode: sprint (40 lines)", toggle: true,
        doc: "game.startMode('sprint').",
        on: function (v) { if (v) g().startMode("sprint"); else g().toMenu() } },
      { id: "modeGrandmaster", label: "Mode: grandmaster (20G)", toggle: true,
        doc: "game.startMode('grandmaster') — gravity starts at level 4 (dropInterval 0 at level 5+), grades from GRADES/GRADE_TH.",
        on: function (v) { if (v) g().startMode("grandmaster"); else g().toMenu() } },
      { id: "modeZone", label: "Mode: zone", toggle: true,
        doc: "game.startMode('zone').",
        on: function (v) { if (v) g().startMode("zone"); else g().toMenu() } },
      { id: "modeUltra", label: "Mode: ultra (2 min)", toggle: true,
        doc: "game.startMode('ultra') — 120 s countdown.",
        on: function (v) { if (v) g().startMode("ultra"); else g().toMenu() } },
      { id: "modeGarbage", label: "Mode: garbage battle", toggle: true,
        doc: "game.startMode('garbage').",
        on: function (v) { if (v) g().startMode("garbage"); else g().toMenu() } },
      { id: "restart", label: "Restart current mode",
        doc: "game.restart() — same mode, fresh board.",
        run: function () { g().restart(); TLDBG.toast("restarted " + g().mode) } },
      { id: "gameOver", label: "End the game now",
        doc: "game.gameOver(): shows the game-over screen with the current score.",
        run: function () { g().gameOver(); TLDBG.toast("game over") } },
      { id: "ghost", label: "Ghost piece", toggle: true,
        doc: "settings.ghostOn and game.ghostOn — the landing preview under the active piece; persisted with the options record.",
        on: function (v) { settings.ghostOn = !!v; g().ghostOn = !!v; settings.save(); if (ui) ui.syncOptions(); g().draw() } },
      { id: "music", label: "Music", toggle: true,
        doc: "settings.musicOn plus music.applyState(): starts or stops the AudioEngine loop.",
        on: function (v) { settings.musicOn = !!v; settings.save(); if (ui) ui.syncOptions(); if (music) music.applyState() } },
      { id: "sound", label: "Sound effects", toggle: true,
        doc: "settings.soundOn (sfx for lock, clear, level-up).",
        on: function (v) { settings.soundOn = !!v; settings.save(); if (ui) ui.syncOptions() } }
    ],

    hooks: [
      { label: "Console: piece and queue", doc: "Active piece (type, colour, position, rotation, matrix), the 5-piece next queue, the remaining bag and the held piece.",
        run: function () {
          var G = g();
          console.log({ current: G.current ? { type: G.current.type, color: G.current.color, x: G.current.x, y: G.current.y, rotation: G.current.rotation, matrix: G.current.matrix } : null,
            nextQueue: (G.nextQueue || []).slice(), bag: (G.bag || []).slice(), hold: G.hold, canHold: G.canHold, lastAction: G.lastAction });
        } },
      { label: "Console: board", doc: "The board as ASCII rows plus the count of occupied cells and complete rows.",
        run: function () {
          var G = g();
          console.log({ fullRows: filledRows(), occupied: occupied(),
            rows: G.board.map(function (r) { return r.map(function (c) { return c ? "#" : "." }).join("") }) });
        } },
      { label: "Console: timing", doc: "Gravity, drop counter, lock timer/resets, DAS/ARR, soft-drop state and the raw loop delta.",
        run: function () {
          var G = g();
          console.log({ dropInterval: G.dropInterval, dropCounter: num(G.dropCounter), gravityForLevel: G.gravityFor(G.level),
            lockTimer: num(G.lockTimer), lockResets: G.lockResets, grounded: G.grounded,
            dasDelay: G.dasDelay, arrDelay: G.arrDelay, holdDir: G.holdDir,
            softHeld: G.softHeld, softTimer: num(G.softTimer), lastT: num(G.lastT), frozen: frozen });
        } },
      { label: "Console: scoring", doc: "Score, level, lines, combo, back-to-back, zone meter and grandmaster grade against the shipped thresholds.",
        run: function () {
          var G = g();
          console.log({ score: G.score, level: G.level, lines: G.lines, combo: G.combo, b2b: G.b2b,
            zoneMeter: G.zoneMeter, zoneMax: G.zoneMax, zoneActive: G.zoneActive, zoneClears: G.zoneClears,
            gradePts: G.gradePts, grade: G.grade, grades: GRADES.slice(0, 12), thresholds: GRADE_TH.slice(0, 12) });
        } },
      { label: "Console: shapes", doc: "Every tetromino matrix, the SRS kick tables and the block colour map.",
        run: function () {
          console.log({ shapes: SHAPES, kicksJLSTZ: KICKS_JLSTZ, kicksI: KICKS_I, colors: COLORS });
        } },
      { label: "Console: audio settings", doc: "Options record, persisted localStorage value and the AudioEngine state.",
        run: function () {
          var m = music || {};
          console.log({ settings: JSON.parse(JSON.stringify(settings)),
            stored: localStorage.getItem("te3s_settings"),
            audio: { ctxState: m.ctx ? m.ctx.state : "none", playing: !!m.playing, song: m.song ? String(m.song).slice(0, 40) : null, step: m.step } });
        } }
    ],

    layout: [
      { sel: "#app", label: "Root element" },
      { sel: "#game-layout", label: "Game layout grid" },
      { sel: "#play-area", label: "Play-area wrapper" },
      { sel: "#gameCanvas", label: "Board canvas" },
      { sel: "#nextCanvas", label: "Next queue canvas" },
      { sel: "#holdCanvas", label: "Hold canvas" },
      { sel: "#score", label: "Score readout" },
      { sel: "#level", label: "Level readout" },
      { sel: "#lines", label: "Lines readout" },
      { sel: "#timer", label: "Timer readout" },
      { sel: "#timer-label", label: "Timer label" },
      { sel: "#timer-wrap", label: "Timer wrapper" },
      { sel: "#grade", label: "Grade readout" },
      { sel: "#grade-wrap", label: "Grade wrapper" },
      { sel: "#zone-fill", label: "Zone meter fill" },
      { sel: "#title-screen", label: "Title screen overlay" },
      { sel: "#pause-screen", label: "Pause overlay" },
      { sel: "#options-screen", label: "Options overlay" },
      { sel: "#help-screen", label: "Help overlay" },
      { sel: "#gameover-screen", label: "Game-over overlay" },
      { sel: "#final-score", label: "Final score line" },
      { sel: "#final-extra", label: "Final extra line" },
      { sel: "#opt-music", label: "Music checkbox" },
      { sel: "#opt-sound", label: "Sound checkbox" },
      { sel: "#opt-ghost", label: "Ghost checkbox" },
      { sel: "#opt-musicvol", label: "Music volume slider" },
      { sel: "#opt-sfxvol", label: "SFX volume slider" },
      { sel: ".dpad", label: "Touch D-pad" },
      { sel: ".dpad-btn", label: "D-pad buttons" },
      { sel: ".action-btns", label: "Touch action buttons" },
      { sel: ".act-btn", label: "Action buttons" },
      { sel: ".info-strip", label: "Info strip" },
      { sel: ".info-box", label: "Side panels" },
      { sel: ".stats-box", label: "Stats panel" },
      { sel: ".next-box", label: "Next panel" },
      { sel: ".hold-box", label: "Hold panel" },
      { sel: ".zone-box", label: "Zone panel" },
      { sel: ".lbl", label: "Panel labels" },
      { sel: ".menu-btn", label: "Menu buttons" },
      { sel: ".pause-btn", label: "Pause button" },
      { sel: ".help-content", label: "Help content" },
      { sel: ".overlay", label: "Overlays" },
      { sel: ".active", label: "Visible overlay state" },
      { sel: ".zone-active", label: "Zone glow state" },
      { sel: ".c", label: "Generic cell hook" }
    ],

    control: [
      { id: "mode", label: "Start a mode or go to menu", args: '"marathon" | "sprint" | "grandmaster" | "zone" | "ultra" | "garbage" | "menu"', argDefault: "marathon",
        doc: "game.startMode(name) resets the board, bag and counters and begins that rule set; menu returns to the title screen.",
        run: function (m) {
          var G = g();
          if (String(m) === "menu") G.toMenu(); else G.startMode(String(m || "marathon"));
          return { state: G.state, mode: G.mode, level: G.level, score: G.score, lines: G.lines, piece: G.current ? G.current.type : null };
        } },
      { id: "pause", label: "Pause or resume", args: '"pause" | "resume"', argDefault: "pause",
        doc: "game.pause()/resume() — the P-key path, including the pause overlay and music ducking.",
        run: function (w) { var G = g(); if (String(w) === "resume") G.resume(); else G.pause(); return { state: G.state, lockTimer: num(G.lockTimer), dropCounter: num(G.dropCounter) }; } },
      { id: "piece", label: "Force the next piece", args: 'piece name: I, O, T, S, Z, J, L', argDefault: "\"T\"",
        doc: "Writes the queue head (the page stores type names) and spawns it — the exact piece you need for a kick, a T-spin or a line-clear test.",
        run: function (p) {
          var G = g(), name = (Array.isArray(p) ? String(p[0]) : String(p === undefined ? "T" : p)).toUpperCase();
          if (typeof SHAPES === "undefined" || !(name in SHAPES)) return "unknown piece " + name + " — try I O T S Z J L";
          G.nextQueue = [name].concat((G.nextQueue || []).slice(1));
          G.spawn();
          return { current: G.current ? G.current.type : null, rotation: G.current ? G.current.rotation : null, queue: (G.nextQueue || []).slice(), bag: (G.bag || []).slice() };
        } },
      { id: "move", label: "Move, rotate, soft drop or hard drop", args: '"left" | "right" | "cw" | "ccw" | "soft" | "drop"', argDefault: "drop",
        doc: "The one-cell input primitives: move(±1), rotate(±1), tryDown(), hardDrop() — each reports the resulting position and any kick.",
        run: function (w) {
          var G = g(), s = String(w || "drop");
          if (s === "left") G.move(-1); else if (s === "right") G.move(1); else if (s === "cw") G.rotate(1); else if (s === "ccw") G.rotate(-1); else if (s === "soft") G.tryDown(); else G.hardDrop();
          return { current: G.current ? G.current.type : null, xy: G.current ? G.current.x + "," + G.current.y : null,
            rotation: G.current ? G.current.rotation : null, grounded: !!G.grounded, lockResets: G.lockResets || 0, lines: G.lines, score: G.score };
        } },
      { id: "hold", label: "Hold swap", args: "unused", doc: "game.holdPiece() — swaps with the hold slot, honouring the once-per-piece rule.",
        run: function () { var G = g(); G.holdPiece(); return { hold: G.hold || null, canHold: !!G.canHold, current: G.current ? G.current.type : null }; } },
      { id: "tempo", label: "Set drop interval, DAS and ARR", args: "[dropMs, dasMs, arrMs]", argDefault: "[600, 150, 30]",
        doc: "The three timing numbers that define play speed: gravity period, hold-repeat delay and repeat rate.",
        run: function (a) { if (!Array.isArray(a)) return "want [dropMs, dasMs, arrMs]"; var G = g(); G.dropInterval = Number(a[0]); G.dasDelay = Number(a[1]); G.arrDelay = Number(a[2]); return { dropInterval: num(G.dropInterval), dasDelay: G.dasDelay, arrDelay: G.arrDelay, level: G.level }; } },
      { id: "attack", label: "Push garbage rows", args: "row count", argDefault: 3,
        doc: "game.addGarbage() per row — raises the stack and tests whether your clears beat the attack at the current level.",
        run: function (n) { var G = g(), k = Math.max(1, Math.min(20, Math.round(Number(n) || 1))); for (var i = 0; i < k; i++) G.addGarbage(); return { lines: G.lines, score: G.score, state: G.state, occupied: occupied() }; } },
      { id: "zone", label: "Trigger zone mode", args: "unused", doc: "Fills the zone meter and calls game.activateZone() — the zone rule set and its countdown.",
        run: function () { var G = g(); G.zoneMeter = G.zoneMax; G.activateZone(); return { zoneActive: !!G.zoneActive, zoneMeter: num(G.zoneMeter), zoneMax: num(G.zoneMax) }; } },
      { id: "probe", label: "Read the field", args: "unused",
        doc: "State and mode, current piece (type/colour/position/rotation), grounded and lock timer/resets, hold and canHold, next queue and bag, score/lines/level/combo/back-to-back, last action, drop timing, DAS/ARR and hold direction, zone meter, occupied cells.",
        run: function () {
          var G = g();
          return { state: G.state, mode: G.mode,
            current: G.current ? { type: G.current.type, color: G.current.color, x: G.current.x, y: G.current.y, rotation: G.current.rotation } : null,
            grounded: !!G.grounded, lockTimer: num(G.lockTimer), lockResets: G.lockResets || 0,
            canHold: !!G.canHold, hold: G.hold || null, nextQueue: (G.nextQueue || []).slice(), bag: (G.bag || []).slice(),
            score: G.score, lines: G.lines, level: G.level, combo: G.combo, backToBack: !!G.b2b, lastAction: G.lastAction || null,
            dropInterval: num(G.dropInterval), dropCounter: num(G.dropCounter), dasDelay: G.dasDelay, arrDelay: G.arrDelay, holdDir: G.holdDir,
            softHeld: !!G.softHeld, softTimer: num(G.softTimer),
            zoneMeter: num(G.zoneMeter), zoneMax: num(G.zoneMax), zoneActive: !!G.zoneActive, occupied: occupied() };
        } },
      { id: "watch", label: "Log the run every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Piece position, stack fill, lines and score each interval — the trace for gravity and lock-timer tuning; window.__tllTetris holds the timer.",
        run: function (s) {
          if (window.__tllTetris) { clearInterval(window.__tllTetris); window.__tllTetris = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllTetris = setInterval(function () {
            var G = g();
            console.log("piece", G.current ? G.current.type : "-", "xy", G.current ? G.current.x + "," + G.current.y : "-",
              "grounded", G.grounded, "lock", (G.lockTimer || 0).toFixed(0), "occupied", occupied(), "lines", G.lines, "score", G.score, "state", G.state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "T-spin setup: paint the notch and rotate into it",
        doc: "Builds the classic T-spin notch on the board, spawns a T piece above it, rotates and prints whether the kick landed and how many lines cleared.",
        js: 'var G = game, W = COLS, H = ROWS;\nvar b = G.board;\nfor (var y = 0; y < H; y++) for (var x = 0; x < W; x++) b[y][x] = 0;\nfor (var x = 0; x < W; x++) { b[H - 1][x] = 1; b[H - 2][x] = 1; }\nb[H - 2][W - 2] = 0; b[H - 1][W - 2] = 0; b[H - 2][W - 3] = 0;\nG.nextQueue = ["T"].concat(G.nextQueue.slice(1));\nG.spawn();\nG.current.x = W - 4; G.current.y = H - 4;\nG.rotate(1); G.rotate(1);\nvar before = G.lines;\nG.hardDrop();\nconsole.log("T-spin lines cleared", G.lines - before, "score", G.score, "lastAction", G.lastAction);' },
      { label: "Gravity ladder by level",
        doc: "Prints the drop interval the game uses at each level, showing the speed curve players feel.",
        js: 'var G = game, out = [];\nfor (var lv = 1; lv <= 15; lv++) {\n  G.level = lv;\n  if (typeof G.updateGravity === "function") G.updateGravity(); else G.dropInterval = Math.max(0, 1000 - (lv - 1) * 60);\n  out.push({ level: lv, dropInterval: G.dropInterval, secondsPerRow: (G.dropInterval / 1000).toFixed(2) });\n}\nconsole.table(out);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live game (state, mode, active piece, queue, board snapshot, timers, zone, grade). BALANCE edits DAS/ARR, gravity, score/level/lines/combo, zone and garbage periods, volume. CHEATS drives input and mode switches. LAYOUT resizes and repositions the canvases, side panels, overlays and touch controls. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "tetris.html declares game, music, ui, settings, COLS, ROWS, COLORS, SHAPES, KICKS_JLSTZ, KICKS_I, GRADES and GRADE_TH as top-level const in a classic script. Those live in the script-scope lexical environment, not on window, so the harness refers to them by name (window.game would be undefined). Nothing in tetris.html was modified." },
      { topic: "Freeze vs pause", text: "'Freeze physics' replaces game.loop with a no-op — gravity, DAS, soft drop, garbage attacks, zone countdown and canvas redraw all stop while the rAF chain is idle. 'Game pause' is the game's own P: state becomes 'paused', music stops and #pause-screen shows, but loop() still runs (and skips its body)." },
      { topic: "Gravity is level-derived", text: "gravityFor(level) recomputes dropInterval on every line clear in marathon/garbage/zone, and in grandmaster uses gravityFor(level+3) then clamps to 0 at level 5. Setting gravity or level here sticks only until the next clear." },
      { topic: "Modes", text: "marathon (level-up gravity), sprint (40 lines, timer counts up), grandmaster (20G at level 5, grade ladder 9..G+ via GRADES/GRADE_TH), zone (meter fills per line, V triggers slow-motion bonus scoring), ultra (120 s countdown), garbage (rows pushed up every garbageInterval, shortening by 150 ms per attack, floor 4000)." },
      { topic: "Zone behaviour", text: "While zoneActive, dropCounter accumulates at dt*0.2 and cleared lines add to zoneClears instead of score; the bonus is zoneClears^2*50*level paid when the zone ends. 'Trigger zone mode' fills the meter first so it fires immediately." },
      { topic: "No translation table", text: "tetris.html ships single-language markup with no i18n record, so the TEXTS tab is empty by design. Strings live inline in the markup and in updateStats()/gameOver() text." },
      { topic: "Not reachable", text: "WebAudio node graphs inside AudioEngine stay private; the WebAudio context state is visible through Console: audio settings. Board, queue, timers, settings and overlays are all live." }
    ]
  });
})();
