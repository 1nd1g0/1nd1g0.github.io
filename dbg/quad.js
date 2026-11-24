/* dbg/quad.js — developer harness for quad.html (FPV drone racing over terrain)
 *
 * Load with:  quad.html?debug=dbg/quad.js
 * quad.html wraps its game in a strict IIFE; the last block publishes
 * window.TLHOOK (names only), which everything here reads: physStep,
 * stepInput, crash, resolveColliders, respawn, doRespawn, startRun, finishRun,
 * togglePause, render, drawHUD, frame, resize, rebuild, terrainH, terrainN,
 * windV, qRotV, buildPresetSeg, buildQualSeg, buildStyleSeg, saveS, tlResync
 * plus drone, S, PRESETS, QUAL, DIFFS, gates, collGroups, dynObs, worldR,
 * pathPts, closedPath, inpState, inpTgt and the run counters.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK); }
  function SS() { return h().S }
  function D() { return h().drone }
  function GT() { return h().gates }
  function IN() { return h().inpState }
  function TG() { return h().inpTgt }

  var realPhys = null, scale = null;
  function wrap(v) {
    var T = h();
    if (!realPhys) realPhys = T.physStep;
    scale = v === null ? null : v;
    if (scale === null) { T.physStep = realPhys; return; }
    T.physStep = function (dt, t) { realPhys(dt * scale, t) };
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 1000)) / (r || 1000) : 0 }
  function spd() { var d = D(); return Math.hypot(d.v[0], d.v[1], d.v[2]) }
  function gate(i) { var g = GT(); return g && g[i] ? g[i] : null }
  function setS(k, v, custom) { SS()[k] = v; if (custom) SS().preset = "CUSTOM" }

  TLDBG.register({
    game: "quad", file: "quad.html",

    state: function () {
      var T = h(), d = D(), S = SS();
      return {
        state: T.state, racePhase: T.racePhase, paused: T.paused,
        seed: S.seed, difficulty: S.diff, diffName: T.DIFFS[S.diff] || "-", style: S.style, preset: S.preset,
        time: num(T.runTime, 100), countdown: num(T.countT, 10), worldTime: num(T.worldT, 10),
        gateIndex: T.gateIdx, gatesTotal: GT() ? GT().length : 0, gatesDone: T.gatesFinished,
        crashes: T.crashes, topSpeed: num(T.topSpd, 10), speed: num(spd(), 10),
        position: d.p.map(function (x) { return num(x, 100) }),
        velocity: d.v.map(function (x) { return num(x, 100) }),
        spin: d.w.map(function (x) { return num(x, 100) }),
        quaternion: d.q.map(function (x) { return num(x, 1000) }),
        motors: d.mot.map(function (m) { return num(m, 100) }),
        battery: num(d.charge, 1000), crashed: !!d.crashed, crashTimer: num(d.crashT, 100),
        shake: num(d.shake, 100), holdHeight: num(T.holdY, 100),
        input: { throttle: num(IN().t, 100), roll: num(IN().r, 100), pitch: num(IN().p, 100), yaw: num(IN().y, 100) },
        terrainRadius: T.worldR, colliderGroups: T.collGroups ? T.collGroups.length : 0,
        dynamicObstacles: T.dynObs ? T.dynObs.length : 0, pathPoints: T.pathPts ? T.pathPts.length : 0,
        quality: S.quality, viewDist: S.viewDist, camera: S.cam, sound: !!S.sound, assist: !!S.assist, batteryMode: !!S.battery,
        nextGate: (function () { var g = gate(T.gateIdx); if (!g || !g.p) return null;
          return { i: T.gateIdx, type: g.type, pos: [num(g.p[0], 1), num(g.p[1], 1), num(g.p[2], 1)],
            dist: num(Math.hypot(g.p[0] - d.p[0], g.p[1] - d.p[1], g.p[2] - d.p[2]), 1), finish: !!g.finish }; })(),
        canvas: (function () { var c = document.getElementById("gl"); return c ? c.width + "x" + c.height : "no canvas" })()
      };
    },

    params: [
      { id: "mass", label: "Drone mass", unit: "g", min: 250, max: 1600, step: 10,
        get: function () { return SS().mass }, set: function (v) { setS("mass", v, true) },
        code: { file: "quad.html", line: 648, name: "S.mass" },
        doc: "Mass in grams (750 on FREESTYLE). physStep divides thrust by it, so heavier drones fall faster and carry more inertia into collisions." },
      { id: "twr", label: "Thrust-to-weight ratio", unit: "x", min: 1, max: 14, step: 0.1,
        get: function () { return SS().twr }, set: function (v) { setS("twr", v, true) },
        code: { file: "quad.html", line: 648, name: "S.twr" },
        doc: "Hover authority (6.2). At 1.0 full throttle barely holds altitude; 9.5 (RACE) climbs hard out of a dive. The hover stick point is sqrt(1/twr)." },
      { id: "motorMs", label: "Motor spool time", unit: "ms", min: 5, max: 160, step: 1,
        get: function () { return SS().motorMs }, set: function (v) { setS("motorMs", v, true) },
        code: { file: "quad.html", line: 648, name: "S.motorMs" },
        doc: "How fast motor RPM follows the input (45 ms). Long values give sluggish, droney handling; short values make it twitchy." },
      { id: "drag", label: "Drag coefficient", unit: "1/s", min: 0, max: 3, step: 0.05,
        get: function () { return SS().drag }, set: function (v) { setS("drag", v, true) },
        code: { file: "quad.html", line: 648, name: "S.drag" },
        doc: "Velocity damping (0.5). Sets terminal speed for a given thrust; 1.3 (CINEWHOOP) feels glued." },
      { id: "wind", label: "Wind strength", unit: "m/s", min: 0, max: 6, step: 0.1,
        get: function () { return SS().wind }, set: function (v) { setS("wind", v) },
        code: { file: "quad.html", line: 648, name: "S.wind" },
        doc: "Multiplier for windV() — the gust field pushed on the drone every step. 0 is a windless calm for line testing." },
      { id: "maxRate", label: "Max roll/pitch rate", unit: "deg/s", min: 60, max: 1400, step: 10,
        get: function () { return SS().maxRate }, set: function (v) { setS("maxRate", v, true) },
        code: { file: "quad.html", line: 648, name: "S.maxRate" },
        doc: "Rate limit for roll/pitch commands (560). Race presets go to 920." },
      { id: "yawRate", label: "Max yaw rate", unit: "deg/s", min: 40, max: 1000, step: 10,
        get: function () { return SS().yawRate }, set: function (v) { setS("yawRate", v, true) },
        code: { file: "quad.html", line: 648, name: "S.yawRate" },
        doc: "Rate limit for yaw (400)." },
      { id: "expo", label: "Stick expo", unit: "0-1", min: 0, max: 1, step: 0.02,
        get: function () { return SS().expo }, set: function (v) { setS("expo", v, true) },
        code: { file: "quad.html", line: 649, name: "S.expo" },
        doc: "Curve softness around stick centre (0.6). Higher expo = calmer small inputs, sharper at full stick." },
      { id: "rateP", label: "Rate P gain", unit: "gain", min: 0, max: 1, step: 0.01,
        get: function () { return SS().rateP }, set: function (v) { setS("rateP", v, true) },
        code: { file: "quad.html", line: 649, name: "S.rateP" },
        doc: "Proportional term of the rate loop (0.09)." },
      { id: "rateI", label: "Rate I gain", unit: "gain", min: 0, max: 1, step: 0.01,
        get: function () { return SS().rateI }, set: function (v) { setS("rateI", v, true) },
        code: { file: "quad.html", line: 649, name: "S.rateI" },
        doc: "Integral term of the rate loop (0.22) — removes steady-state lean error." },
      { id: "angP", label: "Angle P gain", unit: "gain", min: 0, max: 20, step: 0.2,
        get: function () { return SS().angP }, set: function (v) { setS("angP", v, true) },
        code: { file: "quad.html", line: 650, name: "S.angP" },
        doc: "Self-level loop gain (5) used when assist is on." },
      { id: "angD", label: "Angle D gain", unit: "gain", min: 0, max: 3, step: 0.05,
        get: function () { return SS().angD }, set: function (v) { setS("angD", v, true) },
        code: { file: "quad.html", line: 650, name: "S.angD" },
        doc: "Damping of the angle loop (0.5)." },
      { id: "angMax", label: "Assist angle limit", unit: "deg", min: 0, max: 90, step: 1,
        get: function () { return SS().angMax }, set: function (v) { setS("angMax", v) },
        code: { file: "quad.html", line: 650, name: "S.angMax" },
        doc: "Maximum tilt the angle-mode limiter allows (35). Raise it to let assisted flight lean like acro." },
      { id: "ge", label: "Hover efficiency", unit: "0-1", min: 0.2, max: 1, step: 0.02,
        get: function () { return SS().ge }, set: function (v) { setS("ge", v) },
        code: { file: "quad.html", line: 650, name: "S.ge" },
        doc: "Ground-efficiency factor near the terrain (0.7) — extra lift close to the ground." },
      { id: "fov", label: "Camera FOV", unit: "deg", min: 40, max: 160, step: 1,
        get: function () { return SS().fov }, set: function (v) { setS("fov", v) },
        code: { file: "quad.html", line: 650, name: "S.fov" },
        doc: "Projection field of view (104). Read by render each frame." },
      { id: "camTilt", label: "Camera tilt", unit: "deg", min: -30, max: 40, step: 1,
        get: function () { return SS().camTilt }, set: function (v) { setS("camTilt", v) },
        code: { file: "quad.html", line: 650, name: "S.camTilt" },
        doc: "FPV pitch offset (10 degrees down) applied in render." },
      { id: "kbSens", label: "Keyboard sensitivity", unit: "x", min: 0.2, max: 3, step: 0.05,
        get: function () { return SS().kbSens }, set: function (v) { setS("kbSens", v) },
        code: { file: "quad.html", line: 651, name: "S.kbSens" },
        doc: "Scale of key-driven stick input in stepInput." },
      { id: "kbRamp", label: "Keyboard ramp", unit: "s", min: 0.05, max: 2, step: 0.05,
        get: function () { return SS().kbRamp }, set: function (v) { setS("kbRamp", v) },
        code: { file: "quad.html", line: 651, name: "S.kbRamp" },
        doc: "Time for a held key to reach full stick (1 s)." },
      { id: "gpDead", label: "Gamepad dead zone", unit: "0-0.5", min: 0, max: 0.5, step: 0.01,
        get: function () { return SS().gpDead }, set: function (v) { setS("gpDead", v) },
        code: { file: "quad.html", line: 651, name: "S.gpDead" },
        doc: "Stick dead zone before input counts (0.08)." },
      { id: "tchDead", label: "Touch dead zone", unit: "0-0.5", min: 0, max: 0.5, step: 0.01,
        get: function () { return SS().tchDead }, set: function (v) { setS("tchDead", v) },
        code: { file: "quad.html", line: 651, name: "S.tchDead" },
        doc: "On-screen stick dead zone (0.06)." },
      { id: "difficulty", label: "Difficulty", unit: "0-5", min: 0, max: 5, step: 1,
        get: function () { return SS().diff },
        set: function (v) { SS().diff = Math.max(0, Math.min(5, Math.round(v))); if (typeof h().rebuild === "function") h().rebuild() },
        code: { file: "quad.html", line: 2001, name: "S.diff (diffR handler)" },
        doc: "Course generator difficulty (0 = '', 1 BOBBER .. 5 MANIAC). Writes S.diff and rebuilds terrain/gates like the page's slider." },
      { id: "viewDist", label: "View distance", unit: "m", min: 80, max: 900, step: 10,
        get: function () { return SS().viewDist }, set: function (v) { setS("viewDist", v) },
        code: { file: "quad.html", line: 2003, name: "S.viewDist" },
        doc: "Cull/fog distance (300). Same key the vdR slider writes." },
      { id: "quality", label: "Quality tier", unit: "0 LOW / 1 MED / 2 HIGH", min: 0, max: 2, step: 1,
        get: function () { return ["LOW", "MED", "HIGH"].indexOf(SS().quality) },
        set: function (v) {
          SS().quality = ["LOW", "MED", "HIGH"][Math.max(0, Math.min(2, Math.round(v)))];
          if (typeof h().buildQualSeg === "function") h().buildQualSeg();
          if (typeof h().resize === "function") h().resize();
          if (typeof h().rebuild === "function") h().rebuild();
        },
        code: { file: "quad.html", line: 655, name: "QUAL[S.quality] / S.quality" },
        doc: "QUAL tiers scale the render buffer (0.5/0.72/1) and decoration density. The page's own auto-drop can lower it again if fps stays under 32." },
      { id: "holdHeight", label: "Hover hold height", unit: "m", min: 0.5, max: 60, step: 0.5,
        get: function () { return h().holdY }, set: function (v) { h().holdY = v },
        code: { file: "quad.html", line: 1335, name: "holdY" },
        doc: "Altitude the assist/altitude loop targets (drone spawn y). Used by the auto style; startRun re-derives it from the respawn height." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "physStep becomes a no-op: drone motion, motor spool, gates, wind and crash timers stop while rendering continues.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "Scales the delta handed to physStep so flight, prop spin and collisions all slow together.",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "noCrash", label: "No crashes", toggle: true,
        doc: "Replaces crash() with a no-op so terrain and obstacle hits stop ending the run. Off restores the real function.",
        on: function (v) {
          var T = h();
          if (v) { if (!T.__tllCrash) T.__tllCrash = T.crash; T.crash = function () { }; }
          else if (T.__tllCrash) { T.crash = T.__tllCrash; delete T.__tllCrash }
        } },
      { id: "fullThrottle", label: "Full throttle", toggle: true,
        doc: "Forces the throttle target and state to 1, so the drone climbs hands-free.",
        on: function (v) { IN().t = v ? 1 : 0; TG().t = v ? 1 : 0 } },
      { id: "hoverInput", label: "Force hover (no input)", toggle: true,
        doc: "Wraps stepInput so every stick target stays at 0: throttle lands on the hover point (T = sqrt(1/twr)) and the drone sits still.",
        on: function (v) {
          var T = h();
          if (v) {
            if (!T.__tllStep) T.__tllStep = T.stepInput;
            T.stepInput = function (dt) { TG().t = 0; TG().r = 0; TG().p = 0; TG().y = 0; T.__tllStep(dt) };
          } else if (T.__tllStep) { T.stepInput = T.__tllStep; delete T.__tllStep }
        } },
      { id: "teleport", label: "Teleport to next gate",
        doc: "Moves the drone above the current gate with zero velocity — jumps the lap without flying it.",
        run: function () {
          var d = D(), g = gate(h().gateIdx);
          if (!g || !g.p) { TLDBG.toast("no gate target"); return; }
          d.p[0] = g.p[0]; d.p[1] = g.p[1] + 3; d.p[2] = g.p[2];
          d.v[0] = 0; d.v[1] = 0; d.v[2] = 0; d.w[0] = 0; d.w[1] = 0; d.w[2] = 0;
          TLDBG.toast("gate " + (h().gateIdx + 1));
        } },
      { id: "skipGate", label: "Pass gate without flying",
        doc: "Advances gateIdx directly (HUD and lap logic read it), so you can test gate sequencing.",
        run: function () { var T = h(); T.gateIdx = Math.min(GT() ? GT().length : 0, T.gateIdx + 1); TLDBG.toast("gateIdx " + T.gateIdx) } },
      { id: "finishRun", label: "Finish the run",
        doc: "finishRun(): banks the time, writes the per-seed best score and shows the finish overlay.",
        run: function () { h().finishRun(); TLDBG.toast("time " + num(h().runTime, 100) + "s") } },
      { id: "respawn", label: "Respawn drone",
        doc: "respawn(): the page's own reset of position, velocity and attitude near spawn.",
        run: function () { h().respawn(); TLDBG.toast("respawned"); } },
      { id: "crashNow", label: "Crash on purpose",
        doc: "crash(): triggers the crash state, shake, sound and respawn timer — tests the recovery path.",
        run: function () { h().crash(); TLDBG.toast("crashes " + h().crashes) } },
      { id: "startRun", label: "Start a run",
        doc: "startRun(): 3-second countdown, timer, gate reset, drone respawn.",
        run: function () { h().startRun(); TLDBG.toast("run started"); } },
      { id: "restartRun", label: "Restart run (unpause)",
        doc: "Clears pause and calls startRun(), the same path as #btnRestart.",
        run: function () { h().paused = false; var o = document.getElementById("pauseOv"); if (o) o.classList.add("hide"); h().startRun(); TLDBG.toast("restarted") } },
      { id: "pause", label: "Pause", toggle: true,
        doc: "Sets paused (frame skips stepInput and physics) and shows/hides #pauseOv.",
        on: function (v) { h().paused = !!v; var o = document.getElementById("pauseOv"); if (o) o.classList[v ? "remove" : "add"]("hide") } },
      { id: "toggleCam", label: "FPV / chase camera", toggle: true,
        doc: "Flips S.cam between fpv and chase; render reads it live.",
        on: function (v) { SS().cam = v ? "chase" : "fpv" } },
      { id: "assistOn", label: "Self-level assist", toggle: true,
        doc: "S.assist on/off — angle loop with angMax limits instead of raw acro rates.",
        on: function (v) { SS().assist = !!v } },
      { id: "presetRace", label: "Apply RACE preset",
        doc: "Copies PRESETS.RACE into S (mass, twr, motorMs, drag, rates, gains) and refreshes the preset segment.",
        run: function () { applyPresetTo("RACE"); TLDBG.toast("preset RACE") } },
      { id: "presetFreestyle", label: "Apply FREESTYLE preset",
        doc: "Copies PRESETS.FREESTYLE into S.",
        run: function () { applyPresetTo("FREESTYLE"); TLDBG.toast("preset FREESTYLE") } },
      { id: "presetCinewhoop", label: "Apply CINEWHOOP preset",
        doc: "Copies PRESETS.CINEWHOOP into S — heavy, sluggish, draggy.",
        run: function () { applyPresetTo("CINEWHOOP"); TLDBG.toast("preset CINEWHOOP") } },
      { id: "styleRace", label: "Course style: RACE", toggle: true,
        doc: "S.style drives gate/path generation and flight assist behaviour; rebuild the course after changing it.",
        on: function (v) { SS().style = v ? "RACE" : "AUTO"; if (typeof h().buildStyleSeg === "function") h().buildStyleSeg() } },
      { id: "rebuildCourse", label: "Rebuild terrain and gates",
        doc: "rebuild(): regenerates terrain, gates and obstacles from S.seed/S.diff.",
        run: function () { h().rebuild(); TLDBG.toast("rebuilt " + SS().seed) } },
      { id: "newSeed", label: "Random seed and rebuild",
        doc: "Writes a fresh random seed into S.seed and #seedInp, then rebuilds the world.",
        run: function () {
          var s = "KESTREL-" + ((Math.random() * 9000 + 100) | 0);
          SS().seed = s; var i = document.getElementById("seedInp"); if (i) i.value = s;
          h().rebuild(); TLDBG.toast("seed " + s);
        } },
      { id: "hideHud", label: "Hide HUD and buttons", toggle: true,
        doc: "Display:none on #hud, #tbtns and #hintBar for clean captures.",
        on: function (v) { ["hud", "tbtns", "hintBar"].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = v ? "none" : "" }) } }
    ],

    hooks: [
      { label: "Console: drone state", doc: "Position, velocity, attitude quaternion, body rates, motor targets, battery and crash flags.",
        run: function () {
          var d = D(), T = h();
          console.log({ p: d.p.map(function (x) { return num(x, 100) }), v: d.v.map(function (x) { return num(x, 100) }),
            q: d.q.map(function (x) { return num(x, 1000) }), w: d.w.map(function (x) { return num(x, 100) }),
            mot: d.mot.map(function (x) { return num(x, 1000) }), propA: d.propA.map(function (x) { return num(x, 100) }),
            charge: num(d.charge, 10000), crashed: d.crashed, crashT: num(d.crashT, 100), shake: num(d.shake, 100),
            speed: num(spd(), 100), groundHeightAtDrone: num(T.terrainH(d.p[0], d.p[2]), 100) });
        } },
      { label: "Console: tuning object", doc: "S plus the three preset rows, so you can see exactly what diverges from a shipped preset.",
        run: function () {
          var T = h(), S = SS();
          console.log({ S: JSON.parse(JSON.stringify(S)), PRESETS: T.PRESETS, QUAL: T.QUAL,
            deltaFromPreset: (function () {
              var p = T.PRESETS[S.preset] || null; if (!p) return "CUSTOM";
              var d = {}; for (var k in p) if (Math.abs((S[k] || 0) - p[k]) > 1e-9) d[k] = { preset: p[k], now: S[k] };
              return d;
            })() });
        } },
      { label: "Console: gates and course", doc: "Every gate with position, kind and size, path points, collider groups and dynamic obstacles.",
        run: function () {
          var T = h(), S = SS(), g = GT();
          console.log({ seed: S.seed, diff: S.diff, style: S.style, worldR: T.worldR, viewDist: S.viewDist,
            gateCount: g ? g.length : 0, nextGate: T.gateIdx, gatesFinished: T.gatesFinished, closedPath: T.closedPath });
          if (g && g.length) console.table(g.map(function (q, i) {
            return { i: i, type: q.type, x: q.p ? num(q.p[0], 1) : "-", y: q.p ? num(q.p[1], 1) : "-", z: q.p ? num(q.p[2], 1) : "-",
              R: q.R !== undefined ? num(q.R, 100) : "-", hw: q.hw !== undefined ? num(q.hw, 100) : "-", gh: q.gh !== undefined ? num(q.gh, 100) : "-",
              yaw: q.yaw !== undefined ? num(q.yaw, 100) : "-", finish: !!q.finish, status: i < T.gateIdx ? "passed" : (i === T.gateIdx ? "next" : "-") };
          }));
          console.log({ colliderGroups: T.collGroups ? T.collGroups.length : 0, dynamicObstacles: T.dynObs ? T.dynObs.length : 0,
            pathPoints: T.pathPts ? T.pathPts.length : 0 });
        } },
      { label: "Console: terrain and wind", doc: "Terrain height and normal under the drone plus the wind vector at its position.",
        run: function () {
          var T = h(), d = D(), x = d.p[0], z = d.p[2];
          console.log({ at: [num(x, 1), num(z, 1)], terrainHeight: num(T.terrainH(x, z), 100),
            terrainNormal: typeof T.terrainN === "function" ? T.terrainN(x, z).map(function (v) { return num(v, 100) }) : null,
            heightAboveGround: num(d.p[1] - T.terrainH(x, z), 100),
            wind: typeof T.windV === "function" ? T.windV(T.worldT, [x, d.p[1], z]).map(function (v) { return num(v, 100) }) : null,
            windStrength: SS().wind });
        } },
      { label: "Console: run summary", doc: "Phase, timers, counters, input state and the localStorage best key for this seed.",
        run: function () {
          var T = h(), S = SS(), key = "pl_best_" + S.seed + "_" + S.diff;
          console.log({ state: T.state, racePhase: T.racePhase, paused: T.paused, runTime: num(T.runTime, 100),
            countT: num(T.countT, 100), goT: num(T.goT, 100), worldT: num(T.worldT, 100), gateIdx: T.gateIdx, crashes: T.crashes,
            topSpd: num(T.topSpd, 10), gatesFinished: T.gatesFinished, holdY: num(T.holdY, 100), lowBattWarned: T.lowBattWarned,
            input: { t: num(IN().t, 1000), r: num(IN().r, 1000), p: num(IN().p, 1000), y: num(IN().y, 1000) },
            inputTarget: { t: num(TG().t, 1000), r: num(TG().r, 1000), p: num(TG().p, 1000), y: num(TG().y, 1000) },
            bestKey: key, bestStored: (function () { try { return localStorage.getItem(key) } catch (e) { return "unavailable" } })(),
            saveKey: "proploop" });
        } }
    ],

    layout: [
      { sel: "#gl", label: "WebGL canvas" },
      { sel: "#hud", label: "HUD layer" },
      { sel: "#timerBox", label: "Timer box" },
      { sel: "#timer", label: "Timer readout" },
      { sel: "#gateTxt", label: "Gate readout" },
      { sel: "#fpsChip", label: "FPS chip" },
      { sel: "#chipSeed", label: "Seed chip" },
      { sel: "#diffLbl", label: "Difficulty label" },
      { sel: "#bestLbl", label: "Best time label" },
      { sel: "#cd", label: "Countdown digit" },
      { sel: "#hintBar", label: "Hint bar" },
      { sel: "#flash", label: "Crash flash" },
      { sel: "#vig", label: "Vignette" },
      { sel: "#tbtns", label: "Top button row" },
      { sel: "#tCam", label: "Camera toggle" },
      { sel: "#tPause", label: "Pause toggle" },
      { sel: "#tReset", label: "Reset button" },
      { sel: "#tSnd", label: "Sound toggle" },
      { sel: "#menuOv", label: "Menu overlay" },
      { sel: "#btnStart", label: "Start button" },
      { sel: "#btnDice", label: "Random seed button" },
      { sel: "#btnNewSeed", label: "New seed button" },
      { sel: "#btnHome", label: "Home link" },
      { sel: "#btnLoad", label: "Load preset button" },
      { sel: "#btnExport", label: "Export tuning button" },
      { sel: "#btnImport", label: "Import tuning button" },
      { sel: "#btnCopy", label: "Copy tuning button" },
      { sel: "#codeInp", label: "Tuning code textarea" },
      { sel: "#fileInp", label: "Import file input" },
      { sel: "#seedInp", label: "Seed input" },
      { sel: "#diffR", label: "Difficulty slider" },
      { sel: "#vdR", label: "View distance slider" },
      { sel: "#presetSeg", label: "Preset segment" },
      { sel: "#styleSeg", label: "Course style segment" },
      { sel: "#qualSeg", label: "Quality segment" },
      { sel: "#tuneGrid", label: "Tuning slider grid" },
      { sel: "#tuneTog", label: "Tuning panel toggle" },
      { sel: "#quickGrid", label: "Quick controls grid" },
      { sel: "#ctrlGrid", label: "Control grid" },
      { sel: "#slotRow", label: "Preset slot row" },
      { sel: "#statsBox", label: "Stats box" },
      { sel: "#stickL", label: "Left on-screen stick" },
      { sel: "#stickR", label: "Right on-screen stick" },
      { sel: "#knobL", label: "Left stick knob" },
      { sel: "#knobR", label: "Right stick knob" },
      { sel: "#pauseOv", label: "Pause overlay" },
      { sel: "#btnResume", label: "Resume button" },
      { sel: "#btnRestart", label: "Restart button" },
      { sel: "#btnQuit", label: "Quit button" },
      { sel: "#finOv", label: "Finish overlay" },
      { sel: "#finTitle", label: "Finish title" },
      { sel: "#finStats", label: "Finish stats" },
      { sel: "#btnRetry", label: "Retry button" },
      { sel: "#btnNext", label: "Next course button" },
      { sel: "#btnMenu2", label: "Menu button (finish overlay)" },
      { sel: "#diag", label: "Diagnostics block" },
      { sel: "#bootLine", label: "Boot line" },
      { sel: "#helpBlock", label: "Help block" },
      { sel: "#toast", label: "Toast" },
      { sel: ".panel", label: "Menu panel (i18n mounted)" },
      { sel: ".hide", label: "Hidden element hook" }
    ],

    control: [
      { id: "race", label: "Start, finish or pause the run", args: '"start" | "finish" | "pause"', argDefault: "start",
        doc: "startRun() resets the timer, gates and drone; finishRun() closes the run; togglePause() stops the frame loop from stepping physics.",
        run: function (which) {
          var T = h(), w = String(which || "start");
          if (w === "finish") T.finishRun(); else if (w === "pause") T.togglePause(); else T.startRun();
          return { state: T.state, racePhase: T.racePhase, paused: !!T.paused, gatesDone: T.gatesFinished, time: num(T.runTime, 100) };
        } },
      { id: "input", label: "Drive the drone", args: "[throttle, roll, pitch, yaw] in -1..1", argDefault: "[0.8, 0, -0.2, 0]",
        doc: "Writes inpTgt, the input target the ramping code eases inpState toward — the same channel the keys, gamepad and touch sticks feed.",
        run: function (a) {
          var T = h();
          if (!Array.isArray(a)) return "want [throttle, roll, pitch, yaw]";
          var cl = function (v) { return Math.max(-1, Math.min(1, Number(v) || 0)); };
          T.inpTgt.t = cl(a[0]); T.inpTgt.r = cl(a[1]); T.inpTgt.p = cl(a[2]); T.inpTgt.y = cl(a[3]);
          return { target: T.inpTgt, eased: { t: num(IN().t, 100), r: num(IN().r, 100), p: num(IN().p, 100), y: num(IN().y, 100) } };
        } },
      { id: "teleport", label: "Move the drone", args: "[x, y, z]", argDefault: "",
        doc: "Writes drone.p — drop it in front of the next gate, under a dynamic obstacle, or on terrain to test a collision case.",
        run: function (a) {
          var T = h(), d = D();
          if (!Array.isArray(a)) return "want [x, y, z] — or leave empty to lift to the hold height";
          d.p[0] = Number(a[0]); d.p[1] = Number(a[1]); d.p[2] = Number(a[2]);
          d.v = [0, 0, 0]; d.w = [0, 0, 0];
          return { position: d.p.map(function (x) { return num(x, 10) }), groundHeight: num(T.terrainH(d.p[0], d.p[2]), 10) };
        } },
      { id: "respawn", label: "Respawn the drone", args: "unused", doc: "respawn() — the crash-recovery path: position, velocity, spin and crash timer reset.",
        run: function () { var T = h(); T.respawn(); return { position: D().p.map(function (x) { return num(x, 10) }), crashed: !!D().crashed, crashes: T.crashes }; } },
      { id: "step", label: "Step physics N frames", args: "frame count", argDefault: 10,
        doc: "physStep(DT, worldT) run by hand — advance the simulation a fixed number of frames while the loop is paused, for deterministic collision debugging.",
        run: function (n) {
          var T = h(), k = Math.max(1, Math.min(600, Math.round(Number(n) || 1))), DT = 1 / 60;
          for (var i = 0; i < k; i++) T.physStep(DT, (T.worldT || 0) + i * DT);
          return { steps: k, speed: num(spd(), 10), position: D().p.map(function (x) { return num(x, 10) }), battery: num(D().charge, 1000) };
        } },
      { id: "wind", label: "Set the wind vector", args: "[x, y, z]", argDefault: "[6, 0, 0]",
        doc: "windV is the environmental push every physics step adds — the knob for testing drift and gate-line stability in crosswind.",
        run: function (a) { if (!Array.isArray(a)) return "want [x, y, z]"; h().windV[0] = Number(a[0]); h().windV[1] = Number(a[1]); h().windV[2] = Number(a[2]); return { wind: h().windV.map(function (x) { return num(x, 10) }) }; } },
      { id: "preset", label: "Switch preset, difficulty or quality", args: '["preset"|"diff"|"quality", index]', argDefault: '["diff", 2]',
        doc: "S.preset / S.diff / S.quality drive gate layout, speed envelope and render tier; the page re-reads them each frame.",
        run: function (a) {
          var T = h(), S = SS();
          if (!Array.isArray(a)) return 'want ["preset"|"diff"|"quality", index]';
          var key = String(a[0]), idx = Math.max(0, Math.round(Number(a[1]) || 0));
          if (key === "preset") { S.preset = idx; T.buildPresetSeg(); } else if (key === "quality") { S.quality = idx; T.buildQualSeg(); } else { S.diff = idx; T.buildStyleSeg && T.buildStyleSeg(); }
          return { preset: S.preset, presetName: T.PRESETS[S.preset] || "-", diff: S.diff, diffName: T.DIFFS[S.diff] || "-", quality: S.quality };
        } },
      { id: "probe", label: "Read the flight state", args: "unused",
        doc: "Race phase, seed and difficulty, run/world time, gate progress, crashes and top speed, drone position/velocity/spin/quaternion, motor commands, battery, shake, eased input, collider group and dynamic obstacle counts.",
        run: function () {
          var T = h(), d = D(), S = SS();
          return { state: T.state, racePhase: T.racePhase, paused: !!T.paused,
            seed: S.seed, difficulty: S.diff, diffName: T.DIFFS[S.diff] || "-", preset: S.preset, presetName: T.PRESETS[S.preset] || "-", style: S.style,
            time: num(T.runTime, 100), countdown: num(T.countT, 10), worldTime: num(T.worldT, 10),
            gateIndex: T.gateIdx, gatesTotal: GT() ? GT().length : 0, gatesDone: T.gatesFinished,
            crashes: T.crashes, topSpeed: num(T.topSpd, 10), speed: num(spd(), 10),
            position: d.p.map(function (x) { return num(x, 10) }), velocity: d.v.map(function (x) { return num(x, 10) }),
            spin: d.w.map(function (x) { return num(x, 10) }), quaternion: d.q.map(function (x) { return num(x, 1000) }),
            motors: d.mot ? d.mot.map(function (m) { return num(m, 100) }) : null, battery: num(d.charge, 1000),
            crashed: !!d.crashed, crashTimer: num(d.crashT, 100), shake: num(d.shake, 100),
            input: { throttle: num(IN().t, 100), roll: num(IN().r, 100), pitch: num(IN().p, 100), yaw: num(IN().y, 100) },
            wind: T.windV ? T.windV.map(function (x) { return num(x, 10) }) : null,
            terrainRadius: T.worldR, groundHeight: num(T.terrainH(d.p[0], d.p[2]), 10),
            colliderGroups: T.collGroups ? T.collGroups.length : 0, dynamicObstacles: T.dynObs ? T.dynObs.length : 0,
            pathPoints: T.pathPts ? T.pathPts.length : 0, quality: S.quality };
        } },
      { id: "watch", label: "Log the flight every N seconds", args: "seconds (0 stops)", argDefault: 0.5,
        doc: "Speed, position, ground clearance, gate index and battery each interval — the trace for gate-line and drift tuning; window.__tllFlight holds the timer.",
        run: function (s) {
          if (window.__tllFlight) { clearInterval(window.__tllFlight); window.__tllFlight = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllFlight = setInterval(function () {
            var T = h(), d = D();
            console.log("speed", spd().toFixed(1), "pos", d.p.map(function (x) { return Math.round(x) }).join(","),
              "ground", T.terrainH(d.p[0], d.p[2]).toFixed(1), "gate", T.gateIdx + "/" + (T.gates ? T.gates.length : 0),
              "battery", d.charge.toFixed(3), "crashed", d.crashed);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Gate sequence audit",
        doc: "Teleports the drone in front of each gate and steps physics by hand until it registers (or 200 frames pass), printing which gates fire.",
        js: 'var T = window.TLHOOK, d = T.drone, G = T.gates;\nif (T.state !== "fly") T.startRun();\nvar out = [];\nfor (var i = 0; i < Math.min(G.length, 12); i++) {\n  var g = G[i], before = T.gatesFinished;\n  d.p[0] = g.x !== undefined ? g.x : d.p[0]; d.p[2] = g.z !== undefined ? g.z : d.p[2]; d.p[1] = (g.y !== undefined ? g.y : d.p[1]) + 12;\n  d.v = [0, 0, 0]; d.w = [0, 0, 0];\n  for (var k = 0; k < 200; k++) T.physStep(1 / 60, (T.worldT || 0) + k / 60);\n  out.push({ gate: i, registered: T.gatesFinished > before, pos: d.p.map(function (x) { return Math.round(x) }) });\n}\nconsole.table(out);' },
      { label: "Wind drift measurement",
        doc: "Holds the drone steady with zero input and walks the crosswind from 0 to 12, printing the resulting sideways drift per second.",
        js: 'var T = window.TLHOOK, d = T.drone;\nT.inpTgt.t = 0; T.inpTgt.r = 0; T.inpTgt.p = 0; T.inpTgt.y = 0;\nvar out = [];\nfor (var w = 0; w <= 12; w += 3) {\n  T.respawn(); T.windV[0] = w;\n  var x0 = d.p[0];\n  for (var k = 0; k < 180; k++) T.physStep(1 / 60, (T.worldT || 0) + k / 60);\n  out.push({ wind: w, driftPerSec: ((d.p[0] - x0) / 3).toFixed(2), speed: Math.hypot(d.v[0], d.v[1], d.v[2]).toFixed(1) });\n}\nconsole.table(out);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live flight (phase, drone kinematics, motors, battery, gate index, wind and terrain under the drone). BALANCE edits the tuning object S, difficulty and quality. CHEATS changes the run. LAYOUT resizes and repositions the canvas, HUD, sticks, menu, pause and finish overlays per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "Bridge", text: "quad.html wraps its game in a strict IIFE. Its last block publishes window.TLHOOK: physStep, stepInput, crash, resolveColliders, respawn, doRespawn, startRun, finishRun, togglePause, render, drawHUD, frame, resize, rebuild, terrainH, terrainN, windV, buildPresetSeg, buildQualSeg, buildStyleSeg, saveS, tlResync; the objects drone, S, PRESETS, QUAL, DIFFS, gates, collGroups, dynObs, worldR, pathPts, inpState, inpTgt; and the counters state, racePhase, runTime, countT, gateIdx, crashes, topSpd, gatesFinished, paused, holdY, worldT. No game code runs in that block." },
      { topic: "S is the tuning surface", text: "S is a plain object persisted under the localStorage key 'proploop'. Editing a tuning row marks S.preset = 'CUSTOM' (like the page's own sliders) so the preset segment stops claiming a shipped preset. PRESETS.RACE/FREESTYLE/CINEWHOOP can be copied back with the preset cheats." },
      { topic: "Generator versus live values", text: "S.diff, S.style and S.seed feed the terrain and gate generator — those need CHEATS: rebuild terrain and gates. mass, twr, drag, rates, gains and wind are read by physStep every tick and take effect immediately." },
      { topic: "Frozen physics, live rendering", text: "frame drives stepInput every real frame and calls physStep(dt, worldTime) for the simulation. Freeze and slow motion wrap physStep only, so camera, prop animation and HUD keep moving while the drone hangs in the air." },
      { topic: "No crashes", text: "The toggle replaces the bridged crash with a no-op; terrain and obstacle hits stop counting crashes and stop respawning the drone. Off restores the original function." },
      { topic: "Quality auto-drop", text: "The page lowers S.quality itself when fps stays under 32 (autoDrop counter). If a tier you set snaps down, that is the page's own path, not a harness bug — freeze or lower viewDist to keep fps up." },
      { topic: "Not reachable", text: "WebGL resources (programs, buffers, textures), the audio synth internals, and the generated terrain/mesh caches stay private. Flight state, tuning, course structure and terrain sampling are all visible through the hooks." }
    ]
  });

  function applyPresetTo(name) {
    var T = h(), p = T.PRESETS[name]; if (!p) return;
    for (var k in p) SS()[k] = p[k];
    SS().preset = name;
    if (typeof T.buildPresetSeg === "function") T.buildPresetSeg();
    if (typeof T.saveS === "function") T.saveS();
  }
})();
