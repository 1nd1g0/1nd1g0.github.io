/* dbg/defender.js — developer harness for defender.html
 *
 * Load with:  defender.html?debug=dbg/defender.js
 * defender.html keeps its WebGL game in a plain top-level script (its own
 * "use strict" at the script head, no IIFE), so the harness reaches update,
 * render, damagePlayer, doBomb, fireWeapon, killEnemy, spawnEvent,
 * spawnSmallRocks, resetGame, startGame, gameOver, player, enemies, astros,
 * ebul, pbul, pick, boss, lives, bombs, score, scrollX directly.
 * No page bridge is needed; without ?debug the page is untouched.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  var realUpdate = null;
  function wrap(scale) {
    if (!realUpdate) realUpdate = window.update;
    if (scale === null) { window.update = realUpdate; return; }
    window.update = function (dt) { realUpdate(dt * scale) };
  }

  var realDamage = null;
  function setGod(v) {
    if (v) {
      if (!realDamage) realDamage = window.damagePlayer;
      window.damagePlayer = function () { };
      invT = Math.max(invT, 9e9);
      if (!player.alive && lives >= 0) { player.alive = true; deadT = 0; }
    } else if (realDamage) {
      window.damagePlayer = realDamage;
      if (invT > 1e8) invT = 0;
    }
  }

  /* RADII / SCORES / DROP_RATE are const objects — the bindings cannot be
     replaced but their properties can, which is what these two scalars use.
     Originals are snapshotted so setting a scale twice is absolute. */
  var baseRad = {}, baseScore = {};
  function scaleTable(tbl, base, factor) {
    var k;
    if (!base.orig) { base.orig = {}; for (k in tbl) base.orig[k] = tbl[k]; }
    for (k in tbl) tbl[k] = base.orig[k] * factor;
  }
  function radScale() {
    if (!baseRad.orig) { baseRad.orig = {}; for (var k in RADII) baseRad.orig[k] = RADII[k]; }
    return baseRad.orig.drone ? RADII.drone / baseRad.orig.drone : 1;
  }
  function scoreScale() {
    if (!baseScore.orig) { baseScore.orig = {}; for (var k in SCORES) baseScore.orig[k] = SCORES[k]; }
    return baseScore.orig.drone ? SCORES.drone / baseScore.orig.drone : 1;
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }

  TLDBG.register({
    game: "defender", file: "defender.html",

    state: function () {
      return {
        phase: state, paused: paused, elapsed: num(T, 10),
        sector: diff() + 1, scrollX: num(scrollX, 10), worldUnitsPerSector: LEN,
        routeAngleDeg: num(angle * 180 / Math.PI, 10),
        bossIndex: bossIdx, boss: boss ? { hp: num(boss.hp, 1), x: num(boss.x) } : null,
        score: score, hiscore: hi, lives: lives, bombs: bombs,
        powerLevel: powerIdx, nextExtraLifeAt: nextExtra,
        shieldSeconds: num(shieldTime, 10), shieldHits: shieldHits,
        invuln: num(invT, 10), deadTimer: num(deadT, 10), playerAlive: player.alive,
        playerX: num(player.x), playerY: num(player.y), playerVX: num(player.vx),
        enemies: enemies.length, asteroids: astros.length,
        enemyBullets: ebul.length, ownBullets: pbul.length,
        pickups: pick.length, particles: parts.length, beams: beams.length,
        options: options.length, spawnCursor: num(nextSpawnX, 10),
        corridorHalfWidth: num(EXT), corridorDiagonal: num(DIAG)
      };
    },

    params: [
      { id: "lives", label: "Lives", unit: "lives", min: 0, max: 12, step: 1,
        get: function () { return lives },
        set: function (v) { lives = Math.max(0, Math.round(v)) },
        code: { file: "defender.html", line: 747, name: "lives" },
        doc: "Ship count. Below 0 the game calls gameOver(); the HUD icons (#lives) redraw on the next hud() pass." },
      { id: "bombs", label: "Smart bombs", unit: "bombs", min: 0, max: 9, step: 1,
        get: function () { return bombs },
        set: function (v) { bombs = Math.max(0, Math.round(v)) },
        code: { file: "defender.html", line: 747, name: "bombs" },
        doc: "doBomb() spends one: clears enemy bullets and beams, and damages everything within 14 world units of the ship." },
      { id: "power", label: "Weapon power level", unit: "0-5 segments", min: 0, max: 5, step: 1,
        get: function () { return powerIdx },
        set: function (v) { powerIdx = Math.max(0, Math.min(5, Math.round(v))) },
        code: { file: "defender.html", line: 747, name: "powerIdx" },
        doc: "Powers the HUD segment bar. >0 gives missiles and 1.15x world scroll; >3 changes the fire cadence and the option-rebuild cadence. Death resets it to 0." },
      { id: "score", label: "Score", unit: "points", min: 0, max: 999999, step: 100,
        get: function () { return score },
        set: function (v) { score = Math.max(0, Math.round(v)) },
        code: { file: "defender.html", line: 747, name: "score" },
        doc: "Current score. The extra-life award (nextExtra) and the game-over panel read from it." },
      { id: "nextExtra", label: "Extra life at", unit: "points", min: 1000, max: 500000, step: 1000,
        get: function () { return nextExtra },
        set: function (v) { nextExtra = Math.max(1000, Math.round(v)) },
        code: { file: "defender.html", line: 747, name: "nextExtra" },
        doc: "Score at which addScore grants one life (then +50000). Lower it to watch the 1UP popup and the life cap." },
      { id: "scrollX", label: "World scroll position", unit: "units", min: 0, max: 20000, step: 25,
        get: function () { return num(scrollX, 10) },
        set: function (v) { scrollX = v; forceRender = true },
        code: { file: "defender.html", line: 746, name: "scrollX" },
        doc: "Where the camera sits in the world. Difficulty is floor(scrollX/LEN) (line 786), so jumping ahead raises enemy density and speed; spawning follows the same cursor." },
      { id: "sens", label: "Pointer / stick sensitivity", unit: "x", min: 0.005, max: 0.12, step: 0.005,
        get: function () { return SENSITIVITY },
        set: function (v) { SENSITIVITY = v },
        code: { file: "defender.html", line: 941, name: "SENSITIVITY" },
        doc: "Drag-to-turn factor for touch and mouse aiming. Default .03 — higher turns the ship with a smaller drag." },
      { id: "shield", label: "Shield time", unit: "s", min: 0, max: 30, step: 0.5,
        get: function () { return num(shieldTime, 10) },
        set: function (v) { shieldTime = v; if (v > 0) shieldHits = 0 },
        code: { file: "defender.html", line: 749, name: "shieldTime" },
        doc: "Absorbing shield countdown; three absorbed hits break it (shieldHits). The HUD shows it in place of the POWER label while active." },
      { id: "enemyRadius", label: "Enemy size scale", unit: "x", min: 0.3, max: 3, step: 0.05,
        get: function () { return radScale() },
        set: function (v) { scaleTable(RADII, baseRad, v) },
        code: { file: "defender.html", line: 1111, name: "RADII[type]" },
        doc: "Scales every collision radius (drone .52, carrier 1.25, spinner .85...). Absolute, so 1 restores the file's values. Collision and the hitbox hook both read it." },
      { id: "killScore", label: "Kill score scale", unit: "x", min: 0.2, max: 6, step: 0.1,
        get: function () { return scoreScale() },
        set: function (v) { scaleTable(SCORES, baseScore, v) },
        code: { file: "defender.html", line: 1109, name: "SCORES[type]" },
        doc: "Scales the points per kill (drone 100, carrier 800...). Absolute; affects kills made from now on." },
      { id: "mslCd", label: "Missile cooldown left", unit: "s", min: 0, max: 2, step: 0.05,
        get: function () { return num(mslCd, 100) },
        set: function (v) { mslCd = v },
        code: { file: "defender.html", line: 748, name: "mslCd" },
        doc: "The game sets .42 after each missile (line 1301) and needs powerIdx > 1. Zero it here to fire again immediately." },
      { id: "musicVol", label: "Music volume", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { return musicVol },
        set: function (v) { musicVol = v; if (typeof updateVolUI === "function") updateVolUI(true) },
        code: { file: "defender.html", line: 811, name: "musicVol" },
        doc: "Live synth music bus. updateVolUI(true) repaints the slider and the SOUND button label." },
      { id: "sfxVol", label: "Sound-effects volume", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { return sfxVol },
        set: function (v) { sfxVol = v; if (typeof updateVolUI === "function") updateVolUI(true) },
        code: { file: "defender.html", line: 811, name: "sfxVol" },
        doc: "Explosions, shots and pickup blips." },
      { id: "camZ", label: "Camera distance", unit: "units", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return CAMZ },
        code: { file: "defender.html", line: 319, name: "CAMZ" },
        doc: "Read-only const (13.5). It is baked into the view matrix every frame from the const binding, so a debug value could not reach the shader path." },
      { id: "sectorLen", label: "Sector length", unit: "units", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return LEN },
        code: { file: "defender.html", line: 681, name: "LEN" },
        doc: "Read-only const (650): one sector of world distance, the divisor behind the difficulty step and the sector banner names." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "update() becomes a no-op; render keeps drawing, so you can read the field. Off restores the original update.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.35", toggle: true,
        doc: "The frame delta handed to update() is scaled, so flight, bullets and enemy AI all slow together.",
        on: function (v) { wrap(v ? 0.35 : null) } },
      { id: "god", label: "God mode", toggle: true,
        doc: "damagePlayer becomes a no-op and invulnerability is pinned; if the ship was mid-death it is revived. Off restores the real function.",
        on: function (v) { setGod(v) } },
      { id: "maxPower", label: "Weapon power to 5",
        doc: "Full power segment: missiles, faster fire cadence, 1.15x scroll.",
        run: function () { powerIdx = 5; hud(); TLDBG.toast("power 5"); } },
      { id: "resupply", label: "9 lives, 6 bombs",
        doc: "Refills the ship count and bomb stock without touching score (the in-game pickups cap at 6 bombs).",
        run: function () { lives = 9; bombs = 6; hud(); TLDBG.toast("lives 9, bombs 6"); } },
      { id: "clearEnemies", label: "Clear all enemies",
        doc: "Empties the enemy list and the asteroid list without awarding score; the spawn cursor keeps filling the corridor from scrollX.",
        run: function () { enemies.length = 0; astros.length = 0; TLDBG.toast("field cleared"); } },
      { id: "clearFire", label: "Erase enemy bullets",
        doc: "Empties ebul and beams — the same thing the smart bomb does, without spending one.",
        run: function () { ebul.length = 0; beams.length = 0; TLDBG.toast("enemy fire cleared"); } },
      { id: "bombNow", label: "Drop a smart bomb",
        doc: "Calls doBomb(): screen flash, enemy bullets gone, 8 damage to everything near the ship, 15 to a boss.",
        run: function () { if (bombs <= 0) bombs = 1; window.doBomb(); TLDBG.toast("bomb dropped"); } },
      { id: "spawnEvent", label: "Spawn an encounter ahead",
        doc: "Runs spawnEvent() just past the corridor edge, so a new weighted group of hostiles appears in view.",
        run: function () { window.spawnEvent(scrollX + EXT + 4); TLDBG.toast("encounter spawned at " + num(scrollX + EXT + 4, 1)); } },
      { id: "spawnRocks", label: "Spawn 3 asteroids",
        doc: "spawnSmallRocks() ahead of the ship — the cheap way to test asteroid handling and the astro cap.",
        run: function () { window.spawnSmallRocks(scrollX + EXT + 2, 3); TLDBG.toast("asteroids: " + astros.length); } },
      { id: "nextSector", label: "Warp to next sector",
        doc: "Adds one LEN (650 units) to scrollX: difficulty rises, the banner and sector name change on the next hud().",
        run: function () { scrollX += LEN; forceRender = true; hud(); TLDBG.toast("sector " + (diff() + 1)); } },
      { id: "bossNow", label: "Force boss index up",
        doc: "Raises bossIdx and warps forward, which is how the game reaches the next boss archetype; the boss itself arrives through the normal spawn path.",
        run: function () { bossIdx = Math.min(4, bossIdx + 1); scrollX += LEN; forceRender = true; hud(); TLDBG.toast("boss index " + bossIdx); } },
      { id: "forceOver", label: "Force game over",
        doc: "Calls the real gameOver(): final score panel, hiscore write to localStorage, music stop.",
        run: function () { if (typeof window.gameOver === "function") window.gameOver(); TLDBG.toast("game over"); } },
      { id: "hideHud", label: "Hide HUD layer", toggle: true,
        doc: "Display:none on #hud (score, sector, lives, power) for clean captures of the WebGL scene.",
        on: function (v) { var el = document.getElementById("hud"); if (el) el.style.display = v ? "none" : ""; } }
    ],

    hooks: [
      { label: "Console: enemies", doc: "Every hostile: type, world x/y, hp, radius in use, the pattern parameters (amplitude, frequency, phase) and fire countdown.",
        run: function () {
          console.table(enemies.map(function (e) {
            return { type: e.type, x: num(e.x, 10), y: num(e.y, 10), hp: e.hp,
              radius: RADII[e.type], amp: num(e.amp, 10), freq: num(e.fr, 10), phase: num(e.ph, 10),
              fireIn: num(e.fc, 10), segments: e.segs ? e.segs.length : 0 };
          }));
        } },
      { label: "Console: bullets", doc: "Bullet census: enemy shots, your shots, beams, plus the nearest threat to the ship.",
        run: function () {
          var near = null, d2, i, b;
          for (i = 0; i < ebul.length; i++) { b = ebul[i]; d2 = (b.x - player.x) * (b.x - player.x) + (b.y - player.y) * (b.y - player.y); if (!near || d2 < near.d) near = { d: d2, b: b }; }
          console.log("enemy bullets " + ebul.length + "/" + CAP.ebul + " | your bullets " + pbul.length + "/" + CAP.pbul +
            " | beams " + beams.length + " | particles " + parts.length + "/" + CAP.parts);
          if (near) console.log("nearest enemy bullet at " + num(near.b.x, 1) + "," + num(near.b.y, 1) +
            " distance " + num(Math.sqrt(near.d), 10) + " (bullet radius " + near.b.r + ")");
        } },
      { label: "Console: pickups on field", doc: "Drops lying in the corridor: kind, world position, age — with the drop table that produced them.",
        run: function () {
          console.table(pick.map(function (p) { return { kind: p.kind, x: num(p.x, 1), y: num(p.y, 1), age: num(p.t, 10) } }));
          console.log("drop rates:", DROP_RATE);
        } },
      { label: "Console: scoring tables", doc: "Prints SCORES, RADII and DROP_RATE as they currently are, after any BALANCE scaling.",
        run: function () { console.log("SCORES", SCORES); console.log("RADII", RADII); console.log("DROP_RATE", DROP_RATE); console.log("CAP", CAP); } },
      { label: "Console: route and camera", doc: "Flight vector, corridor half-width (EXT) and diagonal (DIAG), turn targets, ship offset — the numbers behind the steering math.",
        run: function () {
          console.log({ angleDeg: num(angle * 180 / Math.PI, 10), angleFrom: num(angFrom * 180 / Math.PI, 10),
            angleTo: num(angTo * 180 / Math.PI, 10), turning: turnT < turnDur, turnDur: num(turnDur, 10),
            turnDelay: num(turnDelay, 10), EXT: num(EXT), DIAG: num(DIAG),
            scrollX: num(scrollX, 1), scrollV: num(scrollV, 10), camX: num(camX), camY: num(camY),
            shipOffsetX: num(player.offsetX, 10), shipVX: num(player.vx, 10), shipVY: num(player.vy, 10) });
        } }
    ],

    layout: [
      { sel: "#c", label: "WebGL canvas" },
      { sel: "#hud", label: "HUD layer" },
      { sel: "#top", label: "HUD top row" },
      { sel: "#bot", label: "HUD bottom row" },
      { sel: "#top > div", label: "Score block (left)" },
      { sel: "#stage", label: "Sector / vector block" },
      { sel: "#stageName", label: "Sector name line" },
      { sel: "#score", label: "Score value" },
      { sel: "#hiscore", label: "Hi-score value" },
      { sel: "#lives", label: "Life icons" },
      { sel: "#bombCt", label: "Bomb count" },
      { sel: "#pow", label: "Power segment bar" },
      { sel: "#segs", label: "Power segments container" },
      { sel: "#powLbl", label: "POWER / shield label" },
      { sel: ".lbl", label: "HUD captions" },
      { sel: ".val", label: "HUD numerals" },
      { sel: "#tag", label: "Tagline under the logo" },
      { sel: ".logo", label: "Logo text" },
      { sel: "#keys", label: "Key legend rows" },
      { sel: "#alert", label: "Warning strip (boss / incoming)" },
      { sel: "#msg", label: "Message toast line" },
      { sel: "#popups", label: "Floating score popups" },
      { sel: "#flash", label: "Bomb flash overlay" },
      { sel: "#vig", label: "Vignette overlay" },
      { sel: "#bossWrap", label: "Boss health bar container" },
      { sel: "#bossBar", label: "Boss health bar fill" },
      { sel: "#title", label: "Title screen (.scr)" },
      { sel: "#title .title", label: "Title heading" },
      { sel: "#title .prompt", label: "TAP TO LAUNCH line" },
      { sel: "#title .rule", label: "Legend rules" },
      { sel: "#over", label: "Game over screen" },
      { sel: "#finScore", label: "Final score line" },
      { sel: "#pauseMenu", label: "Pause menu (.scr)" },
      { sel: ".gameBtn", label: "Menu buttons" },
      { sel: ".gameBtn.amber", label: "Primary menu button" },
      { sel: ".btnRow", label: "Menu button row" },
      { sel: ".homeBtn", label: "Home link button" },
      { sel: ".miniBtn", label: "Small buttons (pause, sound)" },
      { sel: "#pauseBtn", label: "Pause button" },
      { sel: "#soundBtn", label: "Sound master button" },
      { sel: ".volBox", label: "Volume sliders box" },
      { sel: ".volRow", label: "One volume row" },
      { sel: ".volLbl", label: "Volume captions" },
      { sel: ".volVal", label: "Volume readouts" },
      { sel: "#nogl", label: "WebGL-unavailable notice" }
    ],

    control: [
      { id: "start", label: "Start or reset the run", args: '"start" | "reset"', argDefault: "start",
        doc: "startGame() begins a fresh run from the title; resetGame() rebuilds the sector list and puts you back at sector 1.",
        run: function (which) {
          if (String(which) === "reset") resetGame(); else startGame();
          return { phase: state, sector: diff() + 1, score: score, lives: lives, enemies: enemies.length };
        } },
      { id: "spawnEvent", label: "Spawn a random sector event", args: "world x (0 = just ahead)", argDefault: 120,
        doc: "spawnEvent(x) rolls the page's weighted table (drone, weaver, snake, charger, interceptor, turret, spinner, sniper, mine, bulwark, seeker, splitter, lancer, carrier, pod, gem, astro) weighted by difficulty, right at that x.",
        run: function (x) { spawnEvent(Number(x) || scrollX + 120); return { at: num(scrollX, 10), enemies: enemies.length, asteroids: astros.length, pickups: pick.length }; } },
      { id: "rocks", label: "Spawn small asteroids", args: "[x, count]", argDefault: "[200, 3]",
        doc: "spawnSmallRocks(x, n) — the debris the asteroids break into; use it to test collision paths without a full event.",
        run: function (a) { if (!Array.isArray(a)) return "want [x, count]"; spawnSmallRocks(Number(a[0]), Math.max(1, Math.min(12, Math.round(Number(a[1]) || 1)))); return { asteroids: astros.length, cap: 48 }; } },
      { id: "killEnemies", label: "Kill enemies", args: "count (all if omitted)", argDefault: 3,
        doc: "killEnemy(e, i) in order — the page's own kill path with score, explosion and drops.",
        run: function (n) {
          var k = n === undefined || n === "" || n === null ? enemies.length : Math.min(enemies.length, Math.max(1, Math.round(Number(n))));
          for (var i = 0; i < k && enemies.length; i++) killEnemy(enemies[0], 0);
          return { killed: k, enemies: enemies.length, score: score };
        } },
      { id: "playerTo", label: "Move the ship", args: "[x, y] world coordinates", argDefault: "[0, 0]",
        doc: "Writes player.x/player.y (and zeroes velocity) — park the ship in front of a turret line or out of a corridor wall.",
        run: function (a) { if (!Array.isArray(a)) return "want [x, y]"; player.x = Number(a[0]); player.y = Number(a[1]); player.vx = 0; player.vy = 0; return { pos: [num(player.x, 1), num(player.y, 1)], alive: !!player.alive }; } },
      { id: "giveBombs", label: "Set bombs and power", args: "[bombs, powerIndex 0-?]", argDefault: "[5, 3]",
        doc: "bombs and powerIdx directly — power index is the weapon tier the HUD prints; bomb key then detonates.",
        run: function (a) { if (!Array.isArray(a)) return "want [bombs, power]"; bombs = Math.max(0, Math.round(Number(a[0]))); powerIdx = Math.max(0, Math.round(Number(a[1]))); return { bombs: bombs, powerLevel: powerIdx }; } },
      { id: "shieldFor", label: "Shield time and hits", args: "[seconds, hits]", argDefault: "[6, 3]",
        doc: "shieldTime / shieldHits — the landing-shield window used when you touch a surface or take a hit.",
        run: function (a) { if (!Array.isArray(a)) return "want [seconds, hits]"; shieldTime = Number(a[0]); shieldHits = Math.max(0, Math.round(Number(a[1]))); return { shieldSeconds: num(shieldTime, 10), shieldHits: shieldHits, invuln: num(invT, 10) }; } },
      { id: "probe", label: "Read the sector", args: "unused",
        doc: "Phase, sector index, scroll position, route angle, boss, score/lives/bombs/power, player state, entity counts and the spawn cursor.",
        run: function () {
          return { phase: state, sector: diff() + 1, scrollX: num(scrollX, 10), sectorLength: LEN,
            boss: boss ? { hp: num(boss.hp, 1), x: num(boss.x) } : null, bossIndex: bossIdx,
            score: score, lives: lives, bombs: bombs, powerLevel: powerIdx,
            player: { x: num(player.x, 1), y: num(player.y, 1), vx: num(player.vx, 10), alive: !!player.alive },
            enemies: enemies.length, enemyTypes: enemies.slice(0, 12).map(function (e) { return e.type || "?" }),
            asteroids: astros.length, enemyBullets: ebul.length, ownBullets: pbul.length, pickups: pick.length,
            spawnCursor: num(nextSpawnX, 10) };
        } },
      { id: "watch", label: "Log the sector every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "One compact line per interval — scroll, enemy/asteroid/bullet counts, score, lives; window.__tllSector holds the timer.",
        run: function (s) {
          if (window.__tllSector) { clearInterval(window.__tllSector); window.__tllSector = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllSector = setInterval(function () {
            console.log("sector", diff() + 1, "x", num(scrollX, 1), "enemies", enemies.length, "asteroids", astros.length,
              "ebul", ebul.length, "score", score, "lives", lives, "phase", state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Event farm: spawn a dense hostile wall ahead",
        doc: "Spawns events every 30 units along the next stretch so the corridor fills with mixed enemies — the stress test for the collision and scoring paths.",
        js: 'startGame();\nfor (var i = 0; i < 12; i++) spawnEvent(scrollX + 120 + i * 30);\nconsole.log("enemies", enemies.length, "asteroids", astros.length, "pickups", pick.length);\nwindow.__tllWall = setInterval(function () {\n  console.log("x", Math.round(scrollX), "enemies", enemies.length, "ebul", ebul.length, "score", score);\n}, 1000);' },
      { label: "Boss approach timing",
        doc: "Jumps the scroll position to just before the boss gate ((bossIdx+1)*LEN) and logs the countdown to the encounter.",
        js: 'startGame();\nvar gate = (bossIdx + 1) * LEN;\nscrollX = gate - 400;\nconsole.log("boss gate at", gate, "distance", Math.round(gate - scrollX));\nwindow.__tllBoss = setInterval(function () {\n  console.log("to gate", Math.round(gate - scrollX), "boss", boss ? Math.round(boss.hp) : "not spawned", "enemies", enemies.length);\n  if (boss) clearInterval(window.__tllBoss);\n}, 1000);' },
      { label: "Hands-off glide: hold thrust, no steering",
        doc: "Dispatches the page's own key state so the ship keeps flying straight while you watch enemy behaviour unfold.",
        js: 'function press(code) {\n  var o = { code: code, key: code, bubbles: true, cancelable: true };\n  window.dispatchEvent(new KeyboardEvent("keydown", o));\n}\npress("ArrowRight");\nwindow.__tllGlide = setInterval(function () {\n  console.log("x", Math.round(scrollX), "y", Math.round(player.y), "enemies", enemies.length, "alive", player.alive);\n}, 800);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live run (phase, sector, route angle, counts, ship position). BALANCE edits lives, weapons, scoring, sensitivity and audio. CHEATS changes the run and spawns encounters. LAYOUT resizes and repositions the HUD layers, overlays and buttons per screen mode. ELEMENTS lists every selector with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "defender.html keeps its game in a plain top-level script (its own \"use strict\", no IIFE), so the harness reaches update, render, hud, damagePlayer, doBomb, fireWeapon, killEnemy, spawnEvent, spawnSmallRocks, resetGame, startGame, gameOver, addScore, popup, updateVolUI, sectorName plus the live arrays (enemies, astros, ebul, pbul, pick, parts, beams, options, pops) and the tables SCORES, RADII, DROP_RATE, CAP." },
      { topic: "Scale edits are absolute", text: "SCORES, RADII and DROP_RATE are const objects: the bindings cannot be replaced, but their properties can. The two scale parameters snapshot the file's original values, so setting a scale twice does not compound and 1 restores the shipped numbers." },
      { topic: "Read-only numbers", text: "CAMZ (camera distance 13.5) and LEN (sector length 650) are const bindings used directly by the projection and the difficulty step. EXT/DIAG in STATE are recomputed every frame from the corridor size (updateExt, line 761), so they are reported, not edited." },
      { topic: "Not reachable", text: "The WebGL layer stays private in practice: shader sources, program objects and the procedural atlas texture are generated in closures and are not exposed. The audio synth graph and the music scheduler are the same. Everything gameplay-structural is reachable; those are visual/audio internals, visible only through console hooks." },
      { topic: "Texts", text: "The page uses the shared i18n.js kit (en/es/pt/ru/zh): HUD captions carry data-t, while JS-written lines (sector banner, power label, popups, messages) call TLI18N.t. The TEXTS tab is kit-driven — pick a language, edit a key, and the page recomposes via TLI18N.onChange." }
    ]
  });
})();
