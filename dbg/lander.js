/* dbg/lander.js — developer harness for lander.html (3D lunar lander)
 *
 * Load with:  lander.html?debug=dbg/lander.js
 * lander.html declares its game at the top level of a plain <script>, so the
 * harness reaches update, render, setState, loadLevel, winLevel, crashShip,
 * updatePickups, ship, terrain, keys, level, saved, total directly.
 * No page bridge; without ?debug the page behaves as shipped.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  var realUpdate = null;
  function wrap(scale) {
    if (!realUpdate) realUpdate = window.update;
    if (scale === null) { window.update = realUpdate; return; }
    window.update = function (dt) { realUpdate(dt * scale) };
  }

  var realCrash = null;
  function setNoCrash(v) {
    if (v) { if (!realCrash) realCrash = window.crashShip; window.crashShip = function () { }; }
    else if (realCrash) window.crashShip = realCrash;
  }

  function t() { return typeof terrain !== "undefined" && terrain ? terrain : null; }
  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }
  function tun(key, v) { var tt = t(); if (!tt) return; if (v === undefined) return tt[key]; tt[key] = v }

  TLDBG.register({
    game: "lander", file: "lander.html",

    state: function () {
      var tt = t(), s = (typeof ship !== "undefined" && ship) ? ship : null;
      return {
        phase: state, level: level, seed: tt ? tt.seedUsed : null,
        rescued: saved, totalTargets: total,
        astronautTaken: tt ? tt.astronauts.filter(function (a) { return a.taken }).length : 0,
        astronauts: tt ? tt.astronauts.length : 0,
        fuelCansLeft: tt ? tt.fuels.filter(function (f) { return !f.taken }).length : 0,
        shipAlive: s ? !!s.alive : false, grounded: s ? !!s.grounded : false,
        thrusting: s ? !!s.thrusting : false,
        x: s ? num(s.x, 1) : 0, y: s ? num(s.y, 1) : 0,
        vx: s ? num(s.vx, 10) : 0, vy: s ? num(s.vy, 10) : 0,
        angleDeg: s ? num(s.angle * 180 / Math.PI, 10) : 0,
        fuel: s ? num(s.fuel, 1) : 0, maxFuel: s ? s.maxFuel : 0,
        gravity: tun("gravity"), thrust: tun("thrust"), burn: tun("burn"),
        rotRate: tun("rotRate"), safeVx: tun("safeVx"), safeVy: tun("safeVy"),
        safeAngDeg: tt ? num(tt.safeAng * 180 / Math.PI, 10) : 0,
        gameTime: num(typeof gameTime !== "undefined" ? gameTime : 0, 10),
        padX: tt ? num(tt.padX, 1) : 0, padTopY: tt ? num(tt.padTopY, 1) : 0,
        requiredFuel: tt ? num(tt.requiredFuel, 1) : 0
      };
    },

    params: [
      { id: "gravity", label: "Gravity", unit: "u/s2", min: 0, max: 90, step: 1,
        get: function () { return tun("gravity") }, set: function (v) { tun("gravity", v) },
        code: { file: "lander.html", line: 2398, name: "terrain.gravity" },
        doc: "Downward acceleration (22 + difficulty*14). The whole fall timing depends on it." },
      { id: "thrust", label: "Engine thrust", unit: "u/s2", min: 0, max: 260, step: 2,
        get: function () { return tun("thrust") }, set: function (v) { tun("thrust", v) },
        code: { file: "lander.html", line: 2399, name: "terrain.thrust" },
        doc: "Acceleration along the ship's nose while THRUST is held (90 + difficulty*16). Compare with gravity to judge controllability." },
      { id: "burn", label: "Fuel burn", unit: "units/s", min: 0, max: 60, step: 1,
        get: function () { return tun("burn") }, set: function (v) { tun("burn", v) },
        code: { file: "lander.html", line: 2400, name: "terrain.burn" },
        doc: "Fuel spent per second of thrusting (14 + difficulty*5). planFuel() sizes the cans from this." },
      { id: "rotRate", label: "Rotation rate", unit: "rad/s", min: 0.4, max: 6, step: 0.05,
        get: function () { return tun("rotRate") }, set: function (v) { tun("rotRate", v) },
        code: { file: "lander.html", line: 2401, name: "terrain.rotRate" },
        doc: "How fast left/right turns the ship (2.75 - difficulty*0.65)." },
      { id: "safeVx", label: "Safe horizontal landing speed", unit: "u/s", min: 2, max: 120, step: 1,
        get: function () { return tun("safeVx") }, set: function (v) { tun("safeVx", v) },
        code: { file: "lander.html", line: 2402, name: "terrain.safeVx" },
        doc: "Touching down faster than this sideways crashes the ship (38 - difficulty*10)." },
      { id: "safeVy", label: "Safe vertical landing speed", unit: "u/s", min: 2, max: 160, step: 1,
        get: function () { return tun("safeVy") }, set: function (v) { tun("safeVy", v) },
        code: { file: "lander.html", line: 2403, name: "terrain.safeVy" },
        doc: "Maximum downward speed for a soft touchdown (58 - difficulty*18)." },
      { id: "safeAng", label: "Safe landing tilt", unit: "rad", min: 0.05, max: 1.6, step: 0.01,
        get: function () { return tun("safeAng") }, set: function (v) { tun("safeAng", v) },
        code: { file: "lander.html", line: 2404, name: "terrain.safeAng" },
        doc: "Deviation from vertical allowed on the pad (0.42 - difficulty*0.16, about 24 degrees at difficulty 0)." },
      { id: "maxFuel", label: "Tank capacity", unit: "units", min: 100, max: 3000, step: 25,
        get: function () { return tun("maxFuel") }, set: function (v) { tun("maxFuel", v); if (typeof ship !== "undefined" && ship) ship.maxFuel = v },
        code: { file: "lander.html", line: 2405, name: "terrain.maxFuel / ship.maxFuel" },
        doc: "Upper bound of the fuel gauge (#fuelBar). The ship's own cap is set alongside it." },
      { id: "startFuel", label: "Fuel at level start", unit: "units", min: 0, max: 1200, step: 10,
        get: function () { return tun("startFuel") }, set: function (v) { tun("startFuel", v) },
        code: { file: "lander.html", line: 2406, name: "terrain.startFuel" },
        doc: "Tank amount the ship starts with (180 - difficulty*55). Applies on the next loadLevel(); CHEATS offers a direct refill." },
      { id: "fuelCan", label: "Fuel per canister", unit: "units", min: 10, max: 400, step: 5,
        get: function () { return tun("fuelCan") }, set: function (v) { tun("fuelCan", v) },
        code: { file: "lander.html", line: 2407, name: "terrain.fuelCan" },
        doc: "How much a picked-up canister adds (85 - difficulty*30). Applies to cans placed by the next loadLevel()." },
      { id: "shipFuel", label: "Fuel right now", unit: "units", min: 0, max: 3000, step: 5,
        get: function () { return (typeof ship !== "undefined" && ship) ? ship.fuel : 0 },
        set: function (v) { if (typeof ship !== "undefined" && ship) ship.fuel = v },
        code: { file: "lander.html", line: 2655, name: "ship.fuel" },
        doc: "The live gauge value. Set it to 0 to trigger the out-of-fuel loss path while sitting on the pad." },
      { id: "level", label: "Level number", unit: "level", min: 1, max: 40, step: 1,
        get: function () { return level }, set: function (v) { level = Math.max(1, Math.round(v)) },
        code: { file: "lander.html", line: 2485, name: "level" },
        doc: "Difficulty and astronaut count derive from it (up to 8 targets). Takes effect on the next loadLevel() — CHEATS: next / restart level." },
      { id: "shipRadius", label: "Ship collision radius", unit: "u", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return SHIP_R },
        code: { file: "lander.html", line: 224, name: "SHIP_R" },
        doc: "Read-only (12): tunnels and the pickup margins are carved with this radius when the terrain is generated, so changing it live would not reopen the corridors." },
      { id: "worldSize", label: "World size", unit: "u x u", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return WORLD_W },
        code: { file: "lander.html", line: 219, name: "WORLD_W / WORLD_H" },
        doc: "Read-only (2400 x 1500): the terrain grid, textures and camera frustum are built at this size in loadLevel()." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "update() becomes a no-op; the renderer keeps drawing, so you can inspect terrain and the ship pose.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "The delta handed to update() is scaled: fall, thrust, fuel burn and pickups all slow together.",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "noCrash", label: "Cannot crash", toggle: true,
        doc: "crashShip() becomes a no-op — hard landings and tunnel hits still stop the ship but never end the run.",
        on: function (v) { setNoCrash(v) } },
      { id: "refillFuel", label: "Fill the tank",
        doc: "Sets the ship's fuel to its capacity, for testing long routes without pickups.",
        run: function () { if (typeof ship !== "undefined" && ship) ship.fuel = ship.maxFuel; TLDBG.toast("tank full"); } },
      { id: "zeroFuel", label: "Empty the tank",
        doc: "Fuel to 0 — sitting on the pad with unrescued astronauts then runs the out-of-fuel loss screen.",
        run: function () { if (typeof ship !== "undefined" && ship) ship.fuel = 0; TLDBG.toast("tank empty"); } },
      { id: "hoverCalm", label: "Kill velocity",
        doc: "Zeroes vx and vy, so the ship hangs where it is — the quick way to set up a soft-landing test.",
        run: function () { if (typeof ship !== "undefined" && ship) { ship.vx = 0; ship.vy = 0; } TLDBG.toast("velocity zeroed"); } },
      { id: "upright", label: "Straighten the ship",
        doc: "Angle to 0 (nose up) and clears the tilt component of a crash check.",
        run: function () { if (typeof ship !== "undefined" && ship) ship.angle = 0; TLDBG.toast("ship upright"); } },
      { id: "teleportPad", label: "Teleport above the pad",
        doc: "Moves the ship just over the landing pad, keeping its velocity, for repeated landing trials.",
        run: function () {
          var tt = t(); if (!tt || typeof ship === "undefined" || !ship) return TLDBG.toast("no level loaded");
          ship.x = tt.padX; ship.y = tt.padTopY - 120; TLDBG.toast("ship above pad");
        } },
      { id: "rescueAll", label: "Rescue every astronaut",
        doc: "Marks all astronauts taken and matches the rescue counter, so the win condition becomes reachable.",
        run: function () {
          var tt = t(); if (!tt) return TLDBG.toast("no level loaded");
          tt.astronauts.forEach(function (a) { if (!a.taken) { a.taken = true; saved++; } });
          TLDBG.toast("rescued " + saved + "/" + total);
        } },
      { id: "collectFuel", label: "Collect every fuel canister",
        doc: "Adds each remaining canister's fuel to the ship through the same cap the pickup uses.",
        run: function () {
          var tt = t(); if (!tt || typeof ship === "undefined" || !ship) return TLDBG.toast("no level loaded");
          tt.fuels.forEach(function (f) { if (!f.taken) { f.taken = true; ship.fuel = Math.min(ship.maxFuel, ship.fuel + f.fuel); } });
          TLDBG.toast("fuel " + num(ship.fuel, 1));
        } },
      { id: "winNow", label: "Win this level",
        doc: "winLevel(): the win overlay, the next-level button and the level counter behave as after a real finish.",
        run: function () { window.winLevel(); TLDBG.toast("level won"); } },
      { id: "crashNow", label: "Crash now",
        doc: "crashShip() runs the explosion and the loss screen exactly as a real crash.",
        run: function () { setNoCrash(false); window.crashShip(); TLDBG.toast("crashed"); } },
      { id: "nextLevel", label: "Go to next level",
        doc: "The page's own advance: level++ then loadLevel().",
        run: function () { level++; window.loadLevel(); TLDBG.toast("level " + level); } },
      { id: "restartLevel", label: "Restart this level",
        doc: "loadLevel() rebuilds the same seed and difficulty from scratch.",
        run: function () { window.loadLevel(); TLDBG.toast("level " + level + " rebuilt"); } }
    ],

    hooks: [
      { label: "Console: ship", doc: "Full ship record: position, velocity, angle, fuel, alive/grounded/thrusting flags.",
        run: function () {
          var s = (typeof ship !== "undefined" && ship) ? ship : null;
          if (!s) return console.log("no ship yet (title screen)");
          console.log({ x: num(s.x, 1), y: num(s.y, 1), vx: num(s.vx, 10), vy: num(s.vy, 10),
            angleDeg: num(s.angle * 180 / Math.PI, 10), speed: num(Math.hypot(s.vx, s.vy), 10),
            fuel: num(s.fuel, 1) + "/" + s.maxFuel, r: s.r, alive: s.alive, grounded: s.grounded, thrusting: s.thrusting });
        } },
      { label: "Console: level physics", doc: "The terrain's difficulty-derived physics block as it currently stands, plus the safe-landing envelope.",
        run: function () {
          var tt = t(); if (!tt) return console.log("no terrain yet (title screen)");
          console.log({ seed: tt.seedUsed, gravity: tt.gravity, thrust: tt.thrust, burn: tt.burn, rotRate: tt.rotRate,
            safeVx: tt.safeVx, safeVy: tt.safeVy, safeAngDeg: num(tt.safeAng * 180 / Math.PI, 10),
            maxFuel: tt.maxFuel, startFuel: tt.startFuel, fuelCan: tt.fuelCan, requiredFuel: num(tt.requiredFuel, 1),
            padX: num(tt.padX, 1), padTopY: num(tt.padTopY, 1), tunnelHalf: tt.tunnelHalf, chamberHalf: tt.chamberHalf });
        } },
      { label: "Console: astronauts", doc: "Every target with position, radius, whether it is taken, and how deep in the terrain it sits.",
        run: function () {
          var tt = t(); if (!tt) return console.log("no terrain yet (title screen)");
          console.table(tt.astronauts.map(function (a, i) {
            return { i: i, x: num(a.x, 1), y: num(a.y, 1), r: a.r, taken: !!a.taken,
              deep: !!a.deep, belowPad: num(tt.padTopY - a.y, 1) };
          }));
        } },
      { label: "Console: fuel canisters", doc: "Every canister with position, fuel amount, taken flag and remaining total.",
        run: function () {
          var tt = t(); if (!tt) return console.log("no terrain yet (title screen)");
          console.table(tt.fuels.map(function (f, i) {
            return { i: i, x: num(f.x, 1), y: num(f.y, 1), fuel: f.fuel, taken: !!f.taken };
          }));
          console.log("available fuel total:", num(typeof totalAvailableFuel === "function" ? totalAvailableFuel(tt) : 0, 1));
        } },
      { label: "Console: state summary", doc: "Phase, level, rescue counter, timers, quality preset and the camera/power sliders if the page keeps them.",
        run: function () {
          var preset = (typeof q !== "undefined" && q) ? q : null;
          console.log({ state: state, level: level, saved: saved, total: total,
            gameTime: num(typeof gameTime !== "undefined" ? gameTime : 0, 10),
            crashTimer: num(typeof crashTimer !== "undefined" ? crashTimer : 0, 10),
            msgTimer: num(typeof msgTimer !== "undefined" ? msgTimer : 0, 10),
            exhaustRate: preset && preset.exhaustRate !== undefined ? preset.exhaustRate : "-",
            particles: typeof particles !== "undefined" ? particles.length : "-" });
        } }
    ],

    layout: [
      { sel: "#cv", label: "WebGL canvas" },
      { sel: "#wrap", label: "Stage wrapper" },
      { sel: "#hud", label: "HUD bar" },
      { sel: "#hud .box", label: "HUD stat boxes" },
      { sel: "#fuelBar", label: "Fuel gauge track" },
      { sel: "#fuelFill", label: "Fuel gauge fill" },
      { sel: "#astroHud", label: "Rescued / total readout" },
      { sel: "#velHud", label: "Velocity readout" },
      { sel: "#lvl", label: "Level readout" },
      { sel: "#seedHud", label: "Seed readout" },
      { sel: "#msg", label: "Message line" },
      { sel: "#controls", label: "Touch control group" },
      { sel: ".ctrlGroup", label: "Control button group" },
      { sel: ".ctrl", label: "Round control buttons" },
      { sel: ".ctrl.thrust", label: "THRUST button" },
      { sel: "#btnLeft", label: "Rotate-left button" },
      { sel: "#btnRight", label: "Rotate-right button" },
      { sel: "#btnThrust", label: "Thrust button" },
      { sel: "#title", label: "Title screen (.screen)" },
      { sel: "#pause", label: "Pause screen (.screen)" },
      { sel: "#win", label: "Level-complete screen (.screen)" },
      { sel: "#lose", label: "Loss screen (.screen)" },
      { sel: ".screen", label: "Any overlay screen" },
      { sel: ".screen.hidden", label: "Hidden overlay screen" },
      { sel: ".row", label: "Overlay rows" },
      { sel: ".btn", label: "Overlay buttons" },
      { sel: "#startBtn", label: "Start button" },
      { sel: "#resumeBtn", label: "Resume button" },
      { sel: "#restartBtn", label: "Restart level button" },
      { sel: "#nextBtn", label: "Next level button" },
      { sel: "#retryBtn", label: "Retry button" },
      { sel: "#pauseBtn", label: "Pause button" },
      { sel: "#titleBtn", label: "Back-to-title button" },
      { sel: "#loseTitleBtn", label: "Title button on the loss screen" },
      { sel: "#winTitleBtn", label: "Title button on the win screen" },
      { sel: "#newSeedTitle", label: "New-seed button (title)" },
      { sel: "#seedTitle", label: "Seed field (title)" },
      { sel: "#seedPause", label: "Seed field (pause)" },
      { sel: "#newSeedPause", label: "New-seed button (pause)" },
      { sel: "#loseNewSeed", label: "New-seed button (loss)" },
      { sel: ".gfxBtn", label: "Graphics-quality buttons" },
      { sel: ".small", label: "Small help text" }
    ],

    control: [
      { id: "level", label: "Load a level", args: "level number (restarts current)", argDefault: "",
        doc: "Sets the level number and calls loadLevel() — terrain, astronauts, canisters, fuel allowance and difficulty all rebuild from it.",
        run: function (n) {
          if (n !== "" && n !== undefined && !Array.isArray(n)) level = Math.max(1, Math.round(Number(n)));
          loadLevel();
          return { level: level, phase: state, astronauts: t() ? t().astronauts.length : 0, padX: num(t().padX, 1), padTopY: num(t().padTopY, 1) };
        } },
      { id: "phase", label: "Force the run phase", args: '"playing" | "paused" | "title"', argDefault: "playing",
        doc: "setState(...) — jumps between title, playing and paused without going through the buttons.",
        run: function (s) { setState(String(s || "playing")); return { phase: state, alive: ship ? !!ship.alive : false }; } },
      { id: "teleport", label: "Move the ship", args: "[x, y]", argDefault: "[1200, 900]",
        doc: "Writes ship.x/y — park it above the pad, next to an astronaut, or in the tunnel mouth to test a specific approach.",
        run: function (a) { if (!Array.isArray(a)) return "want [x, y]"; ship.x = Number(a[0]); ship.y = Number(a[1]); return { x: num(ship.x, 1), y: num(ship.y, 1), grounded: !!ship.grounded }; } },
      { id: "velocity", label: "Set velocity and angle", args: "[vx, vy, angleRadians]", argDefault: "[0, -8, 0]",
        doc: "The landing criteria are safeVx / safeVy / safeAng; writing these lets you land exactly at the threshold and see which side the page picks.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [vx, vy, angle]";
          ship.vx = Number(a[0]); ship.vy = Number(a[1]); if (a[2] !== undefined) ship.angle = Number(a[2]);
          var tt = t();
          return { vx: num(ship.vx, 10), vy: num(ship.vy, 10), angleDeg: num(ship.angle * 180 / Math.PI, 10),
            safeVx: tun("safeVx"), safeVy: tun("safeVy"), safeAngDeg: tt ? num(tt.safeAng * 180 / Math.PI, 10) : 0 };
        } },
      { id: "thrust", label: "Hold or release thrust", args: '"on" | "off"', argDefault: "on",
        doc: "Sets keys.thrust — the same flag the Space key and the thrust button drive, so burn time and fuel drain behave as in play.",
        run: function (v) { keys.thrust = String(v || "on") !== "off"; return { thrusting: !!ship.thrusting, fuel: num(ship.fuel, 1), burnPerSec: tun("burn") }; } },
      { id: "win", label: "Win or crash now", args: '"win" | "crash"', argDefault: "win",
        doc: "winLevel() / crashShip() — force either ending to exercise the overlay, scoring and the next-level path.",
        run: function (w) { if (String(w) === "crash") crashShip(); else winLevel(); return { phase: state, saved: saved, total: total }; } },
      { id: "probe", label: "Read the flight state", args: "unused",
        doc: "Phase, level and seed, ship position/velocity/angle/fuel, grounded and thrusting flags, pad coordinates, astronaut and canister counts, gravity/thrust/rotation and the safe-landing limits.",
        run: function () {
          var tt = t();
          return { phase: state, level: level, seed: tt ? tt.seedUsed : null,
            ship: { x: num(ship.x, 1), y: num(ship.y, 1), vx: num(ship.vx, 10), vy: num(ship.vy, 10), angleDeg: num(ship.angle * 180 / Math.PI, 10), fuel: num(ship.fuel, 1), maxFuel: ship.maxFuel, alive: !!ship.alive, grounded: !!ship.grounded, thrusting: !!ship.thrusting },
            pad: { x: tt ? num(tt.padX, 1) : 0, topY: tt ? num(tt.padTopY, 1) : 0, safeAngDeg: tt ? num(tt.safeAng * 180 / Math.PI, 10) : 0 },
            limits: { safeVx: tun("safeVx"), safeVy: tun("safeVy"), gravity: tun("gravity"), thrust: tun("thrust"), burn: tun("burn"), rotRate: tun("rotRate") },
            astronauts: tt ? tt.astronauts.length : 0, taken: tt ? tt.astronauts.filter(function (a) { return a.taken }).length : 0,
            cansLeft: tt ? tt.fuels.filter(function (f) { return !f.taken }).length : 0,
            saved: saved, total: total, gameTime: num(typeof gameTime !== "undefined" ? gameTime : 0, 10) };
        } },
      { id: "watch", label: "Log the descent every N seconds", args: "seconds (0 stops)", argDefault: 0.5,
        doc: "Velocity, altitude above the pad, angle and fuel each interval — the readout you want while tuning a soft landing.",
        run: function (s) {
          if (window.__tllDescent) { clearInterval(window.__tllDescent); window.__tllDescent = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllDescent = setInterval(function () {
            var tt = t();
            console.log("vy", ship.vy.toFixed(2), "vx", ship.vx.toFixed(2), "alt", (ship.y - (tt ? tt.padTopY : 0)).toFixed(1),
              "angle", (ship.angle * 180 / Math.PI).toFixed(1), "fuel", ship.fuel.toFixed(0), "safeVx", tun("safeVx"), "safeVy", tun("safeVy"), "phase", state);
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Threshold sweep: landings just inside and outside the limits",
        doc: "Places the ship above the pad and walks vy across the safe-landing ceiling, printing which side of the limit each touchdown is.",
        js: 'var tt = terrain, pad = tt.padTopY;\nvar lim = window.__tllSafeVy || 8;\nfor (var i = 0; i < 5; i++) {\n  ship.x = tt.padX; ship.y = pad + 40; ship.vx = 0; ship.vy = lim * (0.6 + i * 0.2); ship.angle = 0;\n  console.log("attempt", i, "vy", ship.vy.toFixed(2), "safeVy", lim, ship.vy > lim ? "expected crash" : "expected land");\n}' },
      { label: "Fuel budget for one rescue run",
        doc: "Prints burn rate, tank size and the hover time they buy, then drains fuel to that budget so you can test a full run on the margin.",
        js: 'var burn = window.__tllBurn || 12, tank = ship.maxFuel;\nconsole.log("tank", tank, "burn/s", burn, "hover seconds", (tank / burn).toFixed(2));\nship.fuel = tank;\nvar t0 = Date.now();\nwindow.__tllFuel = setInterval(function () {\n  keys.thrust = true;\n  ship.fuel -= burn * 0.25;\n  if (ship.fuel <= 0) { keys.thrust = false; console.log("fuel out after", ((Date.now() - t0) / 1000).toFixed(1), "s"); clearInterval(window.__tllFuel); }\n}, 250);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live run (phase, level, rescue count, ship pose and velocity, the physics block). BALANCE edits gravity, thrust, burn, rotation and the safe-landing envelope plus fuel amounts. CHEATS changes the run. LAYOUT resizes and repositions the HUD, gauges, touch buttons and overlay screens per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "lander.html declares its game at the top level of a plain script, so the harness reaches update, render, setState, loadLevel, winLevel, crashShip, updatePickups, updateCameraMatrices, totalAvailableFuel, ship, terrain, keys, level, saved, total, gameTime, state. The page file is untouched." },
      { topic: "Difficulty is per level", text: "terrain.gravity/thrust/burn/rotRate/safeVx/safeVy/safeAng/startFuel/fuelCan are computed from level and difficulty at loadLevel time. Editing them changes the CURRENT level immediately; the next loadLevel() recomputes them, so use the level row plus CHEATS: next level to retune a fresh level." },
      { topic: "Soft landing", text: "A touchdown is safe when horizontal speed is under safeVx, vertical under safeVy and the tilt within safeAng of vertical. CHEATS: kill velocity and straighten the ship give a guaranteed soft landing at any height." },
      { topic: "Not reachable", text: "The WebGL internals stay private: renderer setup, mesh builders (ship, asteroid, fuel can, terrain chunks), textures and shader sources live in closures. Audio graph and the procedural terrain noise are the same. Structure is visible through the console hooks instead." },
      { topic: "Texts", text: "The page uses the shared i18n.js kit (en/es/pt/ru/zh) with data-t attributes, so the TEXTS tab is kit-driven: pick a language, edit a key and the page re-applies it. Overlay copy (out-of-fuel, win, help lines) comes from that table." }
    ]
  });
})();
