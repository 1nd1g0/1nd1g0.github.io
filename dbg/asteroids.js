/* Developer harness script for asteroids.html.
   Loaded by the page loader when the URL has ?debug=dbg/asteroids.js, after
   dbg/_harness.js. Registers live state, balance rows, cheats, console hooks,
   layout selectors and docs. Nothing here runs unless the harness is on. */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  var NAMES = ["MENU", "PLAY", "CLEAR", "OVER"];
  function st() { return (typeof state !== "undefined") ? state : 0 }
  function shipRef() { return (typeof ship !== "undefined") ? ship : {} }
  function num(v) { return (typeof v === "number" && isFinite(v)) ? v : 0 }

  /* god mode: wrap hitShip while on, restore on off */
  var savedHit = null;
  function godMode(on) {
    if (typeof hitShip !== "function") { TLDBG.toast("hitShip not reachable"); return }
    if (on) {
      if (!savedHit) savedHit = hitShip;
      hitShip = function () { if (window.__tldbgGodLog) console.log("[TLDBG] hit suppressed") };
    } else if (savedHit) { hitShip = savedHit; savedHit = null }
    window.__tldbgGod = !!on;
  }

  function addPts(n) { if (typeof addScore === "function") addScore(n, W / 2, H / 2, 1); TLDBG.toast("+" + n + " score") }
  function clearAst() { if (typeof ast !== "undefined") ast.length = 0; TLDBG.toast("asteroid field cleared") }
  function giveWeapon() { if (typeof weapon !== "undefined") { weapon = "triple"; weaponT = 20 } TLDBG.toast("triple for 20 s") }

  TLDBG.register({
    game: "asteroids",
    file: "asteroids.html",
    state: function () {
      var s = shipRef();
      return {
        state: NAMES[st()] || String(st()),
        paused: (typeof paused !== "undefined") ? !!paused : false,
        score: (typeof score !== "undefined") ? score : 0,
        hi: (typeof hi !== "undefined") ? hi : 0,
        lives: (typeof lives !== "undefined") ? lives : 0,
        level: (typeof level !== "undefined") ? level : 0,
        nextLife: (typeof nextLife !== "undefined") ? nextLife : 0,
        combo: (typeof combo !== "undefined") ? combo : 0,
        mult: (typeof mult !== "undefined") ? mult : 1,
        weapon: (typeof weapon !== "undefined") ? weapon : "-",
        rapidT: (typeof rapidT !== "undefined") ? +rapidT.toFixed(1) : 0,
        shield: (typeof shield !== "undefined") ? shield : 0,
        asteroids: (typeof ast !== "undefined") ? ast.length : 0,
        bullets: (typeof blts !== "undefined") ? blts.length : 0,
        foeBullets: (typeof eblts !== "undefined") ? eblts.length : 0,
        ufos: (typeof ufos !== "undefined") ? ufos.length : 0,
        powerups: (typeof pows !== "undefined") ? pows.length : 0,
        particles: (typeof pcount !== "undefined") ? pcount : 0,
        shipAlive: !!s.alive,
        shipSpeed: s.vx != null ? Math.round(Math.hypot(s.vx, s.vy)) : 0,
        god: !!window.__tldbgGod,
        lowSpec: (typeof LOW !== "undefined") ? !!LOW : false
      };
    },
    params: [
      { id: "score", label: "Score", unit: "pts", min: 0, max: 1e7, step: 100,
        get: function () { return num(score) }, set: function (v) { score = v },
        code: { file: "asteroids.html", line: 149, name: "score" },
        doc: "live score; setting it above nextLife triggers the extra life at the next award" },
      { id: "lives", label: "Lives", unit: "", min: 0, max: 99, step: 1,
        get: function () { return num(lives) }, set: function (v) { lives = v },
        code: { file: "asteroids.html", line: 149, name: "lives" },
        doc: "remaining ships; 0 ends the game on the next hit" },
      { id: "level", label: "Level", unit: "", min: 1, max: 60, step: 1,
        get: function () { return num(level) }, set: function (v) { level = v },
        code: { file: "asteroids.html", line: 149, name: "level" },
        doc: "drives asteroid count, UFO cadence and UFO speed caps" },
      { id: "nextLife", label: "Extra life at", unit: "pts", min: 1000, max: 200000, step: 500,
        get: function () { return num(nextLife) }, set: function (v) { nextLife = v },
        code: { file: "asteroids.html", line: 149, name: "nextLife" },
        doc: "score threshold for the next bonus ship (starts at 10000)" },
      { id: "hi", label: "High score", unit: "pts", min: 0, max: 1e7, step: 100,
        get: function () { return num(hi) }, set: function (v) { hi = v },
        code: { file: "asteroids.html", line: 149, name: "hi" },
        doc: "the HI value in the HUD" },
      { id: "shield", label: "Shield charges", unit: "", min: 0, max: 9, step: 1,
        get: function () { return num(shield) }, set: function (v) { shield = v },
        code: { file: "asteroids.html", line: 152, name: "shield" },
        doc: "hits absorbed before the ship dies; picked up as a power-up" },
      { id: "rapidT", label: "Rapid-fire time left", unit: "s", min: 0, max: 90, step: 0.5,
        get: function () { return num(rapidT) }, set: function (v) { rapidT = v },
        code: { file: "asteroids.html", line: 152, name: "rapidT" },
        doc: "seconds of rapid fire remaining; 0 = normal cadence" },
      { id: "scoreBig", label: "Points: large asteroid", unit: "pts", min: 1, max: 1000, step: 1,
        get: function () { return (typeof ASTSCORE !== "undefined") ? num(ASTSCORE[3]) : 0 },
        set: function (v) { if (typeof ASTSCORE !== "undefined") ASTSCORE[3] = v },
        code: { file: "asteroids.html", line: 220, name: "ASTSCORE[3]" },
        doc: "award for splitting a large one; combo multiplier still applies on top" },
      { id: "scoreMed", label: "Points: medium asteroid", unit: "pts", min: 1, max: 1000, step: 1,
        get: function () { return (typeof ASTSCORE !== "undefined") ? num(ASTSCORE[2]) : 0 },
        set: function (v) { if (typeof ASTSCORE !== "undefined") ASTSCORE[2] = v },
        code: { file: "asteroids.html", line: 220, name: "ASTSCORE[2]" },
        doc: "award for splitting a medium asteroid" },
      { id: "scoreSmall", label: "Points: small asteroid", unit: "pts", min: 1, max: 1000, step: 1,
        get: function () { return (typeof ASTSCORE !== "undefined") ? num(ASTSCORE[1]) : 0 },
        set: function (v) { if (typeof ASTSCORE !== "undefined") ASTSCORE[1] = v },
        code: { file: "asteroids.html", line: 220, name: "ASTSCORE[1]" },
        doc: "award for destroying the smallest rocks" },
      { id: "thrust", label: "Ship thrust", unit: "px/s^2", min: 50, max: 1200, step: 10,
        readonly: true,
        get: function () { return 300 },
        code: { file: "asteroids.html", line: 292, name: "300*RS*dt thrust" },
        doc: "READ ONLY literal inside upShip; the export names the line so the LLM can patch the file" },
      { id: "turn", label: "Ship rotation rate", unit: "rad/s", min: 1, max: 12, step: 0.1,
        readonly: true,
        get: function () { return 4.1 },
        code: { file: "asteroids.html", line: 289, name: "4.1*dt turn" },
        doc: "READ ONLY literal (left line 289, right line 290)" },
      { id: "maxSpeed", label: "Ship speed cap", unit: "px/s", min: 100, max: 1500, step: 10,
        readonly: true,
        get: function () { return 400 },
        code: { file: "asteroids.html", line: 296, name: "mx=400*RS" },
        doc: "READ ONLY literal; the 0.9/s damping sits on line 295" },
      { id: "bulletSpeed", label: "Bullet speed", unit: "px/s", min: 200, max: 2000, step: 10,
        readonly: true,
        get: function () { return 560 },
        code: { file: "asteroids.html", line: 250, name: "sp=(laser?860:560)*RS" },
        doc: "READ ONLY literal: 560 normal shots, 860 laser, same line" }
    ],
    cheats: [
      { id: "god", label: "God mode", doc: "replaces hitShip with a no-op while on; restored when off", toggle: true, on: function (v) { godMode(v) } },
      { id: "life", label: "+1 life", doc: "adds one ship to the reserve", run: function () { lives++; TLDBG.toast("lives " + lives) } },
      { id: "pts", label: "+5000 score", doc: "awards through addScore so combo and popups behave", run: addPts },
      { id: "clearAst", label: "Clear the field", doc: "empties the asteroid array; the level-clear logic then runs", run: clearAst },
      { id: "weapon", label: "Give triple shot", doc: "sets weapon to triple for 20 seconds", run: giveWeapon },
      { id: "shieldCheat", label: "+3 shields", doc: "tops up shield charges", run: function () { shield += 3; TLDBG.toast("shield " + shield) } },
      { id: "bomb", label: "Detonate bomb", doc: "runs the page's own doBomb: flash, shake, clears the field", run: function () { if (typeof doBomb === "function") doBomb() } },
      { id: "hyper", label: "Hyperspace", doc: "jumps the ship through the page's own hyperspace()", run: function () { if (typeof hyperspace === "function") hyperspace() } },
      { id: "ufo", label: "Spawn a UFO", doc: "forces one UFO now", run: function () { if (typeof spawnUFO === "function") spawnUFO() } },
      { id: "noUfo", label: "No more UFOs", doc: "pushes the UFO timer far into the future", run: function () { ufoT = 1e6; TLDBG.toast("UFO timer parked") } },
      { id: "mute", label: "Mute sound", doc: "flips SND.muted while on; restored when off", toggle: true,
        on: function (v) { if (typeof SND !== "undefined") SND.muted = !!v } }
    ],
    hooks: [
      { label: "console.table asteroids", doc: "every rock with size, position, velocity", run: function () { console.table((typeof ast !== "undefined" ? ast : []).slice(0, 40)) } },
      { label: "console.table powerups", doc: "floating drops with type and time left", run: function () { console.table((typeof pows !== "undefined" ? pows : []).slice(0, 20)) } },
      { label: "log ship", doc: "the ship object plus the raw input flags", run: function () { console.log(shipRef(), inp) } },
      { label: "log tables", doc: "ASTSCORE, POW, POWK and particle pool fill", run: function () { console.log((typeof ASTSCORE !== "undefined" ? ASTSCORE : null), (typeof POW !== "undefined" ? POW : null), (typeof POWK !== "undefined" ? POWK : null), pcount + "/" + PMAX) } }
    ],
    layout: [
      { sel: "#c", label: "game canvas" },
      { sel: "#tlHost", label: "title / language host" },
      { sel: "#bT", label: "thrust button" },
      { sel: "#bF", label: "fire button" },
      { sel: "#bL", label: "rotate left button" },
      { sel: "#bR", label: "rotate right button" },
      { sel: "#bH", label: "hyperspace button" },
      { sel: "#bP", label: "pause button" },
      { sel: "#bM", label: "mute button" },
      { sel: "#bHome", label: "home / menu button" },
      { sel: ".btn", label: "every control button" }
    ],
    control: [
      { id: "drive", label: "Drive the ship by flags", args: '"thrust" | "left" | "right" | "fire" | "stop"', argDefault: "thrust",
        doc: "Writes the page's own inp object ({l,r,t,f,hyp}) that upShip reads every tick — scripted flight without keyboard events. stop clears everything.",
        run: function (k) {
          var name = String(k || "stop");
          if (name === "stop") { inp.l = inp.r = inp.t = inp.f = 0; inp.hyp = false; return "input cleared"; }
          var field = { left: "l", right: "r", thrust: "t", fire: "f", hyper: "hyp" }[name];
          if (!field) return "unknown action " + name;
          inp[field] = inp[field] ? 0 : (name === "hyper" ? true : 1);
          return JSON.stringify(inp);
        } },
      { id: "fire", label: "Fire now", args: "unused",
        doc: "shoot() through the page's own path — respects cooldown, weapon and rapid-fire timers.",
        run: function () { shoot(); return { shots: blts.length, weapon: weapon, cooldown: num(ship.cool, 100) }; } },
      { id: "hyper", label: "Hyperspace", args: "unused",
        doc: "hyperspace() — the random teleport, respecting the 1.2 s cooldown; the classic desperate move.",
        run: function () { hyperspace(); return { pos: [num(ship.x, 1), num(ship.y, 1)], hypCd: num(ship.hypCd, 100) }; } },
      { id: "bomb", label: "Smart bomb", args: "unused",
        doc: "doBomb() — clears every asteroid and enemy shot on screen, flash and shake.",
        run: function () { doBomb(); return { asteroids: ast.length, enemyShots: eblts.length, score: score }; } },
      { id: "spawnWave", label: "Spawn an asteroid wave", args: "count 1-10", argDefault: 6,
        doc: "spawnWave(n) puts n large asteroids on random edge tracks.",
        run: function (n) { spawnWave(Math.max(1, Math.min(12, Math.round(Number(n) || 4)))); return { asteroids: ast.length, level: level }; } },
      { id: "spawnUfo", label: "Spawn a UFO", args: "unused",
        doc: "spawnUFO() — small/large and tracking/shooting type by the page's roll (small chance rises with level).",
        run: function () { spawnUFO(); return { ufos: ufos.length, types: ufos.map(function (u) { return u.small ? "small" : "large" }), nextGap: num(ufoT, 10) }; } },
      { id: "ufoGap", label: "Seconds to the next UFO", args: "seconds", argDefault: 1,
        doc: "ufoT counts down in upUFO; at 0 a UFO spawns while ufos.length < maxU (2 from level 5). Set it small to force one immediately.",
        run: function (s) { ufoT = Number(s); return { ufoT: num(ufoT, 10), maxUfo: level >= 5 ? 2 : 1, ufos: ufos.length }; } },
      { id: "weapon", label: "Give a weapon", args: '"single" | "triple" | "spread" | "laser"', argDefault: "spread",
        doc: "Sets weapon and weaponT (12 s) directly — the same fields applyPow writes, read by shoot() every shot.",
        run: function (w) {
          var name = String(w || "single");
          if (["single", "triple", "spread", "laser"].indexOf(name) < 0) return "unknown weapon " + name;
          weapon = name; weaponT = name === "single" ? 0 : 12;
          return { weapon: weapon, weaponT: num(weaponT, 10), rapidT: num(rapidT, 10) };
        } },
      { id: "shipTo", label: "Move the ship", args: "[x, y] canvas pixels", argDefault: "[400, 300]",
        doc: "Sets ship position (keeps velocity) so you can park the ship on a collision course or escape a UFO line.",
        run: function (a) { if (!Array.isArray(a)) return "want [x, y]"; ship.x = Number(a[0]); ship.y = Number(a[1]); return { pos: [num(ship.x, 1), num(ship.y, 1)], alive: !!ship.alive, inv: num(ship.inv, 10) }; } },
      { id: "level", label: "Jump to a level", args: "level number", argDefault: 5,
        doc: "startLevel(n) rebuilds the wave, resets shots/UFOs and re-rolls the UFO timer.",
        run: function (n) { startLevel(Math.max(1, Math.round(Number(n) || 1))); return { level: level, asteroids: ast.length, state: state }; } },
      { id: "game", label: "New game", args: "unused",
        doc: "startGame() — score 0, 3 lives, level 1, ship respawned.",
        run: function () { startGame(); return { state: state, level: level, lives: lives, score: score }; } },
      { id: "probe", label: "Read the run", args: "unused",
        doc: "Phase, ship state, asteroid/UFO/shot/pow counts, weapon, combo multiplier, UFO timer and the input flags.",
        run: function () {
          return { state: NAMES[state] || state, level: level, score: score, lives: lives, combo: combo, mult: mult,
            ship: { alive: !!ship.alive, x: num(ship.x, 1), y: num(ship.y, 1), a: num(ship.a, 100), v: num(Math.hypot(ship.vx, ship.vy), 10), inv: num(ship.inv, 10), cool: num(ship.cool, 100) },
            asteroids: ast.length, ufos: ufos.map(function (u) { return { small: !!u.small, x: num(u.x, 1), y: num(u.y, 1) } }),
            shots: blts.length, enemyShots: eblts.length, powerups: pows.length, weapon: weapon, rapidT: num(rapidT, 10), ufoT: num(ufoT, 10), inp: JSON.parse(JSON.stringify(inp)) };
        } },
      { id: "watch", label: "Log the run every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Compact run line each tick interval — asteroid count, UFO count, ship velocity, score; window.__tllAI holds the timer.",
        run: function (s) {
          if (window.__tllAI) { clearInterval(window.__tllAI); window.__tllAI = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllAI = setInterval(function () {
            console.log(NAMES[state] || state, "lvl", level, "ast", ast.length, "ufo", ufos.length,
              "shots", blts.length, "enemy", eblts.length, "v", num(Math.hypot(ship.vx, ship.vy), 10), "score", score);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Hands-off autopilot: hold thrust and fire",
        doc: "Sets inp flags so the ship accelerates and shoots continuously — watch the scoring combo build without keyboard input.",
        js: 'inp.t = 1; inp.f = 1;\nsetInterval(function () { console.log("state", state, "ast", ast.length, "ufo", ufos.length, "score", score, "lives", lives); }, 1000);' },
      { label: "UFO pressure test",
        doc: "Level 5 (two UFOs allowed) with the UFO timer forced to 1 s, then a tracking log of every UFO position.",
        js: 'startLevel(5);\nufoT = 1;\nwindow.__tllUfo = setInterval(function () {\n  console.table(ufos.map(function (u, i) { return { i: i, small: !!u.small, x: Math.round(u.x), y: Math.round(u.y), hp: u.hp }; }));\n  ufoT = 1;\n}, 1500);' },
      { label: "Bomb-clear timing",
        doc: "Spawns a big wave, times how long until the field is cleared by shooting, then bombs it — a pace measurement for wave sizing.",
        js: 'startGame();\nspawnWave(9);\nvar t0 = performance.now();\ninp.t = 0; inp.f = 1;\nwindow.__tllWave = setInterval(function () {\n  console.log("asteroids", ast.length, "elapsed", ((performance.now() - t0) / 1000).toFixed(1) + "s");\n  if (ast.length === 0) { clearInterval(window.__tllWave); console.log("wave cleared in", ((performance.now() - t0) / 1000).toFixed(1) + "s"); }\n}, 1000);\nsetTimeout(function () { doBomb(); inp.f = 0; }, 20000);' }
    ],

    docs: [
      { topic: "What this panel is", text: "asteroids.html driven live. STATE reads the page's own globals (state, score, lives, level, arrays of rocks/bullets/UFOs/pickups) every 700 ms." },
      { topic: "Editable vs documented", text: "score, lives, level, nextLife, hi, shield, rapidT and the ASTSCORE awards are real globals or mutable object fields, so slider changes take effect immediately. Thrust, turn rate, speed cap and bullet speed are literals baked into upShip/shoot: those rows are READ ONLY and carry the exact source line, which the JSON export hands to the LLM to patch." },
      { topic: "Cheats", text: "God mode wraps hitShip; bomb, hyperspace and UFO spawn call the page's own functions, so audio, particles and scoring stay authentic." },
      { topic: "What is unreachable", text: "Everything in this page is top level, so no names are hidden in a closure; the only limits are inline literals, listed above as READ ONLY with their line numbers." },
      { topic: "Layout editing", text: "LAYOUT resizes and repositions the canvas, the touch control buttons and the title host per screen mode (portrait/landscape, mobile/desktop). The preview applies the bucket you edit; the export wraps each bucket in its media query." },
      { topic: "Texts", text: "asteroids.html uses the shared kit (i18n.js), so TEXTS edits kit keys for this page and re-translates live." }
    ]
  });
})();
