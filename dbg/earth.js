/* dbg/earth.js — developer harness for earth.html (Burning Earth, 3D artillery)
 *
 * Load with:  earth.html?debug=dbg/earth.js
 * earth.html declares its game at the top level of a plain <script>, so the
 * harness reaches update, fire, damage, beginTurn, nextTurn, gameOver,
 * forceShoot, toggleMode, players, shots, wind, cam, WEAPONS, heights, water,
 * G/G0/PS/P0/PR directly. No page bridge; without ?debug the page is untouched.
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
      if (!realDamage) realDamage = window.damage;
      window.damage = function () { };
      players.forEach(function (p) { p.health = 100 });
    } else if (realDamage) {
      window.damage = realDamage;
    }
  }

  /* WEAPONS is a plain array of rows; damage/radius scaling multiplies each
     row and keeps the shipped originals so the scale is absolute. */
  var baseW = null;
  function snapshotW() { if (!baseW) baseW = WEAPONS.map(function (w) { return { damage: w.damage, radius: w.radius } }); }
  function wScale(key, baseKey) {
    snapshotW();
    return baseW[0][baseKey] ? WEAPONS[0][key] / baseW[0][baseKey] : 1;
  }
  function setWScale(key, baseKey, v) {
    snapshotW();
    WEAPONS.forEach(function (w, i) { if (w[key] != null) w[key] = baseW[i][baseKey] * v });
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 100)) / (r || 100) : 0 }
  function me() { return curP || players[0] || null; }

  TLDBG.register({
    game: "earth", file: "earth.html",

    state: function () {
      var p = me();
      return {
        phase: state, paused: paused, quality: qual, focus: focus,
        players: players.length, alive: players.filter(function (q) { return q.alive }).length,
        current: p ? p.index : -1, currentHuman: p ? !!p.human : false,
        turnTime: num(turnT, 10), simTime: num(simT, 10), moveTime: num(moveTime, 10),
        cpuShot: cpuShot, shotsInFlight: shots.length, delays: delays.length,
        blasts: booms.length, particles: parts.length, trees: trees.length,
        wind: { x: num(wind.x), y: num(wind.y), z: num(wind.z) },
        gravity: num(G), powerScale: num(PS), planetRadius: PR,
        aim: p ? { dir: num(p.aim.dir, 10), elev: num(p.aim.elev, 10), power: num(p.aim.power, 10) } : null,
        health: p ? num(p.health, 1) : 0,
        ammo: p ? p.ammo.join("/") : "",
        camPlanet: num(cam.dPlanet), camPlayer: num(cam.dPlayer), camShot: num(cam.dShot),
        terrainMaxHeight: num(maxH, 1)
      };
    },

    params: [
      { id: "gravity", label: "Gravity (live)", unit: "u/s2", min: 0, max: 40, step: 0.5,
        get: function () { return G },
        set: function (v) { G = v },
        code: { file: "earth.html", line: 450, name: "G" },
        doc: "The value the ballistics simulation uses right now. Reset to G0 at the start of a game (line 3609)." },
      { id: "baseGravity", label: "Gravity at game start", unit: "u/s2", min: 0, max: 40, step: 0.5,
        get: function () { return G0 },
        set: function (v) { G0 = v },
        code: { file: "earth.html", line: 448, name: "G0" },
        doc: "The shipped default gravity (12). Also use it as the restore value for the live gravity row." },
      { id: "powerScale", label: "Power scale (live)", unit: "u/s per aim unit", min: 0.1, max: 1.2, step: 0.01,
        get: function () { return PS },
        set: function (v) { PS = v },
        code: { file: "earth.html", line: 451, name: "PS" },
        doc: "Converts the power slider into muzzle speed. calib() (line 3266) recomputes it before every shot to keep long shots reachable, so a manual value is a transient override — good for judging trajectory." },
      { id: "basePower", label: "Power scale floor", unit: "u/s per aim unit", min: 0.1, max: 1.2, step: 0.01,
        get: function () { return P0 },
        set: function (v) { P0 = v },
        code: { file: "earth.html", line: 449, name: "P0" },
        doc: "Minimum muzzle-speed scale the calibration will use (shipped 0.52). Raising it makes every shot faster at the same slider value." },
      { id: "dmgScale", label: "Weapon damage scale", unit: "x", min: 0.1, max: 5, step: 0.1,
        get: function () { return wScale("damage", "damage") },
        set: function (v) { setWScale("damage", "damage", v) },
        code: { file: "earth.html", line: 461, name: "WEAPONS[i].damage / kill" },
        doc: "Absolute multiplier over the shipped damage of all seven weapons (Shell 28 ... Mini Nuke 75). Explosions use damage for hurt and kill for the instant-death threshold." },
      { id: "radiusScale", label: "Explosion radius scale", unit: "x", min: 0.2, max: 4, step: 0.1,
        get: function () { return wScale("radius", "radius") },
        set: function (v) { setWScale("radius", "radius", v) },
        code: { file: "earth.html", line: 461, name: "WEAPONS[i].radius" },
        doc: "Absolute multiplier over each weapon's blast radius (Shell 4.2 ... Mini Nuke 10). Terrain cratering follows the same rows." },
      { id: "health", label: "Current tank health", unit: "hp", min: 1, max: 100, step: 1,
        get: function () { var p = me(); return p ? p.health : 100 },
        set: function (v) { var p = me(); if (p) { p.health = v; p.alive = v > 0 } },
        code: { file: "earth.html", line: 3630, name: "player.health" },
        doc: "The tank whose turn it is. The health panel (#healthList) repaints on the next buildHealth() pass." },
      { id: "aimPower", label: "Aim power slider", unit: "0-100", min: 1, max: 100, step: 1,
        get: function () { var p = me(); return p ? p.aim.power : 55 },
        set: function (v) { var p = me(); if (p) p.aim.power = v },
        code: { file: "earth.html", line: 3639, name: "player.aim.power" },
        doc: "The power the FIRE button will use, mirrored in the #power slider on the next syncSetup() pass." },
      { id: "aimElev", label: "Aim elevation", unit: "deg", min: 0, max: 90, step: 1,
        get: function () { var p = me(); return p ? p.aim.elev : 45 },
        set: function (v) { var p = me(); if (p) p.aim.elev = v },
        code: { file: "earth.html", line: 3639, name: "player.aim.elev" },
        doc: "Firing angle above the horizon for the current tank (#elev slider)." },
      { id: "windX", label: "Wind X", unit: "u/s", min: -20, max: 20, step: 0.5,
        get: function () { return wind.x },
        set: function (v) { wind.x = v },
        code: { file: "earth.html", line: 492, name: "wind.x" },
        doc: "Horizontal wind the shots integrate. Zero it to make a shot perfectly reproducible." },
      { id: "windZ", label: "Wind Z", unit: "u/s", min: -20, max: 20, step: 0.5,
        get: function () { return wind.z },
        set: function (v) { wind.z = v },
        code: { file: "earth.html", line: 492, name: "wind.z" },
        doc: "The other horizontal component. wind.y is the vertical term, also editable here as the next row." },
      { id: "windY", label: "Wind Y (vertical)", unit: "u/s", min: -20, max: 20, step: 0.5,
        get: function () { return wind.y },
        set: function (v) { wind.y = v },
        code: { file: "earth.html", line: 492, name: "wind.y" },
        doc: "Vertical wind component; lifts or drops the shot during flight." },
      { id: "camPlayer", label: "Follow camera distance", unit: "u", min: 8, max: 90, step: 1,
        get: function () { return cam.dPlayer },
        set: function (v) { cam.dPlayer = v },
        code: { file: "earth.html", line: 466, name: "cam.dPlayer" },
        doc: "Camera distance while following a tank (shipped 28)." },
      { id: "camPlanet", label: "Planet view distance", unit: "u", min: 40, max: 400, step: 5,
        get: function () { return cam.dPlanet },
        set: function (v) { cam.dPlanet = v },
        code: { file: "earth.html", line: 465, name: "cam.dPlanet" },
        doc: "Camera distance for the whole-planet view (shipped 120)." },
      { id: "planetRadius", label: "Planet radius", unit: "u", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return PR },
        code: { file: "earth.html", line: 447, name: "PR" },
        doc: "Read-only (38): the terrain mesh, spawn placement and curvature maths are built around it at startGame, so changing it live would desync the geometry from the collision data." },
      { id: "terrainMax", label: "Terrain height cap", unit: "u", min: 0, max: 0, step: 1, readonly: true,
        get: function () { return MAX_H },
        code: { file: "earth.html", line: 457, name: "MAX_H" },
        doc: "Read-only (12): the height field is clamped and allocated with this cap, so a live change would not resize the mesh." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "update() becomes a no-op; the renderer keeps drawing, so you can inspect a shot mid-flight.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "The frame delta handed to update() is scaled: shots, particles, tree fire and turn timers all slow together.",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "god", label: "Nobody can be hurt", toggle: true,
        doc: "damage() becomes a no-op and every tank is healed to 100. Explosions still crater terrain.",
        on: function (v) { setGod(v) } },
      { id: "healAll", label: "Heal every tank",
        doc: "Health 100 and alive for all players, without touching ammo or the turn order.",
        run: function () { players.forEach(function (p) { p.health = 100; p.alive = true }); TLDBG.toast("healed " + players.length); } },
      { id: "refillAmmo", label: "Refill all ammo",
        doc: "Every weapon of every tank gets 20 rounds (the ammo array is per-weapon).",
        run: function () { players.forEach(function (p) { p.ammo = p.ammo.map(function () { return 20 }) }); TLDBG.toast("ammo refilled"); } },
      { id: "fireTestShot", label: "Fire with the current aim",
        doc: "Calls fire() on the current tank using its own aim (direction, elevation, power) and the selected weapon — the deterministic shot for tuning ballistics.",
        run: function () {
          var p = me(); if (!p) return TLDBG.toast("no tank yet");
          var wi = 0;
          if (typeof weaponSelect !== "undefined" && weaponSelect) wi = parseInt(weaponSelect.value, 10) || 0;
          window.fire(p, wi, p.aim.elev, p.aim.dir, p.aim.power);
          TLDBG.toast("shot fired (weapon " + (WEAPONS[wi] ? WEAPONS[wi].name : wi) + ")");
        } },
      { id: "killCurrent", label: "Destroy current tank",
        doc: "Applies 100 damage at the current tank's position through the game's own damage(), so death and the turn handoff run as in play.",
        run: function () {
          var p = me(); if (!p) return TLDBG.toast("no tank yet");
          window.damage(p.pos, 6, 100); TLDBG.toast("damage applied");
        } },
      { id: "nextTurn", label: "End this turn",
        doc: "Runs nextTurn(): picks the next playable tank and starts its timer.",
        run: function () { window.nextTurn(); TLDBG.toast("turn " + (curIdx + 1) + "/" + players.length); } },
      { id: "beginTurn", label: "Restart this turn",
        doc: "Runs beginTurn() for the current tank — resets the turn timer and camera framing.",
        run: function () { window.beginTurn(); TLDBG.toast("turn restarted"); } },
      { id: "aiShoot", label: "Make the CPU shoot now",
        doc: "forceShoot() makes an AI tank fire immediately with its current target.",
        run: function () { window.forceShoot(); TLDBG.toast("cpu shot requested"); } },
      { id: "toggleMode", label: "Toggle human / CPU mode",
        doc: "toggleMode() flips the current tank between human control and the AI, the same as the in-game button.",
        run: function () { window.toggleMode(); TLDBG.toast("mode flipped"); } },
      { id: "forceOver", label: "Force game over",
        doc: "Calls gameOver(): result overlay, rematch button and the stored best-run record behave as in a real finish.",
        run: function () { window.gameOver(); TLDBG.toast("game over"); } },
      { id: "noAmmoEnd", label: "Trigger the no-ammo end",
        doc: "noAmmoEnd() is the stalemate path when nobody has ammunition left — run it to see how the game resolves a draw.",
        run: function () { window.noAmmoEnd(); TLDBG.toast("no-ammo end"); } },
      { id: "hideHud", label: "Hide HUD layer", toggle: true,
        doc: "Display:none on #hud (health list, turn banner, labels) for clean 3D captures.",
        on: function (v) { var el = document.getElementById("hud"); if (el) el.style.display = v ? "none" : ""; } }
    ],

    hooks: [
      { label: "Console: tanks", doc: "Every tank: index, human/CPU, health, alive, world position, aim, ammo per weapon.",
        run: function () {
          console.table(players.map(function (p) {
            return { i: p.index, human: !!p.human, skill: num(p.skill, 100), health: num(p.health, 1), alive: p.alive,
              x: num(p.pos[0]), y: num(p.pos[1]), z: num(p.pos[2]),
              dir: num(p.aim.dir, 10), elev: num(p.aim.elev, 10), power: num(p.aim.power, 10),
              ammo: p.ammo.join("/") };
          }));
        } },
      { label: "Console: shots in flight", doc: "Each live projectile: weapon row, owner tank, position, velocity, age, active flag, remaining bounces.",
        run: function () {
          console.table(shots.map(function (s) {
            return { weapon: s.weapon ? s.weapon.name : "-", owner: s.owner ? s.owner.index : "-",
              x: num(s.pos[0]), y: num(s.pos[1]), z: num(s.pos[2]),
              vx: num(s.vel[0]), vy: num(s.vel[1]), vz: num(s.vel[2]),
              age: num(s.age, 10), active: !!s.active, bounces: s.bounces };
          }));
        } },
      { label: "Console: weapon table", doc: "The WEAPONS rows as they currently stand, after any BALANCE scaling.",
        run: function () {
          console.table(WEAPONS.map(function (w, i) {
            return { i: i, name: w.name, type: w.type, damage: w.damage, kill: w.kill, radius: w.radius,
              crater: w.crater, count: w.count || 0, fires: w.fires || 0, homing: !!w.homing };
          }));
        } },
      { label: "Console: terrain and water", doc: "Height-field summary: resolution, min/max height, water level, tree and particle counts.",
        run: function () {
          var mn = Infinity, mx = -Infinity, i, h;
          if (heights) for (i = 0; i < heights.length; i++) { h = heights[i]; if (h < mn) mn = h; if (h > mx) mx = h; }
          console.log({ quality: qual, terrainResolution: TRES, heightCells: heights ? heights.length : 0,
            minHeight: mn === Infinity ? "-" : num(mn, 100), maxHeight: mx === -Infinity ? "-" : num(mx, 100),
            maxH: num(maxH, 100), water: water ? (water.length ? num(water[0], 100) : "empty array") : "not built",
            trees: trees.length, leaves: leaves.length, particles: parts.length, blasts: booms.length });
        } },
      { label: "Console: camera and flags", doc: "Camera vectors, focus mode, auto-camera, pause/aim/ghost flags, simulation clocks.",
        run: function () {
          console.log({ state: state, paused: paused, focus: focus, selP: selP ? selP.index : null,
            aimAct: aimAct, ghost: ghost, cpuShot: cpuShot, hudDirty: hudD,
            turnT: num(turnT, 10), simT: num(simT, 10), moveTime: num(moveTime, 10),
            camEye: cam.eye.map(function (v) { return num(v, 10) }),
            camDist: { planet: cam.dPlanet, player: cam.dPlayer, shot: cam.dShot },
            autoCam: { on: pAuto.on, dist: pAuto.dist }, playerCam: { yaw: num(pCam.yaw), pitch: num(pCam.pitch), manual: pCam.manual } });
        } }
    ],

    layout: [
      { sel: "#c", label: "WebGL canvas" },
      { sel: "#hud", label: "HUD layer" },
      { sel: "#healthList", label: "Tank health bars" },
      { sel: "#turnSwatch", label: "Turn colour swatch" },
      { sel: "#turnText", label: "Turn caption" },
      { sel: "#banner", label: "Banner line (wind / result)" },
      { sel: "#labels", label: "Floating name labels" },
      { sel: "#controls", label: "Control panel" },
      { sel: "#moveUI", label: "Move section" },
      { sel: "#moveSide", label: "Move side buttons" },
      { sel: "#moveTime", label: "Move-time readout" },
      { sel: "#shootUI", label: "Aiming section" },
      { sel: "#fireCtl", label: "Fire controls row" },
      { sel: "#elev", label: "Elevation slider" },
      { sel: "#power", label: "Power slider" },
      { sel: "#direction", label: "Direction slider" },
      { sel: "#weaponSelect", label: "Weapon selector" },
      { sel: "#fireBtn", label: "FIRE button" },
      { sel: "#dpad", label: "Touch D-pad" },
      { sel: ".dbtn", label: "D-pad buttons" },
      { sel: "#cameraBtn", label: "Camera mode button" },
      { sel: "#toggleModeBtn", label: "Human / CPU toggle" },
      { sel: "#setupOverlay", label: "Setup overlay" },
      { sel: "#playerCount", label: "Player count row" },
      { sel: "#playerRows", label: "Player rows container" },
      { sel: "#qualitySelect", label: "Quality selector" },
      { sel: "#perfNote", label: "Performance note" },
      { sel: "#startBtn", label: "Start button" },
      { sel: "#setupBtn", label: "Back-to-setup button" },
      { sel: "#gameoverOverlay", label: "Game-over overlay" },
      { sel: "#resultText", label: "Result text" },
      { sel: "#rematchBtn", label: "Rematch button" },
      { sel: "#pauseOverlay", label: "Pause overlay" },
      { sel: "#pauseBtn", label: "Pause button" },
      { sel: "#resumeBtn", label: "Resume button" },
      { sel: "#titleBtn", label: "Title button" },
      { sel: "#pauseSoundChk", label: "Sound checkbox (pause)" },
      { sel: "#pauseHelperChk", label: "Helper checkbox (pause)" },
      { sel: "#homeLink", label: "Home link" }
    ],

    control: [
      { id: "start", label: "Start the match", args: "unused",
        doc: "Clicks the page's own #startBtn — the setup screen's players/skill settings are read there, so bot control needs a live match first.",
        run: function () {
          var b = document.getElementById("startBtn");
          if (!b) return "no #startBtn";
          b.click();
          return { state: state, players: players.length, turn: curIdx };
        } },
      { id: "seat", label: "Seat human or CPU", args: '[playerIndex, "human" | "cpu"]', argDefault: '[0, "cpu"]',
        doc: "players[i].human decides whether the turn waits for keyboard input or runs the CPU shot routine (the cpuShot path in the update loop).",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, human|cpu]";
          var p = players[+a[0] || 0]; if (!p) return "no player " + a[0];
          p.human = a[1] === "human";
          return { player: +a[0] || 0, human: !!p.human, alive: !!p.alive, skill: num(p.skill, 100), current: p === curP };
        } },
      { id: "skill", label: "Aim accuracy of a bot", args: "[playerIndex, 0-1]", argDefault: "[1, 0.9]",
        doc: "players[i].skill: the shot solver adds error proportional to (1 - skill), so 1 is a precise shooter and 0.2 sprays. This is the same value the setup screen's skill slider writes.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, 0-1]";
          var p = players[+a[0] || 0]; if (!p) return "no player " + a[0];
          p.skill = Math.max(0, Math.min(1, Number(a[1])));
          return { player: +a[0] || 0, skill: num(p.skill, 100), errorBand: num(1 - p.skill, 100), cpu: !p.human };
        } },
      { id: "weapon", label: "Give a tank a weapon", args: "[playerIndex, weaponIndex into WEAPONS]", argDefault: '[1, 0]',
        doc: "Sets p.weapon; WEAPONS rows are printed by the WEAPONS console hook, so pick an index you have read.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, weaponIndex]";
          var p = players[+a[0] || 0]; if (!p) return "no player " + a[0];
          var w = +a[1]; if (!WEAPONS[w]) return "no weapon " + w;
          p.weapon = w;
          return { player: +a[0] || 0, weapon: w, name: WEAPONS[w].name || String(w), ammo: p.ammo };
        } },
      { id: "setWind", label: "Set the wind", args: "[x, y, z] u/s", argDefault: "[3, 0, -2]",
        doc: "Writes the live wind vector — the CPU re-solves its shot next turn, so wind is the cheapest way to stress the aim solver.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [x, y, z]";
          wind.x = Number(a[0]); wind.y = Number(a[1] || 0); wind.z = Number(a[2] || 0);
          return { wind: { x: num(wind.x, 10), y: num(wind.y, 10), z: num(wind.z, 10) }, state: state };
        } },
      { id: "probe", label: "Read whose turn it is and how they aim", args: "unused",
        doc: "Current player, phase (setup / move / aim / flight), skill, weapon, ammo, aim slider values, assist state (aimAct, ghost) and the shot list in flight.",
        run: function () {
          return { state: state, paused: !!paused, turn: curIdx, current: curP ? {
            human: !!curP.human, skill: num(curP.skill, 100), weapon: curP.weapon, ammo: curP.ammo,
            hp: num(curP.hp, 10), pos: curP.pos ? curP.pos.map(function (v) { return num(v, 10) }) : null } : null,
            cpuShot: !!cpuShot, aimAssist: !!aimAct, ghostAim: !!ghost,
            wind: { x: num(wind.x, 10), y: num(wind.y, 10), z: num(wind.z, 10) },
            shotsInFlight: shots.length, players: players.map(function (p, i) { return { i: i, human: !!p.human, skill: num(p.skill, 100), alive: !!p.alive, ammo: p.ammo }; }) };
        } },
      { id: "aiWatch", label: "Watch turn and solver state", args: "seconds (0 stops)", argDefault: 1,
        doc: "Logs phase, current seat, skill and in-flight shots each N seconds — enough to see the CPU take its turn and fire.",
        run: function (s) {
          if (window.__tllAI) { clearInterval(window.__tllAI); window.__tllAI = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllAI = setInterval(function () {
            console.log("state", state, "turn", curIdx, "human", curP ? !!curP.human : "-",
              "skill", curP ? num(curP.skill, 100) : "-", "ammo", curP ? curP.ammo : "-",
              "cpuShot", !!cpuShot, "shots", shots.length, "moveTime", num(moveTime, 10));
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "All-CPU duel at 90% accuracy",
        doc: "Both seats become CPU with high skill — the game plays itself and you can watch the ballistics resolve.",
        js: 'if (!players.length) document.getElementById("startBtn").click();\nplayers.forEach(function (p) { p.human = false; p.skill = 0.9; });\nsetInterval(function () {\n  console.log(state, "turn", curIdx, "hp", players.map(function (p) { return Math.round(p.hp); }).join("/"), "shots", shots.length);\n}, 1000);' },
      { label: "Accuracy sweep: how far off is 1 - skill?",
        doc: "Runs the same shot at several skill levels and prints the miss distance, so you can calibrate the error band against the map.",
        js: 'if (!curP) document.getElementById("startBtn").click();\nif (!curP) return "match did not start";\nvar target = players.filter(function (p) { return p.alive && p !== curP; })[0];\n[1, 0.8, 0.6, 0.4, 0.2].forEach(function (sk) {\n  curP.skill = sk;\n  console.log("skill", sk, "expected error band", (1 - sk).toFixed(2),\n    "weapon", WEAPONS[curP.weapon] ? WEAPONS[curP.weapon].name : curP.weapon,\n    "target distance", target ? Math.hypot(target.pos[0] - curP.pos[0], target.pos[1] - curP.pos[1], target.pos[2] - curP.pos[2]).toFixed(1) : "-");\n});' },
      { label: "Wind stress for the solver",
        doc: "Sets a hard crosswind, hands the turn to the CPU and logs whether its shots still land on target.",
        js: 'if (!players.length) document.getElementById("startBtn").click();\nwind.x = 8; wind.z = -6;\nnextTurn();\nif (window.__tllWind) clearInterval(window.__tllWind);\nwindow.__tllWind = setInterval(function () {\n  console.log(state, "turn", curIdx, "wind", wind.x.toFixed(1) + "/" + wind.y.toFixed(1) + "/" + wind.z.toFixed(1),\n    "shots", shots.map(function (s) { return (s.vel ? Math.hypot(s.vel[0], s.vel[1], s.vel[2]).toFixed(1) : "-"); }).join(" "));\n}, 800);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live game (phase, turn, tanks, shots, wind, ballistics numbers). BALANCE edits gravity, muzzle speed, weapon damage/radius, wind, camera distances and the current tank's aim. CHEATS changes the run. LAYOUT resizes and repositions the HUD and the control panel per screen mode. ELEMENTS lists every selector with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "earth.html declares its game at the top level of a plain script, so the harness reaches update, fire, sim, damage, beginTurn, nextTurn, gameOver, noAmmoEnd, forceShoot, toggleMode, buildHealth, players, shots, delays, booms, parts, trees, leaves, wind, cam, WEAPONS, heights, water, G, G0, PS, P0, PR. The page file is untouched." },
      { topic: "Ballistics", text: "Muzzle speed is the aim power times PS (a calibration the game recomputes before every shot, line 3266, floor P0). Gravity is G. So a shot is fully reproducible when you zero wind and pin both values; sim() runs the same maths offline for the aim preview." },
      { topic: "Weapon scale edits are absolute", text: "damage and radius rows are multiplied against a snapshot of the shipped WEAPONS table, so 1 restores the file values and setting a scale twice does not compound. Craters, napalm spread and cluster counts follow the same rows and are listed in the weapon-table hook." },
      { topic: "Not reachable", text: "The WebGL internals stay private: shader sources, program/uniform objects, the terrain vertex buffers and the atlas-free planet geometry live in closures. Quality presets (PRE) reshape buffers at startGame, which is why quality is only changeable through the page's own selector." },
      { topic: "Texts", text: "The page uses the shared i18n.js kit (en/es/pt/ru/zh), so the TEXTS tab is kit-driven: pick a language, edit a key, and TLI18N re-applies it. Weapon names and HUD lines are written by JS from that table." }
    ]
  });
})();
