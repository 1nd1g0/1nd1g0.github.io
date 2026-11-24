/* dbg/tetris2.js — developer harness for tetris2.html ("Te3s")
 *
 * Load with:  tetris2.html?debug=dbg/tetris2.js
 * tetris2.html declares game, music, ui, settings, COLS, ROWS, COLORS, SHAPES,
 * KICKS_JLSTZ, KICKS_I, GRADES, GRADE_TH as top-level const in a classic script
 * (script-scope lexical bindings, not window properties), so this harness refers
 * to them by name. Nothing in tetris2.html was modified.
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
    if (frozen) { if (!realLoop) realLoop = g().loop; g().loop = function () { }; }
    else if (realLoop) { g().loop = realLoop; }
  }

  TLDBG.register({
    game: "tetris2", file: "tetris2.html",

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
        zoneBarPercent: num(100 * (G.zoneMeter || 0) / (G.zoneMax || 1)),
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
        code: { file: "tetris2.html", line: 657, name: "game.dasDelay" },
        doc: "Hold time before horizontal auto-repeat (133). Arrow keydown re-asserts 133/50, and a pointerdown on the D-pad sets 220 for touch taps, so a value set here survives only until the next press." },
      { id: "arrDelay", label: "ARR rate", unit: "ms", min: 5, max: 200, step: 5,
        get: function () { return g().arrDelay }, set: function (v) { var n = iv(v, 5, 1e9); if (n !== null) g().arrDelay = n },
        code: { file: "tetris2.html", line: 657, name: "game.arrDelay" },
        doc: "Repeat period once DAS has elapsed (50). Also re-asserted by keydown handlers." },
      { id: "dropInterval", label: "Gravity interval", unit: "ms", min: 0, max: 2000, step: 10,
        get: function () { return g().dropInterval }, set: function (v) { var n = iv(v, 0, 1e9); if (n !== null) g().dropInterval = n },
        code: { file: "tetris2.html", line: 972, name: "game.dropInterval" },
        doc: "Milliseconds per automatic row of fall; 0 is 20G (instant). gravityFor(level) overwrites it on every clear." },
      { id: "level", label: "Level", unit: "level", min: 1, max: 30, step: 1,
        get: function () { return g().level }, set: function (v) { var n = iv(v, 1, 30); if (n === null) return; g().level = n; g().dropInterval = g().gravityFor(g().level); g().updateStats() },
        code: { file: "tetris2.html", line: 968, name: "game.level" },
        doc: "Score multiplier; the setter recomputes gravity exactly as clearLines() does." },
      { id: "score", label: "Score", unit: "points", min: 0, max: 999999, step: 100,
        get: function () { return g().score }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; g().score = n; g().updateStats() },
        code: { file: "tetris2.html", line: 968, name: "game.score" },
        doc: "Shown in #score. Soft drop +1 per row, hard drop +2 per row, clears scale with level and combo." },
      { id: "lines", label: "Lines cleared", unit: "lines", min: 0, max: 400, step: 1,
        get: function () { return g().lines }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; g().lines = n; g().updateStats() },
        code: { file: "tetris2.html", line: 968, name: "game.lines" },
        doc: "Sprint ends at 40 lines; level advances every 10." },
      { id: "combo", label: "Combo counter", unit: "combo", min: -1, max: 99, step: 1,
        get: function () { return g().combo }, set: function (v) { var n = iv(v, -1, 99); if (n !== null) g().combo = n },
        code: { file: "tetris2.html", line: 968, name: "game.combo" },
        doc: "-1 means no combo; bonus is 50*combo*level." },
      { id: "zoneMax", label: "Zone meter size", unit: "lines", min: 1, max: 40, step: 1,
        get: function () { return g().zoneMax }, set: function (v) { var n = iv(v, 1, 40); if (n === null) return; g().zoneMax = n; g().updateStats() },
        code: { file: "tetris2.html", line: 969, name: "game.zoneMax" },
        doc: "Lines needed to fill the meter (10). updateStats writes it to the CSS var --zp on #zone-fill." },
      { id: "zoneTime", label: "Zone duration", unit: "ms", min: 500, max: 20000, step: 500,
        get: function () { return g().zoneTime }, set: function (v) { var n = iv(v, 100, 1e9); if (n !== null) g().zoneTime = n },
        code: { file: "tetris2.html", line: 969, name: "game.zoneTime" },
        doc: "How long zone stays active once triggered (set to 5000 by activateZone())." },
      { id: "garbageInterval", label: "Garbage attack period", unit: "ms", min: 1000, max: 30000, step: 500,
        get: function () { return g().garbageInterval }, set: function (v) { var n = iv(v, 1000, 1e9); if (n !== null) g().garbageInterval = n },
        code: { file: "tetris2.html", line: 970, name: "game.garbageInterval" },
        doc: "Garbage battle only: rows pushed up from the bottom each period (10000, -150 per attack, floor 4000)." },
      { id: "timeRemaining", label: "Ultra time remaining", unit: "ms", min: 0, max: 300000, step: 1000,
        get: function () { return g().timeRemaining }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; g().timeRemaining = n; g().updateStats() },
        code: { file: "tetris2.html", line: 974, name: "game.timeRemaining" },
        doc: "Ultra countdown (120000); reaching 0 ends the game." },
      { id: "musicVol", label: "Music volume", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return settings.musicVol }, set: function (v) { var n = iv(v, 0, 100); if (n === null) return; settings.musicVol = n; settings.save(); if (ui) ui.syncOptions() },
        code: { file: "tetris2.html", line: 428, name: "settings.musicVol" },
        doc: "Options screen value (35), persisted to localStorage." },
      { id: "sfxVol", label: "Sound-effect volume", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return settings.sfxVol }, set: function (v) { var n = iv(v, 0, 100); if (n === null) return; settings.sfxVol = n; settings.save(); if (ui) ui.syncOptions() },
        code: { file: "tetris2.html", line: 428, name: "settings.sfxVol" },
        doc: "Options screen value (75), persisted with the same record." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze physics", toggle: true,
        doc: "Replaces game.loop with a no-op: gravity, DAS, soft drop, garbage, zone countdown and drawing all stop; the rAF chain resumes when off.",
        on: function (v) { freezeMode(v) } },
      { id: "pause", label: "Game pause (P)", toggle: true,
        doc: "game.pause()/resume() — the overlay shows and music stops, exactly like the P key.",
        on: function (v) { if (v) g().pause(); else g().resume() } },
      { id: "hardDrop", label: "Hard drop",
        doc: "game.hardDrop(): slams the piece down (+2 per row) then locks it.",
        run: function () { g().hardDrop(); TLDBG.toast("dropped " + (g().current ? g().current.type : "locked")) } },
      { id: "rotateCW", label: "Rotate clockwise",
        doc: "game.rotate(1) with SRS kicks (KICKS_JLSTZ / KICKS_I).",
        run: function () { g().rotate(1); TLDBG.toast("rot " + (g().current ? g().current.rotation : "-")) } },
      { id: "rotateCCW", label: "Rotate counter-clockwise",
        doc: "game.rotate(-1).",
        run: function () { g().rotate(-1); TLDBG.toast("rot " + (g().current ? g().current.rotation : "-")) } },
      { id: "rotate180", label: "Rotate 180",
        doc: "Two clockwise rotations in a row.",
        run: function () { g().rotate(1); g().rotate(1); TLDBG.toast("rot " + (g().current ? g().current.rotation : "-")) } },
      { id: "holdPiece", label: "Hold piece (C)",
        doc: "game.holdPiece(): swaps active piece with the held one, once per piece.",
        run: function () { g().holdPiece(); TLDBG.toast("hold=" + (g().hold || "none")) } },
      { id: "left", label: "Move left", doc: "game.move(-1) one cell.",
        run: function () { g().move(-1); TLDBG.toast("x=" + (g().current ? g().current.x : "-")) } },
      { id: "right", label: "Move right", doc: "game.move(1) one cell.",
        run: function () { g().move(1); TLDBG.toast("x=" + (g().current ? g().current.x : "-")) } },
      { id: "softStep", label: "Soft drop one row", doc: "game.tryDown() once (+1 point when it moves).",
        run: function () { g().tryDown(); TLDBG.toast("y=" + (g().current ? g().current.y : "-")) } },
      { id: "activateZone", label: "Trigger zone mode",
        doc: "Fills the meter then game.activateZone(): gravity accumulates at 20% for zoneTime ms and the board gets .zone-active.",
        run: function () { var G = g(); G.zoneMeter = G.zoneMax; G.activateZone(); TLDBG.toast(G.zoneActive ? "zone active " + G.zoneTime + "ms" : "zone refused") } },
      { id: "spawnGarbage", label: "Push garbage row",
        doc: "game.addGarbage() — usable in any mode.",
        run: function () { g().addGarbage(); TLDBG.toast("occupied " + occupied()) } },
      { id: "fillBottom", label: "Fill the bottom 3 rows",
        doc: "Writes a mostly-full bottom band with one gap column, so a clear is one piece away.",
        run: function () {
          var G = g(), gap = 3;
          for (var y = rows() - 3; y < rows(); y++) for (var x = 0; x < cols(); x++) G.board[y][x] = x === gap ? 0 : 8;
          G.draw(); TLDBG.toast("occupied " + occupied())
        } },
      { id: "clearBoard", label: "Clear the board",
        doc: "Empties game.board (no scoring) and redraws.",
        run: function () { var G = g(); G.board = G.createBoard(); G.draw(); TLDBG.toast("board empty") } },
      { id: "modeMarathon", label: "Mode: marathon", toggle: true,
        doc: "game.startMode('marathon'); off returns to the title screen via toMenu().",
        on: function (v) { if (v) g().startMode("marathon"); else g().toMenu() } },
      { id: "modeSprint", label: "Mode: sprint (40 lines)", toggle: true,
        doc: "game.startMode('sprint').",
        on: function (v) { if (v) g().startMode("sprint"); else g().toMenu() } },
      { id: "modeGrandmaster", label: "Mode: grandmaster (20G)", toggle: true,
        doc: "game.startMode('grandmaster') — gravity starts at gravityFor(4), 0 at level 5+, grade ladder 9..G+.",
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
        doc: "game.gameOver(): shows the game-over overlay with the current score.",
        run: function () { g().gameOver(); TLDBG.toast("game over") } },
      { id: "ghost", label: "Ghost piece", toggle: true,
        doc: "settings.ghostOn and game.ghostOn — landing preview under the active piece; persisted with the options record.",
        on: function (v) { settings.ghostOn = !!v; g().ghostOn = !!v; settings.save(); if (ui) ui.syncOptions(); g().draw() } },
      { id: "music", label: "Music", toggle: true,
        doc: "settings.musicOn plus music.applyState(): starts or stops the procedural AudioEngine loop.",
        on: function (v) { settings.musicOn = !!v; settings.save(); if (ui) ui.syncOptions(); if (music) music.applyState() } },
      { id: "sound", label: "Sound effects", toggle: true,
        doc: "settings.soundOn (lock, clear, level-up sfx).",
        on: function (v) { settings.soundOn = !!v; settings.save(); if (ui) ui.syncOptions() } }
    ],

    hooks: [
      { label: "Console: piece and queue", doc: "Active piece (type, colour, position, rotation, matrix), the 5-piece next queue, remaining bag, held piece and last action.",
        run: function () {
          var G = g();
          console.log({ current: G.current ? { type: G.current.type, color: G.current.color, x: G.current.x, y: G.current.y, rotation: G.current.rotation, matrix: G.current.matrix } : null,
            nextQueue: (G.nextQueue || []).slice(), bag: (G.bag || []).slice(), hold: G.hold, canHold: G.canHold, lastAction: G.lastAction });
        } },
      { label: "Console: board", doc: "The board as ASCII rows plus occupied cells and complete rows.",
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
      { label: "Console: scoring", doc: "Score, level, lines, combo, back-to-back, zone meter and grandmaster grade against the shipped ladder.",
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
      { label: "Console: audio and options", doc: "Options record, persisted localStorage value, AudioEngine state and the active language.",
        run: function () {
          var m = music || {};
          console.log({ settings: JSON.parse(JSON.stringify(settings)),
            stored: localStorage.getItem(Object.keys(localStorage).filter(function (k) { return /te3s|settings/i.test(k) })[0] || ""),
            audio: { ctxState: m.ctx ? m.ctx.state : "none", playing: !!m.playing, song: m.song ? String(m.song).slice(0, 40) : null, step: m.step },
            lang: document.documentElement.lang,
            zoneBarVar: getComputedStyle(document.getElementById("zone-fill")).getPropertyValue("--zp") });
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
      { sel: "#zone-fill", label: "Zone meter fill (--zp)" },
      { sel: "#title-screen", label: "Title overlay" },
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
      { sel: "#tlHost", label: "Harness host mount" },
      { sel: ".left-col", label: "Left column" },
      { sel: ".right-col", label: "Right column" },
      { sel: ".rbox", label: "Right side boxes" },
      { sel: ".rlbl", label: "Right side labels" },
      { sel: ".vstat", label: "Stat values" },
      { sel: ".lbl", label: "Labels" },
      { sel: ".sub", label: "Subtitle" },
      { sel: ".meter", label: "Zone meter track" },
      { sel: ".dpad", label: "Touch D-pad" },
      { sel: ".dpad-btn", label: "D-pad buttons" },
      { sel: ".touch-controls", label: "Touch control block" },
      { sel: ".action-btns", label: "Touch action buttons" },
      { sel: ".act-btn", label: "Action buttons" },
      { sel: ".menu-btn", label: "Menu buttons" },
      { sel: ".pause-btn", label: "Pause button" },
      { sel: ".options-group", label: "Options groups" },
      { sel: ".opt-row", label: "Option rows" },
      { sel: ".switch", label: "Toggle switches" },
      { sel: ".slider", label: "Sliders" },
      { sel: ".help-content", label: "Help content" },
      { sel: ".overlay", label: "Overlays" },
      { sel: ".active", label: "Visible overlay state" },
      { sel: ".zone-active", label: "Zone glow state" },
      { sel: ".tag", label: "Help tags" },
      { sel: ".c", label: "Generic cell hook" }
    ],

    control: [
      { id: "mode", label: "Start a mode or go to menu", args: '"marathon" | "sprint" | "grandmaster" | "zone" | "ultra" | "garbage" | "menu"', argDefault: "marathon",
        doc: "game.startMode(name) resets board, bag and counters — grandmaster runs 20G gravity, sprint counts to 40 lines, ultra is a 120 s countdown.",
        run: function (m) {
          var G = g();
          if (String(m) === "menu") G.toMenu(); else G.startMode(String(m || "marathon"));
          return { state: G.state, mode: G.mode, level: G.level, score: G.score, lines: G.lines, piece: G.current ? G.current.type : null };
        } },
      { id: "pause", label: "Pause or resume", args: '"pause" | "resume"', argDefault: "pause",
        doc: "game.pause()/resume() — the P-key path with the pause overlay and music.",
        run: function (w) { var G = g(); if (String(w) === "resume") G.resume(); else G.pause(); return { state: G.state, lockTimer: num(G.lockTimer), dropCounter: num(G.dropCounter) }; } },
      { id: "piece", label: "Force the next piece", args: 'piece name: I, O, T, S, Z, J, L', argDefault: "\"T\"",
        doc: "Writes the queue head (type names) and spawns it — the piece you need to exercise the SRS kick tables (KICKS_JLSTZ, KICKS_I).",
        run: function (p) {
          var G = g(), name = (Array.isArray(p) ? String(p[0]) : String(p === undefined ? "T" : p)).toUpperCase();
          if (typeof SHAPES === "undefined" || !(name in SHAPES)) return "unknown piece " + name + " — try I O T S Z J L";
          G.nextQueue = [name].concat((G.nextQueue || []).slice(1));
          G.spawn();
          return { current: G.current ? G.current.type : null, rotation: G.current ? G.current.rotation : null, queue: (G.nextQueue || []).slice(), bag: (G.bag || []).slice() };
        } },
      { id: "move", label: "Move, rotate, soft drop or hard drop", args: '"left" | "right" | "cw" | "ccw" | "soft" | "drop"', argDefault: "drop",
        doc: "The input primitives: move(±1), rotate(±1) through the SRS kicks, tryDown(), hardDrop() — each reports position, grounded state and lock resets.",
        run: function (w) {
          var G = g(), s = String(w || "drop");
          if (s === "left") G.move(-1); else if (s === "right") G.move(1); else if (s === "cw") G.rotate(1); else if (s === "ccw") G.rotate(-1); else if (s === "soft") G.tryDown(); else G.hardDrop();
          return { current: G.current ? G.current.type : null, xy: G.current ? G.current.x + "," + G.current.y : null,
            rotation: G.current ? G.current.rotation : null, grounded: !!G.grounded, lockResets: G.lockResets || 0, lines: G.lines, score: G.score, lastAction: G.lastAction || null };
        } },
      { id: "hold", label: "Hold swap", args: "unused", doc: "game.holdPiece() — the guideline once-per-piece hold swap.",
        run: function () { var G = g(); G.holdPiece(); return { hold: G.hold || null, canHold: !!G.canHold, current: G.current ? G.current.type : null }; } },
      { id: "tempo", label: "Set drop interval, DAS and ARR", args: "[dropMs, dasMs, arrMs]", argDefault: "[600, 150, 30]",
        doc: "Gravity period, horizontal repeat delay and rate — the three numbers behind how the game feels at a given level.",
        run: function (a) { if (!Array.isArray(a)) return "want [dropMs, dasMs, arrMs]"; var G = g(); G.dropInterval = Number(a[0]); G.dasDelay = Number(a[1]); G.arrDelay = Number(a[2]); return { dropInterval: num(G.dropInterval), dasDelay: G.dasDelay, arrDelay: G.arrDelay, level: G.level }; } },
      { id: "attack", label: "Push garbage rows", args: "row count", argDefault: 3,
        doc: "game.addGarbage() per row — raises the stack so you can test clears under attack at the current gravity.",
        run: function (n) { var G = g(), k = Math.max(1, Math.min(20, Math.round(Number(n) || 1))); for (var i = 0; i < k; i++) G.addGarbage(); return { lines: G.lines, score: G.score, state: G.state, occupied: occupied() }; } },
      { id: "zone", label: "Trigger zone mode", args: "unused", doc: "Fills the zone meter and calls game.activateZone() — the zone rule set and its countdown.",
        run: function () { var G = g(); G.zoneMeter = G.zoneMax; G.activateZone(); return { zoneActive: !!G.zoneActive, zoneMeter: num(G.zoneMeter), zoneMax: num(G.zoneMax) }; } },
      { id: "probe", label: "Read the field", args: "unused",
        doc: "State and mode, current piece (type/colour/position/rotation), grounded and lock timer/resets, hold and canHold, 5-next queue and 7-bag, score/lines/level/combo/back-to-back, last action, drop timing, DAS/ARR, hold direction, zone meter, occupied cells.",
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
        doc: "Piece position, stack fill, lines and score each interval — the trace for 20G and lock-delay tuning; window.__tllTe3s holds the timer.",
        run: function (s) {
          if (window.__tllTe3s) { clearInterval(window.__tllTe3s); window.__tllTe3s = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllTe3s = setInterval(function () {
            var G = g();
            console.log("piece", G.current ? G.current.type : "-", "xy", G.current ? G.current.x + "," + G.current.y : "-",
              "grounded", G.grounded, "lock", (G.lockTimer || 0).toFixed(0), "occupied", occupied(), "lines", G.lines, "score", G.score, "state", G.state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "SRS kick audit for every piece and rotation",
        doc: "Clears the board, places a wall on the left and rotates each piece against it, printing which rotation state each kick lands in — the SRS table check.",
        js: 'var G = game, W = COLS, H = ROWS, b = G.board;\nvar pieces = Object.keys(SHAPES), out = [];\nfor (var i = 0; i < pieces.length; i++) {\n  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) b[y][x] = 0;\n  for (var y = 0; y < H; y++) b[y][0] = 1;\n  G.nextQueue = [pieces[i]].concat(G.nextQueue.slice(1));\n  G.spawn();\n  G.current.x = 0; G.current.y = 2;\n  var r0 = G.current.rotation;\n  G.rotate(1); var r1 = G.current.rotation;\n  G.rotate(1); var r2 = G.current.rotation;\n  G.rotate(-1); var r3 = G.current.rotation;\n  out.push({ piece: pieces[i], start: r0, cw: r1, cw2: r2, ccw: r3, x: G.current.x, y: G.current.y });\n}\nconsole.table(out);' },
      { label: "Gravity ladder including 20G",
        doc: "Prints the drop interval per level through the guideline curve, so the 20G ceiling is visible in numbers.",
        js: 'var G = game, out = [];\nfor (var lv = 1; lv <= 20; lv++) {\n  G.level = lv;\n  if (typeof G.updateGravity === "function") G.updateGravity(); else G.dropInterval = lv >= 15 ? 0 : Math.max(0, 1000 - (lv - 1) * 60);\n  out.push({ level: lv, dropInterval: G.dropInterval, secondsPerRow: (G.dropInterval / 1000).toFixed(2) });\n}\nconsole.table(out);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live game (state, mode, active piece, queue, board snapshot, timers, zone, grade). BALANCE edits DAS/ARR, gravity, score/level/lines/combo, zone and garbage periods, volume. CHEATS drives input and mode switches. LAYOUT resizes and repositions the canvases, side columns, overlays and touch controls. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "game, music, ui, settings, COLS, ROWS, COLORS, SHAPES, KICKS_JLSTZ, KICKS_I, GRADES and GRADE_TH are top-level const in a classic script: script-scope lexical bindings, visible by name to every script but not properties of window. Nothing in tetris2.html was modified." },
      { topic: "Freeze vs pause", text: "'Freeze physics' replaces game.loop with a no-op — gravity, DAS, soft drop, garbage attacks, zone countdown and canvas redraw all stop. 'Game pause' is the game's own P: state becomes 'paused', music stops and the pause overlay shows while loop() keeps running without doing work." },
      { topic: "DAS is re-asserted by input", text: "ArrowLeft/ArrowRight keydown sets dasDelay=133 and arrDelay=50 again, and a pointerdown on the D-pad sets dasDelay to 220 for touch taps. A tuned value holds until the next press; CHEATS: move left/right call move() directly and do not reset it." },
      { topic: "Gravity is level-derived", text: "gravityFor(level) recomputes dropInterval on every clear in marathon/garbage/zone; grandmaster uses gravityFor(level+3) and clamps to 0 (20G) at level 5." },
      { topic: "Zone bar is a CSS variable", text: "updateStats() writes --zp on #zone-fill rather than inline width, so zone visualisation is driven by the custom property; STATE reports both zoneMeter and the computed --zp percentage." },
      { topic: "Modes", text: "marathon (level-up gravity), sprint (40 lines, timer counts up), grandmaster (20G at level 5, grade ladder 9..G+ via GRADES/GRADE_TH), zone (meter fills per line, V triggers slow-motion bonus scoring), ultra (120 s countdown), garbage (rows pushed up every garbageInterval, shortening by 150 ms per attack, floor 4000)." },
      { topic: "Not reachable", text: "WebAudio node graphs inside AudioEngine stay private; the context state is visible through Console: audio and options. Board, queue, timers, settings and overlays are all live." }
    ]
  });
})();
