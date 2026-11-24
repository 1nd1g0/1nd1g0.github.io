/* dbg/pinball.js — developer harness for pinball.html (3D/OpenGL pinball table)
 *
 * Load with:  pinball.html?debug=dbg/pinball.js
 * pinball.html wraps its game in a strict IIFE; the last block publishes
 * window.TLHOOK (names only), which everything here reads: update, stepBall,
 * updFlipper, collideFlipper, launchBall, servePlunger, newBallObj, startGame,
 * commitAndStart, toMenu, pauseGame, resumeGame, nextBall, drainBall, addScore,
 * onBumper, onSling, hitTarget, resetBank, startMultiball, onRampComplete,
 * nudge, doTilt, setQual, pcSetZoom, buildTable, updChips, updHeat, spawnParts,
 * store plus G, L, RULES, DIFFS, BALL_R, MAXV, DT, PASS, PERF, held, dynCam.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK); }
  function gs() { return h().G }
  function ly() { return h().L }

  var realUpdate = null, scale = null, saveMode = false;
  function apply() {
    var T = h();
    if (!realUpdate) realUpdate = T.update;
    if (scale === null && !saveMode) { T.update = realUpdate; return; }
    T.update = function (dt) {
      realUpdate(scale === null ? dt : dt * scale);
      if (saveMode && ly()) gs().saveT = Math.max(gs().saveT, ly().diff.save * 0.5);
    };
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }
  function row() { var G = gs(); return h().DIFFS[G.diff] || h().DIFFS.classic }
  function fl(i) { var L = ly(); return L && L.flippers && L.flippers[i] ? L.flippers[i] : null }
  function lyv(key, v) { var L = ly(); if (!L) return v === undefined ? 0 : undefined; if (v === undefined) return L[key]; L[key] = v }

  TLDBG.register({
    game: "pinball", file: "pinball.html",

    state: function () {
      var G = gs(), L = ly(), T = h();
      return {
        phase: G.state, seed: G.seed, difficulty: G.diff, build: G.build,
        score: G.score, displayScore: G.disp, highScore: G.hi, highBeaten: G.hiBeaten,
        ballNum: G.ballNum, multiplier: G.mult, bonus: G.bonus, locks: G.locks, multiball: G.multiball,
        ballsOnField: G.balls.length,
        plungerBalls: G.balls.filter(function (b) { return b.state === "plunger" }).length,
        charging: G.charging, charge: num(G.charge, 100),
        ballSaveLeft: num(G.saveT, 10), skillTimer: num(G.skillT, 10),
        tiltHeat: G.tiltHeat, tilted: G.tilted, clock: num(G.clock, 10),
        lanesLit: G.lanes.filter(Boolean).length, jackLit: G.jackLit, lockLit: G.lockLit, rampLit: G.rampLit,
        dropTargetsDown: L && L.targets ? L.targets.filter(function (t) { return !t.up }).length : 0,
        dropTargetsTotal: L && L.targets ? L.targets.length : 0,
        bumpersHit: G.stats.bump, rampsDone: G.stats.ramp, jackpots: G.stats.jack,
        segments: L ? L.segs.length : 0, circles: L ? L.circles.length : 0, posts: L ? L.posts.length : 0,
        flippers: L ? L.flippers.length : 0, bumpers: L ? L.bumpers.length : 0,
        quality: G.qual, autoQuality: G.autoQual, eco: T.PERF.eco, emaMs: num(G.ema, 10),
        zoom: num(G.zoom, 100), zoomCur: num(G.zoomCur, 100), dynamicCam: G.dynamicCam,
        cameraView: G.camName[G.cam] || G.cam, cam: num(G.cam, 10), roll: num(G.roll, 1000), shake: num(G.shake, 1000),
        giBrightness: num(G.gi, 100), message: G.msg, extraAt: L ? L.extraAt : 0,
        timersQueued: G.timers.length, glLost: G.glLost, bootReady: G.booted
      };
    },

    params: [
      { id: "gravMult", label: "Gravity multiplier", unit: "x", min: 0.8, max: 2.2, step: 0.02,
        get: function () { return row().g }, set: function (v) { row().g = v },
        code: { file: "pinball.html", line: 808, name: "DIFFS[G.diff].g" },
        doc: "Slope acceleration of the ACTIVE difficulty row (easy 1.26 / classic 1.4 / wild 1.56). stepBall reads it every tick, so this is the live fall-speed knob." },
      { id: "powerMult", label: "Flipper power multiplier", unit: "x", min: 0.6, max: 1.8, step: 0.02,
        get: function () { return row().power }, set: function (v) { row().power = v },
        code: { file: "pinball.html", line: 808, name: "DIFFS[G.diff].power" },
        doc: "Launch/flip strength multiplier for the active row (1.0 / 1.06 / 1.14), applied in collideFlipper." },
      { id: "ballSave", label: "Ball-save duration", unit: "s", min: 1, max: 30, step: 1,
        get: function () { return row().save }, set: function (v) { row().save = Math.max(0.5, v) },
        code: { file: "pinball.html", line: 808, name: "DIFFS[G.diff].save" },
        doc: "Seconds of ball save granted at launch (12 / 8 / 5). launchBall reads it; CHEATS: keep ball save re-arms it continuously." },
      { id: "ballRadius", label: "Ball radius", unit: "table units", min: 0.012, max: 0.05, step: 0.001,
        get: function () { return h().BALL_R }, set: function (v) { h().BALL_R = v },
        code: { file: "pinball.html", line: 824, name: "BALL_R" },
        doc: "Live collision radius (0.026). Static geometry was built from RULES.ball, so a value far from 0.026 opens gaps or jams lanes — use it to probe margin, not to redesign the table." },
      { id: "maxVel", label: "Ball speed cap", unit: "units/s", min: 1.5, max: 10, step: 0.1,
        get: function () { return h().MAXV }, set: function (v) { h().MAXV = v },
        code: { file: "pinball.html", line: 824, name: "MAXV" },
        doc: "stepBall clamps |v| to MAXV (4.6). Raising it lets a full-power plunger shot cross the table in one step." },
      { id: "flLenL", label: "Left flipper length", unit: "table units", min: 0.06, max: 0.24, step: 0.005,
        get: function () { var f = fl(0); return f ? f.len : 0 }, set: function (v) { var f = fl(0); if (f) f.len = v },
        code: { file: "pinball.html", line: 1731, name: "L.flippers[0].len" },
        doc: "Live arm length of the left flipper (solved from RULES.flipLen). collideFlipper uses it every contact, so it takes effect immediately." },
      { id: "flRestL", label: "Left flipper rest angle", unit: "rad", min: -0.2, max: 1.4, step: 0.01,
        get: function () { var f = fl(0); return f ? f.rest : 0 }, set: function (v) { var f = fl(0); if (f) f.rest = v },
        code: { file: "pinball.html", line: 1686, name: "L.flippers[0].rest" },
        doc: "Idle angle (RULES.flipRest 0.55, mirrored per side). A raised rest angle points the ball up the div." },
      { id: "flUpL", label: "Left flipper fire angle", unit: "rad", min: -1.4, max: 0.6, step: 0.01,
        get: function () { var f = fl(0); return f ? f.up : 0 }, set: function (v) { var f = fl(0); if (f) f.up = v },
        code: { file: "pinball.html", line: 1686, name: "L.flippers[0].up" },
        doc: "Pressed angle (RULES.flipUp -0.62) — the shot line of the left flipper." },
      { id: "flLenR", label: "Right flipper length", unit: "table units", min: 0.06, max: 0.24, step: 0.005,
        get: function () { var f = fl(1); return f ? f.len : 0 }, set: function (v) { var f = fl(1); if (f) f.len = v },
        code: { file: "pinball.html", line: 1731, name: "L.flippers[1].len" },
        doc: "Live arm length of the right flipper." },
      { id: "flRestR", label: "Right flipper rest angle", unit: "rad", min: 1.6, max: 3.6, step: 0.01,
        get: function () { var f = fl(1); return f ? f.rest : 0 }, set: function (v) { var f = fl(1); if (f) f.rest = v },
        code: { file: "pinball.html", line: 1686, name: "L.flippers[1].rest" },
        doc: "Idle angle of the right flipper (PI - RULES.flipRest)." },
      { id: "flUpR", label: "Right flipper fire angle", unit: "rad", min: 2.4, max: 4.4, step: 0.01,
        get: function () { var f = fl(1); return f ? f.up : 0 }, set: function (v) { var f = fl(1); if (f) f.up = v },
        code: { file: "pinball.html", line: 1686, name: "L.flippers[1].up" },
        doc: "Pressed angle of the right flipper (PI - RULES.flipUp)." },
      { id: "slingKick", label: "Sling shot kick", unit: "units/s", min: 1, max: 5, step: 0.05,
        get: function () { return lyv("slingKick") }, set: function (v) { lyv("slingKick", v) },
        code: { file: "pinball.html", line: 1175, name: "L.slingKick" },
        doc: "Kick speed baked into the sling faces (2.4 + seeded jitter). The seg objects carry a copy, so this slider takes effect on the NEXT table build (CHEATS: commit seed and start)." },
      { id: "extraAt", label: "Extra-ball threshold", unit: "points", min: 100000, max: 1000000, step: 50000,
        get: function () { return lyv("extraAt") }, set: function (v) { lyv("extraAt", Math.max(1000, v)) },
        code: { file: "pinball.html", line: 1302, name: "L.extraAt" },
        doc: "Score at which addScore grants the extra ball ((8..12)*50000, seeded). Live-editable mid-run to test the award path." },
      { id: "laneTop", label: "Skill-lane top y", unit: "table units", min: 0.08, max: 0.3, step: 0.005,
        get: function () { return lyv("laneTop") }, set: function (v) { lyv("laneTop", v) },
        code: { file: "pinball.html", line: 1176, name: "L.laneTop" },
        doc: "Upper bound of the skill-lane window (0.14 + jitter). Geometry is baked at build time; edit then rebuild to see it move." },
      { id: "laneBot", label: "Skill-lane bottom y", unit: "table units", min: 0.2, max: 0.45, step: 0.005,
        get: function () { return lyv("laneBot") }, set: function (v) { lyv("laneBot", v) },
        code: { file: "pinball.html", line: 1176, name: "L.laneBot" },
        doc: "Lower bound of the skill-lane window (0.30 + jitter)." },
      { id: "score", label: "Score", unit: "points", min: 0, max: 9999999, step: 1000,
        get: function () { return gs().score }, set: function (v) { var G = gs(); G.score = Math.max(0, Math.round(v)); G.dmdDirty = true },
        code: { file: "pinball.html", line: 817, name: "G.score" },
        doc: "Writes the run score directly (the display counter eases toward it). addScore applies the multiplier; this row does not." },
      { id: "mult", label: "Multiplier", unit: "x", min: 1, max: 12, step: 1,
        get: function () { return gs().mult }, set: function (v) { var G = gs(); G.mult = Math.max(1, Math.round(v)); if (typeof h().updChips === "function") h().updChips() },
        code: { file: "pinball.html", line: 817, name: "G.mult" },
        doc: "Score multiplier; addScore multiplies every award by it and #multChip repaints via updChips." },
      { id: "ballNum", label: "Ball number", unit: "ball", min: 1, max: 9, step: 1,
        get: function () { return gs().ballNum }, set: function (v) { gs().ballNum = Math.max(1, Math.round(v)) },
        code: { file: "pinball.html", line: 817, name: "G.ballNum" },
        doc: "Current ball in #ballDots. nextBall increments it; the game ends past the last ball." },
      { id: "bonus", label: "End-of-ball bonus", unit: "points", min: 0, max: 200000, step: 500,
        get: function () { return gs().bonus }, set: function (v) { gs().bonus = Math.max(0, Math.round(v)) },
        code: { file: "pinball.html", line: 817, name: "G.bonus" },
        doc: "Accumulated from bumpers (+100) and drop targets (+1000); paid by endOfBall. doTilt zeroes it." },
      { id: "locks", label: "Multiball locks", unit: "locks", min: 0, max: 3, step: 1,
        get: function () { return gs().locks }, set: function (v) { var G = gs(); G.locks = Math.max(0, Math.round(v)); if (typeof h().updChips === "function") h().updChips() },
        code: { file: "pinball.html", line: 817, name: "G.locks" },
        doc: "Locked balls toward multiball (startMultiball clears them); #lock0/#lock1 dots follow updChips." },
      { id: "tiltHeat", label: "Tilt heat", unit: "0-3", min: 0, max: 3, step: 1,
        get: function () { return gs().tiltHeat },
        set: function (v) { var G = gs(); G.tiltHeat = Math.max(0, Math.min(3, Math.round(v))); if (typeof h().updHeat === "function") h().updHeat(); if (G.tiltHeat >= 3 && typeof h().doTilt === "function") h().doTilt() },
        code: { file: "pinball.html", line: 817, name: "G.tiltHeat" },
        doc: "Nudge fuse. nudge adds 1 and doTilt fires at 3; writing 3 here triggers the tilt through the page's own path." },
      { id: "ballSaveTimer", label: "Ball-save time left", unit: "s", min: 0, max: 30, step: 0.5,
        get: function () { return gs().saveT }, set: function (v) { gs().saveT = Math.max(0, v) },
        code: { file: "pinball.html", line: 818, name: "G.saveT" },
        doc: "Countdown the drain check consults. Set it to 10 mid-run to see the save kicker catch the ball." },
      { id: "skillTimer", label: "Launch skill window", unit: "s", min: 0, max: 10, step: 0.5,
        get: function () { return gs().skillT }, set: function (v) { gs().skillT = Math.max(0, v) },
        code: { file: "pinball.html", line: 818, name: "G.skillT" },
        doc: "Window after launch in which the skill-lane bonus can be earned (launchBall sets 4 s)." },
      { id: "zoom", label: "Camera zoom", unit: "0.85-2.6", min: 0.85, max: 2.6, step: 0.05,
        get: function () { return gs().zoom },
        set: function (v) { if (typeof h().pcSetZoom === "function") h().pcSetZoom(v); else gs().zoom = Math.max(0.85, Math.min(2.6, v)) },
        code: { file: "pinball.html", line: 2174, name: "pcSetZoom" },
        doc: "Uses the page's own setter (clamps 0.85..2.6, updates #pcZoomVal and persists to localStorage)." },
      { id: "quality", label: "Render quality", unit: "0 low / 1 high", min: 0, max: 1, step: 1,
        get: function () { return gs().qual === "low" ? 0 : 1 },
        set: function (v) { var q = Math.round(v) === 0 ? "low" : "high"; if (typeof h().setQual === "function") h().setQual(q); else gs().qual = q },
        code: { file: "pinball.html", line: 2004, name: "setQual" },
        doc: "setQual flips the #qualSeg buttons, stores the value and changes the frame-rate target in frame(). G.autoQual may drop you to low if measured frame time (G.ema) exceeds 34 ms." },
      { id: "ecoMode", label: "Eco frame limiter", unit: "0/1", min: 0, max: 1, step: 1,
        get: function () { return h().PERF.eco ? 1 : 0 },
        set: function (v) { var on = Math.round(v) === 1; h().PERF.eco = on; if (typeof h().store === "function") h().store("eco", on ? "1" : "0") },
        code: { file: "pinball.html", line: 827, name: "PERF.eco" },
        doc: "frame targets 20 fps in menu / 30 in play / 4 fps when paused with eco on. Writes the same localStorage key the page reads." },
      { id: "step", label: "Fixed timestep", unit: "s", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().DT },
        code: { file: "pinball.html", line: 824, name: "DT" },
        doc: "Read-only here: frame accumulates real time into update(DT) slices (1/120, max 6 per frame). Use slow motion instead of changing it." },
      { id: "passWidth", label: "Outlane pass width", unit: "table units", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().PASS },
        code: { file: "pinball.html", line: 777, name: "PASS" },
        doc: "Read-only (0.078): the pass-through gap used while solving the lower apron. Live changes would not rebuild the baked geometry — edit RULES.pass and rebuild from seed." },
      { id: "flipLenRule", label: "Flipper length rule", unit: "table units", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return h().RULES.flipLen },
        code: { file: "pinball.html", line: 1103, name: "RULES.flipLen" },
        doc: "Read-only reference (0.15). RULES feeds solveLower/buildSide at table build; the live per-flipper lengths are the editable flLenL/flLenR rows." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "update becomes a no-op: flipper motion, ball physics, timers, tilt fuse and ball save all stop while rendering continues.",
        on: function (v) { scale = v ? 0 : null; apply() } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "Scales the delta handed to update(): ball, flippers, timers, GI flashes and shake all slow together.",
        on: function (v) { scale = v ? 0.3 : null; apply() } },
      { id: "keepSave", label: "Keep ball save armed", toggle: true,
        doc: "After each update G.saveT is topped up to half the difficulty's save time, so the save kicker never expires.",
        on: function (v) { saveMode = !!v; apply() } },
      { id: "holdLeft", label: "Hold left flipper", toggle: true,
        doc: "held.l = true: updFlipper drives the flipper to its fire angle without keyboard input.",
        on: function (v) { h().held.l = !!v } },
      { id: "holdRight", label: "Hold right flipper", toggle: true,
        doc: "held.r = true.",
        on: function (v) { h().held.r = !!v } },
      { id: "startGame", label: "Start a game",
        doc: "startGame(): the page's own reset (score, balls, chips, plunger serve).",
        run: function () { h().startGame(); TLDBG.toast("ball " + gs().ballNum); } },
      { id: "commitSeed", label: "Commit seed and start",
        doc: "commitAndStart(): reads #seedInput, rebuilds the table for that seed if it changed, then starts.",
        run: function () { h().commitAndStart(); TLDBG.toast("seed " + gs().seed); } },
      { id: "serveBall", label: "Serve a ball in the lane",
        doc: "servePlunger(): new plunger ball, charge reset, random skill lane.",
        run: function () { h().servePlunger(); TLDBG.toast("balls " + gs().balls.length); } },
      { id: "launchFull", label: "Launch at full power",
        doc: "G.charge = 1 then launchBall(1): maximum plunger shot, arms ball save and the skill window.",
        run: function () { var G = gs(); G.charge = 1; h().launchBall(1); TLDBG.toast("launched"); } },
      { id: "dropBall", label: "Drop another ball on the field",
        doc: "newBallObj at the upper playfield with a live state — instant multiball without the lock path.",
        run: function () {
          var b = h().newBallObj(0.2, 0.5); b.state = "live"; b.vy = 0.8; b.h = 0.02; b.vh = 1.0;
          gs().balls.push(b); TLDBG.toast("balls " + gs().balls.length);
        } },
      { id: "multiball", label: "Start multiball",
        doc: "startMultiball(): three balls out of the saucer on delayed timers, jack lit.",
        run: function () { h().startMultiball(); TLDBG.toast("multiball"); } },
      { id: "plusScore", label: "Add 100000 points",
        doc: "addScore(100000) through the real path: multiplier, DMD, extra-ball and high-score checks all fire.",
        run: function () { h().addScore(100000); TLDBG.toast("score " + gs().score.toLocaleString()); } },
      { id: "lightLanes", label: "Light all skill lanes",
        doc: "G.lanes = [true,true,true] and repaints the chips.",
        run: function () { gs().lanes = [true, true, true]; if (typeof h().updChips === "function") h().updChips(); TLDBG.toast("lanes lit"); } },
      { id: "lightAll", label: "Light jack, lock and ramp",
        doc: "Sets the three feature lights so any feature shot can be tested immediately.",
        run: function () { var G = gs(); G.jackLit = true; G.lockLit = true; G.rampLit = true; if (typeof h().updChips === "function") h().updChips(); TLDBG.toast("features lit"); } },
      { id: "raiseBank", label: "Raise drop-target bank",
        doc: "resetBank(): every target up again with the bank-reset sound.",
        run: function () { h().resetBank(); TLDBG.toast("bank raised"); } },
      { id: "knockBank", label: "Knock down drop targets",
        doc: "hitTarget on every standing target: score, dropState and segment lights follow.",
        run: function () {
          var L = ly(); if (!L || !L.targets) { TLDBG.toast("no table built"); return; }
          L.targets.forEach(function (t) { if (t.up) h().hitTarget(t) });
          TLDBG.toast("targets down");
        } },
      { id: "bumperFrenzy", label: "Trigger every bumper",
        doc: "onBumper for each bumper: score, flash, particles, shake and stats.",
        run: function () {
          var L = ly(); if (!L || !L.bumpers) { TLDBG.toast("no table built"); return; }
          L.bumpers.forEach(function (b) { h().onBumper(b) });
          TLDBG.toast("bumpers " + gs().stats.bump);
        } },
      { id: "nudgeLeft", label: "Nudge left",
        doc: "nudge(-1,0): pushes live balls, shakes, adds 1 tilt heat.",
        run: function () { h().nudge(-1, 0); TLDBG.toast("heat " + gs().tiltHeat) } },
      { id: "nudgeRight", label: "Nudge right",
        doc: "nudge(1,0).",
        run: function () { h().nudge(1, 0); TLDBG.toast("heat " + gs().tiltHeat) } },
      { id: "forceTilt", label: "Force tilt",
        doc: "doTilt(): tilt stamp, bonus zeroed, flippers dead.",
        run: function () { h().doTilt(); TLDBG.toast("tilted"); } },
      { id: "clearTilt", label: "Clear tilt", toggle: true,
        doc: "Forces tilted off, heat to 0, hides #tiltStamp and repaints the dots so scoring works again.",
        on: function (v) {
          if (!v) return;
          var G = gs(); G.tilted = false; G.tiltHeat = 0;
          if (typeof h().updHeat === "function") h().updHeat();
          var st = document.getElementById("tiltStamp"); if (st) st.className = "";
          TLDBG.toast("tilt cleared");
        } },
      { id: "cycleCam", label: "Cycle camera view",
        doc: "G.cam++ through the three names in G.camName (CLASSIC / ACTION / OVERHEAD).",
        run: function () { var G = gs(); G.cam = (G.cam + 1) % G.camName.length; TLDBG.toast(G.camName[G.cam]) } },
      { id: "pause", label: "Pause",
        doc: "pauseGame(): shows the pause overlay and drops the frame target.",
        run: function () { h().pauseGame(); TLDBG.toast("paused"); } },
      { id: "resume", label: "Resume",
        doc: "resumeGame().",
        run: function () { h().resumeGame(); TLDBG.toast("resumed"); } },
      { id: "toMenu", label: "Back to menu",
        doc: "toMenu(): clears balls/timers and shows the title overlay.",
        run: function () { h().toMenu(); TLDBG.toast("menu"); } },
      { id: "hideUi", label: "Hide HUD and overlays", toggle: true,
        doc: "Display:none on #ui, #hudBar and #topbar for clean captures of the rendered table.",
        on: function (v) { ["ui", "hudBar", "topbar"].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = v ? "none" : "" }) } }
    ],

    hooks: [
      { label: "Console: balls", doc: "Every ball object: position, velocity, height, state, stuck/pocket timers.",
        run: function () {
          console.table(gs().balls.map(function (b, i) {
            return { i: i, x: num(b.x, 1000), y: num(b.y, 1000), vx: num(b.vx, 1000), vy: num(b.vy, 1000),
              h: num(b.h, 1000), vh: num(b.vh, 1000), state: b.state, rideS: num(b.rideS, 1000), heldT: num(b.heldT, 100),
              stuck: num(b.stuck, 100), pocketT: num(b.pocketT, 100), lostT: num(b.lostT, 100), feedT: num(b.feedT, 100), rescueN: b.rescueN };
          }));
        } },
      { label: "Console: flippers", doc: "Pivot, angle, target angles, angular velocity and pressed flag for both flipper objects.",
        run: function () {
          var L = ly(); if (!L) { console.log("no table built yet"); return; }
          console.table(L.flippers.map(function (f, i) {
            return { i: i, side: i === 0 ? "left" : "right", px: num(f.px, 1000), py: num(f.py, 1000), len: num(f.len, 1000),
              rest: num(f.rest, 1000), up: num(f.up, 1000), theta: num(f.th, 1000), omega: num(f.w, 100), pressed: !!f.pressed };
          }));
        } },
      { label: "Console: table geometry", doc: "Collider inventory: segment kinds, circles, posts, saucer, guides, bumpers with values and flashes.",
        run: function () {
          var L = ly(); if (!L) { console.log("no table built yet"); return; }
          var kinds = {};
          L.segs.forEach(function (s) { var k = s.type || "wall"; kinds[k] = (kinds[k] || 0) + 1 });
          console.log({
            seed: gs().seed, difficulty: gs().diff, extraAt: L.extraAt, slingKick: num(L.slingKick, 100),
            laneTop: num(L.laneTop, 1000), laneBot: num(L.laneBot, 1000),
            segs: L.segs.length, kinds: kinds, circles: L.circles.length, posts: L.posts.length,
            targets: L.targets ? L.targets.length : 0, bumpers: L.bumpers ? L.bumpers.length : 0,
            saucer: L.saucer, guides: L.guides ? L.guides.length : 0
          });
          if (L.bumpers) console.table(L.bumpers.map(function (b, i) {
            return { i: i, x: num(b.x, 1000), y: num(b.y, 1000), val: b.val, idx: b.idx, flash: num(b.flash, 100) };
          }));
        } },
      { label: "Console: rules and difficulty", doc: "RULES layout block, all three DIFFS rows, BALL_R/MAXV/DT/PASS and the active row.",
        run: function () {
          var T = h();
          console.log({ RULES: T.RULES, BALL_R: T.BALL_R, MAXV: T.MAXV, DT: T.DT, PASS: T.PASS,
            activeRow: gs().diff, row: row(),
            allRows: Object.keys(T.DIFFS).map(function (k) { return k + ": save " + T.DIFFS[k].save + ", g " + T.DIFFS[k].g + ", power " + T.DIFFS[k].power + ", post " + T.DIFFS[k].post })
          });
        } },
      { label: "Console: run summary", doc: "Everything in G except the ball and timer arrays, plus PERF, held, dynCam and canvas size.",
        run: function () {
          var G = gs(), T = h(), copy = {};
          for (var k in G) if (k !== "balls" && k !== "timers") copy[k] = G[k];
          console.log(copy);
          console.log({ perf: T.PERF, dynCam: T.dynCam, held: T.held, isTouch: T.isTouch,
            canvas: (function () { var c = document.getElementById("gl"); return c ? c.width + "x" + c.height : "no canvas" })(),
            timers: G.timers.length });
        } }
    ],

    layout: [
      { sel: "#gl", label: "WebGL canvas" },
      { sel: "#ui", label: "UI layer" },
      { sel: "#topbar", label: "Top bar" },
      { sel: "#hudBar", label: "HUD bar" },
      { sel: "#scoreBlock", label: "Score block" },
      { sel: "#score", label: "Score readout" },
      { sel: "#hiscore", label: "High score readout" },
      { sel: "#ballDots", label: "Ball dots" },
      { sel: "#chipBlock", label: "Feature chips" },
      { sel: "#multChip", label: "Multiplier chip" },
      { sel: "#mbChip", label: "Multiball chip" },
      { sel: "#saveChip", label: "Ball-save chip" },
      { sel: "#extraChip", label: "Extra-ball chip" },
      { sel: "#heatDots", label: "Tilt heat dots" },
      { sel: "#tiltStamp", label: "Tilt stamp" },
      { sel: "#launchFill", label: "Plunger charge fill" },
      { sel: "#launchLabel", label: "Plunger label" },
      { sel: "#btnLaunch", label: "Launch button" },
      { sel: "#btnNudge", label: "Nudge button" },
      { sel: "#btnPause", label: "Pause button" },
      { sel: "#btnSound", label: "Sound button" },
      { sel: "#btnCam", label: "Camera button" },
      { sel: "#btnDice", label: "Random seed button" },
      { sel: "#btnHelp", label: "Help button" },
      { sel: "#btnFull", label: "Fullscreen button" },
      { sel: "#btnHome", label: "Home link" },
      { sel: "#seedInput", label: "Seed input" },
      { sel: "#diffSeg", label: "Difficulty segment" },
      { sel: "#diffDesc", label: "Difficulty description" },
      { sel: "#qualSeg", label: "Quality segment" },
      { sel: "#pcZoomVal", label: "Zoom readout" },
      { sel: "#pcZoomIn", label: "Zoom in button" },
      { sel: "#pcZoomOut", label: "Zoom out button" },
      { sel: "#pcDyn", label: "Dynamic camera toggle" },
      { sel: "#pcEco", label: "Eco mode toggle" },
      { sel: "#pcTilt", label: "Tilt toggle" },
      { sel: "#menu", label: "Menu overlay" },
      { sel: "#btnStart", label: "Start button" },
      { sel: "#menuHigh", label: "Menu high score" },
      { sel: "#menuTheme", label: "Menu theme line" },
      { sel: "#pauseOv", label: "Pause overlay" },
      { sel: "#btnResume", label: "Resume button" },
      { sel: "#btnPauseNew", label: "Pause new-game button" },
      { sel: "#btnPauseMenu", label: "Pause menu button" },
      { sel: "#btnPauseCam", label: "Pause camera button" },
      { sel: "#btnPauseSound", label: "Pause sound button" },
      { sel: "#overOv", label: "Game-over overlay" },
      { sel: "#overTitle", label: "Game-over title" },
      { sel: "#finalScore", label: "Final score" },
      { sel: "#overHigh", label: "Game-over high score" },
      { sel: "#newRecord", label: "New record badge" },
      { sel: "#btnOverNew", label: "Game-over new-game button" },
      { sel: "#btnOverMenu", label: "Game-over menu button" },
      { sel: "#helpOv", label: "Help overlay" },
      { sel: "#helpBody", label: "Help body" },
      { sel: "#helpRules", label: "Help rules" },
      { sel: "#helpFeat", label: "Help features" },
      { sel: "#btnHelpClose", label: "Help close button" },
      { sel: "#announce", label: "Announcement line" },
      { sel: "#toast", label: "Toast" },
      { sel: "#floaters", label: "Score floaters layer" },
      { sel: "#glare", label: "Glare overlay" },
      { sel: "#vignette", label: "Vignette overlay" },
      { sel: "#loading", label: "Loading bar" },
      { sel: "#patchBar", label: "Patch bar" },
      { sel: "#fallback", label: "WebGL fallback panel" },
      { sel: "#fbTitle", label: "Fallback title" },
      { sel: "#fbDetail", label: "Fallback detail" },
      { sel: "#fbLow", label: "Fallback low-quality link" },
      { sel: "#fbRetry", label: "Fallback retry button" },
      { sel: "#hintL", label: "Left hint" },
      { sel: "#hintR", label: "Right hint" },
      { sel: "#stBump", label: "Bumper stat" },
      { sel: "#dbgRoot", label: "Page's own debug overlay (?dbg)" },
      { sel: "#dbgDock", label: "Page's own debug dock" },
      { sel: "#dbgFreeze", label: "Page's own freeze button" },
      { sel: "#dbgGrid", label: "Page's own grid toggle" },
      { sel: "#dbgVectors", label: "Page's own vectors toggle" },
      { sel: "#dbgColliders", label: "Page's own collider toggle" },
      { sel: ".chip", label: "Feature chips" },
      { sel: ".seg", label: "Segmented controls" },
      { sel: ".btn", label: "Buttons" },
      { sel: ".pcBtn", label: "Playfield control buttons" },
      { sel: ".pcRow", label: "Playfield control rows" },
      { sel: ".btnRow", label: "Button rows" },
      { sel: ".card", label: "Menu cards" },
      { sel: ".ov", label: "Overlay screens" },
      { sel: ".ovTitle", label: "Overlay titles" },
      { sel: ".stat", label: "Stat readouts" },
      { sel: ".statRow", label: "Stat rows" },
      { sel: ".hint", label: "Hints" },
      { sel: ".orb", label: "Orbit control dots" },
      { sel: ".ibtn", label: "Icon buttons" },
      { sel: ".lockdot", label: "Lock dots" },
      { sel: ".keysGrid", label: "Key legend grid" },
      { sel: ".fieldLabel", label: "Field labels" },
      { sel: ".seedRow", label: "Seed row" },
      { sel: ".logoRow", label: "Logo row" },
      { sel: ".menuHigh", label: "Menu high-score styling" },
      { sel: ".footNote", label: "Foot notes" },
      { sel: ".dbgChip", label: "Page's own debug chips" },
      { sel: ".dbgDot", label: "Page's own debug dots" },
      { sel: ".on", label: "Active control state" },
      { sel: ".show", label: "Shown state" },
      { sel: ".hide", label: "Hidden state" }
    ],

    control: [
      { id: "game", label: "Start, pause, resume or quit to menu", args: '"start" | "pause" | "resume" | "menu"', argDefault: "start",
        doc: "The page's own transitions: startGame() with the current difficulty, pauseGame/resumeGame, toMenu().",
        run: function (which) {
          var T = h(), w = String(which || "start");
          if (w === "pause") T.pauseGame(); else if (w === "resume") T.resumeGame(); else if (w === "menu") T.toMenu(); else T.startGame();
          return { phase: gs().state, difficulty: gs().diff, ballsLeft: gs().balls.length, score: gs().score };
        } },
      { id: "launch", label: "Launch a ball", args: "launch power 0-1 (optional)", argDefault: 0.7,
        doc: "servePlunger()/launchBall() — sends a ball out of the lane; with a power it lands straight into the playfield instead of the ramp.",
        run: function (p) {
          var T = h();
          if (p === undefined || p === "" || Array.isArray(p)) T.servePlunger(); else T.launchBall(Math.max(0, Math.min(1, Number(p))));
          return { balls: gs().balls.length, plungerBalls: gs().balls.filter(function (b) { return b.state === "plunger" }).length };
        } },
      { id: "spawnBall", label: "Drop a ball at a spot", args: "[x, y]", argDefault: "[500, 300]",
        doc: "newBallObj() then push onto the field — put a ball exactly on a bumper, a lane or a drop-target bank to test one scoring rule.",
        run: function (a) {
          var T = h(), G = gs();
          if (!Array.isArray(a)) return "want [x, y]";
          var b = T.newBallObj(); b.x = Number(a[0]); b.y = Number(a[1]); b.vx = 0; b.vy = 0; b.state = "field";
          G.balls.push(b);
          return { balls: G.balls.length, at: [num(b.x, 1), num(b.y, 1)], mult: G.mult };
        } },
      { id: "nextBall", label: "Next ball or drain this one", args: '"next" | "drain"', argDefault: "next",
        doc: "nextBall() starts the following ball; drainBall() ends the current one — the paths behind ball count, bonus and game over.",
        run: function (w) { var T = h(); if (String(w) === "drain") T.drainBall(); else T.nextBall(); return { phase: gs().state, ballNum: gs().ballNum, balls: gs().balls.length, score: gs().score }; } },
      { id: "multiball", label: "Start multiball", args: "unused", doc: "startMultiball() — locks the balls and releases the extra ones, the highest-variance scoring mode.",
        run: function () { var T = h(); T.startMultiball(); return { multiball: !!gs().multiball, locks: gs().locks, balls: gs().balls.length, mult: gs().mult }; } },
      { id: "score", label: "Add score", args: "points", argDefault: 100000,
        doc: "addScore(n) — goes through the multiplier and high-score bookkeeping the display uses.",
        run: function (n) { var T = h(); T.addScore(Math.round(Number(n) || 0)); return { score: gs().score, display: num(gs().disp, 1), highBeaten: !!gs().hiBeaten }; } },
      { id: "nudge", label: "Nudge or tilt", args: '"left" | "right" | "tilt"', argDefault: "left",
        doc: "nudge(dir) warms the tilt meter and shakes the table; doTilt() triggers the tilt penalty directly.",
        run: function (d) {
          var T = h(), G = gs();
          if (String(d) === "tilt") T.doTilt(); else T.nudge(String(d) === "right" ? 1 : -1);
          return { tiltHeat: num(G.tiltHeat, 100), tilted: !!G.tilted, shake: num(G.shakeAmt, 10) };
        } },
      { id: "difficulty", label: "Switch difficulty", args: "index into DIFFS", argDefault: 1,
        doc: "DIFFS rows hold the scoring and drain rules; changing the index applies on the next startGame().",
        run: function (i) {
          var T = h(), G = gs(), row = T.DIFFS[+i || 0]; if (!row) return "no difficulty " + i;
          G.diff = +i || 0;
          return { difficulty: G.diff, row: typeof row === "object" ? Object.keys(row).join(",") : String(row), next: "applies on next start" };
        } },
      { id: "probe", label: "Read the table state", args: "unused",
        doc: "Phase, ball and multiplier state, lanes/jack/lock/ramp lit flags, drop-target progress, bumper/ramp/jackpot counters, tilt heat, plunger charge, camera zoom and table geometry counts.",
        run: function () {
          var T = h(), G = gs(), L = ly();
          return { phase: G.state, seed: G.seed, difficulty: G.diff, build: G.build,
            score: G.score, display: num(G.disp, 1), high: G.hi, highBeaten: !!G.hiBeaten,
            ballNum: G.ballNum, ballsOnField: G.balls.length, ballsLeft: G.ballsLeft, mult: G.mult, bonus: G.bonus, locks: G.locks, multiball: !!G.multiball,
            charging: !!G.charging, charge: num(G.charge, 100), ballSaveLeft: num(G.saveT, 10), skillTimer: num(G.skillT, 10),
            tiltHeat: num(G.tiltHeat, 100), tilted: !!G.tilted, clock: num(G.clock, 10),
            lanesLit: G.lanes.filter(Boolean).length, jackLit: !!G.jackLit, lockLit: !!G.lockLit, rampLit: !!G.rampLit,
            dropTargetsDown: L && L.targets ? L.targets.filter(function (t) { return !t.up }).length : 0,
            stats: { bumpers: G.stats.bump, ramps: G.stats.ramp, jackpots: G.stats.jack },
            table: { segments: L ? L.segs.length : 0, circles: L ? L.circles.length : 0, posts: L ? L.posts.length : 0, flippers: L ? L.flippers.length : 0, bumpers: L ? L.bumpers.length : 0 },
            camera: { zoom: num(G.zoom, 100), zoomCur: num(G.zoomCur, 100), dynamicCam: !!G.dynamicCam }, quality: G.qual, eco: T.PERF ? !!T.PERF.eco : false };
        } },
      { id: "watch", label: "Log the field every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Ball positions, multiplier, tilt heat and score each interval — the trace for flipper timing and drain debugging; window.__tllField holds the timer.",
        run: function (s) {
          if (window.__tllField) { clearInterval(window.__tllField); window.__tllField = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllField = setInterval(function () {
            var G = gs();
            console.log("balls", G.balls.map(function (b) { return b.state + "@" + Math.round(b.x) + "," + Math.round(b.y) + " v" + Math.round(Math.hypot(b.vx, b.vy)) }).join(" | "),
              "mult", G.mult, "tilt", G.tiltHeat.toFixed(1), "score", G.score, "phase", G.state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Bumper heat map: balls dropped on each bumper",
        doc: "Spawns a ball on every bumper in turn and prints the hit counter deltas, so bumper scoring and rebound can be compared side by side.",
        js: 'var T = window.TLHOOK, G = T.G, L = T.L;\nif (G.state !== "play") T.startGame();\nvar bumpers = (L.bumpers || []).slice(0, 4);\nbumpers.forEach(function (b, i) {\n  var before = G.stats.bump;\n  var ball = T.newBallObj(); ball.x = b.x; ball.y = b.y - 30; ball.vx = 0; ball.vy = 220; ball.state = "field";\n  G.balls.push(ball);\n  setTimeout(function () { console.log("bumper", i, "hits delta", G.stats.bump - before, "score", G.score, "balls", G.balls.length); }, 1200);\n});' },
      { label: "Tilt meter ramp test",
        doc: "Nudges repeatedly and logs tilt heat until the tilt trips, showing how many nudges the meter allows at the current difficulty.",
        js: 'var T = window.TLHOOK, G = T.G;\nvar n = 0;\nwindow.__tllField = setInterval(function () {\n  T.nudge(n % 2 ? 1 : -1);\n  console.log("nudge", ++n, "heat", G.tiltHeat.toFixed(1), "tilted", G.tilted);\n  if (G.tilted) { console.log("tilt tripped after", n, "nudges"); clearInterval(window.__tllField); }\n}, 300);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live game (phase, seed, score, multiplier, ball-save timer, tilt heat, lights, collider counts, camera). BALANCE edits the active difficulty row, live flipper geometry, run counters and camera/quality. CHEATS changes the run. LAYOUT resizes and repositions the canvas, HUD bar, chips, overlays and controls per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "Bridge", text: "pinball.html wraps its game in a strict IIFE. Its last block publishes window.TLHOOK: update, stepBall, updFlipper, collideFlipper, launchBall, servePlunger, newBallObj, startGame, commitAndStart, toMenu, pauseGame, resumeGame, nextBall, drainBall, addScore, onBumper, onSling, hitTarget, resetBank, startMultiball, onRampComplete, nudge, doTilt, setQual, pcSetZoom, buildTable, updChips, updHeat, spawnParts, store, resize; plus G, L, RULES, DIFFS, BALL_R, MAXV, DT, PASS, PERF, held, dynCam, isTouch. No game code runs in that block." },
      { topic: "Two tunable layers", text: "DIFFS[G.diff] rows (g, power, save) are plain objects and take effect on the next physics tick. RULES (flipLen, flipRest, flipUp, pass, outW, pivotX, ...) feeds solveLower and is baked when buildTable(seed, diff) runs — change it and use CHEATS: commit seed and start. Per-flipper objects (L.flippers[i].len/rest/up) are editable live." },
      { topic: "Seeded layout", text: "L.slingKick, L.laneTop, L.laneBot and L.extraAt come from the seed's RNG at build time. slingKick/laneTop/laneBot are read as baked copies by the colliders, so edit them then rebuild; L.extraAt is read live by addScore." },
      { topic: "Fixed timestep", text: "frame accumulates real time and calls update(DT) with DT = 1/120, capped at 6 slices, and only while G.state === 'play'. Freeze and slow motion wrap update(), so the accumulator and rendering keep running; if the ball seems frozen but the table animates, check that the phase is really 'play'." },
      { topic: "Keep ball save armed", text: "That toggle wraps update() and tops G.saveT up after every tick, so the drain check always finds save time left. Off restores the original update()." },
      { topic: "The page has its own debug tools", text: "pinball.html ships a ?dbg overlay (G.debug, #dbgRoot, #dbgFreeze, #dbgGrid, #dbgVectors, #dbgColliders). This harness is separate and reads/writes the same globals, so a page-level freeze and a harness freeze can both be active — turn one off if the ball is stuck for the wrong reason." },
      { topic: "Not reachable", text: "WebGL resources (programs, textures, framebuffers), the audio engine internals (A, SFX), theme colour ramps and particle pool buffers stay private. Table structure, collider inventory, difficulty math and camera state are all visible through the hooks." }
    ]
  });
})();
