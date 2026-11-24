/* dbg/moto.js — developer harness for moto.html (stunt scooter / side-scroll racer)
 *
 * Load with:  moto.html?debug=dbg/moto.js
 * moto.html declares its game at the top level of a plain <script>, so the
 * harness reaches physics, crash, win, respawnAtCheckpoint, resetBike,
 * startLevel, startNewGame, nextLevel, restartLevel, quitToTitle, pauseGame,
 * resumeGame, updateHUD, setQualityTier, setDifficulty, setDriveMode, resize,
 * awardFlips, collectCoinsAndCheckpoints, updateCamera plus bike, rider, cam,
 * visuals, headLight, tailLight, quality, DIFF_PARAMS, input, pits, coins,
 * checkpoints, bridges, rocks, trees, level, score, difficulty, driveMode.
 * No page bridge; without ?debug the page behaves as shipped.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  var realPhysics = null;
  function wrap(scale) {
    if (!realPhysics) realPhysics = window.physics;
    if (scale === null) { window.physics = realPhysics; return; }
    window.physics = function (dt) { realPhysics(dt * scale) };
  }

  var realCrash = null;
  function setNoCrash(v) {
    if (v) { if (!realCrash) realCrash = window.crash; window.crash = function () { }; }
    else if (realCrash) window.crash = realCrash;
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }
  function dp() { var i = Math.max(0, Math.min(3, difficulty | 0)); return DIFF_PARAMS[i] }

  TLDBG.register({
    game: "moto", file: "moto.html",

    state: function () {
      return {
        inGame: inGame, paused: paused, alive: !!bike.alive, finished: !!bike.finished,
        crashPending: crashPending, crashReason: crashReason, crashes: crashes,
        level: level, score: score, difficulty: difficulty, driveMode: driveMode, musicOn: musicOn,
        distance: num(bike.dist, 1), maxX: num(bike.maxX, 1), finishX: num(finishX, 1), worldW: num(worldW, 1),
        speed: num(bike.speed, 1), vx: num(bike.vx, 1), vy: num(bike.vy, 1),
        angleDeg: num(bike.a * 180 / Math.PI, 1), angVel: num(bike.av, 10),
        onGround: !!bike.onGnd, rearOnGround: !!bike.rearG, frontOnGround: !!bike.frontG,
        airTime: num(bike.air, 10), rotation: num(bike.rot, 10), maxRotation: num(bike.maxRot, 10),
        flips: bike.flips, flipsAwarded: bike.flipsAwarded, boosting: !!bike.boosting,
        combo: bike.combo, comboTimer: num(bike.comboT, 10),
        checkpointsDone: curCp, coinsGot: coinsGot,
        coinsOnTrack: coins.length, checkpointsOnTrack: checkpoints.length,
        pits: pits.length, bridges: bridges.length, rocks: rocks.length, trees: trees.length,
        theme: theme ? (theme.name || theme.kind || "custom") : null,
        camera: { x: num(cam.x, 1), y: num(cam.y, 1), scale: num(cam.scale, 100) },
        quality: { tier: quality.tier, resScale: num(quality.resScale, 100), maxPixels: quality.maxPixels, weatherMax: quality.weatherMax },
        canvas: W + "x" + H,
        throttle: !!input.gas, brake: !!input.brake, leanLeft: !!input.left, leanRight: !!input.right
      };
    },

    params: [
      { id: "gravity", label: "Gravity", unit: "px/s2", min: 200, max: 3000, step: 25,
        get: function () { return GRAV }, set: function (v) { GRAV = v },
        code: { file: "moto.html", line: 352, name: "GRAV" },
        doc: "Downward acceleration (1320). jumpRange() and maxClimbRad() recompute from it, so ramps and climbable slopes change with the value." },
      { id: "engine", label: "Engine force", unit: "px/s2", min: 400, max: 4000, step: 50,
        get: function () { return ENG }, set: function (v) { ENG = v },
        code: { file: "moto.html", line: 352, name: "ENG" },
        doc: "Drive force on the powered wheel (1650). Also sets the steepest climbable slope through maxClimbRad(traction)." },
      { id: "boost", label: "Boost pad force", unit: "px/s2", min: 600, max: 6000, step: 100,
        get: function () { return BOOST }, set: function (v) { BOOST = v },
        code: { file: "moto.html", line: 352, name: "BOOST" },
        doc: "Extra force while riding a boost pad (T_BOOST, 2600)." },
      { id: "maxSpeed", label: "Speed cap", unit: "px/s", min: 200, max: 2000, step: 20,
        get: function () { return MAXSPD }, set: function (v) { MAXSPD = v },
        code: { file: "moto.html", line: 352, name: "MAXSPD" },
        doc: "Velocity clamp (860) applied every physics tick; raising it lets boost pads fling the scooter." },
      { id: "wheelRadius", label: "Wheel radius", unit: "px", min: 6, max: 26, step: 1,
        get: function () { return WRAD }, set: function (v) { WRAD = v },
        code: { file: "moto.html", line: 352, name: "WRAD" },
        doc: "Contact radius of both wheels (13). Terrain sampling sits WRAD+WY above the ground, so this changes ride height." },
      { id: "wheelBase", label: "Wheel base", unit: "px", min: 30, max: 110, step: 1,
        get: function () { return WBASE }, set: function (v) { WBASE = v },
        code: { file: "moto.html", line: 352, name: "WBASE" },
        doc: "Distance between the two contact points (54). A longer base bridges gaps and pitches less on slopes." },
      { id: "leanGround", label: "Lean torque (ground)", unit: "rad/s2", min: 0, max: 140, step: 2,
        get: function () { return LEAN_G }, set: function (v) { LEAN_G = v },
        code: { file: "moto.html", line: 353, name: "LEAN_G" },
        doc: "How hard left/right leans rotate the bike while a wheel touches (36)." },
      { id: "leanAir", label: "Lean torque (air)", unit: "rad/s2", min: 0, max: 260, step: 5,
        get: function () { return LEAN_A }, set: function (v) { LEAN_A = v },
        code: { file: "moto.html", line: 353, name: "LEAN_A" },
        doc: "Airborne rotation authority (98) — the flip knob. Double it and flips land far too fast." },
      { id: "maxAvGround", label: "Max angular vel (ground)", unit: "rad/s", min: 1, max: 24, step: 0.5,
        get: function () { return MAX_AV_G }, set: function (v) { MAX_AV_G = v },
        code: { file: "moto.html", line: 353, name: "MAX_AV_G" },
        doc: "Spin cap on the ground (8.5), keeps landing correction sane." },
      { id: "maxAvAir", label: "Max angular vel (air)", unit: "rad/s", min: 4, max: 60, step: 1,
        get: function () { return MAX_AV_A }, set: function (v) { MAX_AV_A = v },
        code: { file: "moto.html", line: 353, name: "MAX_AV_A" },
        doc: "Spin cap in the air (24). With LEAN_A this sets how many flips fit inside one jump." },
      { id: "flipEpsilon", label: "Flip credit slack", unit: "turns", min: 0, max: 1, step: 0.02,
        get: function () { return FLIP_EPS }, set: function (v) { FLIP_EPS = v },
        code: { file: "moto.html", line: 353, name: "FLIP_EPS" },
        doc: "awardFlips() rounds floor((maxRot+FLIP_EPS)/TAU), so this partial turn (0.34) is what a near-flip credits as." },
      { id: "traction", label: "Traction (current difficulty)", unit: "0.4-1.4", min: 0.4, max: 1.4, step: 0.01,
        get: function () { return dp().traction }, set: function (v) { dp().traction = v },
        code: { file: "moto.html", line: 357, name: "DIFF_PARAMS[difficulty].traction" },
        doc: "Grip multiplier of the active difficulty row (1.00 easy .. 0.85 extreme). physics() reads it every tick; it scales drive force and climb ability." },
      { id: "wind", label: "Wind force (current difficulty)", unit: "px/s2", min: 0, max: 400, step: 10,
        get: function () { return dp().wind }, set: function (v) { dp().wind = v },
        code: { file: "moto.html", line: 357, name: "DIFF_PARAMS[difficulty].wind" },
        doc: "Constant horizontal push for the active row (120..270)." },
      { id: "landTol", label: "Landing tolerance", unit: "rad ratio", min: 0.6, max: 2, step: 0.05,
        get: function () { return dp().landTol }, set: function (v) { dp().landTol = v },
        code: { file: "moto.html", line: 357, name: "DIFF_PARAMS[difficulty].landTol" },
        doc: "How far off the slope angle a landing may be before crash() fires. 2.0 makes landings forgiving." },
      { id: "cpEvery", label: "Checkpoint spacing", unit: "px", min: 400, max: 2400, step: 50,
        get: function () { return dp().cpEvery }, set: function (v) { dp().cpEvery = v },
        code: { file: "moto.html", line: 357, name: "DIFF_PARAMS[difficulty].cpEvery" },
        doc: "Distance between generated checkpoints (850..1400). Applies to the NEXT level build; use CHEATS: restart level." },
      { id: "level", label: "Level", unit: "level", min: 1, max: 99, step: 1,
        get: function () { return level }, set: function (v) { level = Math.max(1, Math.round(v)) },
        code: { file: "moto.html", line: 347, name: "level" },
        doc: "Level number in the HUD. Terrain length scales with it (target + per*level), so pair it with restart level." },
      { id: "score", label: "Score", unit: "points", min: 0, max: 9999999, step: 100,
        get: function () { return score }, set: function (v) { score = Math.max(0, Math.round(v)); if (typeof updateHUD === "function") updateHUD() },
        code: { file: "moto.html", line: 347, name: "score" },
        doc: "Run score; updateHUD() repaints #hudScore immediately." },
      { id: "difficulty", label: "Difficulty", unit: "0-3", min: 0, max: 3, step: 1,
        get: function () { return difficulty },
        set: function (v) { if (typeof setDifficulty === "function") setDifficulty(Math.round(v)); else difficulty = Math.max(0, Math.min(3, Math.round(v))) },
        code: { file: "moto.html", line: 791, name: "setDifficulty" },
        doc: "Uses the page's own setter (clamps, repaints #diffBtn*, saves options). Terrain generation reads DIFF_PARAMS on the next startLevel()." },
      { id: "driveMode", label: "Drive mode", unit: "0-2", min: 0, max: 2, step: 1,
        get: function () { return driveMode },
        set: function (v) { if (typeof setDriveMode === "function") setDriveMode(Math.round(v)); else driveMode = Math.max(0, Math.min(2, Math.round(v))) },
        code: { file: "moto.html", line: 792, name: "setDriveMode" },
        doc: "0 rear, 1 front, 2 both wheels powered — changes traction handling in physics() live." },
      { id: "qualityTier", label: "Quality tier", unit: "0-2", min: 0, max: 2, step: 1,
        get: function () { return quality.tier },
        set: function (v) { if (typeof setQualityTier === "function") setQualityTier(Math.round(v)); else quality.tier = Math.max(0, Math.min(2, Math.round(v))) },
        code: { file: "moto.html", line: 394, name: "setQualityTier" },
        doc: "configureQualityTier + resize: resolution scale, weather particle caps, fog/lighting/leaves flags. updateQualityAuto() may retune it from measured frame time (qCooldown 2.5 s)." },
      { id: "headlightRange", label: "Headlight range", unit: "px", min: 100, max: 900, step: 20,
        get: function () { return headLight.range }, set: function (v) { headLight.range = v },
        code: { file: "moto.html", line: 370, name: "headLight.range" },
        doc: "Headlight reach (520) used by lightIntensity(); updateLights() re-derives on/off each frame from the theme." },
      { id: "fogDensity", label: "Fog density", unit: "0-0.4", min: 0, max: 0.4, step: 0.01,
        get: function () { return visuals.fogDensity }, set: function (v) { visuals.fogDensity = v },
        code: { file: "moto.html", line: 368, name: "visuals.fogDensity" },
        doc: "Distance fog strength (0.08). 0 flattens depth; 0.4 hides the finish line." },
      { id: "step", label: "Fixed timestep", unit: "s", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return STEP },
        code: { file: "moto.html", line: 353, name: "STEP" },
        doc: "Read-only by design here: frame() accumulates real time into physics(STEP) slices (1/120). Changing it live would desync the accumulator; use slow motion instead." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "physics() becomes a no-op: the scooter hangs mid-air while drawing, camera and HUD keep running.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "Scales the delta handed to physics(): flips, landing, particles and weather all slow together.",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "noCrash", label: "No crashes", toggle: true,
        doc: "Replaces crash() with a no-op, so bad landings and pits stop ending the run. Off restores the real function.",
        on: function (v) { setNoCrash(v) } },
      { id: "holdThrottle", label: "Hold throttle", toggle: true,
        doc: "Forces kIn.gas true so the scooter accelerates without key input — hands-free ride tests.",
        on: function (v) { kIn.gas = !!v; if (!v) input.gas = false } },
      { id: "leanBack", label: "Hold lean back", toggle: true,
        doc: "Forces kIn.left true: wheelies on the ground, back-flips in the air.",
        on: function (v) { kIn.left = !!v } },
      { id: "creditFlip", label: "Credit one flip",
        doc: "Adds a full turn to bike.maxRot; awardFlips() scores it on the next physics tick.",
        run: function () { bike.maxRot += TAU; TLDBG.toast("maxRot " + num(bike.maxRot, 10)) } },
      { id: "maxCombo", label: "Combo to 12",
        doc: "Sets bike.combo and refreshes the timer so the combo multiplier is visible immediately.",
        run: function () { bike.combo = 12; bike.comboT = 3; if (typeof updateHUD === "function") updateHUD(); TLDBG.toast("combo 12"); } },
      { id: "teleport", label: "Teleport +600 px",
        doc: "Moves the scooter forward and drops it onto the sampled ground (groundAt + ggInfo), zeroing velocity.",
        run: function () {
          var nx = bike.x + 600; groundAt(nx, ggInfo);
          bike.x = nx; bike.y = ggInfo.y - WRAD - WY - 1; bike.a = ggInfo.angle;
          bike.vx = 0; bike.vy = 0; bike.av = 0; bike.onGnd = true; TLDBG.toast("x " + num(nx, 1));
        } },
      { id: "respawnCp", label: "Respawn at checkpoint",
        doc: "respawnAtCheckpoint(): the page's own crash-recovery path to the last checkpoint.",
        run: function () { respawnAtCheckpoint(); TLDBG.toast("cp " + curCp); } },
      { id: "revive", label: "Revive and continue",
        doc: "Clears alive=false / crashPending, sets inGame and resumes — mid-run recovery without a new level.",
        run: function () {
          bike.alive = true; bike.finished = false; crashPending = false; crashTimer = 0; crashReason = "";
          inGame = true; if (typeof resumeGame === "function") resumeGame(); else paused = false;
          TLDBG.toast("revived");
        } },
      { id: "winNow", label: "Finish the level",
        doc: "win(): scores distance + flips + coins and shows the win screen.",
        run: function () { win(); TLDBG.toast("level won"); } },
      { id: "collectAll", label: "Collect coins and checkpoints now",
        doc: "Runs collectCoinsAndCheckpoints() at the current position; use after teleporting past pickups.",
        run: function () { collectCoinsAndCheckpoints(); TLDBG.toast("coins " + coinsGot + " cp " + curCp) } },
      { id: "newGame", label: "Start a new game",
        doc: "startNewGame(): level 1, score 0, fresh terrain through the page's own path.",
        run: function () { startNewGame(); TLDBG.toast("new game"); } },
      { id: "nextLevel", label: "Go to next level",
        doc: "nextLevel(): level++ then startLevel() rebuilds terrain for that level and difficulty row.",
        run: function () { nextLevel(); TLDBG.toast("level " + level) } },
      { id: "restartLevel", label: "Restart this level",
        doc: "restartLevel() (startLevel): same level, fresh terrain and bike.",
        run: function () { restartLevel(); TLDBG.toast("level " + level + " restarted") } },
      { id: "quitTitle", label: "Quit to title",
        doc: "quitToTitle(): stops music and shows #titleScreen.",
        run: function () { quitToTitle(); TLDBG.toast("title screen") } },
      { id: "hideHud", label: "Hide HUD and touch pad", toggle: true,
        doc: "Display:none on #hud and #touchControls for clean captures.",
        on: function (v) { ["hud", "touchControls"].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = v ? "none" : "" }) } }
    ],

    hooks: [
      { label: "Console: scooter state", doc: "bike + rider: position, velocity, angle, contacts, air time, rotation, flips, combo.",
        run: function () {
          console.log({ bike: { x: num(bike.x, 1), y: num(bike.y, 1), vx: num(bike.vx, 1), vy: num(bike.vy, 1),
            a: num(bike.a, 100), av: num(bike.av, 100), speed: num(bike.speed, 1), dist: num(bike.dist, 1), maxX: num(bike.maxX, 1),
            onGnd: bike.onGnd, rearG: bike.rearG, frontG: bike.frontG, air: num(bike.air, 10), rot: num(bike.rot, 10),
            maxRot: num(bike.maxRot, 10), flips: bike.flips, flipsAwarded: bike.flipsAwarded, combo: bike.combo, comboT: num(bike.comboT, 10),
            boosting: bike.boosting, engineOn: bike.engineOn, fax: num(bike.fax, 1), fay: num(bike.fay, 1) },
            rider: { torsoAbs: num(rider.torsoAbs, 100), torsoV: num(rider.torsoV, 100), headAbs: num(rider.headAbs, 100), headV: num(rider.headV, 100), crouch: num(rider.crouch, 100) },
            contacts: { rear: { y: num(rgInfo.y, 1), angle: num(rgInfo.angle, 100), type: rgInfo.type }, front: { y: num(fgInfo.y, 1), angle: num(fgInfo.angle, 100), type: fgInfo.type } } });
        } },
      { label: "Console: difficulty rows", doc: "All four DIFF_PARAMS rows with the active one marked, plus jump range and climb limit math.",
        run: function () {
          console.table(DIFF_PARAMS.map(function (p, i) {
            return { i: i, label: DIFF_KEYS[i], active: i === difficulty, target: p.target, per: p.per, traction: p.traction,
              wind: p.wind, landTol: p.landTol, gapMin: p.gapMin, gapMax: p.gapMax, mtnH: p.mtnH.join("-"), climb: p.climb,
              sag: p.sag.join("-"), holes: p.holes, cpEvery: p.cpEvery, boostChance: p.boostChance, recovery: p.recovery,
              maxClimbRad: num(typeof maxClimbRad === "function" ? maxClimbRad(p.traction) : 0, 100) };
          }));
        } },
      { label: "Console: world objects", doc: "Generated terrain features with counts and x-ranges: pits, bridges, coins, checkpoints, rocks, trees.",
        run: function () {
          function span(a) { if (!a || !a.length) return "-"; var lo = a[0].x, hi = a[0].x; for (var i = 1; i < a.length; i++) { if (a[i].x < lo) lo = a[i].x; if (a[i].x > hi) hi = a[i].x } return num(lo, 1) + ".." + num(hi, 1) }
          console.log({ level: level, worldW: num(worldW, 1), finishX: num(finishX, 1), bikeX: num(bike.x, 1),
            pits: pits.length + " @ " + span(pits), bridges: bridges.length + " @ " + span(bridges),
            coins: coins.length + " @ " + span(coins), checkpoints: checkpoints.length + " @ " + span(checkpoints),
            rocks: rocks.length + " @ " + span(rocks), trees: trees.length + " @ " + span(trees),
            coinsGot: coinsGot, curCp: curCp, theme: theme });
        } },
      { label: "Console: weather, lights and quality", doc: "visuals, headlight/tailLight, the quality table and measured canvas caps.",
        run: function () {
          console.log({ visuals: { daylight: num(visuals.daylight, 100), ambient: num(visuals.ambient, 100), weather: visuals.weather,
            intensity: num(visuals.intensity, 100), windX: num(visuals.windX, 100), windStrength: num(visuals.windStrength, 100),
            fogColor: visuals.fogColor, fogDensity: num(visuals.fogDensity, 1000), headlight: num(visuals.headlight, 100), tailLight: num(visuals.tailLight, 100) },
            headLight: { on: headLight.on, i: num(headLight.i, 100), range: headLight.range, beam: num(headLight.beam, 100), power: num(headLight.power, 100), color: headLight.color },
            tailLight: { on: tailLight.on, i: num(tailLight.i, 100), range: tailLight.range, beam: num(tailLight.beam, 100), power: num(tailLight.power, 100) },
            quality: quality, caps: { canvas: W + "x" + H, area: W * H }, shake: { mag: num(shakeMag, 1), time: num(shakeTime, 10) } });
        } },
      { label: "Console: run summary", doc: "Phase, counters, inputs, camera and save-key state.",
        run: function () {
          console.log({ inGame: inGame, paused: paused, alive: bike.alive, finished: bike.finished, crashPending: crashPending, crashReason: crashReason,
            crashes: crashes, level: level, score: score, difficulty: difficulty, driveMode: driveMode, musicOn: musicOn,
            inputs: { gas: input.gas, brake: input.brake, left: input.left, right: input.right, keys: kIn, touch: tIn },
            camera: { x: num(cam.x, 1), y: num(cam.y, 1), scale: num(cam.scale, 100), init: cam.init },
            stuck: { timer: num(stuckTimer, 10), cooldown: num(stuckCooldown, 10) },
            saveKey: (typeof SAVE_KEY !== "undefined") ? SAVE_KEY : "-", optionsKey: (typeof OPT_KEY !== "undefined") ? OPT_KEY : "-" });
        } }
    ],

    layout: [
      { sel: "#c", label: "Canvas" },
      { sel: "#hud", label: "HUD layer" },
      { sel: "#hudRight", label: "HUD right column" },
      { sel: "#hudDist", label: "Distance readout" },
      { sel: "#hudSpeed", label: "Speed readout" },
      { sel: "#hudScore", label: "Score readout" },
      { sel: "#hudLevel", label: "Level readout" },
      { sel: "#hudCoins", label: "Coins readout" },
      { sel: "#hudFlips", label: "Flips readout" },
      { sel: "#hudCp", label: "Checkpoint readout" },
      { sel: "#hudCombo", label: "Combo readout" },
      { sel: "#hudPerf", label: "Perf readout" },
      { sel: "#hudDrive", label: "Drive-mode readout" },
      { sel: "#hudMusic", label: "Music readout" },
      { sel: "#pauseBtn", label: "Pause button" },
      { sel: "#musicBtn", label: "Music button" },
      { sel: "#titleScreen", label: "Title screen" },
      { sel: "#titleNewBtn", label: "New game button" },
      { sel: "#seedInput", label: "Seed input" },
      { sel: ".seed-box", label: "Seed box" },
      { sel: "#pauseScreen", label: "Pause dialog" },
      { sel: "#pauseResumeBtn", label: "Resume button" },
      { sel: "#pauseMusicBtn", label: "Pause music button" },
      { sel: "#overScreen", label: "Game-over dialog" },
      { sel: "#overTitle", label: "Game-over title" },
      { sel: "#overScore", label: "Game-over score" },
      { sel: "#overDist", label: "Game-over distance" },
      { sel: "#overCoins", label: "Game-over coins" },
      { sel: "#overRetryBtn", label: "Retry button" },
      { sel: "#winScreen", label: "Win dialog" },
      { sel: "#winStats", label: "Win stats" },
      { sel: "#winNextBtn", label: "Next level button" },
      { sel: "#touchControls", label: "Touch controls layer" },
      { sel: "#tGas", label: "Throttle pad" },
      { sel: "#tBrake", label: "Brake pad" },
      { sel: "#tLeft", label: "Lean-left pad" },
      { sel: "#tRight", label: "Lean-right pad" },
      { sel: ".touch-zone", label: "Touch zones" },
      { sel: ".screen", label: "Screen layers" },
      { sel: ".dialog", label: "Dialog boxes" },
      { sel: ".btn", label: "Buttons" },
      { sel: ".optBtn", label: "Option buttons" },
      { sel: ".selected", label: "Selected option state" },
      { sel: ".btnGrid", label: "Button grid" },
      { sel: ".optRow", label: "Option row" },
      { sel: ".rowLabel", label: "Option row label" },
      { sel: ".lab", label: "Small labels" },
      { sel: ".info", label: "Info block" },
      { sel: ".title", label: "Title text" },
      { sel: ".subtitle", label: "Subtitle text" },
      { sel: ".stats", label: "Stats block" },
      { sel: ".pad", label: "Padding block" },
      { sel: ".popup", label: "Score popup (created at runtime)" },
      { sel: ".hidden", label: "Hidden element hook" }
    ],

    control: [
      { id: "game", label: "Start, restart, next level or pause", args: '"start" | "restart" | "next" | "pause" | "resume"', argDefault: "start",
        doc: "startNewGame() / restartLevel() / nextLevel() / pauseGame() / resumeGame() — the page's own paths, so terrain and bike reset exactly as in play.",
        run: function (which) {
          var w = String(which || "start");
          if (w === "restart") restartLevel(); else if (w === "next") nextLevel(); else if (w === "pause") pauseGame(); else if (w === "resume") resumeGame(); else startNewGame();
          return { inGame: inGame, paused: paused, level: level, score: score, alive: !!bike.alive };
        } },
      { id: "drive", label: "Press throttle, brake, lean", args: '["gas"|"brake"|"left"|"right", true|false]', argDefault: '["gas", true]',
        doc: "Writes the `input` flags the physics reads — hold gas to build speed, brake for the traction test, lean for air rotation.",
        run: function (a) {
          if (!Array.isArray(a)) return 'want ["gas"|"brake"|"left"|"right", true|false]';
          input[String(a[0])] = a[1] === undefined ? true : !!a[1];
          return { input: { gas: !!input.gas, brake: !!input.brake, left: !!input.left, right: !!input.right }, speed: num(bike.speed, 10) };
        } },
      { id: "teleport", label: "Move the bike", args: "[x] — snaps onto the terrain at that x", argDefault: "[600]",
        doc: "Places the bike on the ground at x (groundAt gives the surface), zeroing velocity — start a jump, a pit or a bridge crossing exactly where you want.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [x]";
          var info = { y: 0, angle: 0 }; groundAt(Number(a[0]), info);
          bike.x = Number(a[0]); bike.y = info.y - WRAD - WY - 1; bike.vx = 0; bike.vy = 0; bike.a = info.angle; bike.av = 0; bike.speed = 0;
          bike.onGnd = bike.rearG = bike.frontG = true; bike.alive = true; crashPending = false;
          return { x: num(bike.x, 1), y: num(bike.y, 1), slopeDeg: num(info.angle * 180 / Math.PI, 10), finishX: num(finishX, 1) };
        } },
      { id: "velocity", label: "Set velocity and lean angle", args: "[vx, vy, angleRadians]", argDefault: "[600, -250, 0.3]",
        doc: "Launch the bike by hand — the numbers behind air time, rotation credit and crash thresholds.",
        run: function (a) { if (!Array.isArray(a)) return "want [vx, vy, angle]"; bike.vx = Number(a[0]); bike.vy = Number(a[1]); if (a[2] !== undefined) bike.a = Number(a[2]); return { vx: num(bike.vx, 10), vy: num(bike.vy, 10), angleDeg: num(bike.a * 180 / Math.PI, 10), air: num(bike.air, 10) }; } },
      { id: "outcome", label: "Crash, win or respawn", args: '"crash" | "win" | "respawn"', argDefault: "crash",
        doc: "crash(reason) / win() / respawnAtCheckpoint() — force each ending and the checkpoint recovery path.",
        run: function (w) {
          var s = String(w || "crash");
          if (s === "win") win(); else if (s === "respawn") respawnAtCheckpoint(); else crash("harness");
          return { phase: { inGame: inGame, alive: !!bike.alive, finished: !!bike.finished, crashPending: crashPending }, reason: crashReason, crashes: crashes, score: score };
        } },
      { id: "difficulty", label: "Set difficulty and drive mode", args: "[difficulty 0-3, driveMode 0-2]", argDefault: "[2, 1]",
        doc: "setDifficulty / setDriveMode — DIFF_PARAMS rows hold traction, wind, gap sizes, landing tolerance and checkpoint spacing; drive mode changes the control model.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [difficulty, driveMode]";
          setDifficulty(Number(a[0])); setDriveMode(Number(a[1]));
          var p = DIFF_PARAMS[difficulty];
          return { difficulty: difficulty, driveMode: driveMode, traction: p.traction, wind: p.wind, landTol: p.landTol, gapMin: p.gapMin, gapMax: p.gapMax, cpEvery: p.cpEvery, recovery: p.recovery };
        } },
      { id: "diffRow", label: "Edit a difficulty row", args: '[index, "traction"|"wind"|"landTol"|"recovery"|..., value]', argDefault: '[2, "traction", 0.8]',
        doc: "Difficulties are plain mutable objects — change traction or landing tolerance live, then regenerate the level to see the effect on crashes.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, field, value]";
          var row = DIFF_PARAMS[+a[0]]; if (!row) return "no difficulty " + a[0];
          var f = String(a[1]); if (!(f in row)) return "no field " + f;
          row[f] = Number(a[2]);
          return { difficulty: +a[0], field: f, value: row[f], active: +a[0] === difficulty };
        } },
      { id: "probe", label: "Read the ride state", args: "unused",
        doc: "Run flags, level and score, distance against the finish line, velocity, lean angle and angular velocity, wheel contact flags, air time, rotation and flip credit, combo, checkpoints and coins, camera and quality tier.",
        run: function () {
          return { inGame: inGame, paused: paused, alive: !!bike.alive, finished: !!bike.finished,
            crashPending: crashPending, crashReason: crashReason, crashes: crashes,
            level: level, score: score, difficulty: difficulty, driveMode: driveMode,
            distance: num(bike.dist, 1), maxX: num(bike.maxX, 1), finishX: num(finishX, 1), worldW: num(worldW, 1),
            speed: num(bike.speed, 1), vx: num(bike.vx, 1), vy: num(bike.vy, 1),
            angleDeg: num(bike.a * 180 / Math.PI, 1), angVel: num(bike.av, 10),
            onGround: !!bike.onGnd, rearOnGround: !!bike.rearG, frontOnGround: !!bike.frontG,
            airTime: num(bike.air, 10), rotation: num(bike.rot, 10), maxRotation: num(bike.maxRot, 10),
            flips: bike.flips, flipsAwarded: bike.flipsAwarded, boosting: !!bike.boosting,
            combo: bike.combo, comboTimer: num(bike.comboT, 10),
            checkpointsDone: curCp, coinsGot: coinsGot, coinsOnTrack: coins.length, checkpointsOnTrack: checkpoints.length,
            pits: pits.length, bridges: bridges.length, rocks: rocks.length, trees: trees.length,
            camera: { x: num(cam.x, 1), y: num(cam.y, 1), scale: num(cam.scale, 100) },
            quality: { tier: quality.tier, resScale: num(quality.resScale, 100) } };
        } },
      { id: "watch", label: "Log the ride every N seconds", args: "seconds (0 stops)", argDefault: 0.5,
        doc: "Speed, distance, air time, rotation, contact flags and combo each interval — the trace for jump and flip tuning; window.__tllRide holds the timer.",
        run: function (s) {
          if (window.__tllRide) { clearInterval(window.__tllRide); window.__tllRide = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllRide = setInterval(function () {
            console.log("speed", bike.speed.toFixed(0), "x", bike.x.toFixed(0), "of", finishX.toFixed(0),
              "air", bike.air.toFixed(2), "rot", bike.rot.toFixed(2), "contact", bike.rearG + "/" + bike.frontG,
              "combo", bike.combo, "crashes", crashes, "alive", bike.alive);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Jump-landing tolerance sweep",
        doc: "Launches the bike at increasing speeds and logs whether landings stay inside landTol, printing the crash reason each time.",
        js: 'var P = DIFF_PARAMS[difficulty], tol = P.landTol;\nvar out = [];\nfor (var i = 0; i < 6; i++) {\n  restartLevel();\n  bike.x = 400; bike.vx = 300 + i * 120; bike.vy = -320; bike.a = 0; bike.av = 0;\n  var before = crashes;\n  setTimeout(function () { out.push({ speed: Math.round(bike.speed), crashes: crashes - before, reason: crashReason, landTol: tol, air: bike.air.toFixed(2) }); }, 2200);\n}\nsetTimeout(function () { console.table(out); }, 14000);' },
      { label: "Traction ladder across difficulties",
        doc: "Prints every difficulty row's traction, wind and gap range, then walks the live bike to the finish under each in turn.",
        js: 'console.table(DIFF_PARAMS.map(function (p, i) { return { i: i, traction: p.traction, wind: p.wind, landTol: p.landTol, gapMin: p.gapMin, gapMax: p.gapMax, cpEvery: p.cpEvery }; }));\nvar i = 0;\nwindow.__tllRide = setInterval(function () {\n  setDifficulty(i);\n  restartLevel();\n  input.gas = true;\n  console.log("difficulty", difficulty, "traction", DIFF_PARAMS[difficulty].traction, "finishX", finishX.toFixed(0));\n  i = (i + 1) % DIFF_PARAMS.length;\n}, 4000);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live run (phase, scooter kinematics, pickups, weather, camera). BALANCE edits gravity, engine, wheel geometry, lean authority, the active difficulty row and the run counters. CHEATS changes the run. LAYOUT resizes and repositions the canvas, HUD readouts, dialogs and touch pads per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "moto.html declares its game at the top level of a plain script, so the harness reaches physics, crash, win, respawnAtCheckpoint, resetBike, startLevel, startNewGame, nextLevel, restartLevel, quitToTitle, pauseGame, resumeGame, updateHUD, setQualityTier, setDifficulty, setDriveMode, resize, awardFlips, collectCoinsAndCheckpoints, groundAt, maxClimbRad plus bike, rider, cam, visuals, headLight, tailLight, quality, DIFF_PARAMS, input, kIn, tIn, pits, coins, checkpoints, bridges, rocks, trees. The page file is untouched." },
      { topic: "Difficulty rows are editable", text: "DIFF_PARAMS is an array of plain objects, so traction, wind, landTol and cpEvery can be rewritten live and physics() picks them up on the next tick. Geometry fields (gapMin/gapMax/mtnH/sag/holes/target/per) only take effect when startLevel() regenerates terrain — use CHEATS: restart this level." },
      { topic: "Fixed timestep", text: "frame() accumulates real time and calls physics(STEP) with STEP = 1/120. Freeze and slow motion wrap physics(), leaving the accumulator, camera smoothing and rendering untouched, so the frame rate stays honest." },
      { topic: "No crashes / revive", text: "The no-crash toggle replaces window.crash with a no-op: landings that would have crashed simply keep the scooter alive, and crash() is restored when the toggle goes off. Revive clears bike.alive and crashPending for a run that already crashed." },
      { topic: "Quality auto-tuning", text: "quality.tier is editable, but updateQualityAuto() samples frame time and can retune it (qCooldown 2.5 s after a manual setQualityTier). If a tier you set keeps snapping back, that is the page's own auto path — set it and watch the perf readout." },
      { topic: "Not reachable", text: "The audio graph (AC, musicBus, engine oscillators), the particle pools' internal buffers (rain, snow, fog, leaves, splashes objects exist but their arrays are managed by reset/emit), and the theme colour ramps built inside buildTheme stay private or partially private. Terrain geometry, weather knobs and quality flags are all visible through the hooks." }
    ]
  });
})();
