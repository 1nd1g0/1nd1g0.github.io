/* dbg/bullethell.js — developer harness for bullethell.html
 *
 * Load with:  bullethell.html?debug=dbg/bullethell.js
 * bullethell.html keeps its game in a plain top-level <script>, so these
 * functions/variables are reachable directly: hitPlayer, doBomb, nextWave,
 * startBoss, gameOver, applyUpgrade, UPG, P, D, DIFFS, bullets, enemies.
 * No page bridge is needed and the page behaves identically without ?debug.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  /* Freeze / slow motion wrap the game's own updatePlay: loop() calls it by
     name, so a thinner-dt or no-op version takes effect, and the restore
     installs the original function back. */
  var realUpdate = null;
  function wrap(scale) {
    if (!realUpdate) realUpdate = window.updatePlay;
    if (scale === null) { window.updatePlay = realUpdate; return; }
    window.updatePlay = function (dt) { realUpdate(dt * scale) };
  }

  var realHit = null;
  function setGod(v) {
    if (v) { if (!realHit) realHit = window.hitPlayer; window.hitPlayer = function () { }; }
    else if (realHit) { window.hitPlayer = realHit; }
    if (typeof P !== "undefined" && P) { if (v) P.inv = 9e9; else if (P.inv > 1e8) P.inv = 0; }
  }

  function num(x, r) { return typeof x === "number" ? Math.round(x * (r || 100)) / (r || 100) : 0 }

  /* Difficulty is a const table plus a mutable `D` pointing at one row. Editing
     means publishing a modified copy of that row, which is what the game itself
     does in resetRun(). */
  function diffGet(k) { return typeof D !== "undefined" && D ? D[k] : 1 }
  function diffSet(k, v) {
    if (typeof D === "undefined" || !D) return;
    var copy = {}; for (var p in D) copy[p] = D[p];
    copy[k] = v; D = copy;
  }

  TLDBG.register({
    game: "bullethell", file: "bullethell.html",

    state: function () {
      return {
        phase: state, difficulty: diffKey, seed: seedTxt,
        wave: wave, waveProgress: num(waveDur ? waveT / waveDur : 0, 100),
        runTime: num(runTime, 10), score: score, hiscore: hiscore,
        multiplier: num(mult, 10), graze: graze, power: power, bombsFragments: bombFrag,
        boons: boons, lives: P ? P.lives : 0, bombs: P ? P.bombs : 0,
        playerX: P ? num(P.x) : 0, playerY: P ? num(P.y) : 0,
        invuln: P ? num(P.inv) : 0, dead: P ? num(P.dead) : 0,
        enemyCount: enemies ? enemies.length : 0,
        enemyBulletCount: bullets ? bullets.length : 0,
        ownShotCount: shots ? shots.length : 0,
        pendingSpawns: spawnQ ? spawnQ.length : 0,
        boss: boss ? (boss.name || "boss") : null,
        timeScale: num(timeScale, 100), focusing: focusing(),
        renderQuality: quality, particles: parts ? parts.length : 0
      };
    },

    params: [
      { id: "spdMul", label: "Ship speed multiplier", unit: "x", min: 0.2, max: 4, step: 0.05,
        get: function () { return P && P.spdMul != null ? P.spdMul : 1 },
        set: function (v) { P.spdMul = v },
        code: { file: "bullethell.html", line: 1257, name: "P.spdMul" },
        doc: "Base speed is 265 px/s, or 112 px/s while focusing. Boons add +0.12 (speed) and +0.05 (ascending)." },
      { id: "dmgMul", label: "Damage multiplier", unit: "x", min: 0.2, max: 8, step: 0.1,
        get: function () { return P && P.dmgMul != null ? P.dmgMul : 1 },
        set: function (v) { P.dmgMul = v },
        code: { file: "bullethell.html", line: 1257, name: "P.dmgMul" },
        doc: "Multiplies every shot's damage. The game also scales damage by power (1 + power/160) and by focus (+35% per focus level)." },
      { id: "grazeMul", label: "Graze radius multiplier", unit: "x", min: 0.5, max: 6, step: 0.1,
        get: function () { return P && P.grazeMul != null ? P.grazeMul : 1 },
        set: function (v) { P.grazeMul = v },
        code: { file: "bullethell.html", line: 1257, name: "P.grazeMul" },
        doc: "Graze ring is 15 px times this. Grazing bullets scores without being hit; graze boons multiply it by 1.4 each." },
      { id: "lives", label: "Lives", unit: "lives", min: 0, max: 12, step: 1,
        get: function () { return P && P.lives != null ? P.lives : 3 },
        set: function (v) { P.lives = v },
        code: { file: "bullethell.html", line: 1256, name: "P.lives" },
        doc: "Going below 0 triggers the death path (death-bomb boon may spend one bomb to survive first)." },
      { id: "bombs", label: "Bombs", unit: "bombs", min: 0, max: 12, step: 1,
        get: function () { return P && P.bombs != null ? P.bombs : 3 },
        set: function (v) { P.bombs = v },
        code: { file: "bullethell.html", line: 1256, name: "P.bombs" },
        doc: "Bomb stock. Each bomb erases bullets, grants 1.5 s of invulnerability and costs 0.55 s of bomb animation." },
      { id: "power", label: "Power meter", unit: "points", min: 0, max: 400, step: 5,
        get: function () { return power },
        set: function (v) { power = v },
        code: { file: "bullethell.html", line: 1206, name: "power" },
        doc: "Shot damage scales with 1 + power/160; extra shot streams unlock at 40 and 80. Getting hit loses 25." },
      { id: "mult", label: "Score multiplier", unit: "x", min: 1, max: 20, step: 0.1,
        get: function () { return mult },
        set: function (v) { mult = v; if (v > maxMult) maxMult = v },
        code: { file: "bullethell.html", line: 1206, name: "mult" },
        doc: "Current multiplier; a hit resets it to 1. maxMult is the best value of the run and is what the score panel prints." },
      { id: "diffHp", label: "Difficulty: enemy HP", unit: "x", min: 0.3, max: 4, step: 0.05,
        get: function () { return diffGet("hp") },
        set: function (v) { diffSet("hp", v) },
        code: { file: "bullethell.html", line: 1204, name: "D.hp (DIFFS[diffKey])" },
        doc: "Enemy hit points for the chosen difficulty (easy .75, normal 1, hard 1.35, lunatic higher). Editing `D` changes the live run; the title-screen chips would overwrite it on the next start." },
      { id: "diffSpd", label: "Difficulty: enemy speed", unit: "x", min: 0.3, max: 4, step: 0.05,
        get: function () { return diffGet("spd") },
        set: function (v) { diffSet("spd", v) },
        code: { file: "bullethell.html", line: 1204, name: "D.spd" },
        doc: "Enemy and bullet movement scale for the chosen difficulty." },
      { id: "diffDen", label: "Difficulty: bullet density", unit: "x", min: 0.2, max: 4, step: 0.05,
        get: function () { return diffGet("den") },
        set: function (v) { diffSet("den", v) },
        code: { file: "bullethell.html", line: 1204, name: "D.den" },
        doc: "How many bullets the procedural waves fire. The safest knob for testing readability of a spell." },
      { id: "tempo", label: "Music tempo", unit: "BPM", min: 40, max: 300, step: 1,
        get: function () { return mTempo },
        set: function (v) { mTempo = v },
        code: { file: "bullethell.html", line: 702, name: "mTempo" },
        doc: "The procedural score (bass, pad, lead) steps at this tempo. Music must be ON for it to advance." },
      { id: "quality", label: "Render quality", unit: "level 0/1/2", min: 0, max: 2, step: 1,
        get: function () { return quality },
        set: function (v) { quality = Math.max(0, Math.min(2, Math.round(v))); if (typeof resize === "function") resize() },
        code: { file: "bullethell.html", line: 604, name: "quality / qRes" },
        doc: "0 = full resolution, 1 = 0.85, 2 = 0.7 of the device pixel ratio; the same row also caps particles (340/200/110) and bullets (1000/860/700)." },
      { id: "timeScale", label: "Hit-stop time scale", unit: "x", min: 0.05, max: 1, step: 0.05,
        get: function () { return timeScale },
        set: function (v) { timeScale = v },
        code: { file: "bullethell.html", line: 1210, name: "timeScale" },
        doc: "The game eases this back to 1 every frame (loop line 2813), so a manual value is a transient hit-stop. For a steady slow motion use CHEATS: slow motion." },
      { id: "hitRadius", label: "Hit radius", unit: "px", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return HITR },
        code: { file: "bullethell.html", line: 581, name: "HITR" },
        doc: "Read-only: 2.5 px core hit radius, declared as a const at the top of the script. Bullets hit you only when their centre is this close." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "updatePlay becomes a no-op: bullets, enemies and the spawn queue stop, the frame still renders. Off restores the original function.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.35", toggle: true,
        doc: "Every gameplay update receives 0.35 of the frame delta, so you can read a spell frame by frame.",
        on: function (v) { wrap(v ? 0.35 : null) } },
      { id: "god", label: "God mode", toggle: true,
        doc: "hitPlayer becomes a no-op and invulnerability is pinned. Lives, multiplier and power stop dropping.",
        on: function (v) { setGod(v) } },
      { id: "refill", label: "Refill lives and bombs",
        doc: "Sets lives and bombs to 9 without touching the multiplier, for long test runs.",
        run: function () { P.lives = 9; P.bombs = 9; TLDBG.toast("lives and bombs 9"); } },
      { id: "clearBullets", label: "Erase all enemy bullets",
        doc: "Empties the bullet array (the bomb effect does the same plus a screen flash).",
        run: function () { bullets.length = 0; TLDBG.toast("bullets cleared"); } },
      { id: "clearEnemies", label: "Kill all enemies",
        doc: "Empties the enemy list without awarding score, so the wave drains to the intermission.",
        run: function () { enemies.length = 0; TLDBG.toast("enemies cleared"); } },
      { id: "bombNow", label: "Fire a bomb",
        doc: "Calls the game's doBomb(), which clears bullets, flashes the screen and grants 1.5 s of invulnerability.",
        run: function () { window.doBomb(); TLDBG.toast("bomb fired"); } },
      { id: "nextWave", label: "Advance to next wave",
        doc: "Runs nextWave(): the procedural generator builds the wave for the current seed and difficulty.",
        run: function () { window.nextWave(); TLDBG.toast("wave " + wave); } },
      { id: "bossNow", label: "Start boss fight",
        doc: "Calls startBoss() immediately — the fastest way to reach a boss pattern you are tuning.",
        run: function () { window.startBoss(); TLDBG.toast("boss started"); } },
      { id: "maxPower", label: "Power to 160",
        doc: "Sets the power meter to the value where the damage formula doubles, and all extra shot streams are unlocked.",
        run: function () { power = 160; TLDBG.toast("power 160"); } },
      { id: "allBoons", label: "Give every permanent boon",
        doc: "Applies each non-consumable upgrade in UPG through the game's own applyUpgrade, so counters, damage and shot layout are set the way the reward screen sets them.",
        run: function () {
          UPG.forEach(function (u) { if (!u.consumable && upLvl(u.id) < u.max) window.applyUpgrade(u) });
          TLDBG.toast("boons applied: " + boons);
        } },
      { id: "focusLock", label: "Lock focus mode", toggle: true,
        doc: "Sets focusingFlag, so the ship moves at focus speed and the shot spread narrows without holding Shift.",
        on: function (v) { focusingFlag = v } },
      { id: "closeUpgrade", label: "Dismiss the upgrade panel",
        doc: "For use when the reward overlay is up: returns to play and hides the panel, without choosing a boon.",
        run: function () {
          state = "play"; if (typeof $ === "function") { var el = $("ovUpgrade"); if (el) el.classList.add("hide"); }
          TLDBG.toast("upgrade panel closed");
        } },
      { id: "forceOver", label: "Force game over",
        doc: "Calls the real gameOver(): the results panel fills from the live run and hiscore updates like in normal play.",
        run: function () { if (typeof window.gameOver === "function") window.gameOver(); TLDBG.toast("game over"); } }
    ],

    hooks: [
      { label: "Console: enemies", doc: "Every live enemy: kind, position, hp/max hp, speed, fire delay, phase and age.",
        run: function () {
          console.table(enemies.map(function (e) {
            return { kind: e.kind, x: num(e.x), y: num(e.y), hp: num(e.hp, 1), maxHp: num(e.mhp, 1),
              spd: num(e.spd), fireDelay: num(e.ft, 10), phase: e.ph, age: num(e.t, 10), flash: num(e.flash, 10) };
          }));
        } },
      { label: "Console: bullet census", doc: "Counts of enemy bullets, your shots, pickups and particles, plus the fastest enemy bullet (bullets carry angle + speed, not vx/vy).",
        run: function () {
          var max = 0, i;
          for (i = 0; i < bullets.length; i++) if (bullets[i].spd > max) max = bullets[i].spd;
          console.log("enemy bullets " + bullets.length + " | your shots " + shots.length +
            " | items " + items.length + " | particles " + parts.length + " | texts " + texts.length +
            " | fastest bullet " + num(max) + " px/s | pending spawns " + spawnQ.length +
            " | cap " + (typeof BCAP === "function" ? BCAP() : "-"));
        } },
      { label: "Console: owned boons", doc: "Every upgrade level you own, with its display name and max, from UPG and P.up.",
        run: function () {
          console.table(UPG.map(function (u) {
            return { id: u.id, name: u.n, level: upLvl(u.id), max: u.max, consumable: !!u.consumable, glyph: u.g };
          }).filter(function (r) { return r.level > 0 }));
        } },
      { label: "Console: pending spawns", doc: "The spawn queue for the current wave: scheduled time and what each entry does.",
        run: function () {
          console.table(spawnQ.map(function (s) {
            return { at: num(s.t, 10), waveTime: num(waveT, 10), fn: s.f ? String(s.f).slice(0, 70) : "-" };
          }));
        } },
      { label: "Console: run summary", doc: "One object with seed, difficulty, wave, score, multiplier, power, boons and the effective D row.",
        run: function () {
          console.log({ seed: seedTxt, difficulty: diffKey, D: D, wave: wave, runTime: num(runTime, 10),
            score: score, hiscore: hiscore, mult: num(mult, 10), graze: graze, power: power,
            boons: boons, lives: P.lives, bombs: P.bombs, spdMul: num(P.spdMul), dmgMul: num(P.dmgMul) });
        } }
    ],

    layout: [
      { sel: "#frame", label: "Game frame (canvas + buttons)" },
      { sel: "#game", label: "Canvas 480x720" },
      { sel: "#btnPause", label: "Pause button" },
      { sel: "#btnFocus", label: "FOCUS touch button" },
      { sel: "#btnBomb", label: "BOMB touch button" },
      { sel: ".tbtn", label: "Both touch action buttons" },
      { sel: "#ovTitle", label: "Title screen overlay" },
      { sel: "#ovTitle .panel", label: "Title panel" },
      { sel: "#ovTitle .kanji", label: "Title kanji mark" },
      { sel: "#ovTitle .eyebrow", label: "Title eyebrow line" },
      { sel: "#ovTitle .flavor", label: "Title flavour paragraph" },
      { sel: "#ovTitle .row", label: "Title option rows" },
      { sel: "#ovTitle .lbl", label: "Row labels (DIFFICULTY, SEED, PASSWORD)" },
      { sel: "#ovTitle .chip", label: "Difficulty chips" },
      { sel: "#seedVal", label: "Seed readout" },
      { sel: "#pwBox", label: "Password box (title)" },
      { sel: "#btnStart", label: "Begin the Night button" },
      { sel: ".btn.ghost", label: "Secondary buttons (Home, Fullscreen, Resume...)" },
      { sel: "#ovTitle .ctls", label: "Controls help block" },
      { sel: "#ovTitle .hiline", label: "Best-score footer line" },
      { sel: "#hiTitle", label: "Best score value on title" },
      { sel: "#ovUpgrade", label: "Boon choice overlay" },
      { sel: "#ovUpgrade .panel", label: "Boon panel" },
      { sel: "#cards", label: "Three boon cards container" },
      { sel: "#upgSub", label: "Boon panel subtitle" },
      { sel: "#ovUpgrade .hint", label: "Boon hotkey hint" },
      { sel: "#ovPause", label: "Pause overlay" },
      { sel: "#pauseInfo", label: "Pause hint line" },
      { sel: "#pwPauseBox", label: "Password box (pause)" },
      { sel: "#ovOver", label: "Game over overlay" },
      { sel: "#ovOver .panel", label: "Game over panel" },
      { sel: "#newRec", label: "New best score banner" },
      { sel: "#ovOver dl", label: "Run statistics list" },
      { sel: "#ovOver dt", label: "Statistic names" },
      { sel: "#ovOver dd", label: "Statistic values" }
    ],

    control: [
      { id: "start", label: "Start the run", args: '"easy" | "normal" | "hard" | "lunatic"', argDefault: "normal",
        doc: "setDiff(name) then resetRun(seedTxt, name) — the same path #btnStart uses, so the wave director and upgrade pool are rebuilt.",
        run: function (d) {
          var name = String(d || "normal");
          if (!DIFFS[name]) return "unknown difficulty " + name;
          setDiff(name); resetRun(seedTxt, name);
          return { phase: state, difficulty: diffKey, wave: wave, lives: P ? P.lives : 0 };
        } },
      { id: "diffRow", label: "Edit a difficulty row", args: '["easy"|"normal"|"hard"|"lunatic", "hp"|"spd"|"den"|"lifeBias", value]', argDefault: '["normal", "den", 1.6]',
        doc: "DIFFS rows: enemy HP multiplier, speed multiplier, bullet density and life-drop bias. Editing the row changes every wave spawned after it.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [difficulty, field, value]";
          var row = DIFFS[String(a[0])]; if (!row) return "unknown difficulty " + a[0];
          var f = String(a[1]); if (!(f in row)) return "no field " + f;
          row[f] = Number(a[2]);
          return { difficulty: String(a[0]), field: f, value: row[f], active: diffKey === String(a[0]) };
        } },
      { id: "wave", label: "Force the next wave", args: "unused",
        doc: "nextWave() — advances the director, re-rolls the pattern and the spawn queue.",
        run: function () { nextWave(); return { wave: wave, pendingSpawns: spawnQ ? spawnQ.length : 0, enemies: enemies ? enemies.length : 0 }; } },
      { id: "boss", label: "Start the boss", args: "unused",
        doc: "startBoss() — the boss fight begins immediately, whatever the wave state.",
        run: function () { startBoss(); return { boss: boss ? (boss.name || "boss") : null, hp: boss ? num(boss.hp, 1) : 0 }; } },
      { id: "flyTo", label: "Move the ship", args: "[x, y] pixels", argDefault: "[400, 300]",
        doc: "Writes P.x / P.y directly — park the ship inside a bullet pattern to test hit radius or graze counting.",
        run: function (a) { if (!Array.isArray(a)) return "want [x, y]"; if (!P) return "no ship yet"; P.x = Number(a[0]); P.y = Number(a[1]); return { pos: [num(P.x, 1), num(P.y, 1)], inv: num(P.inv, 10), focusing: focusing() }; } },
      { id: "pressKey", label: "Hold or release a key", args: '"ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Space" | "ShiftLeft" | "release"', argDefault: "Space",
        doc: "Writes the page's own keys{} map (keyed by KeyboardEvent.code) — auto-fire stays off, so holding Space keeps shooting; ShiftLeft is the focus mode.",
        run: function (k) {
          var name = String(k || "release");
          if (name === "release") { keys.ArrowLeft = keys.ArrowRight = keys.ArrowUp = keys.ArrowDown = keys.Space = false; return "keys released"; }
          keys[name] = !keys[name];
          return { keys: Object.keys(keys).filter(function (c) { return keys[c] }), focusing: focusing() };
        } },
      { id: "upgrade", label: "Apply an upgrade card", args: "index into UPG", argDefault: 0,
        doc: "applyUpgrade(UPG[i]) through the page's own upgrade path — the same function the pick card calls.",
        run: function (i) {
          var u = UPG[+i || 0]; if (!u) return "no upgrade " + i;
          applyUpgrade(u);
          return { upgrade: u.name || u.id || String(i), power: power, boons: boons, spread: P ? P.spread : null };
        } },
      { id: "probe", label: "Read the run", args: "unused",
        doc: "Phase, difficulty, seed, wave progress, score/multiplier/graze, power, bombs, ship position, enemy/bullet/shot counts, pending spawns, boss, time scale and quality.",
        run: function () {
          return { phase: state, difficulty: diffKey, seed: seedTxt, wave: wave,
            waveProgress: num(waveDur ? waveT / waveDur : 0, 100), runTime: num(runTime, 10),
            score: score, multiplier: num(mult, 10), graze: graze, power: power, bombFragments: bombFrag, boons: boons,
            ship: P ? { x: num(P.x, 1), y: num(P.y, 1), lives: P.lives, bombs: P.bombs, inv: num(P.inv, 10), dead: num(P.dead, 10) } : null,
            enemies: enemies ? enemies.length : 0, enemyBullets: bullets ? bullets.length : 0, ownShots: shots ? shots.length : 0,
            pendingSpawns: spawnQ ? spawnQ.length : 0, boss: boss ? (boss.name || "boss") : null,
            focusing: focusing(), timeScale: num(timeScale, 100), quality: quality };
        } },
      { id: "watch", label: "Log the run every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Wave, enemy and bullet counts, graze, score each interval; window.__tllRun holds the timer.",
        run: function (s) {
          if (window.__tllRun) { clearInterval(window.__tllRun); window.__tllRun = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllRun = setInterval(function () {
            console.log("wave", wave, "enemies", enemies ? enemies.length : 0, "bullets", bullets ? bullets.length : 0,
              "graze", graze, "score", score, "lives", P ? P.lives : 0, "phase", state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Bullet-density sweep",
        doc: "Runs the same seed at density 0.7, 1.0, 1.6 and logs how many enemy bullets are on screen each second — the curve that makes a difficulty feel unfair.",
        js: 'var densities = [0.7, 1.0, 1.6];\ndensities.forEach(function (den) {\n  DIFFS.normal.den = den;\n  resetRun(seedTxt, "normal");\n  console.log("density", den, "started, wave", wave);\n});\nwindow.__tllDen = setInterval(function () {\n  console.log("den", DIFFS.normal.den, "bullets", bullets ? bullets.length : 0, "enemies", enemies ? enemies.length : 0, "lives", P ? P.lives : 0);\n}, 1000);' },
      { label: "Hands-off graze counter",
        doc: "Parks the ship mid-pattern with no input and counts graze ticks — measures whether the bullet shapes are grazable at all.",
        js: 'resetRun(seedTxt, "hard");\nsetTimeout(function () { if (P) { P.x = 400; P.y = 300; } }, 600);\nvar seen = 0;\nwindow.__tllGraze = setInterval(function () {\n  if (P && P.graze !== undefined) seen = P.graze;\n  console.log("graze", graze, "bullets", bullets ? bullets.length : 0, "hp", P ? P.lives : 0, "mult", mult);\n}, 700);' },
      { label: "Boss immediately, full upgrade kit",
        doc: "Starts a run, hands out every upgrade card and jumps straight into the boss — the quick way to test boss patterns against a maxed ship.",
        js: 'resetRun(seedTxt, "normal");\nUPG.forEach(function (u) { applyUpgrade(u); });\nstartBoss();\nconsole.log("upgrades", UPG.length, "boss", boss ? boss.name : "none", "power", power, "spread", P ? P.spread : 0);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live run (phase, wave, score, counts of bullets and enemies). BALANCE edits player, difficulty and music numbers. CHEATS changes the run. LAYOUT resizes and repositions the frame, overlays and buttons per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "bullethell.html keeps its game in a plain top-level script (its own 'use strict' at the script head, no IIFE), so the harness reaches hitPlayer, doBomb, nextWave, startBoss, gameOver, applyUpgrade, upLvl, UPG, DIFFS, D, P, bullets, enemies, spawnQ, parts directly. The page file is untouched by this script." },
      { topic: "Freeze vs time scale", text: "The game's own `timeScale` is a hit-stop the loop eases back to 1 each frame (bullethell.html line 2813). Steady slow motion and freeze therefore wrap updatePlay instead, and undo by installing the original function back." },
      { topic: "Difficulty edits", text: "DIFFS is a const table; the live row is `D`. Editing a difficulty parameter publishes a modified copy of the row, exactly like resetRun does. Clicking a difficulty chip on the title screen replaces `D` again — expected." },
      { topic: "Not reachable", text: "Everything inside closures stays private: the audio graph and the procedural music scheduler, the wave generator internals (they are readable through the spawn-queue hook), the password encode/decode helpers, and the seeded RNG state (rngRun). The seed string itself is shown in STATE and is editable by the title screen's own NEW button." },
      { topic: "Texts", text: "The page uses the shared i18n.js kit (en/es/pt/ru/zh) with data-t attributes, so the TEXTS tab is kit-driven: pick a language, edit a key, the page re-applies through TLI18N. JS-written strings (banner text, toasts, boon names) come from the same table via TLI18N.t." }
    ]
  });
})();
