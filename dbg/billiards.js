/* Developer harness script for billiards.html (3D pool / trick-puzzle table).
   Loaded by the page loader when the URL has ?debug=dbg/billiards.js, after
   dbg/_harness.js. The page keeps its names at the top level of its script, so
   this script reads them directly - no window.TLHOOK bridge is needed here. */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  var H = window.TLHOOK || {};
  function B() { return H.balls || [] }
  function gs() { return H.G || null }
  function pk() { return H.POCKETS || [] }
  function num(v) { return (typeof v === "number" && isFinite(v)) ? v : 0 }

  /* physics wrap: freeze or slow-motion through the page's own step(dt) */
  var savedStep = null, mode = 1;
  function physicsWrap(m) {
    mode = m;
    if (typeof H.step !== "function") { TLDBG.toast("step() not reachable"); return }
    if (m === 1) { if (savedStep) { H.step = savedStep; savedStep = null } return }
    if (!savedStep) savedStep = H.step;
    var orig = savedStep;
    H.step = function (dt) { if (m === 0) return; orig(dt * 0.3) };
  }

  function restoreRack() {
    var bs = B(), n = 0;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.id !== 0 && b.sunk) { b.sunk = false; b.sink = 0; b.vx = 0; b.vz = 0; n++ }
    }
    TLDBG.toast("restored " + n + " potted ball(s) (still at their last position)");
  }
  function potNext() {
    var bs = B();
    for (var i = 1; i < bs.length; i++) if (!bs[i].sunk) { bs[i].sunk = true; bs[i].vx = 0; bs[i].vz = 0; TLDBG.toast("ball " + bs[i].id + " potted"); return }
    TLDBG.toast("table already clear");
  }
  function fullPowerShot() {
    var g = gs(); if (!g) return;
    g.power = 1;
    if (typeof H.fire === "function") H.fire(); else TLDBG.toast("fire() not reachable");
  }
  function spinMax() {
    var g = gs(); if (!g) return;
    g.spinX = 0.8; g.spinY = -0.8; g.elev = 25;
    if (typeof H.syncSpinUI === "function") H.syncSpinUI();
    TLDBG.toast("heavy draw+side spin set");
  }
  function clearShots() { var g = gs(); if (g) { g.shots = 0; TLDBG.toast("shot counter reset") } }
  function addScore(n) { var g = gs(); if (g) { g.score += n; if (typeof syncHud === "function") syncHud(); TLDBG.toast("+" + n + " score") } }

  TLDBG.register({
    game: "billiards",
    file: "billiards.html",
    state: function () {
      var g = gs(), bs = B(), live = 0;
      for (var i = 0; i < bs.length; i++) if (bs[i].id !== 0 && !bs[i].sunk) live++;
      var cue = bs[0] || {};
      return {
        phase: g ? g.phase : "-",
        mode: g ? g.mode : "-",
        turn: g ? g.turn : 0,
        score: g ? g.score : 0,
        shots: g ? g.shots : 0,
        potted: g ? g.potted : 0,
        streak: g ? g.streak : 0,
        scratch: g ? !!g.scratch : false,
        rolling: g ? !!g.rolling : false,
        paused: g ? !!g.paused : false,
        aim: g ? +(g.aim * 57.3).toFixed(1) : 0,
        power: g ? +num(g.power).toFixed(2) : 0,
        elev: g ? +num(g.elev).toFixed(1) : 0,
        spin: g ? (num(g.spinX).toFixed(2) + "," + num(g.spinY).toFixed(2)) : "0,0",
        zoom: g ? +num(g.zoom).toFixed(2) : 1,
        ballsOnTable: live,
        cueSpeed: cue.vx != null ? Math.round(Math.hypot(cue.vx, cue.vz) * 100) / 100 : 0,
        replayOn: g ? !!g.replayOn : false,
        replaying: g ? !!g.replaying : false,
        lang: (typeof H.LANG !== "undefined") ? H.LANG : "?"
      };
    },
    params: [
      { id: "rollDrag", label: "Rolling drag", unit: "/s", min: 0, max: 3, step: 0.01,
        readonly: true,
        get: function () { return (H.phys && num(H.phys.ROLL_DRAG)) || 0.55 },
        code: { file: "billiards.html", line: 776, name: "ROLL_DRAG" },
        doc: "READ ONLY const: how fast a rolling ball sheds speed. Lower = longer rolls, softer table" },
      { id: "transDamp", label: "Translation damping", unit: "/s", min: 0, max: 5, step: 0.05,
        readonly: true,
        get: function () { return (H.phys && num(H.phys.TRANS_DAMP)) || 1.25 },
        code: { file: "billiards.html", line: 776, name: "TRANS_DAMP" },
        doc: "READ ONLY const: cushion/impact damping applied to travel speed" },
      { id: "angDamp", label: "Spin damping", unit: "/s", min: 0, max: 6, step: 0.05,
        readonly: true,
        get: function () { return (H.phys && num(H.phys.ANG_DAMP)) || 1.4 },
        code: { file: "billiards.html", line: 776, name: "ANG_DAMP" },
        doc: "READ ONLY const: how quickly english (side spin) dies out" },
      { id: "stopSpeed", label: "Stop threshold", unit: "m/s", min: 0.01, max: 0.4, step: 0.005,
        readonly: true,
        get: function () { return (H.phys && num(H.phys.STOP_SPEED)) || 0.06 },
        code: { file: "billiards.html", line: 776, name: "STOP_SPEED" },
        doc: "READ ONLY const: below this speed a ball is considered stopped (ends the shot)" },
      { id: "maxAng", label: "Max spin rate", unit: "rad/s", min: 5, max: 160, step: 1,
        readonly: true,
        get: function () { return (H.phys && num(H.phys.MAX_ANG)) || 45 },
        code: { file: "billiards.html", line: 776, name: "MAX_ANG" },
        doc: "READ ONLY const: cap on angular speed, so spin cannot go infinite" },
      { id: "shotBase", label: "Shot speed base + span", unit: "m/s", min: 0.5, max: 14, step: 0.1,
        readonly: true,
        get: function () { return 9.7 },
        code: { file: "billiards.html", line: 827, name: "(2.0+7.7*pow(power,1.1))*(1-.28*sa)" },
        doc: "READ ONLY literal: 2.0 m/s at zero power up to 9.7 m/s at full power, minus 28% at maximum elevation" },
      { id: "cornerPocketR", label: "Corner pocket radius", unit: "m", min: 0.06, max: 0.2, step: 0.001,
        get: function () { var p = pk(); return p.length ? num(p[0].r) : 0 },
        set: function (v) { var p = pk(); for (var i = 0; i < 4 && i < p.length; i++) p[i].r = v },
        code: { file: "billiards.html", line: 724, name: "POCKETS[0..3].r" },
        doc: "Live pocket openings: write applies to all four corners; balls drop through the new gap on the next roll" },
      { id: "sidePocketR", label: "Side pocket radius", unit: "m", min: 0.05, max: 0.2, step: 0.001,
        get: function () { var p = pk(); return p.length > 4 ? num(p[4].r) : 0 },
        set: function (v) { var p = pk(); for (var i = 4; i < p.length; i++) p[i].r = v },
        code: { file: "billiards.html", line: 724, name: "POCKETS[4..5].r" },
        doc: "Middle side pockets on the long rails" },
      { id: "aim", label: "Aim angle", unit: "deg", min: -180, max: 180, step: 1,
        get: function () { var g = gs(); return g ? Math.round(num(g.aim) * 57.2958) : 0 },
        set: function (v) { var g = gs(); if (g) g.aim = v / 57.2958 },
        code: { file: "billiards.html", line: 981, name: "G.aim" },
        doc: "Current cue direction in degrees; the guide line follows it immediately" },
      { id: "power", label: "Shot power", unit: "0..1", min: 0, max: 1, step: 0.01,
        get: function () { var g = gs(); return g ? num(g.power) : 0 },
        set: function (v) { var g = gs(); if (g) g.power = v },
        code: { file: "billiards.html", line: 981, name: "G.power" },
        doc: "Charge amount; set it and press the Fire cheat to shoot at exactly this power" },
      { id: "elev", label: "Cue elevation", unit: "deg", min: -20, max: 70, step: 1,
        get: function () { var g = gs(); return g ? num(g.elev) : 0 },
        set: function (v) { var g = gs(); if (g) g.elev = v },
        code: { file: "billiards.html", line: 981, name: "G.elev" },
        doc: "Massa/sweep angle; high elevation removes up to 28% of shot speed" },
      { id: "zoom", label: "Camera zoom", unit: "x", min: 0.4, max: 3, step: 0.01,
        get: function () { var g = gs(); return g ? num(g.zoom) : 1 },
        set: function (v) { var g = gs(); if (g) g.zoom = v },
        code: { file: "billiards.html", line: 981, name: "G.zoom" },
        doc: "Camera distance multiplier for the current view" },
      { id: "replaySpeed", label: "Replay speed", unit: "x", min: 0.25, max: 3, step: 0.05,
        get: function () { var g = gs(); return g ? num(g.replaySpeed) : 1 },
        set: function (v) { var g = gs(); if (g) g.replaySpeed = v },
        code: { file: "billiards.html", line: 983, name: "G.replaySpeed" },
        doc: "Playback rate of the cinematic replay after a shot" },
      { id: "par", label: "Par for the rack", unit: "shots", min: 1, max: 60, step: 1,
        readonly: true,
        get: function () { return num(H.PAR) || 15 },
        code: { file: "billiards.html", line: 986, name: "PAR" },
        doc: "READ ONLY const used for the clear-bonus scoring; edit the source line to change par" }
    ],
    cheats: [
      { id: "freeze", label: "Freeze physics", doc: "wraps the page's step(dt) as a no-op while on; restores it when off",
        toggle: true, on: function (v) { physicsWrap(v ? 0 : 1) } },
      { id: "slow", label: "Slow motion (30%)", doc: "wraps step(dt) at 0.3x while on; restores when off",
        toggle: true, on: function (v) { physicsWrap(v ? 0.3 : 1) } },
      { id: "fire", label: "Fire at current power", doc: "sets power to 1 and calls the page's own fire()", run: fullPowerShot },
      { id: "potNext", label: "Pot the next ball", doc: "marks the first live ball sunk - for testing the shot-end rules", run: potNext },
      { id: "restore", label: "Un-pot every ball", doc: "brings potted balls back (at their last position) with zero velocity", run: restoreRack },
      { id: "spin", label: "Max english", doc: "sets heavy draw + side spin and cue elevation", run: spinMax },
      { id: "zeroShots", label: "Reset shot counter", doc: "G.shots = 0 so the clear bonus recomputes", run: clearShots },
      { id: "score1k", label: "+1000 score", doc: "adds to the current player's score", run: function () { addScore(1000) } },
      { id: "uncue", label: "Revive cue ball", doc: "un-sinks the cue ball so play can continue after a scratch test",
        run: function () { var bs = B(); if (bs[0]) { bs[0].sunk = false; bs[0].sink = 0; bs[0].vx = 0; bs[0].vz = 0; TLDBG.toast("cue ball revived") } } }
    ],
    hooks: [
      { label: "console.table balls", doc: "every ball: id, position, velocity, spin, sunk flag",
        run: function () { console.table(B().map(function (b) { return { id: b.id, x: +b.x.toFixed(3), z: +b.z.toFixed(3), vx: +b.vx.toFixed(3), vz: +b.vz.toFixed(3), sunk: b.sunk } })) } },
      { label: "log G (game state)", doc: "the whole G object: phase, mode, players, camera, replay",
        run: function () { console.log(gs()) } },
      { label: "log POCKETS / table consts", doc: "pocket openings and the geometry constants",
        run: function () { console.log(pk(), H.W != null ? { W: H.W, L: H.L, CUSH: H.CUSH, WOOD: H.WOOD, R: H.R } : null) } },
      { label: "log physics consts", doc: "the damping and threshold line as it currently stands",
        run: function () { console.log(H.phys || null) } }
    ],
    layout: [
      { sel: "#gl", label: "WebGL table canvas" },
      { sel: "#hud", label: "top HUD strip" },
      { sel: "#hudMode", label: "mode label" },
      { sel: "#hudScoreWrap", label: "score chip" },
      { sel: "#hudShotsWrap", label: "shots chip" },
      { sel: "#hudStreakWrap", label: "streak chip" },
      { sel: "#board", label: "ball board row" },
      { sel: ".chip", label: "each player chip" },
      { sel: ".balls", label: "ball icon row" },
      { sel: ".ball", label: "one ball icon" },
      { sel: ".hbtn", label: "HUD micro buttons" },
      { sel: "#banner", label: "banner line" },
      { sel: "#meter", label: "power meter" },
      { sel: "#meterFill", label: "power meter fill" },
      { sel: "#meterLbl", label: "power meter label" },
      { sel: "#nextWrap", label: "next-ball preview" },
      { sel: "#focusWrap", label: "focus-ball control" },
      { sel: "#miniPad", label: "touch mini pad" },
      { sel: "#miniElev", label: "elevation mini slider" },
      { sel: "#helpBtn", label: "help button" },
      { sel: "#helpPanel", label: "help panel" },
      { sel: "#modeGrid", label: "mode picker grid" },
      { sel: "#overPanel", label: "game-over panel" },
      { sel: "#clearPanel", label: "table-clear panel" },
      { sel: "#langOv", label: "language overlay" },
      { sel: "#nav", label: "nav button row" }
    ],
    texts: {
      langs: function () { var ls = H.LANGS || (typeof LANGS !== "undefined" ? LANGS : null); return ls ? ls.map(function (l) { return l[0] }) : ["en"] },
      keys: function (l) { var t = H.TR || (typeof TR !== "undefined" ? TR : {}); return Object.keys(t[l] || t.en || {}) },
      get: function (l, k) { var t = H.TR || (typeof TR !== "undefined" ? TR : {}); return (t[l] && t[l][k] != null) ? t[l][k] : ((t.en && t.en[k] != null) ? t.en[k] : "") },
      set: function (l, k, v) { var t = H.TR || (typeof TR !== "undefined" ? TR : null); if (!t) return; t[l] = t[l] || {}; t[l][k] = v },
      apply: function () { if (typeof H.applyLang === "function") H.applyLang() }
    },
    control: [
      { id: "start", label: "Rack a new game", args: "unused",
        doc: "Clicks the page's own #rackBtn — that builds the players, the rack and G.learn, so opponent-skill control needs a live game first.",
        run: function () {
          var b = document.getElementById("rackBtn");
          if (!b) return "no #rackBtn";
          b.click();
          var G = gs();
          return { players: G ? G.players.length : 0, turn: G ? G.turn : null, mode: G ? G.mode : null };
        } },
      { id: "players", label: "Seat count then rack", args: "2 - 4 players", argDefault: 2,
        doc: "Clicks the player-count chip (#pcBtns, the same buttons the setup screen builds) and then #rackBtn, so a CPU opponent seat exists for skill/seat control.",
        run: function (n) {
          var want = String(Math.max(2, Math.min(4, Math.round(Number(n) || 2))));
          var chips = document.querySelectorAll("#pcBtns .pcbtn");
          var hit = null;
          for (var i = 0; i < chips.length; i++) if (chips[i].textContent.trim() === want) { hit = chips[i]; break; }
          if (!hit) return "no count chip " + want + " for this mode (chips: " + [].map.call(chips, function (b) { return b.textContent.trim() }).join(",") + ")";
          hit.click();
          var rack = document.getElementById("rackBtn"); if (rack) rack.click();
          var G = gs();
          return { count: want, players: G ? G.players.length : 0, seats: G ? G.players.map(function (p) { return p.human ? "human" : "CPU" }) : [] };
        } },
      { id: "skill", label: "CPU opponent skill", args: '[playerIndex, "auto"|"rookie"|"amateur"|"pro"|"shark"|"legend"]', argDefault: '[1, "legend"]',
        doc: "p.skill feeds cpuSkill: a named value is used as-is, 'auto' estimates it from G.learn (pot rate, fouls, spin use, curve success) against the human players' mean. The search depth and shot-error scaling follow that number.",
        run: function (a) {
          var G = gs(); if (!G) return "no game state";
          var p = G.players[+a[0] || 0]; if (!p) return "no player " + a[0];
          var v = String(a[1]);
          if (["auto", "rookie", "amateur", "pro", "shark", "legend"].indexOf(v) < 0) return "unknown skill " + v;
          p.skill = v;
          return { player: +a[0] || 0, skill: v, human: !!p.human, learn: G.learn[+a[0] || 0] || null };
        } },
      { id: "seat", label: "Seat human or CPU", args: '[playerIndex, "human" | "cpu"]', argDefault: '[0, "cpu"]',
        doc: "isHuman() reads G.players[G.turn].human — flip a seat to CPU and the shot routine (cpuSearch → G.cpuAim easing → fire) takes over that player's turns.",
        run: function (a) {
          var G = gs(); if (!G) return "no game state";
          var p = G.players[+a[0] || 0]; if (!p) return "no player " + a[0];
          p.human = a[1] === "human";
          return { player: +a[0] || 0, human: !!p.human, turn: G.turn, cpuBusy: !!G.cpuBusy };
        } },
      { id: "turn", label: "Force the active player", args: "player index", argDefault: 1,
        doc: "G.turn = index; do it while the balls are asleep (G.rolling false) so the next shot belongs to that seat.",
        run: function (i) {
          var G = gs(); if (!G) return "no game state";
          if (G.rolling) return "balls still rolling";
          G.turn = +i || 0;
          return { turn: G.turn, human: !!G.players[G.turn].human, skill: G.players[G.turn].skill };
        } },
      { id: "aimTo", label: "Aim and set power", args: "[radians, power 0-1]", argDefault: "[0, 0.6]",
        doc: "Writes G.aim (radians, atan2 style) and G.power directly, bypassing the mouse — pair with fire() to shoot a exact line.",
        run: function (a) {
          var G = gs(); if (!G) return "no game state";
          G.aim = Number(a[0]); G.power = Math.max(0, Math.min(1, Number(a[1])));
          return { aimDeg: num(G.aim * 57.2958), power: num(G.power), cue: { x: num(B()[0] ? B()[0].x : 0), z: num(B()[0] ? B()[0].z : 0) } };
        } },
      { id: "shoot", label: "Shoot with a given power", args: "power 0-1", argDefault: 0.7,
        doc: "Sets G.power then calls the page's own fire() (same path as the spacebar), so cooldown/sleep checks behave exactly as in play.",
        run: function (pw) {
          var G = gs(), H = window.TLHOOK || {}; if (!G) return "no game state";
          if (G.rolling) return "balls still rolling";
          G.power = Math.max(0, Math.min(1, Number(pw) || 0.5));
          if (typeof H.fire === "function") H.fire();
          return { power: num(G.power), rolling: !!G.rolling, shots: G.shots };
        } },
      { id: "cueTo", label: "Place the cue ball", args: "[x, z] table coords", argDefault: "[0, -0.2]",
        doc: "Moves balls[0] (the cue) and clears its velocity — set up a shot line or reproduce a scratch position.",
        run: function (a) {
          var cue = B()[0]; if (!cue) return "no cue ball";
          cue.x = Number(a[0]); cue.z = Number(a[1]); cue.vx = 0; cue.vz = 0; cue.wz = 0;
          return { cue: { x: num(cue.x), z: num(cue.z) }, sunk: !!cue.sunk };
        } },
      { id: "probe", label: "Read the CPU shot routine", args: "unused",
        doc: "G.cpuBusy, G.cpuAim (from/to aim, power, spin, easing t and dur) and the per-player learning counters that drive 'auto' skill.",
        run: function () {
          var G = gs(); if (!G) return "no game state";
          var a = G.cpuAim;
          return { turn: G.turn, rolling: !!G.rolling, cpuBusy: !!G.cpuBusy,
            aimDeg: num(G.aim * 57.2958), power: num(G.power), spin: [num(G.spinX), num(G.spinY)], elev: num(G.elev),
            cpuAim: a ? { fromDeg: num(a.from.aim * 57.2958), toDeg: num(a.to.aim * 57.2958), toPower: num(a.to.power), t: num(a.t), dur: num(a.dur) } : null,
            players: G.players.map(function (p, i) { return { i: i, human: !!p.human, skill: p.skill, score: p.score, out: !!p.out, learn: G.learn[i] || null }; }) };
        } },
      { id: "learnReset", label: "Reset a player's learning", args: "player index", argDefault: 1,
        doc: "Zeroes G.learn[i] counters so skillEstimate falls back to 0.4 — the clean slate for measuring how the adaptive opponent re-learns.",
        run: function (i) {
          var G = gs(); if (!G) return "no game state";
          var k = +i || 0;
          if (G.learn[k]) G.learn[k] = { shots: 0, pots: 0, fouls: 0, spin: 0, curve: 0, curvePots: 0 };
          return { player: k, learn: G.learn[k] || null };
        } },
      { id: "aiWatch", label: "Trace the bot's aiming", args: "seconds (0 stops)", argDefault: 0.5,
        doc: "Logs aim easing, power, spin and turn every N seconds while the CPU searches and shoots; window.__tllPool holds the timer.",
        run: function (s) {
          if (window.__tllPool) { clearInterval(window.__tllPool); window.__tllPool = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllPool = setInterval(function () {
            var G = gs(), a = G && G.cpuAim;
            console.log("turn", G && G.turn, "human", G && G.players[G.turn] ? !!G.players[G.turn].human : "-",
              "aim", G ? num(G.aim * 57.2958) : "-", "power", G ? num(G.power) : "-",
              "busy", G && !!G.cpuBusy, a ? ("to " + num(a.to.aim * 57.2958) + " deg, t " + num(a.t) + "/" + num(a.dur)) : "");
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "CPU versus CPU, legend against adaptive",
        doc: "Seat 0 becomes a legend, seat 1 keeps 'auto' (learns from play), and nobody is human — the table plays itself.",
        js: 'var H = window.TLHOOK, G = H.G;\nvar chips = document.querySelectorAll("#pcBtns .pcbtn");\nfor (var i = 0; i < chips.length; i++) if (chips[i].textContent.trim() === "2") chips[i].click();\ndocument.getElementById("rackBtn").click();\nG.players[0].human = false; G.players[0].skill = "legend";\nif (G.players[1]) { G.players[1].human = false; G.players[1].skill = "auto"; }\nG.turn = 0;\nsetInterval(function () {\n  console.log("turn", G.turn, "aim", (G.aim * 57.3).toFixed(1), "power", G.power.toFixed(2), "shots", G.shots, "rolling", G.rolling);\n}, 700);' },
      { label: "Measure the adaptive skill estimate",
        doc: "Prints the raw learning counters and the derived skill band after every shot — the numbers behind 'auto' opponents.",
        js: 'var G = window.TLHOOK.G;\nwindow.__tllLearn = setInterval(function () {\n  console.table(G.players.map(function (p, i) {\n    var L = G.learn[i] || { shots: 0, pots: 0, fouls: 0, spin: 0, curve: 0, curvePots: 0 };\n    return { i: i, human: !!p.human, skill: p.skill, shots: L.shots, pots: L.pots,\n      potRate: L.shots ? +(L.pots / L.shots).toFixed(2) : 0, foulRate: L.shots ? +(L.fouls / L.shots).toFixed(2) : 0 };\n  }));\n}, 2000);' },
      { label: "Exact-line shot test",
        doc: "Parks the cue ball, aims straight at a target ball's angle and fires at a fixed power — physics without mouse noise.",
        js: 'var H = window.TLHOOK, G = H.G, balls = H.balls;\nvar cue = balls[0], tgt = balls.find(function (b, i) { return i > 0 && !b.sunk; });\nif (cue && tgt) {\n  cue.x = 0; cue.z = 0.6; cue.vx = cue.vz = 0;\n  G.aim = Math.atan2(tgt.x - cue.x, tgt.z - cue.z);\n  G.power = 0.65;\n  setTimeout(function () { H.fire(); console.log("fired at", (G.aim * 57.3).toFixed(1), "deg"); }, 300);\n}' },
      { label: "Pocket-line scratch repro",
        doc: "Places the cue ball on the nearest pocket line and shoots it: reproduces a scratch to test the ball-in-hand and CPU-placement path.",
        js: 'var H = window.TLHOOK, G = H.G, balls = H.balls, POCK = H.POCKETS;\nvar cue = balls[0], pk = POCK[0];\nif (cue && pk) {\n  cue.x = pk.x * 0.7; cue.z = pk.z * 0.7;\n  G.aim = Math.atan2(pk.x - cue.x, pk.z - cue.z);\n  G.power = 0.8;\n  setTimeout(function () { H.fire(); }, 300);\n}' }
    ],

    docs: [
      { topic: "What this panel is", text: "billiards.html driven live: STATE reads the page's own G object and the balls array every 700 ms, so you watch phase, rolling, power, spin and the ball count change while you play." },
      { topic: "How it reaches the game", text: "billiards.html wraps its whole game in one strict IIFE, so the page exports a single window.TLHOOK handle (end of that IIFE) with names only: G, balls, POCKETS, the patchable step(dt), LANG, TR/LANGS, fire/applyLang/syncSpinUI, PAR and the geometry/physics constants. Nothing in the page runs from it and behaviour is identical with or without ?debug." },
      { topic: "Editable vs documented", text: "Pocket radii, aim, power, elevation, zoom and replay speed write live and take effect immediately. The damping set (TRANS_DAMP, ROLL_DRAG, ANG_DAMP, STOP_SPEED, MAX_ANG), the shot-speed formula and PAR are consts baked into the physics: those rows are READ ONLY and export their exact source line (776, 827, 986) for the LLM to patch." },
      { topic: "Cheats", text: "Freeze physics and slow motion wrap the page's own step(dt) and restore it when switched off. Pot-next and un-pot rewrite the balls array so you can force shot-end, scratch and table-clear paths. Fire shoots at the power slider value." },
      { topic: "Layout editing", text: "LAYOUT resizes and repositions the HUD strip, player chips, ball board, power meter, mini pad, help and overlay panels per screen mode (portrait/landscape, mobile/desktop). The preview applies the bucket you are editing; the export wraps each bucket in its media query." },
      { topic: "Texts", text: "The page keeps its own TR table (14 languages, keys per language) and re-translates with applyLang(). TEXTS edits TR for the selected language and re-renders immediately. Language codes come from LANGS." }
    ]
  });
})();
