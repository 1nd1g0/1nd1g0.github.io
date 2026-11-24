/* dbg/stuntcarracer.js — developer harness for stuntcarracer.html (3D arcade racer)
 *
 * Load with:  stuntcarracer.html?debug=dbg/stuntcarracer.js
 * stuntcarracer.html declares its game at the top level of a plain script, so
 * the harness reaches stepCar, updateCarVisual, makeCar, placeGrid, respawn,
 * startRace, enterPause, exitPause, ranking, resize, frame, drawCar, drawMesh,
 * genTrack, buildTrack, buildCar, sample, sampleK plus cars, player, demoCar,
 * TRK, opt, state, stateBeforePause, raceT, countT, camSnap, camMode, camE,
 * camL, fov, keys, HW, ASSIST, CPU_BOOST, DIFFS, acc.
 * No page bridge; without ?debug the page behaves as shipped.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  function ensureRace() {
    if (typeof cars !== "undefined" && cars && cars.length > 1) return;
    if (typeof opt !== "undefined" && (!opt.opp || opt.opp < 3)) opt.opp = 3;
    var b = document.getElementById("start");
    if (b) b.click();
  }

  var realStep = null, scale = null;
  function wrap(v) {
    if (!realStep) realStep = window.stepCar;
    scale = v === null ? null : v;
    if (scale === null) { window.stepCar = realStep; return; }
    window.stepCar = function (c, dt) { realStep(c, dt * scale) };
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 1000)) / (r || 1000) : 0 }
  function P() { return player }
  function setP(key, v) { var c = player; if (c) c[key] = v }
  /* same ordering the page's ranking() uses: finished cars by finish time, then by laps+distance */
  function order() {
    if (!TRK) return cars.slice();
    return cars.slice().sort(function (a, b) {
      if (a.fin && b.fin) return a.finT - b.finT;
      if (a.fin) return -1; if (b.fin) return 1;
      return (b.lap * TRK.L + b.s) - (a.lap * TRK.L + a.s);
    });
  }

  TLDBG.register({
    game: "stuntcarracer", file: "stuntcarracer.html",

    state: function () {
      var c = P();
      return {
        phase: state, phaseBeforePause: stateBeforePause,
        raceTime: num(raceT, 100), countdown: num(countT, 100),
        difficulty: opt.diff, lapsTarget: opt.laps, opponents: opt.opp, music: !!opt.music,
        trackLength: TRK ? num(TRK.L, 1) : 0, trackSeed: (typeof seed !== "undefined" && typeof seed === "number") ? seed : (TRK ? TRK.seed : null),
        carsOnTrack: cars.length,
        playerLap: c ? c.lap : 0, playerS: c ? num(c.s, 1) : 0, playerSpeed: c ? num(c.v, 10) : 0,
        playerMaxSpeed: c ? num(c.vmax, 10) : 0, playerAir: c ? !!c.air : false, playerY: c ? num(c.y, 10) : 0,
        playerFinished: c ? !!c.fin : false, playerFinishTime: c ? (c.finT === null ? null : num(c.finT, 100)) : null,
        lastLap: c ? (c.lastLap === null ? null : num(c.lastLap, 100)) : null,
        bestLap: c ? (c.bestLap === null ? null : num(c.bestLap, 100)) : null,
        playerThrottle: c ? num(c.th, 100) : 0, playerBrake: c ? num(c.br, 100) : 0, playerSteer: c ? num(c.steer, 100) : 0,
        lateral: c ? num(c.lat, 100) : 0, spin: c ? num(c.spin, 100) : 0, safeSpot: c ? num(c.safe, 1) : 0,
        trackHalfWidth: HW, steeringAssist: ASSIST, cpuBoost: CPU_BOOST,
        keys: { up: !!keys.up, down: !!keys.dn, left: !!keys.lt, right: !!keys.rt },
        camera: { mode: camMode, snap: !!camSnap, fov: num(fov, 10), eye: camE.map(function (v) { return num(v, 1) }) },
        ranking: typeof ranking === "function" ? order().map(function (r, i) {
          return i + 1 + " " + (r.name || (r.isPlayer ? "player" : "cpu")) + " lap " + r.lap + " s " + num(r.s, 1);
        }).join(" | ") : null,
        playerPlace: typeof ranking === "function" ? ranking() : null
      };
    },

    params: [
      { id: "trackWidth", label: "Track half-width", unit: "units", min: 2, max: 9, step: 0.1,
        get: function () { return HW }, set: function (v) { HW = v },
        code: { file: "stuntcarracer.html", line: 510, name: "HW" },
        doc: "Drivable half-width of the road (4.5). stepCar clamps lateral offset against it; narrow values make corners brutal." },
      { id: "assist", label: "Steering assist", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { return ASSIST }, set: function (v) { ASSIST = v },
        code: { file: "stuntcarracer.html", line: 511, name: "ASSIST" },
        doc: "Blend toward the racing line when you steer (0.3 on normal). 1 makes steering automatic; 0 is raw." },
      { id: "cpuBoost", label: "Opponent speed boost", unit: "x", min: 0.5, max: 1.8, step: 0.05,
        get: function () { return CPU_BOOST }, set: function (v) { CPU_BOOST = v },
        code: { file: "stuntcarracer.html", line: 512, name: "CPU_BOOST" },
        doc: "Multiplier baked into each opponent's vmax at makeCar time. Changing it affects the NEXT race (CHEATS: start race)." },
      { id: "laps", label: "Race laps", unit: "laps", min: 1, max: 10, step: 1,
        get: function () { return opt.laps }, set: function (v) { opt.laps = Math.max(1, Math.round(v)) },
        code: { file: "stuntcarracer.html", line: 1002, name: "opt.laps" },
        doc: "Laps to finish (3). stepCar checks c.lap >= opt.laps to flag the car finished." },
      { id: "opponents", label: "Opponent count", unit: "cars", min: 0, max: 6, step: 1,
        get: function () { return opt.opp }, set: function (v) { opt.opp = Math.max(0, Math.round(v)) },
        code: { file: "stuntcarracer.html", line: 1002, name: "opt.opp" },
        doc: "Number of CPU cars created by startRace. Reads the same key as the #opSeg segment." },
      { id: "difficulty", label: "Difficulty", unit: "0 easy / 1 normal / 2 hard", min: 0, max: 2, step: 1,
        get: function () { return ["easy", "normal", "hard"].indexOf(opt.diff) },
        set: function (v) { opt.diff = ["easy", "normal", "hard"][Math.max(0, Math.min(2, Math.round(v)))] },
        code: { file: "stuntcarracer.html", line: 506, name: "opt.diff / DIFFS" },
        doc: "DIFFS rows carry hw, assist, curve and cpuBoost. `curve` only feeds genTrack, so the track shape changes on the next race rebuild; hw/assist rows are applied at race start." },
      { id: "fov", label: "Camera FOV", unit: "deg", min: 30, max: 110, step: 1,
        get: function () { return fov }, set: function (v) { fov = v },
        code: { file: "stuntcarracer.html", line: 1006, name: "fov" },
        doc: "Perspective field of view (60). Read by the projection each frame." },
      { id: "camMode", label: "Camera mode", unit: "index", min: 0, max: 4, step: 1,
        get: function () { return camMode }, set: function (v) { camMode = Math.max(0, Math.round(v)); camSnap = true },
        code: { file: "stuntcarracer.html", line: 1004, name: "camMode" },
        doc: "Camera preset index cycled by #tCam; setting it also arms camSnap so the view jumps immediately." },
      { id: "playerMaxSpeed", label: "Player top speed", unit: "units/s", min: 20, max: 120, step: 1,
        get: function () { var c = P(); return c ? c.vmax : 0 }, set: function (v) { setP("vmax", Math.max(5, v)) },
        code: { file: "stuntcarracer.html", line: 733, name: "player.vmax" },
        doc: "Live vmax of the player car (47 * boost). stepCar reads it every tick, so a mid-race change takes effect immediately." },
      { id: "playerAgg", label: "Player aggression", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { var c = P(); return c ? c.agg : 0 }, set: function (v) { setP("agg", v) },
        code: { file: "stuntcarracer.html", line: 728, name: "player.agg" },
        doc: "How hard the player car brakes into corners and takes risky lines (0.5)." },
      { id: "playerPref", label: "Player line preference", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { var c = P(); return c ? c.pref : 0 }, set: function (v) { setP("pref", v) },
        code: { file: "stuntcarracer.html", line: 729, name: "player.pref" },
        doc: "Blend between the racing line and the car's own offset (0.5). Read by updateCarVisual for the lateral target." },
      { id: "playerLap", label: "Player lap", unit: "lap", min: 0, max: 12, step: 1,
        get: function () { var c = P(); return c ? c.lap : 0 }, set: function (v) { setP("lap", Math.max(0, Math.round(v))) },
        code: { file: "stuntcarracer.html", line: 741, name: "player.lap" },
        doc: "Completed laps. stepCar flags the car finished once lap >= opt.laps, so writing opt.laps here ends the race on the next tick." },
      { id: "raceTime", label: "Race clock", unit: "s", min: 0, max: 900, step: 1,
        get: function () { return raceT }, set: function (v) { raceT = Math.max(0, v) },
        code: { file: "stuntcarracer.html", line: 1004, name: "raceT" },
        doc: "Race timer used for lap times and results. frame adds real dt while state is race/over." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "stepCar becomes a no-op: every car keeps its position, speed and lap state while rendering and the camera continue.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "Scales the delta handed to stepCar, so all cars (player and CPU) drive in slow motion together.",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "holdThrottle", label: "Hold throttle", toggle: true,
        doc: "keys.up = true: the player car accelerates without keyboard input.",
        on: function (v) { keys.up = !!v } },
      { id: "holdBrake", label: "Hold brake", toggle: true,
        doc: "keys.dn = true.",
        on: function (v) { keys.dn = !!v } },
      { id: "holdLeft", label: "Hold left", toggle: true,
        doc: "keys.lt = true — steer left continuously.",
        on: function (v) { keys.lt = !!v } },
      { id: "holdRight", label: "Hold right", toggle: true,
        doc: "keys.rt = true.",
        on: function (v) { keys.rt = !!v } },
      { id: "forward", label: "Move player +40 along track",
        doc: "Adds 40 units to the player's track coordinate (c.s), leaving y and lateral intact — jumps the grid position.",
        run: function () { var c = P(); if (!c) { TLDBG.toast("no player car"); return; } c.s += 40; TLDBG.toast("s " + num(c.s, 1)); } },
      { id: "launchAir", label: "Launch player into the air",
        doc: "Sets car.y above the road with upward velocity and air flag — tests the airborne/recovery path in stepCar.",
        run: function () { var c = P(); if (!c) { TLDBG.toast("no player car"); return; } c.y += 6; c.vy = 9; c.air = true; TLDBG.toast("airborne"); } },
      { id: "respawnPlayer", label: "Respawn player on track",
        doc: "respawn(): the page's own recovery onto the track at the safe coordinate.",
        run: function () { respawn(); TLDBG.toast("respawned"); } },
      { id: "finishPlayer", label: "Finish the player now",
        doc: "Sets player.lap to opt.laps so stepCar flags the car finished and results appear on the next tick.",
        run: function () { var c = P(); if (!c) { TLDBG.toast("no player car"); return; } c.lap = opt.laps; TLDBG.toast("lap " + c.lap + "/" + opt.laps) } },
      { id: "resetLaps", label: "Reset all laps and times",
        doc: "placeGrid(): re-grids every car and clears lap, best lap, finish flags.",
        run: function () { placeGrid(); raceT = 0; TLDBG.toast("grid reset"); } },
      { id: "startRace", label: "Start the race",
        doc: "startRace(): builds track from the seed, creates opponents, grid and countdown.",
        run: function () { startRace(); TLDBG.toast("cars " + cars.length); } },
      { id: "newSeed", label: "Random seed and rebuild",
        doc: "Writes a fresh seed into #seed and restarts the race, generating a new track.",
        run: function () {
          var s = (Math.random() * 1e9) | 0, i = document.getElementById("seed");
          if (i) i.value = s;
          if (typeof seed !== "undefined") seed = s;
          startRace(); TLDBG.toast("seed " + s);
        } },
      { id: "pause", label: "Pause", toggle: true,
        doc: "enterPause()/exitPause(): stops the clock and shows #pauseOv.",
        on: function (v) { if (v) { if (typeof enterPause === "function") enterPause(); } else { if (typeof exitPause === "function") exitPause() } } },
      { id: "noAssist", label: "Turn assist off", toggle: true,
        doc: "ASSIST = 0 while on (raw steering), restored to the difficulty value when off.",
        on: function (v) { if (v) { if (window.__tllAssist === undefined) window.__tllAssist = ASSIST; ASSIST = 0; } else if (window.__tllAssist !== undefined) { ASSIST = window.__tllAssist; delete window.__tllAssist } } },
      { id: "hideHud", label: "Hide HUD and touch pad", toggle: true,
        doc: "Display:none on #hud, #touch and #hint for clean captures.",
        on: function (v) { ["hud", "touch", "hint"].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = v ? "none" : "" }) } }
    ],

    hooks: [
      { label: "Console: cars", doc: "Every car: name, player flag, lap, track coordinate, speed, height, throttle/brake/steer, lap times.",
        run: function () {
          console.table(cars.map(function (c, i) {
            return { i: i, name: c.name || "-", player: !!c.isPlayer, lap: c.lap, s: num(c.s, 1), lat: num(c.lat, 100),
              v: num(c.v, 10), vmax: num(c.vmax, 10), y: num(c.y, 10), air: !!c.air, th: num(c.th, 100), br: num(c.br, 100),
              steer: num(c.steer, 100), boost: num(c.boost, 100), agg: num(c.agg, 100), pref: num(c.pref, 100),
              lastLap: c.lastLap === null ? "-" : num(c.lastLap, 100), bestLap: c.bestLap === null ? "-" : num(c.bestLap, 100),
              fin: !!c.fin, finT: c.finT === null ? "-" : num(c.finT, 100), hold: !!c.hold };
          }));
        } },
      { label: "Console: ranking", doc: "Race order (finished cars by finish time, then laps+distance) with progress, plus the page's own ranking() place for the player.",
        run: function () {
          console.table(order().map(function (c, i) {
            return { place: i + 1, name: c.name || (c.isPlayer ? "player" : "cpu"), lap: c.lap, s: num(c.s, 1),
              progress: TRK ? num(((c.lap * TRK.L + c.s) / (TRK.L * opt.laps)) * 100, 1) + "%" : "-",
              finished: !!c.fin, time: c.finT === null ? "-" : num(c.finT, 100) };
          }));
          console.log({ playerPlace: typeof ranking === "function" ? ranking() : "ranking() not available", cars: cars.length, laps: opt.laps });
        } },
      { label: "Console: track geometry", doc: "Track length, sample count, elevation range, peak curvature and the ramp gaps, plus two centreline samples.",
        run: function () {
          if (!TRK) { console.log("no track generated yet"); return; }
          var ys = TRK.Y ? TRK.Y : [];
          console.log({ L: num(TRK.L, 1), samples: TRK.N, diff: opt.diff, curve: DIFFS[opt.diff].curve, HW: HW,
            elevMin: ys.length ? num(Math.min.apply(null, ys), 1) : "-", elevMax: ys.length ? num(Math.max.apply(null, ys), 1) : "-",
            maxCurvature: TRK.K ? num(Math.max.apply(null, TRK.K.map(function (k) { return Math.abs(k) })), 1000) : "-",
            gaps: TRK.gaps ? TRK.gaps.length : "-", gapStarts: TRK.gaps ? TRK.gaps.map(function (g) { return num(g.s0, 1) }) : "-",
            fields: Object.keys(TRK) });
          console.log({ sampleAt0: sample(0), sampleAtQuarter: sample(TRK.L * 0.25) });
        } },
      { label: "Console: difficulty and options", doc: "All DIFFS rows, the option object, and the live physics scalars.",
        run: function () {
          console.log({ DIFFS: DIFFS, opt: opt, HW: HW, ASSIST: ASSIST, CPU_BOOST: CPU_BOOST,
            playerRow: player ? { vmax: num(player.vmax, 10), boost: num(player.boost, 100), agg: num(player.agg, 100), pref: num(player.pref, 100), pat: num(player.pat, 100) } : null });
        } },
      { label: "Console: race and camera", doc: "Phase, timers, input keys, camera mode/eye/fov and the accumulator state.",
        run: function () {
          console.log({ state: state, stateBeforePause: stateBeforePause, raceT: num(raceT, 100), countT: num(countT, 100),
            camMode: camMode, camSnap: camSnap, camE: camE.map(function (v) { return num(v, 1) }), camL: camL.map(function (v) { return num(v, 1) }),
            fov: num(fov, 10), keys: keys, acc: num(acc, 1000), stepSize: 1 / 120,
            demoCar: demoCar ? { s: num(demoCar.s, 1), v: num(demoCar.v, 10) } : null });
        } }
    ],

    layout: [
      { sel: "#cv", label: "WebGL canvas" },
      { sel: "#hud", label: "HUD layer" },
      { sel: "#hudTL", label: "HUD top-left block" },
      { sel: "#hudTR", label: "HUD top-right block" },
      { sel: "#pos", label: "Position readout" },
      { sel: "#lap", label: "Lap readout" },
      { sel: "#speed", label: "Speed readout" },
      { sel: "#spd", label: "Speed bar" },
      { sel: "#hint", label: "Hint line" },
      { sel: "#count", label: "Countdown overlay" },
      { sel: "#countN", label: "Countdown digit" },
      { sel: "#menu", label: "Menu overlay" },
      { sel: "#panel", label: "Menu panel" },
      { sel: "#start", label: "Start race button" },
      { sel: "#seed", label: "Seed input" },
      { sel: "#seedRow", label: "Seed row" },
      { sel: "#dice", label: "Random seed button" },
      { sel: "#dfSeg", label: "Difficulty segment" },
      { sel: "#opSeg", label: "Opponents segment" },
      { sel: "#lpSeg", label: "Laps segment" },
      { sel: "#muSeg", label: "Music segment" },
      { sel: "#pauseOv", label: "Pause overlay" },
      { sel: "#pResume", label: "Resume button" },
      { sel: "#pMenu", label: "Pause menu button" },
      { sel: "#pmMuSeg", label: "Pause music segment" },
      { sel: "#results", label: "Results overlay" },
      { sel: "#resTitle", label: "Results title" },
      { sel: "#tbl", label: "Results table" },
      { sel: "#rNew", label: "New race button" },
      { sel: "#rRetry", label: "Retry button" },
      { sel: "#rMenu", label: "Results menu button" },
      { sel: "#touch", label: "Touch controls layer" },
      { sel: "#tL", label: "Touch left button" },
      { sel: "#tR", label: "Touch right button" },
      { sel: "#tB", label: "Touch brake button" },
      { sel: "#tG", label: "Touch gas button" },
      { sel: "#tCam", label: "Camera button" },
      { sel: "#tPause", label: "Pause button" },
      { sel: "#bt", label: "Bottom toolbar" },
      { sel: "#ctrlLine", label: "Controls legend line" },
      { sel: "#homeBtn", label: "Home link" },
      { sel: "#toast", label: "Toast" },
      { sel: "#scan", label: "Scanline overlay" },
      { sel: "#vig", label: "Vignette overlay" },
      { sel: "#fatal", label: "Fatal error panel" },
      { sel: "#noGL", label: "No-WebGL panel" },
      { sel: ".card", label: "Menu cards" },
      { sel: ".chip", label: "Chips" },
      { sel: ".seg", label: "Segmented controls" },
      { sel: ".ovl", label: "Overlay screens" },
      { sel: ".keys", label: "Key legend" },
      { sel: ".lbl", label: "Labels" },
      { sel: ".tb", label: "Toolbar buttons" },
      { sel: ".me", label: "Player row in results" },
      { sel: ".tag", label: "Tags" },
      { sel: ".foot", label: "Foot notes" },
      { sel: ".u", label: "Unit text" },
      { sel: ".v", label: "Value text" },
      { sel: ".sw", label: "Switch element" },
      { sel: ".on", label: "Active control state" },
      { sel: ".hidden", label: "Hidden element hook" }
    ],

    control: [
      { id: "aiParam", label: "Tune one rival driver", args: '[carIndex 1+, "agg"|"pref"|"pat"|"boost"|"vmax"|"react", value]', argDefault: '[1, "agg", 0.95]',
        doc: "Each CPU car carries a personality: agg (aggression — bumps rivals and dives at gaps), pref (line preference: racing line vs wander), pat (pattern phase/amplitude), boost (top-speed multiplier), react (throttle delay at race start). aiControl reads all of them every tick, so the change is instant.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, field, value]";
          ensureRace(); var c = cars[+a[0]]; if (!c) return "no car " + a[0];
          var f = String(a[1]); if (!(f in c)) return "no field " + f;
          c[f] = Number(a[2]);
          return { name: c.name, cpu: !c.isPlayer, field: f, value: c[f], vmax: num(c.vmax, 10) };
        } },
      { id: "profile", label: "Print every driver's personality", args: "unused",
        doc: "console.table of agg/pref/pat/boost/react/vmax/v/steer/throttle/brake for all cars — the read side of aiParam.",
        run: function () {
          console.table(cars.map(function (c, i) {
            return { i: i, name: c.name, cpu: !c.isPlayer, agg: num(c.agg, 100), pref: num(c.pref, 100), pat: num(c.pat, 100),
              boost: num(c.boost, 100), react: num(c.react, 100), vmax: num(c.vmax, 10), v: num(c.v, 10),
              lat: num(c.lat, 10), steer: num(c.steer, 100), th: num(c.th, 100), br: num(c.br, 100), lap: c.lap };
          }));
          return cars.length + " cars printed";
        } },
      { id: "aiWatch", label: "Watch rival decisions", args: "seconds (0 stops)", argDefault: 1,
        doc: "Logs throttle, brake, steer and lateral target for every CPU car on an interval; window.__tllAI holds the timer.",
        run: function (s) {
          if (window.__tllAI) { clearInterval(window.__tllAI); window.__tllAI = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllAI = setInterval(function () {
            console.table(cars.map(function (c, i) {
              return { i: i, name: c.name, v: num(c.v, 10), th: num(c.th, 100), br: num(c.br, 100),
                steer: num(c.steer, 100), lat: num(c.lat, 10), s: num(c.s, 1), lap: c.lap };
            }));
          }, sec * 1000);
          return "watching every " + sec + "s";
        } },
      { id: "boost", label: "Global CPU speed multiplier", args: "0.5 - 1.8", argDefault: 1.2,
        doc: "CPU_BOOST is read by makeCar at race start (0.88-1.10 jitter on top). Setting it here and then restarting the race re-bandwidths every rival's top speed.",
        run: function (v) { CPU_BOOST = Number(v); return { cpuBoost: CPU_BOOST, note: "applies to cars built by the next race" }; } },
      { id: "drive", label: "Drive the player by key state", args: '"up" | "dn" | "lt" | "rt" | "clear"', argDefault: "up",
        doc: "Sets the same keys object the keyboard and touch pad write, so scripts can hold throttle or steering without synthetic events.",
        run: function (k) {
          var name = String(k || "clear");
          if (name === "clear") { keys.up = keys.dn = keys.lt = keys.rt = false; return "keys cleared"; }
          if (!(name in keys)) return "unknown key " + name;
          keys[name] = !keys[name];
          return JSON.stringify(keys);
        } },
      { id: "place", label: "Move a car on the track", args: "[carIndex, distance, lateral]", argDefault: '[1, 120, 0]',
        doc: "Writes c.s and c.lat directly — jump a rival ahead of the player or drop the player into a pack to test the avoidance/overtake branches of aiControl.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, s, lat]";
          ensureRace(); var c = cars[+a[0]]; if (!c) return "no car " + a[0];
          c.s = Number(a[1]); c.lat = clamp(Number(a[2]), -HW, HW);
          return { name: c.name, s: num(c.s, 10), lat: num(c.lat, 10), playerPosition: ranking() };
        } },
      { id: "race", label: "Restart the race", args: "seed text (optional)", argDefault: "",
        doc: "Writes the seed field (#seed or its element) and calls startRace(): rebuilds the track from that seed, the rival roster from CPU_DEFS and their personality rolls.",
        run: function (seed) {
          if (seed && String(seed).trim() && seedEl) seedEl.value = String(seed).trim();
          startRace();
          return { state: state, cars: cars.length, opponents: opt.opp, laps: opt.laps, diff: opt.diff, trackLength: num(TRK.L, 1) };
        } },
      { id: "difficultyNow", label: "Apply a difficulty row now", args: '"easy" | "normal" | "hard"', argDefault: "hard",
        doc: "Loads the DIFFS row into HW, ASSIST and CPU_BOOST immediately (the race-start path) without rebuilding the track.",
        run: function (d) {
          var df = DIFFS[String(d || "normal")]; if (!df) return "unknown difficulty " + d;
          opt.diff = String(d); HW = df.hw; ASSIST = df.assist; CPU_BOOST = df.cpuBoost;
          return { diff: opt.diff, hw: HW, assist: ASSIST, cpuBoost: CPU_BOOST };
        } }
    ],

    recipes: [
      { label: "Make every rival a hard driver",
        doc: "High aggression and line preference on all CPU cars, then a race restart so the boost roll uses the raised CPU_BOOST.",
        js: 'CPU_BOOST = 1.25;\ncars.forEach(function (c) { if (c.isPlayer) return; c.agg = 0.95; c.pref = 0.85; c.pat = 0.7; c.react = 0.08; });\nstartRace();\nconsole.table(cars.map(function (c) { return { name: c.name, agg: c.agg, pref: c.pref, boost: c.boost, vmax: c.vmax }; }));' },
      { label: "Rubber-band test: slow the leader",
        doc: "Caps the leading CPU car so the player can catch it — checks whether the chasing rivals' avoidance logic reacts to a slower car.",
        js: 'var lead = cars.filter(function (c) { return !c.isPlayer; }).sort(function (a, b) { return wrapD(a.s - player.s) - wrapD(b.s - player.s); })[0];\nif (lead) { lead.vmax *= 0.7; lead.agg = 0.2; console.log("slowed", lead.name, "vmax", lead.vmax); }\nwindow.__tllGap = setInterval(function () {\n  console.log("player v", player.v.toFixed(1), "gap to leader", wrapD(lead ? lead.s - player.s : 0).toFixed(1));\n}, 1000);' },
      { label: "Personality sweep of CPU_DEFS",
        doc: "Prints the shipped rival definitions and maps them onto the live cars — the reference for tuning agg/pref per name.",
        js: 'console.table(CPU_DEFS.map(function (d, i) { return { i: i, name: d[0], agg: d[1], pref: d[2], pat: d[3] }; }));\ncars.forEach(function (c, i) { var d = CPU_DEFS[i % CPU_DEFS.length]; if (!c.isPlayer) { c.name = d[0]; c.agg = d[1]; c.pref = d[2]; c.pat = d[3]; } });\nconsole.log("assigned", cars.map(function (c) { return c.name + ":" + c.agg.toFixed(2); }).join(" "));' },
      { label: "Hands-off autopilot probe",
        doc: "Clears player input and logs the standings each second — pure CPU race, useful to measure rival pace without human input.",
        js: 'keys.up = keys.dn = keys.lt = keys.rt = false;\nif (window.__tllStand) clearInterval(window.__tllStand);\nwindow.__tllStand = setInterval(function () {\n  var order = cars.slice().sort(function (a, b) { return (b.lap * TRK.L + b.s) - (a.lap * TRK.L + a.s); });\n  console.table(order.map(function (c, i) { return { pos: i + 1, name: c.name, cpu: !c.isPlayer, lap: c.lap, v: +c.v.toFixed(1), fin: !!c.fin }; }));\n}, 1000);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live race (phase, clock, lap, speed, ranking, camera). BALANCE edits track width, assist, opponent boost, race options, camera and the player car. CHEATS changes the race. LAYOUT resizes and repositions the canvas, HUD blocks, countdown, menu, pause and results overlays per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "stuntcarracer.html declares its game at the top level of a plain script, so the harness reaches stepCar, updateCarVisual, makeCar, placeGrid, respawn, startRace, enterPause, exitPause, ranking, resize, frame, drawCar, drawMesh, genTrack, buildTrack, buildCar, sample, sampleK plus cars, player, demoCar, TRK, opt, state, stateBeforePause, raceT, countT, camSnap, camMode, camE, camL, fov, keys, HW, ASSIST, CPU_BOOST, DIFFS. The page file is untouched." },
      { topic: "Per-car simulation", text: "frame runs a fixed 1/120 accumulator and calls stepCar(car, dt) for every car. Freeze and slow motion wrap stepCar, so all cars stop or slow together while the camera, HUD and prop-free visuals keep rendering." },
      { topic: "Race-start versus live values", text: "opt.opp, opt.diff and CPU_BOOST take effect when startRace() creates the cars. player.vmax, HW, ASSIST, opt.laps and the lap counters are read live by stepCar, so mid-race edits apply immediately." },
      { topic: "Track generation", text: "genTrack(seed) uses DIFFS[opt.diff].curve for corner intensity; TRK holds the centreline, length L and elevation. The seed field is regenerated by the dice button — the CHEAT writes a fresh seed into #seed and restarts." },
      { topic: "Finishing early", text: "Writing player.lap = opt.laps makes stepCar flag the car finished on the next tick, so the results overlay appears without driving the distance. placeGrid() clears laps and finish flags again." },
      { topic: "Not reachable", text: "WebGL resources (programs, buffers, the gl context), the audio synth (beep, startMusic, sfx internals) and the generated mesh buffers stay private. Car state, ranking, track geometry and the difficulty table are all visible through the hooks." }
    ]
  });
})();
