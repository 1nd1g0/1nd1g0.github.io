/* dbg/tanks_editor.js — developer harness for tanks_editor.html (sprite/balance editor)
 *
 * Load with:  tanks_editor.html?debug=dbg/tanks_editor.js
 * tanks_editor.html wraps its editor in a strict IIFE; the last block publishes
 * window.TLHOOK (names only), which everything here reads: MODEL, DEF_BAL,
 * DEF_PAL, DEF_SIZES, DEF_STR, CELL, tool, selChar, mirror, undoStack,
 * previewDir, sheetCvs, gridW, gridH, setCell, cellFromEvent, setTool, pushUndo,
 * undo, drawGrid, sizeGridCanvas, buildSheet, buildPalTab, buildPalSelect,
 * buildSwatches, buildBalTab, renderPreviews, drawAnim, drawPalMinis,
 * renderValue, renderStrList, regenExports, parseText, loadTank, loadPal,
 * loadBal, loadStr, loadSizes, tryImport, resetAll, toast, rebuild.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK); }
  function M() { return h().MODEL }

  var realDrawAnim = null, pausedAnim = false;
  function animMode(v) {
    var T = h();
    pausedAnim = !!v;
    if (pausedAnim) { if (!realDrawAnim) realDrawAnim = T.drawAnim; T.drawAnim = function () { }; }
    else if (realDrawAnim) { T.drawAnim = realDrawAnim; }
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 1000)) / (r || 1000) : 0 }
  function bal(path, v) {
    var k = path.split("."), o = M().bal;
    for (var i = 0; i < k.length - 1; i++) o = o[k[i]];
    if (v === undefined) return o[k[k.length - 1]];
    o[k[k.length - 1]] = v;
  }
  function filled() {
    var t = M().tank, n = 0;
    for (var y = 0; y < t.length; y++) for (var x = 0; x < t[y].length; x++) if (t[y][x] !== ".") n++;
    return n;
  }

  TLDBG.register({
    game: "tanks_editor", file: "tanks_editor.html",

    state: function () {
      var T = h(), M = h().MODEL;
      return {
        tool: T.tool, brushChar: T.selChar, mirror: !!T.mirror, painting: !!T.painting,
        grid: h().gridW() + "x" + h().gridH(), cellPixels: T.CELL,
        filledCells: filled(), undoDepth: T.undoStack ? T.undoStack.length : 0,
        animFrame: T.animFrame, animPaused: pausedAnim, previewDir: T.previewDir,
        spriteFrames: T.sheetCvs ? T.sheetCvs.length : 0,
        paletteNames: M.pal ? Object.keys(M.pal) : [],
        paletteCount: M.pal ? Object.keys(M.pal).length : 0,
        sizePresets: M.sizes ? Object.keys(M.sizes) : [],
        sizeTable: M.sizes ? JSON.parse(JSON.stringify(M.sizes)) : null,
        stringCount: M.str ? Object.keys(M.str).length : 0,
        balKeys: M.bal ? Object.keys(M.bal) : [],
        tankRows: M.tank ? M.tank.length : 0, tankCols: M.tank && M.tank[0] ? M.tank[0].length : 0,
        defaultsDiffer: (function () {
          var d = T.DEF_BAL, b = M.bal, out = [];
          for (var k in d) {
            var v1 = d[k], v2 = b[k];
            if (typeof v1 === "number" && v1 !== v2) out.push(k + ": " + v1 + " -> " + v2);
            else if (v1 && typeof v1 === "object") { for (var k2 in v1) if (typeof v1[k2] === "number" && v2 && v2[k2] !== v1[k2]) out.push(k + "." + k2 + ": " + v1[k2] + " -> " + v2[k2]) }
          }
          return out;
        })(),
        activePane: (function () {
          var on = [...document.querySelectorAll(".pane.on")];
          return on.length ? on[0].id : null;
        })()
      };
    },

    params: [
      { id: "cellPixels", label: "Grid cell size", unit: "px", min: 8, max: 48, step: 2,
        get: function () { return h().CELL }, set: function (v) { h().CELL = Math.max(4, v) },
        code: { file: "tanks_editor.html", line: 591, name: "CELL" },
        doc: "On-screen size of one sprite cell in the editor canvas (24). The setter resizes and repaints the grid; the exported sprite sheet is unaffected." },
      { id: "previewDir", label: "Preview direction", unit: "0-3", min: 0, max: 3, step: 1,
        get: function () { return h().previewDir }, set: function (v) { h().previewDir = Math.max(0, Math.min(3, Math.round(v))); if (typeof h().renderPreviews === "function") h().renderPreviews() },
        code: { file: "tanks_editor.html", line: 592, name: "previewDir" },
        doc: "Which of the four rotations the large preview shows (0 up, 1 right, 2 down, 3 left)." },
      { id: "tankSpeed", label: "Model: player speed", unit: "px/s", min: 20, max: 200, step: 2,
        get: function () { return bal("player.speed") }, set: function (v) { bal("player.speed", v) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.player.speed" },
        doc: "Balance value exported for the game's BAL.player.speed (72). Edited here, pasted into tanks.html via the balance export." },
      { id: "bulletSpeed", label: "Model: bullet speed", unit: "px/s", min: 80, max: 600, step: 10,
        get: function () { return bal("player.bulletSpeed") }, set: function (v) { bal("player.bulletSpeed", v) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.player.bulletSpeed" },
        doc: "Exported BAL.player.bulletSpeed (280)." },
      { id: "maxBullets", label: "Model: bullets per player", unit: "bullets", min: 1, max: 10, step: 1,
        get: function () { return bal("player.maxBullets") }, set: function (v) { bal("player.maxBullets", Math.max(1, Math.round(v))) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.player.maxBullets" },
        doc: "Exported BAL.player.maxBullets (2)." },
      { id: "fireCooldown", label: "Model: fire cooldown", unit: "s", min: 0.05, max: 2, step: 0.05,
        get: function () { return bal("player.baseCd") }, set: function (v) { bal("player.baseCd", v) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.player.baseCd" },
        doc: "Exported BAL.player.baseCd (0.36)." },
      { id: "lives", label: "Model: lives", unit: "lives", min: 1, max: 9, step: 1,
        get: function () { return bal("player.lives") }, set: function (v) { bal("player.lives", Math.max(1, Math.round(v))) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.player.lives" },
        doc: "Exported BAL.player.lives (3)." },
      { id: "eagleHp", label: "Model: eagle HP", unit: "hp", min: 1, max: 12, step: 1,
        get: function () { return bal("eagle.hp") }, set: function (v) { bal("eagle.hp", Math.max(1, Math.round(v))) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.eagle.hp" },
        doc: "Exported BAL.eagle.hp (2)." },
      { id: "enemyBasicSpeed", label: "Model: scout speed", unit: "px/s", min: 10, max: 140, step: 2,
        get: function () { return bal("enemy.types.basic.spd") }, set: function (v) { bal("enemy.types.basic.spd", v) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.enemy.types.basic.spd" },
        doc: "Exported scout speed (44)." },
      { id: "enemyArmorHp", label: "Model: fortress HP", unit: "hp", min: 1, max: 12, step: 1,
        get: function () { return bal("enemy.types.armor.hp") }, set: function (v) { bal("enemy.types.armor.hp", Math.max(1, Math.round(v))) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.enemy.types.armor.hp" },
        doc: "Exported fortress armour (4)." },
      { id: "maxConcurrent", label: "Model: enemies on field", unit: "tanks", min: 1, max: 16, step: 1,
        get: function () { return bal("enemy.maxConcurrent") }, set: function (v) { bal("enemy.maxConcurrent", Math.max(1, Math.round(v))) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.enemy.maxConcurrent" },
        doc: "Exported simultaneous enemy cap (5)." },
      { id: "cameraSpeed", label: "Model: camera speed", unit: "px/s", min: 1, max: 30, step: 1,
        get: function () { return bal("cam.speed") }, set: function (v) { bal("cam.speed", v) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.cam.speed" },
        doc: "Exported camera follow speed (5)." },
      { id: "lookahead", label: "Model: camera lookahead", unit: "px", min: 0, max: 80, step: 2,
        get: function () { return bal("cam.lookahead") }, set: function (v) { bal("cam.lookahead", v) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.cam.lookahead" },
        doc: "Exported lookahead bias (22)." },
      { id: "particles", label: "Model: particle budget", unit: "particles", min: 0, max: 500, step: 10,
        get: function () { return bal("fx.particles") }, set: function (v) { bal("fx.particles", Math.max(0, Math.round(v))) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.fx.particles" },
        doc: "Exported explosion particle cap (140)." },
      { id: "hudReserve", label: "Model: HUD reserve", unit: "px", min: 0, max: 400, step: 4,
        get: function () { return bal("ui.hudReserve") }, set: function (v) { bal("ui.hudReserve", Math.max(0, Math.round(v))) },
        code: { file: "tanks_editor.html", line: 471, name: "MODEL.bal.ui.hudReserve" },
        doc: "Exported HUD band height reserved from the play area (142)." }
    ],

    cheats: [
      { id: "pauseAnim", label: "Pause tread animation", toggle: true,
        doc: "Wraps drawAnim() so the 160 ms tread-animation ticker stops redrawing the animated preview; off restores it.",
        on: function (v) { animMode(v) } },
      { id: "stepAnim", label: "Step tread frame",
        doc: "Flips animFrame (0/1) and redraws the animation canvas immediately.",
        run: function () { var T = h(); T.animFrame ^= 1; if (typeof T.drawAnim === "function") T.drawAnim(); TLDBG.toast("frame " + T.animFrame) } },
      { id: "mirror", label: "Mirror painting", toggle: true,
        doc: "Forces mirror on/off (the toolbar's ⇋ state); painting mirrors across the vertical axis.",
        on: function (v) { var T = h(); T.mirror = !!v; var b = document.getElementById("btnMirror"); if (b) b.classList[v ? "add" : "remove"]("on"); if (typeof T.drawGrid === "function") T.drawGrid() } },
      { id: "toolPaint", label: "Tool: paint", toggle: true,
        doc: "setTool('paint') while on; off restores the previous tool.",
        on: function (v) { var T = h(); if (v) { if (T.__tllTool === undefined) T.__tllTool = T.tool; T.setTool("paint") } else if (T.__tllTool !== undefined) { T.setTool(T.__tllTool); delete T.__tllTool } } },
      { id: "toolFill", label: "Tool: fill", toggle: true,
        doc: "setTool('fill').",
        on: function (v) { var T = h(); if (v) { if (T.__tllTool === undefined) T.__tllTool = T.tool; T.setTool("fill") } else if (T.__tllTool !== undefined) { T.setTool(T.__tllTool); delete T.__tllTool } } },
      { id: "toolErase", label: "Tool: erase", toggle: true,
        doc: "setTool('erase').",
        on: function (v) { var T = h(); if (v) { if (T.__tllTool === undefined) T.__tllTool = T.tool; T.setTool("erase") } else if (T.__tllTool !== undefined) { T.setTool(T.__tllTool); delete T.__tllTool } } },
      { id: "toolPick", label: "Tool: pick", toggle: true,
        doc: "setTool('pick') — eyedropper over the grid.",
        on: function (v) { var T = h(); if (v) { if (T.__tllTool === undefined) T.__tllTool = T.tool; T.setTool("pick") } else if (T.__tllTool !== undefined) { T.setTool(T.__tllTool); delete T.__tllTool } } },
      { id: "fillGrid", label: "Fill grid with brush char",
        doc: "setCell() over every cell with the current brush character, pushed through undo first.",
        run: function () {
          var T = h(); T.pushUndo();
          for (var y = 0; y < h().gridH(); y++) for (var x = 0; x < h().gridW(); x++) T.setCell(x, y, T.selChar);
          if (typeof T.renderPreviews === "function") T.renderPreviews();
          TLDBG.toast("filled " + h().gridW() + "x" + h().gridH());
        } },
      { id: "clearGrid", label: "Clear the grid",
        doc: "Pushes undo, then blanks every cell back to '.'.",
        run: function () {
          var T = h(); T.pushUndo();
          for (var y = 0; y < h().gridH(); y++) for (var x = 0; x < h().gridW(); x++) T.setCell(x, y, ".");
          if (typeof T.renderPreviews === "function") T.renderPreviews();
          TLDBG.toast("grid cleared");
        } },
      { id: "undo", label: "Undo last edit",
        doc: "undo(): pops the editor's own undo stack.",
        run: function () { h().undo(); TLDBG.toast("undo depth " + (h().undoStack ? h().undoStack.length : 0)) } },
      { id: "resizeDefault", label: "Resize grid to M preset",
        doc: "Writes MODEL.sizes.M into #szW/#szH and applies it like the Apply Size button.",
        run: function () {
          var T = h(), s = M().sizes ? M().sizes.M : [46, 32];
          var w = document.getElementById("szW"), hh = document.getElementById("szH");
          if (w) w.value = s[0]; if (hh) hh.value = s[1];
          var b = document.getElementById("btnResize"); if (b) b.click();
          TLDBG.toast("grid " + h().gridW() + "x" + h().gridH());
        } },
      { id: "loadDefaults", label: "Reload built-in defaults",
        doc: "loadTank/loadPal/loadBal/loadStr/loadSizes restore the shipped model into the editor.",
        run: function () {
          var T = h();
          ["loadTank", "loadPal", "loadBal", "loadStr", "loadSizes"].forEach(function (f) { if (typeof T[f] === "function") T[f]() });
          if (typeof T.rebuild === "function") T.rebuild();
          TLDBG.toast("defaults loaded");
        } },
      { id: "regenExports", label: "Regenerate export panes",
        doc: "regenExports(): rebuilds the tank/pal/bal/str export textareas from the current model.",
        run: function () { h().regenExports(); TLDBG.toast("exports regenerated") } },
      { id: "rebuildUi", label: "Rebuild editor UI",
        doc: "The page's own __tlRebuild(): sheet, palette tabs, swatches, balance fields, string list.",
        run: function () { h().rebuild(); TLDBG.toast("UI rebuilt") } },
      { id: "resetAll", label: "Reset everything to defaults",
        doc: "resetAll() directly (the toolbar button asks for confirmation; this skips the dialog).",
        run: function () { h().resetAll(); TLDBG.toast("reset to defaults") } }
    ],

    hooks: [
      { label: "Console: tank sprite", doc: "The sprite rows as painted, one string per row, plus the fill count.",
        run: function () {
          console.log({ grid: h().gridW() + "x" + h().gridH(), filled: filled(), rows: M().tank.slice() });
        } },
      { label: "Console: palette", doc: "Every palette entry with its colours, and the shipped defaults for comparison.",
        run: function () {
          console.log({ model: JSON.parse(JSON.stringify(M().pal)), defaults: JSON.parse(JSON.stringify(h().DEF_PAL)) });
        } },
      { label: "Console: balance model", doc: "The full MODEL.bal object, the shipped DEF_BAL, and the keys that differ.",
        run: function () {
          var T = h();
          console.log({ model: JSON.parse(JSON.stringify(M().bal)), defaults: JSON.parse(JSON.stringify(T.DEF_BAL)) });
          console.log({ differs: (function () {
            var d = T.DEF_BAL, b = M().bal, out = [];
            for (var k in d) {
              if (typeof d[k] === "number") { if (d[k] !== b[k]) out.push(k); }
              else if (d[k] && typeof d[k] === "object") { for (var k2 in d[k]) { if (typeof d[k][k2] === "number" && b[k] && d[k][k2] !== b[k][k2]) out.push(k + "." + k2) } }
            }
            return out;
          })() });
        } },
      { label: "Console: strings and sizes", doc: "String table size and the size presets, plus how many strings the shipped table has.",
        run: function () {
          var T = h();
          console.log({ sizes: M().sizes ? JSON.parse(JSON.stringify(M().sizes)) : null,
            defSizes: JSON.parse(JSON.stringify(T.DEF_SIZES)),
            strings: M().str ? Object.keys(M().str).length : 0,
            defStrings: Object.keys(T.DEF_STR).length,
            missingFromModel: Object.keys(T.DEF_STR).filter(function (k) { return !M().str || M().str[k] === undefined }) });
        } },
      { label: "Console: editor state", doc: "Tool, brush, mirror, undo depth, animation ticker, preview direction and sprite sheet frames.",
        run: function () {
          var T = h();
          console.log({ tool: T.tool, selChar: T.selChar, mirror: T.mirror, painting: T.painting,
            undoDepth: T.undoStack ? T.undoStack.length : 0, undoTop: T.undoStack && T.undoStack.length ? T.undoStack[T.undoStack.length - 1] : null,
            CELL: T.CELL, animFrame: T.animFrame, previewDir: T.previewDir,
            sheetFrames: T.sheetCvs ? T.sheetCvs.length : 0,
            sheetSizes: T.sheetCvs ? T.sheetCvs.map(function (c) { return c.width + "x" + c.height }) : [],
            gridCanvas: (function () { var c = document.getElementById("gridCv"); return c ? c.width + "x" + c.height : "none" })(),
            activePane: (function () { var on = [...document.querySelectorAll(".pane.on")]; return on.map(function (p) { return p.id }) })() });
        } }
    ],

    layout: [
      { sel: "#gridCv", label: "Sprite grid canvas" },
      { sel: "#animCv", label: "Tread animation preview" },
      { sel: "#sheet", label: "Exported sprite sheet preview" },
      { sel: "#tlHost", label: "Harness host mount" },
      { sel: "#pane-tank", label: "Sprite pane" },
      { sel: "#pane-pal", label: "Palette pane" },
      { sel: "#pane-bal", label: "Balance pane" },
      { sel: "#pane-str", label: "Strings pane" },
      { sel: "#tankIn", label: "Tank import textarea" },
      { sel: "#tankOut", label: "Tank export textarea" },
      { sel: "#palIn", label: "Palette import textarea" },
      { sel: "#palOut", label: "Palette export textarea" },
      { sel: "#palSel", label: "Palette selector" },
      { sel: "#palList", label: "Palette list" },
      { sel: "#balIn", label: "Balance import textarea" },
      { sel: "#balOut", label: "Balance export textarea" },
      { sel: "#balFields", label: "Balance field list" },
      { sel: "#strIn", label: "Strings import textarea" },
      { sel: "#strOut", label: "Strings export textarea" },
      { sel: "#strList", label: "Strings list" },
      { sel: "#strFilter", label: "String filter input" },
      { sel: "#sizesList", label: "Size preset list" },
      { sel: "#szW", label: "Grid width input" },
      { sel: "#szH", label: "Grid height input" },
      { sel: "#swl", label: "Swatch strip" },
      { sel: "#btnMirror", label: "Mirror toggle" },
      { sel: "#btnUndo", label: "Undo button" },
      { sel: "#btnClear", label: "Clear button" },
      { sel: "#btnResize", label: "Apply size button" },
      { sel: "#btnAddPal", label: "Add palette button" },
      { sel: "#btnAddSize", label: "Add size button" },
      { sel: "#btnAddStr", label: "Add string button" },
      { sel: "#btnPalLoad", label: "Load palette button" },
      { sel: "#btnBalLoad", label: "Load balance button" },
      { sel: "#btnStrLoad", label: "Load strings button" },
      { sel: "#btnTankLoad", label: "Load tank button" },
      { sel: "#btnExtract", label: "Extract from game button" },
      { sel: "#btnCopyAll", label: "Copy all exports button" },
      { sel: "#btnResetAll", label: "Reset to defaults button" },
      { sel: "#btnHome", label: "Home link" },
      { sel: "#extractStatus", label: "Extract status line" },
      { sel: "#fullSrc", label: "Full source view" },
      { sel: "#workNote", label: "Working note" },
      { sel: "#noteTank", label: "Sprite pane note" },
      { sel: "#notePal", label: "Palette pane note" },
      { sel: "#noteStr", label: "Strings pane note" },
      { sel: "#toast", label: "Toast" },
      { sel: ".pane", label: "Panes" },
      { sel: ".cols", label: "Column layout" },
      { sel: ".colMain", label: "Main column" },
      { sel: ".colSide", label: "Side column" },
      { sel: ".grid", label: "Grid wrapper" },
      { sel: ".dirs", label: "Direction selector" },
      { sel: ".animrow", label: "Animation preview row" },
      { sel: ".btn", label: "Buttons" },
      { sel: ".btnrow", label: "Button rows" },
      { sel: ".codewrap", label: "Code/export wrappers" },
      { sel: ".gImport", label: "Import groups" },
      { sel: ".hazard", label: "Hazard stripe" },
      { sel: ".hst", label: "Stencil headings" },
      { sel: ".on", label: "Active pane/tool state" },
      { sel: ".hidden", label: "Hidden element hook" }
    ],

    control: [
      { id: "tool", label: "Switch the editor tool", args: '"paint" | "erase" | "pick" | …', argDefault: "paint",
        doc: "setTool(...) — the same toolbar paths: paint writes the brush char, erase clears, pick reads the cell under the cursor.",
        run: function (t) { var T = h(); T.setTool(String(t || "paint")); return { tool: T.tool, brushChar: T.selChar, mirror: !!T.mirror }; } },
      { id: "brush", label: "Set the brush character", args: "palette char (a colour key or blank)", argDefault: "1",
        doc: "Writes selChar — what paint drops into a cell. Palette keys come from MODEL.pal.",
        run: function (c) { var T = h(); T.selChar = Array.isArray(c) ? String(c[0]) : String(c === undefined ? "" : c); return { brushChar: T.selChar, palette: T.MODEL.pal ? Object.keys(T.MODEL.pal) : [] }; } },
      { id: "paint", label: "Paint one cell", args: "[x, y, char] — char optional (uses brush)", argDefault: "[3, 3, \"1\"]",
        doc: "setCell(x, y, char) writes the sprite grid directly, honouring mirror mode, then redraws the grid.",
        run: function (a) {
          var T = h();
          if (!Array.isArray(a)) return "want [x, y, char]";
          var ch = a[2] === undefined ? T.selChar : String(a[2]);
          T.setCell(Number(a[0]), Number(a[1]), ch); T.drawGrid();
          return { grid: T.gridW() + "x" + T.gridH(), at: [Number(a[0]), Number(a[1])], char: ch, mirror: !!T.mirror, filled: filled() };
        } },
      { id: "rows", label: "Replace the sprite from rows", args: "array of strings, one per row", argDefault: "[\"..11..\",\"..11..\"]",
        doc: "Writes MODEL.tank row by row — paste a whole sprite design at once instead of painting cells, then rebuild the sheet.",
        run: function (rows) {
          var T = h(), M = T.MODEL;
          if (!Array.isArray(rows) || typeof rows[0] !== "string") return "want an array of row strings";
          if (!M.tank || M.tank.length !== rows.length) {
            if (typeof T.setGrid === "function") T.setGrid(rows); else M.tank = rows.map(function (r) { return r.split("") });
          } else rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) T.setCell(x, y, r[x]); });
          T.drawGrid(); if (typeof T.rebuild === "function") T.rebuild();
          return { grid: T.gridW() + "x" + T.gridH(), rows: M.tank.length, cols: M.tank[0] ? M.tank[0].length : 0, filled: filled() };
        } },
      { id: "balance", label: "Edit a balance value", args: '["key", value] in MODEL.bal', argDefault: '["speed", 1.2]',
        doc: "MODEL.bal holds the tank's gameplay numbers (the exported JSON). Writes go straight into the live model; DEF_BAL is the shipped default for comparison.",
        run: function (a) {
          var M = h().MODEL;
          if (!Array.isArray(a)) return 'want ["key", value]';
          var k = String(a[0]);
          if (!(k in M.bal)) return "no balance key " + k + " — available: " + Object.keys(M.bal).join(", ");
          M.bal[k] = Number(a[1]);
          if (typeof h().regenExports === "function") h().regenExports();
          return { key: k, value: M.bal[k], default: h().DEF_BAL[k] };
        } },
      { id: "load", label: "Load a preset tank", args: "index into MODEL.tank presets or a name", argDefault: 0,
        doc: "loadTank(...) restores a shipped design — its grid, palette and balance — so you can diff an edit against the original.",
        run: function (arg) {
          var T = h();
          if (typeof T.loadTank === "function") T.loadTank(typeof arg === "number" || (typeof arg === "string" && /^\\d+$/.test(arg)) ? +arg : String(arg === undefined ? 0 : arg));
          var M = T.MODEL;
          return { rows: M.tank.length, cols: M.tank[0] ? M.tank[0].length : 0, filled: filled(), balKeys: Object.keys(M.bal).length };
        } },
      { id: "text", label: "Import from the text box", args: "unused — reads the page's textarea",
        doc: "parseText() re-reads the editor's own text area into the model, the same path the Import button uses.",
        run: function () {
          var T = h();
          if (typeof T.parseText === "function") T.parseText();
          if (typeof T.regenExports === "function") T.regenExports();
          var M = T.MODEL;
          return { rows: M.tank.length, cols: M.tank[0] ? M.tank[0].length : 0, filled: filled(), undoDepth: T.undoStack ? T.undoStack.length : 0 };
        } },
      { id: "undo", label: "Undo the last edit", args: "unused", doc: "undo() pops the editor's undo stack — every paint writes one entry.",
        run: function () { var T = h(); T.undo(); T.drawGrid(); return { undoDepth: T.undoStack ? T.undoStack.length : 0, filled: filled() }; } },
      { id: "probe", label: "Read the editor state", args: "unused",
        doc: "Tool, brush char, mirror and painting flags, grid size and filled count, undo depth, cell pixel size, animation frame and preview direction, sprite-sheet frame count, palette keys, size presets, balance keys and how they differ from the shipped defaults.",
        run: function () {
          var T = h(), M = T.MODEL;
          return { tool: T.tool, brushChar: T.selChar, mirror: !!T.mirror, painting: !!T.painting,
            grid: T.gridW() + "x" + T.gridH(), filled: filled(), undoDepth: T.undoStack ? T.undoStack.length : 0,
            cellPixels: T.CELL, animFrame: T.animFrame, previewDir: T.previewDir, spriteFrames: T.sheetCvs ? T.sheetCvs.length : 0,
            palette: M.pal ? Object.keys(M.pal) : [], sizePresets: M.sizes ? Object.keys(M.sizes) : [],
            balKeys: M.bal ? Object.keys(M.bal) : [], strings: M.str ? Object.keys(M.str).length : 0,
            tankRows: M.tank ? M.tank.length : 0, tankCols: M.tank && M.tank[0] ? M.tank[0].length : 0 };
        } },
      { id: "dump", label: "Print the sprite grid to the console", args: "unused",
        doc: "Logs the grid as text rows plus the filled count — the diffable form for comparing an edited sprite against its export.",
        run: function () {
          var T = h(), M = T.MODEL;
          console.log("grid " + T.gridW() + "x" + T.gridH(), "filled", filled());
          console.log((M.tank || []).map(function (r) { return r.join("") }).join("\n"));
          return { rows: M.tank ? M.tank.length : 0, filled: filled() };
        } }
    ],

    recipes: [
      { label: "Symmetric sprite: paint a shape and mirror it",
        doc: "Turns mirror on, paints a diagonal stroke, and prints the resulting grid — checks the mirror axis lines up with the sprite centre.",
        js: 'var T = window.TLHOOK, M = T.MODEL;\nT.setTool("paint"); T.mirror = true; T.selChar = "1";\nfor (var i = 0; i < Math.min(6, T.gridW()); i++) T.setCell(i, i, "1");\nT.drawGrid();\nconsole.log((M.tank || []).map(function (r) { return r.join("") }).join("\\n"));' },
      { label: "Default-versus-current balance diff",
        doc: "Prints every balance key whose live value differs from the shipped default — the delta an LLM needs to make the tuning permanent.",
        js: 'var T = window.TLHOOK, d = T.DEF_BAL, b = T.MODEL.bal, out = [];\nObject.keys(b).forEach(function (k) {\n  if (typeof b[k] === "number" && b[k] !== d[k]) out.push({ key: k, current: b[k], shippedDefault: d[k] });\n});\nconsole.table(out);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live editor (tool, brush, grid contents, palette, balance model, undo depth, animation ticker). BALANCE edits CELL, preview direction and the numeric fields of MODEL.bal. CHEATS drives the editor itself. LAYOUT resizes and repositions the grid canvas, preview, export panes and toolbars per pane. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "Bridge", text: "tanks_editor.html wraps the editor in a strict IIFE. Its last block publishes window.TLHOOK: MODEL, DEF_BAL, DEF_PAL, DEF_SIZES, DEF_STR, CELL, tool, selChar, mirror, painting, undoStack, animFrame, previewDir, sheetCvs, gridW, gridH, setCell, cellFromEvent, setTool, pushUndo, undo, drawGrid, sizeGridCanvas, buildSheet, buildPalTab, buildPalSelect, buildSwatches, buildBalTab, renderPreviews, drawAnim, drawPalMinis, renderValue, renderStrList, regenExports, parseText, loadTank, loadPal, loadBal, loadStr, loadSizes, tryImport, resetAll, toast. No editor logic runs in that block." },
      { topic: "MODEL is the document", text: "MODEL holds the tank sprite rows, palette map, balance object, string table and size presets. Editing MODEL.bal here changes what the export panes produce — paste that into tanks.html (or use its extract flow) to move tuning into the game." },
      { topic: "No simulation to freeze", text: "This page has no physics loop: the only ticker is the 160 ms tread-animation interval. 'Pause tread animation' wraps drawAnim() so the preview stops repainting; every other cheat runs an editor action once (fill, clear, undo, resize, reset)." },
      { topic: "Undo stack", text: "setCell() and the fill/clear cheats push snapshots through pushUndo(), so CHEATS: undo restores the previous grid. The undo depth is shown in STATE." },
      { topic: "Reset without dialogs", text: "The toolbar's Reset To Defaults asks for confirmation; the cheat calls resetAll() directly, which replaces the whole model with the shipped defaults." },
      { topic: "Not reachable", text: "Canvas buffers for the sheet, swatches and previews stay private DOM objects; the editor's file-import plumbing (FileReader paths) is not driven here. Model contents, editor state and export text are all visible through the hooks." }
    ]
  });
})();
