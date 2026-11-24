/* dbg/minigolf3D.js — developer harness for minigolf3D.html (3D mini golf)
 *
 * Load with:  minigolf3D.html?debug=dbg/minigolf3D.js
 * minigolf3D.html declares its game at the top level of a plain script, so the
 * harness reaches physStep, physEvents, releaseShot, computeAim, resetBall,
 * startHole, nextHole, restartHole, updateHUD, newRound, startCampaign, goHome,
 * holeModal, hideModal, setQ, practiceHole, playOne, buildCourse, genLevels,
 * render, frame, resize, panCamera, getBallScreenPos, campPar, toast, store
 * plus ball, lv, round, course, mode, cam, aim, drag, shotHist, strokes,
 * holeIdx, sinkT, lockT, settings, autoScale, R_BALL, GRAV, STEP, MAXSPD,
 * STEPTOL, CATCH, LEDGE, CAMPAIGN, BLOCKS, PC_BLOCKS, AU, edit, edSel.
 * No page bridge; without ?debug the page behaves as shipped.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  var realPhys = null, scale = null;
  function wrap(v) {
    if (!realPhys) realPhys = window.physStep;
    scale = v === null ? null : v;
    if (scale === null) { window.physStep = realPhys; return; }
    window.physStep = function (st, lvl, dt, mills, fx) { realPhys(st, lvl, dt * scale, mills, fx) };
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 1000)) / (r || 1000) : 0 }
  function parts() { return lv && lv.parts ? lv.parts : [] }
  function speed() { return Math.hypot(ball.vx, ball.vz) }

  TLDBG.register({
    game: "minigolf3D", file: "minigolf3D.html",

    state: function () {
      var sp = speed();
      return {
        mode: mode, holeNumber: holeIdx + 1, holeName: lv ? lv.name : null, par: lv ? lv.par : null,
        strokes: strokes, roundTotal: round ? round.total : 0, holesPlayed: round ? round.scores.length : 0,
        campaignPar: typeof campPar === "function" && round ? campPar(round.levels) : null,
        campaignLabel: round ? round.label : null, campaignSize: round ? round.levels.length : 0,
        ball: { x: num(ball.x), y: num(ball.y), z: num(ball.z), vx: num(ball.vx), vy: num(ball.vy), vz: num(ball.vz),
          speed: num(sp), airTime: num(ball.airT, 100), groundHeight: num(ball.gh), moving: !!ball.moving },
        sinking: sinkT >= 0 ? num(sinkT, 100) : false, inputLock: num(lockT, 100),
        parts: parts().length,
        partKinds: (function () { var c = {}; parts().forEach(function (p) { var k = p.t || "g"; c[k] = (c[k] || 0) + 1 }); return c })(),
        mills: course && course.mills ? course.mills.length : 0,
        tee: lv ? [num(lv.tee[0]), num(lv.tee[1])] : null, cup: lv ? [num(lv.cup[0]), num(lv.cup[1])] : null,
        distanceToCup: lv ? num(Math.hypot(ball.x - lv.cup[0], ball.z - lv.cup[1]), 100) : null,
        shotsRecorded: shotHist.length, aimActive: !!aim, dragging: !!drag,
        camera: { yaw: num(cam.yaw, 100), pitch: num(cam.pitch, 100), dist: num(cam.dist, 10), target: [num(cam.tx), num(cam.ty), num(cam.tz)] },
        quality: settings.q, autoScale: num(autoScale, 100), perfEMA: num(perfEMA, 1000), soundOn: !!settings.snd,
        editMode: !!edit, editSelection: edSel, viewScale: VW + "x" + VH,
        canvas: (function () { var c = document.getElementById("gl"); return c ? c.width + "x" + c.height : "no canvas" })()
      };
    },

    params: [
      { id: "gravity", label: "Gravity", unit: "units/s2", min: 4, max: 60, step: 1,
        get: function () { return GRAV }, set: function (v) { GRAV = v },
        code: { file: "minigolf3D.html", line: 1353, name: "GRAV" },
        doc: "Downward acceleration inside physStep (22). Ramps and drops depend on it; low values give floaty jump shots." },
      { id: "ballRadius", label: "Ball radius", unit: "units", min: 0.15, max: 0.9, step: 0.01,
        get: function () { return R_BALL }, set: function (v) { R_BALL = v },
        code: { file: "minigolf3D.html", line: 1353, name: "R_BALL" },
        doc: "Ball collision radius (0.4). Also used for ground offset and cup capture distance, so a bigger ball catches the cup earlier." },
      { id: "maxSpeed", label: "Speed cap", unit: "units/s", min: 6, max: 60, step: 1,
        get: function () { return MAXSPD }, set: function (v) { MAXSPD = v },
        code: { file: "minigolf3D.html", line: 1353, name: "MAXSPD" },
        doc: "physStep clamps the horizontal speed to MAXSPD (24). Full-drag drives are near this cap." },
      { id: "stepTol", label: "Step tolerance", unit: "units", min: 0.05, max: 1, step: 0.01,
        get: function () { return STEPTOL }, set: function (v) { STEPTOL = v },
        code: { file: "minigolf3D.html", line: 1353, name: "STEPTOL" },
        doc: "How far a step may overshoot a surface before it is treated as a hit (0.25). Lower = crisper collision, more tunnelling risk." },
      { id: "catchDist", label: "Cup catch distance", unit: "units", min: 0.05, max: 1.5, step: 0.01,
        get: function () { return CATCH }, set: function (v) { CATCH = v },
        code: { file: "minigolf3D.html", line: 1353, name: "CATCH" },
        doc: "Distance/velocity window for sinking the ball (0.22). Raise it to make every approach drop in; lower it to test rim misses." },
      { id: "ledge", label: "Ledge height", unit: "units", min: 0.05, max: 1.2, step: 0.01,
        get: function () { return LEDGE }, set: function (v) { LEDGE = v },
        code: { file: "minigolf3D.html", line: 1353, name: "LEDGE" },
        doc: "Step-up height the ball can climb without being blocked (0.3). Bigger values let the ball walk up walls you are testing." },
      { id: "camDist", label: "Camera distance", unit: "units", min: 4, max: 40, step: 0.5,
        get: function () { return cam.dist }, set: function (v) { cam.dist = v },
        code: { file: "minigolf3D.html", line: 1358, name: "cam.dist" },
        doc: "Orbit distance from the follow target (13/14 at hole start). Read by render every frame." },
      { id: "camPitch", label: "Camera pitch", unit: "rad", min: 0.05, max: 1.5, step: 0.01,
        get: function () { return cam.pitch }, set: function (v) { cam.pitch = v },
        code: { file: "minigolf3D.html", line: 1358, name: "cam.pitch" },
        doc: "Tilt of the orbit camera (0.66 ≈ 38 degrees). Near 1.5 gives a top-down view for putting-line checks." },
      { id: "camYaw", label: "Camera yaw", unit: "rad", min: -3.2, max: 3.2, step: 0.01,
        get: function () { return cam.yaw }, set: function (v) { cam.yaw = v },
        code: { file: "minigolf3D.html", line: 1358, name: "cam.yaw" },
        doc: "Orbit heading. startHole aims it from tee toward cup; putt direction is derived from it in computeAim." },
      { id: "strokes", label: "Strokes this hole", unit: "strokes", min: 0, max: 30, step: 1,
        get: function () { return strokes }, set: function (v) { strokes = Math.max(0, Math.round(v)); if (typeof updateHUD === "function") updateHUD() },
        code: { file: "minigolf3D.html", line: 1355, name: "strokes" },
        doc: "Live stroke counter (#hudStr). releaseShot increments it; round.total is updated when the hole ends." },
      { id: "roundTotal", label: "Round total strokes", unit: "strokes", min: 0, max: 300, step: 1,
        get: function () { return round ? round.total : 0 }, set: function (v) { if (round) round.total = Math.max(0, Math.round(v)); if (typeof updateHUD === "function") updateHUD() },
        code: { file: "minigolf3D.html", line: 1363, name: "round.total" },
        doc: "Cumulative strokes across the campaign (#hudTot). Editing it changes the scorecard and the saved progress on the next hole." },
      { id: "holeIdx", label: "Hole index", unit: "0-based", min: 0, max: 35, step: 1,
        get: function () { return holeIdx },
        set: function (v) { var i = Math.max(0, Math.round(v)); if (round && round.levels[i]) startHole(i); else holeIdx = i },
        code: { file: "minigolf3D.html", line: 1364, name: "startHole" },
        doc: "Writes holeIdx, and if a round is loaded jumps through startHole — rebuilding the course, camera and HUD for that hole." },
      { id: "inputLock", label: "Input lock timer", unit: "s", min: 0, max: 3, step: 0.05,
        get: function () { return lockT }, set: function (v) { lockT = Math.max(0, v) },
        code: { file: "minigolf3D.html", line: 1355, name: "lockT" },
        doc: "Seconds before putts are accepted after a hole start/reset (0.35). Set 0 to shoot immediately." },
      { id: "sinkTimer", label: "Sink animation timer", unit: "s", min: -1, max: 3, step: 0.05,
        get: function () { return sinkT }, set: function (v) { sinkT = v },
        code: { file: "minigolf3D.html", line: 1355, name: "sinkT" },
        doc: "-1 = not sinking. Writing >= 0 starts the drop animation and blocks further shots; -1 clears it." },
      { id: "quality", label: "Render quality", unit: "0 auto / 1-3", min: 0, max: 3, step: 1,
        get: function () { return settings.q },
        set: function (v) { if (typeof window.setQ === "function") window.setQ(Math.round(v)); else { settings.q = Math.max(0, Math.min(3, Math.round(v))); resize() } },
        code: { file: "minigolf3D.html", line: 1914, name: "window.setQ" },
        doc: "The page's own setter: 0 = auto (perfEMA-driven autoScale), 1/2/3 = fixed 0.66/0.85/1.1 scale, DPR 2 at tier 3. Persists to localStorage." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "physStep becomes a no-op: ball motion, sinking, collisions and mills keep their state while the scene still renders.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "Scales the delta handed to physStep, so rolls, bounces and sink animation slow together (mills keep spinning).",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "shoot", label: "Shoot straight ahead",
        doc: "Sets ball velocity from the current camera heading at the full-drag speed (1.8 + 13.7), counts a stroke through the same HUD path.",
        run: function () {
          var spd = 1.8 + 13.7, fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
          ball.vx = fx * spd; ball.vz = fz * spd; ball.vy = 0.3; ball.moving = true;
          strokes++; if (typeof updateHUD === "function") updateHUD();
          TLDBG.toast("speed " + num(spd, 10));
        } },
      { id: "softTap", label: "Soft putt (pow 0.25)",
        doc: "Same shot path at the 25 % drag power the aim curve would produce (spd = 1.8 + 13.7*0.25^1.25).",
        run: function () {
          var pow = 0.25, spd = 1.8 + 13.7 * Math.pow(pow, 1.25), fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
          ball.vx = fx * spd; ball.vz = fz * spd; ball.vy = 0.3; ball.moving = true;
          strokes++; if (typeof updateHUD === "function") updateHUD();
          TLDBG.toast("tap speed " + num(spd, 10));
        } },
      { id: "toCup", label: "Drop ball at the cup",
        doc: "Moves the ball onto the cup position and zeroes velocity — instant test of the sink check.",
        run: function () {
          if (!lv) { TLDBG.toast("no hole loaded"); return; }
          ball.x = lv.cup[0]; ball.z = lv.cup[1]; ball.vx = 0; ball.vy = 0; ball.vz = 0; ball.airT = 0;
          TLDBG.toast("at cup");
        } },
      { id: "toTee", label: "Back to the tee",
        doc: "resetBall(): the page's own tee placement with velocity cleared.",
        run: function () { resetBall(); TLDBG.toast("at tee"); } },
      { id: "unlockInput", label: "Drop input lock",
        doc: "lockT = 0 so putts are accepted immediately after a hole start.",
        run: function () { lockT = 0; TLDBG.toast("input live"); } },
      { id: "sinkNow", label: "Sink the ball",
        doc: "sinkT = 0 starts the cup animation; the scorecard fills on the next update.",
        run: function () { sinkT = 0; if (typeof updateHUD === "function") updateHUD(); TLDBG.toast("sinking"); } },
      { id: "restartHole", label: "Restart hole",
        doc: "restartHole(): ball back to tee, strokes 0, short lock.",
        run: function () { restartHole(); TLDBG.toast("hole " + (holeIdx + 1) + " restarted"); } },
      { id: "nextHole", label: "Next hole",
        doc: "nextHole(): banks the current strokes into round.scores and loads the following hole.",
        run: function () { nextHole(); TLDBG.toast("hole " + (holeIdx + 1)); } },
      { id: "startCampaign", label: "Start the campaign",
        doc: "startCampaign(): fresh round on the built-in CAMPAIGN (progress is respected like the page's own button).",
        run: function () { startCampaign(); TLDBG.toast("campaign " + (round ? round.levels.length : 0) + " holes"); } },
      { id: "genLevels", label: "Generate a random round",
        doc: "genLevels(seed) then newRound: a procedurally generated course, same path as the generator button.",
        run: function () {
          var seed = (Math.random() * 1e6) | 0, ls = genLevels(seed);
          if (ls && ls.length) { newRound(ls, "Generated #" + seed); TLDBG.toast("seed " + seed + ", " + ls.length + " holes"); }
          else TLDBG.toast("generation failed for seed " + seed);
        } },
      { id: "practiceHole", label: "Open a practice hole",
        doc: "window.practiceHole(): the page's single-hole practice mode (no campaign score).",
        run: function () { if (typeof window.practiceHole === "function") { window.practiceHole(); TLDBG.toast("practice hole") } else TLDBG.toast("practiceHole unavailable") } },
      { id: "goHome", label: "Go to menu",
        doc: "goHome(): leaves play mode and shows the menu.",
        run: function () { goHome(); TLDBG.toast("menu"); } },
      { id: "spinMills", label: "Spin windmills fast", toggle: true,
        doc: "Multiplies every mill blade's angular speed by 4 (course.mills[i].s) — the hazard window changes accordingly.",
        on: function (v) {
          if (!course || !course.mills) return;
          course.mills.forEach(function (m) { if (m.__tllBase === undefined) m.__tllBase = m.s; m.s = v ? m.__tllBase * 4 : m.__tllBase });
        } },
      { id: "showHoleModal", label: "Show the hole card",
        doc: "holeModal(): the par/name card overlay; hideModal() closes it.",
        run: function () { if (typeof holeModal === "function") holeModal(); TLDBG.toast("hole card"); } },
      { id: "hideHud", label: "Hide HUD and hint", toggle: true,
        doc: "Display:none on #hud and #hint for clean captures.",
        on: function (v) { ["hud", "hint"].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = v ? "none" : "" }) } }
    ],

    hooks: [
      { label: "Console: hole parts", doc: "Every part of the current hole: kind, position, size, rotation and the flags physStep uses.",
        run: function () {
          console.table(parts().map(function (p, i) {
            return { i: i, t: p.t, x: num(p.x), y: num(p.y), z: num(p.z), w: p.w !== undefined ? num(p.w) : "-",
              d: p.d !== undefined ? num(p.d) : "-", r: p.r !== undefined ? num(p.r) : "-", h: p.h !== undefined ? num(p.h) : "-",
              a: p.a !== undefined ? num(p.a) : "-", slope: p.slope !== undefined ? num(p.slope) : "-", spd: p.spd !== undefined ? num(p.spd) : "-" };
          }));
        } },
      { label: "Console: ball and shot", doc: "Ball kinematics, distance to cup and tee, stroke history of this hole.",
        run: function () {
          console.log({ ball: { x: num(ball.x), y: num(ball.y), z: num(ball.z), vx: num(ball.vx), vy: num(ball.vy), vz: num(ball.vz),
            speed: num(speed()), airT: num(ball.airT, 100), gh: num(ball.gh), moving: ball.moving, rest: ball.rest },
            shotOrigin: shotOrigin, sinkT: sinkT, lockT: num(lockT, 100), strokes: strokes,
            toCup: lv ? num(Math.hypot(ball.x - lv.cup[0], ball.z - lv.cup[1]), 100) : null,
            toTee: lv ? num(Math.hypot(ball.x - lv.tee[0], ball.z - lv.tee[1]), 100) : null,
            history: shotHist.map(function (s) { return { s: s.s, x: num(s.x), y: num(s.y), z: num(s.z) } })
          });
        } },
      { label: "Console: aim curve", doc: "computeAim output shape and the shot-speed curve it builds, plus the current camera basis.",
        run: function () {
          var a = typeof computeAim === "function" ? computeAim() : null;
          console.log({ drag: drag, aim: a,
            curve: [0, 0.25, 0.5, 0.75, 1].map(function (p) { return "pow " + p + " -> spd " + num(1.8 + 13.7 * Math.pow(p, 1.25), 10) }),
            basis: { fx: num(-Math.sin(cam.yaw)), fz: num(-Math.cos(cam.yaw)), yaw: num(cam.yaw), pitch: num(cam.pitch), dist: num(cam.dist, 10) },
            screenPos: typeof getBallScreenPos === "function" ? getBallScreenPos() : null });
        } },
      { label: "Console: physics constants", doc: "The shipped tuning block (R_BALL, GRAV, STEP, MAXSPD, STEPTOL, CATCH, LEDGE) and the accumulated timestep.",
        run: function () {
          console.log({ R_BALL: R_BALL, GRAV: GRAV, STEP: STEP, MAXSPD: MAXSPD, STEPTOL: STEPTOL, CATCH: CATCH, LEDGE: LEDGE,
            acc: num(acc, 1000), settings: settings, autoScale: num(autoScale, 100), perfEMA: num(perfEMA, 1000), view: VW + "x" + VH });
        } },
      { label: "Console: round and campaign", doc: "Round scores, par totals, campaign size, block catalogue and saved progress keys.",
        run: function () {
          var ls = round ? round.levels : [];
          console.log({ mode: mode, label: round ? round.label : null, holes: ls.length,
            pars: ls.map(function (l) { return l.par }), names: ls.map(function (l) { return l.name }),
            scores: round ? round.scores : null, total: round ? round.total : null,
            campaignPar: typeof campPar === "function" ? campPar(ls) : null,
            currentHole: lv ? { name: lv.name, par: lv.par, parts: lv.parts.length, tee: lv.tee, cup: lv.cup } : null,
            blockCount: Object.keys(typeof PC_BLOCKS !== "undefined" && PC_BLOCKS ? PC_BLOCKS : BLOCKS || {}).length,
            campaignSize: typeof CAMPAIGN !== "undefined" && CAMPAIGN ? CAMPAIGN.length : 0 });
        } }
    ],

    layout: [
      { sel: "#gl", label: "WebGL canvas" },
      { sel: "#ui", label: "UI layer" },
      { sel: "#hud", label: "HUD block" },
      { sel: "#hudTop", label: "HUD top row" },
      { sel: "#hudBot", label: "HUD bottom row" },
      { sel: "#hudBotW", label: "HUD bottom wrapper" },
      { sel: "#hudHole", label: "Hole readout" },
      { sel: "#hudPar", label: "Par readout" },
      { sel: "#hudStr", label: "Strokes readout" },
      { sel: "#hudTot", label: "Round total readout" },
      { sel: "#hint", label: "Hint line" },
      { sel: "#pow", label: "Power meter" },
      { sel: "#powPct", label: "Power percentage" },
      { sel: "#powRow", label: "Power row" },
      { sel: "#powWrap", label: "Power wrapper" },
      { sel: "#bPlay", label: "Play button" },
      { sel: "#bEdit", label: "Edit button" },
      { sel: "#bGen", label: "Generate button" },
      { sel: "#bHoles", label: "Hole list button" },
      { sel: "#bCustom", label: "Custom holes button" },
      { sel: "#bCam", label: "Camera button" },
      { sel: "#bCont", label: "Continue button" },
      { sel: "#bHelp", label: "Help button" },
      { sel: "#bHelpHud", label: "HUD help button" },
      { sel: "#bMenu", label: "Menu button" },
      { sel: "#bHome", label: "Home button" },
      { sel: "#bMute", label: "Mute button" },
      { sel: "#bRestart", label: "Restart button" },
      { sel: "#bSet", label: "Settings button" },
      { sel: "#bUndo", label: "Undo button" },
      { sel: "#sndBtn", label: "Sound button" },
      { sel: "#wipeBtn", label: "Wipe progress button" },
      { sel: "#card", label: "Hole card" },
      { sel: "#cardIn", label: "Hole card inner" },
      { sel: "#menu", label: "Menu screen" },
      { sel: "#modal", label: "Modal dialog" },
      { sel: "#mBox", label: "Modal box" },
      { sel: "#toast", label: "Toast" },
      { sel: "#bestLine", label: "Best-line readout" },
      { sel: "#holeGrid", label: "Hole grid" },
      { sel: "#ed", label: "Editor screen" },
      { sel: "#edTop", label: "Editor top bar" },
      { sel: "#edPanel", label: "Editor panel" },
      { sel: "#edTools", label: "Editor tools" },
      { sel: "#edProps", label: "Editor properties" },
      { sel: "#edName", label: "Hole name input" },
      { sel: "#edPar", label: "Par input" },
      { sel: "#edTee", label: "Tee tool" },
      { sel: "#edCup", label: "Cup tool" },
      { sel: "#edAdd", label: "Add part tool" },
      { sel: "#edDel", label: "Delete tool" },
      { sel: "#edDup", label: "Duplicate tool" },
      { sel: "#edUp", label: "Move up tool" },
      { sel: "#edDn", label: "Move down tool" },
      { sel: "#edBack", label: "Editor back button" },
      { sel: "#edCheck", label: "Validate button" },
      { sel: "#edSave", label: "Save button" },
      { sel: "#edSeal", label: "Seal button" },
      { sel: "#edTest", label: "Test-play button" },
      { sel: "#edIO", label: "Import/export row" },
      { sel: "#edList", label: "Hole list" },
      { sel: "#gSeed", label: "Seed input" },
      { sel: "#gAdd", label: "Generator add button" },
      { sel: "#gN", label: "Generator count input" },
      { sel: "#gD", label: "Generator difficulty input" },
      { sel: "#gDie", label: "Generator discard button" },
      { sel: "#gPlay", label: "Generator play button" },
      { sel: "#cClr", label: "Clear custom holes" },
      { sel: "#cExp", label: "Export holes" },
      { sel: "#cImp", label: "Import holes" },
      { sel: "#cPlay", label: "Play custom holes" },
      { sel: "#ioF", label: "Import file input" },
      { sel: "#ioFile", label: "Import file row" },
      { sel: "#ioTa", label: "Import textarea" },
      { sel: "#ioCopy", label: "Copy button" },
      { sel: "#ioDl", label: "Download button" },
      { sel: "#ioUse", label: "Use imported button" },
      { sel: ".scr", label: "Screens" },
      { sel: ".scrIn", label: "Screen inner block" },
      { sel: ".btn", label: "Buttons" },
      { sel: ".acc", label: "Accented button state" },
      { sel: ".grn", label: "Green button state" },
      { sel: ".ic", label: "Icon buttons" },
      { sel: ".sm", label: "Small buttons" },
      { sel: ".chip", label: "Chips" },
      { sel: ".kv", label: "Key/value lines" },
      { sel: ".lbl", label: "Labels" },
      { sel: ".pill", label: "Pills" },
      { sel: ".row", label: "Rows" },
      { sel: ".sub", label: "Sub text" },
      { sel: ".hide", label: "Hidden element hook" }
    ],

    control: [
      { id: "hole", label: "Jump to a hole", args: "hole number within the round (1-based)", argDefault: 1,
        doc: "startHole(i) rebuilds the course geometry, tee/cup positions, par and the ball — jumps inside the current round.",
        run: function (n) { if (!round) startCampaign(false); startHole(Math.max(0, Math.round(Number(n) || 1) - 1)); return { hole: holeIdx + 1, name: lv ? lv.name : null, par: lv ? lv.par : null, strokes: strokes }; } },
      { id: "flow", label: "Next hole, restart, new round or home", args: '"next" | "restart" | "round" | "home"', argDefault: "next",
        doc: "nextHole() / restartHole() / newRound(...) / goHome() — the round-flow paths, including leaving the campaign.",
        run: function (w) {
          var s = String(w || "next");
          if (s !== "home" && !round) startCampaign(false);
          if (s === "restart") restartHole(); else if (s === "round") newRound(round && round.levels ? round.levels.slice(0, 3) : (typeof CAMPAIGN !== "undefined" ? CAMPAIGN.slice(0, 3) : [lv]), "harness round"); else if (s === "home") goHome(); else nextHole();
          return { hole: holeIdx + 1, round: round ? round.label : null, holes: round ? round.scores.length : 0, total: round ? round.total : 0, strokes: strokes };
        } },
      { id: "teleport", label: "Move the ball", args: "[x, z]", argDefault: "",
        doc: "Writes ball.x/z (y follows the ground) — park it on the green a metre from the cup, or in a hazard mouth.",
        run: function (a) {
          if (!Array.isArray(a)) {
            if (!lv) return "no hole loaded";
            ball.x = lv.tee[0]; ball.z = lv.tee[1]; ball.vx = ball.vy = ball.vz = 0; ball.moving = false; ball.airT = 0;
            return { to: "tee", ball: { x: num(ball.x, 10), y: num(ball.y, 10), z: num(ball.z, 10) }, distanceToCup: num(Math.hypot(ball.x - lv.cup[0], ball.z - lv.cup[1]), 100) };
          }
          ball.x = Number(a[0]); ball.z = Number(a[1]); ball.vx = ball.vy = ball.vz = 0; ball.moving = false; ball.airT = 0;
          return { ball: { x: num(ball.x, 10), y: num(ball.y, 10), z: num(ball.z, 10) }, distanceToCup: lv ? num(Math.hypot(ball.x - lv.cup[0], ball.z - lv.cup[1]), 100) : null };
        } },
      { id: "putt", label: "Putt toward a target", args: "[targetX, targetZ, power]", argDefault: "",
        doc: "Sets ball velocity straight at the target — no pointer drag needed. Power is the launch speed the physics integrates, so par distances become exact tests.",
        run: function (a) {
          var tx, tz;
          if (Array.isArray(a)) { tx = Number(a[0]); tz = Number(a[1]); }
          else if (lv) { tx = lv.cup[0]; tz = lv.cup[1]; }
          else return "want [targetX, targetZ, power] or load a hole";
          var pw = Array.isArray(a) && a[2] !== undefined ? Number(a[2]) : Math.min(9, 2 + Math.hypot(tx - ball.x, tz - ball.z) * 0.06);
          var dx = tx - ball.x, dz = tz - ball.z, d = Math.hypot(dx, dz) || 1;
          ball.vx = dx / d * pw; ball.vz = dz / d * pw; ball.vy = 0; ball.moving = true;
          strokes++; if (typeof updateHUD === "function") updateHUD();
          return { strokes: strokes, power: num(pw, 100), speed: num(Math.hypot(ball.vx, ball.vz), 100), distance: num(d, 100) };
        } },
      { id: "strokes", label: "Set the stroke count", args: "strokes for this hole", argDefault: 1,
        doc: "Writes `strokes` and refreshes the HUD — set up an over-par or hole-in-one test of the scoring card.",
        run: function (n) { strokes = Math.max(0, Math.round(Number(n) || 0)); if (typeof updateHUD === "function") updateHUD(); return { strokes: strokes, par: lv ? lv.par : null, roundTotal: round ? round.total : 0 }; } },
      { id: "camera", label: "Reposition the camera", args: "[yaw, pitch, distance]", argDefault: "[0, 0.6, 18]",
        doc: "Writes cam.yaw/pitch/dist — the orbit the mouse and pan gestures drive, for screenshotting a hole from a fixed angle.",
        run: function (a) { if (!Array.isArray(a)) return "want [yaw, pitch, distance]"; cam.yaw = Number(a[0]); cam.pitch = Number(a[1]); if (a[2] !== undefined) cam.dist = Number(a[2]); return { yaw: num(cam.yaw, 100), pitch: num(cam.pitch, 100), dist: num(cam.dist, 10) }; } },
      { id: "probe", label: "Read the hole state", args: "unused",
        doc: "Mode, hole number/name/par, strokes and round totals, campaign par and size, ball pose/velocity/speed/air time/ground height, sinking and input-lock timers, distance to cup, tee and cup coordinates, part counts by kind, camera pose, recorded shots.",
        run: function () {
          return { mode: mode, holeNumber: holeIdx + 1, holeName: lv ? lv.name : null, par: lv ? lv.par : null,
            strokes: strokes, roundTotal: round ? round.total : 0, holesPlayed: round ? round.scores.length : 0,
            campaignLabel: round ? round.label : null, campaignSize: round ? round.levels.length : 0,
            campaignPar: typeof campPar === "function" && round ? campPar(round.levels) : null,
            ball: { x: num(ball.x, 10), y: num(ball.y, 10), z: num(ball.z, 10), vx: num(ball.vx, 100), vy: num(ball.vy, 100), vz: num(ball.vz, 100), speed: num(Math.hypot(ball.vx, ball.vy, ball.vz), 100), airTime: num(ball.airT, 100), groundHeight: num(ball.gh), moving: !!ball.moving },
            sinking: sinkT >= 0 ? num(sinkT, 100) : false, inputLock: num(lockT, 100),
            tee: lv ? [num(lv.tee[0], 10), num(lv.tee[1], 10)] : null, cup: lv ? [num(lv.cup[0], 10), num(lv.cup[1], 10)] : null,
            distanceToCup: lv ? num(Math.hypot(ball.x - lv.cup[0], ball.z - lv.cup[1]), 100) : null,
            parts: parts().length, mills: course && course.mills ? course.mills.length : 0,
            shotsRecorded: shotHist.length, aimActive: !!aim, dragging: !!drag,
            camera: { yaw: num(cam.yaw, 100), pitch: num(cam.pitch, 100), dist: num(cam.dist, 10) } };
        } },
      { id: "watch", label: "Log the roll every N seconds", args: "seconds (0 stops)", argDefault: 0.4,
        doc: "Ball position, speed, distance to cup and sinking each interval — the trace for putting friction and slope debugging; window.__tllRoll holds the timer.",
        run: function (s) {
          if (window.__tllRoll) { clearInterval(window.__tllRoll); window.__tllRoll = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllRoll = setInterval(function () {
            console.log("ball", ball.x.toFixed(1), ball.z.toFixed(1), "speed", Math.hypot(ball.vx, ball.vz).toFixed(2),
              "toCup", lv ? Math.hypot(ball.x - lv.cup[0], ball.z - lv.cup[1]).toFixed(2) : "-", "strokes", strokes, "sinking", sinkT >= 0);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Every hole: straight-line putt to the cup",
        doc: "Walks the round, teleports the ball to the tee and putts directly at the cup, printing distance, par and whether the ball reaches it.",
        js: 'var levels = round && round.levels ? round.levels : (course && course.levels ? course.levels : [lv]);\nvar out = [];\nlevels.slice(0, 8).forEach(function (L, i) {\n  startHole(i);\n  var tee = lv.tee, cup = lv.cup, d = Math.hypot(tee[0] - cup[0], tee[1] - cup[1]);\n  ball.x = tee[0]; ball.z = tee[1]; ball.vx = ball.vz = 0; ball.moving = false; strokes = 0;\n  var pw = Math.min(9, 2 + d * 0.06);\n  var dx = cup[0] - ball.x, dz = cup[1] - ball.z;\n  ball.vx = dx / (d || 1) * pw; ball.vz = dz / (d || 1) * pw; ball.moving = true; strokes = 1;\n  out.push({ hole: i + 1, name: lv.name, par: lv.par, distance: d.toFixed(1), power: pw.toFixed(2) });\n});\nconsole.table(out);' },
      { label: "Friction readout from a rolling ball",
        doc: "Gives the ball a fixed launch speed and logs speed decay each tenth of a second, exposing the rolling friction the green applies.",
        js: 'ball.vx = 4; ball.vz = 0; ball.moving = true;\nvar n = 0;\nwindow.__tllRoll = setInterval(function () {\n  console.log("t", (n++ * 0.1).toFixed(1), "speed", Math.hypot(ball.vx, ball.vz).toFixed(3), "x", ball.x.toFixed(2));\n  if (Math.hypot(ball.vx, ball.vz) < 0.05) clearInterval(window.__tllRoll);\n}, 100);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live hole (mode, ball kinematics, distance to cup, parts, camera, quality). BALANCE edits physics tuning, camera framing and the scorecard. CHEATS changes the run. LAYOUT resizes and repositions the canvas, HUD rows, power meter, menu, modal and editor controls per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "minigolf3D.html declares its game at the top level of a plain script, so the harness reaches physStep, physEvents, releaseShot, computeAim, resetBall, startHole, nextHole, restartHole, updateHUD, newRound, startCampaign, goHome, holeModal, hideModal, setQ, practiceHole, buildCourse, genLevels, render, frame, resize, panCamera, getBallScreenPos, campPar, toast plus ball, lv, round, course, mode, cam, aim, drag, shotHist, strokes, holeIdx, sinkT, lockT, settings, autoScale, R_BALL, GRAV, STEP, MAXSPD, STEPTOL, CATCH, LEDGE, BLOCKS, PC_BLOCKS, AU, edit, edSel. The page file is untouched." },
      { topic: "Frozen physics, live rendering", text: "frame accumulates real time and calls physStep(ball, lv, STEP, mills, fx) with STEP = 1/120 (max 8 slices). Freeze and slow motion wrap physStep, so camera follow, mill spin and rendering keep running while the ball stops — the frame rate stays honest." },
      { topic: "Shot curve", text: "computeAim maps drag length to power (0..1 over ~42 % of the viewport) and speed to 1.8 + 13.7*pow^1.25, then releaseShot applies it as ball.vx/vz with vy = 0.3. The CHEAT shots reuse that exact curve without needing a pointer drag." },
      { topic: "Hole copies are editable", text: "startHole deep-copies the campaign level into lv, so lv.parts, lv.tee, lv.cup and lv.par can be rewritten live; the mesh is rebuilt only by buildCourse, so geometry edits need a hole reload (or the page's editor) to become visible — the physics uses lv directly." },
      { topic: "Score and progress", text: "round.scores/round.total are the scorecard; the page persists {i,total,scores} under a progress key after each hole. Writing strokes or roundTotal here changes what gets saved on the next hole, so use CHEATS: restart hole to get back to the shipped path." },
      { topic: "Not reachable", text: "WebGL resources (programs, buffers, the gl context), the audio synth internals behind AU, and the generated mesh caches inside buildCourse stay private. Hole structure, ball kinematics, aim math, physics constants and the block catalogue are all visible through the hooks." }
    ]
  });
})();
