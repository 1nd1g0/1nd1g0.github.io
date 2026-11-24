/* Developer harness script for arena.html (Rustfall arena).
   Loaded by the page loader when the URL has ?debug=dbg/arena.js, after
   dbg/_harness.js. Registers live state, balance rows, cheats, console hooks,
   layout selectors and docs. Never runs when the engine is absent, and never
   changes the game unless you press something here. */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  var H = window.TLHOOK || {};   /* the page's live handle, set inside its IIFE */
  function guns() { return H.guns || (typeof GUNS !== "undefined" ? GUNS : null) }
  function foesT() { return H.foesTable || (typeof FOES !== "undefined" ? FOES : null) }
  function chars() { return H.charsTable || (typeof CHARS !== "undefined" ? CHARS : null) }
  function run() { return (H.run !== undefined) ? H.run : (typeof RUN !== "undefined" ? RUN : null) }
  function pls() { return H.players || (typeof players !== "undefined" ? players : []) }
  function foeList() { return H.foes || (typeof foes !== "undefined" ? foes : []) }
  function q() { return (H.q !== undefined) ? H.q : (typeof Q !== "undefined" ? Q : null) }
  function opts() { return H.opts || (typeof OPT !== "undefined" ? OPT : null) }
  function diffMult() { return H.diffMult || (typeof DIFF_MULT !== "undefined" ? DIFF_MULT : null) }

  function num(v) { return (typeof v === "number" && isFinite(v)) ? v : 0 }

  /* gun field helper: object fields are live, so edits apply to the next shot */
  function gunGet(key, field) { var g = guns(); return g && g[key] ? num(g[key][field]) : 0 }
  function gunSet(key, field, v) { var g = guns(); if (g && g[key]) g[key][field] = v }
  function foeGet(key, field) { var f = foesT(); return f && f[key] ? num(f[key][field]) : 0 }
  function foeSet(key, field, v) { var f = foesT(); if (f && f[key]) f[key][field] = v }
  function chrGet(key, field) { var c = chars(); return c && c[key] ? num(c[key][field]) : 0 }
  function chrSet(key, field, v) { var c = chars(); if (c && c[key]) c[key][field] = v }

  /* god mode: wrap hurtPlayer through the page handle, restore when off */
  var savedHurt = null;
  function godMode(on) {
    var cur = H.hurtPlayer || (typeof hurtPlayer === "function" ? hurtPlayer : null);
    if (typeof cur !== "function" || !("hurtPlayer" in H)) { TLDBG.toast("hurtPlayer is not patchable here"); return }
    if (on) { if (!savedHurt) savedHurt = cur; H.hurtPlayer = function () { return 0 } }
    else if (savedHurt) { H.hurtPlayer = savedHurt; savedHurt = null }
    window.__tldbgGod = !!on;
  }

  /* ammo cheat: keep the magazine topped up while on */
  var ammoTimer = null;
  function ammoCheat(on) {
    if (ammoTimer) { clearInterval(ammoTimer); ammoTimer = null }
    if (!on) return;
    ammoTimer = setInterval(function () {
      var ps = pls();
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        if (p && !p.dead && p.gun) p.ammo = p.gun.mag;
      }
    }, 200);
  }

  /* no-spawn: hold the wave budget at zero so the director cannot add foes */
  var spawnTimer = null;
  function noSpawn(on) {
    if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null }
    if (!on) return;
    spawnTimer = setInterval(function () { var r = run(); if (r) r.budget = 0 }, 200);
  }

  function clearFoes() {
    var fs = foeList(), hf = H.hurtFoe || (typeof hurtFoe === "function" ? hurtFoe : null);
    if (typeof hf !== "function") { TLDBG.toast("hurtFoe not reachable"); return }
    for (var i = fs.length - 1; i >= 0; i--) hf(fs[i], 1e7, 0, 0, "dbg");
  }
  function heal() {
    var ps = pls(), n = 0;
    for (var i = 0; i < ps.length; i++) if (ps[i] && !ps[i].dead) { ps[i].hp = ps[i].st.maxhp; n++ }
    TLDBG.toast("healed " + n + " player(s)");
  }
  function skipWave() {
    var r = run();
    if (!r) { TLDBG.toast("no run in progress"); return }
    r.budget = 0; r.waveState = "breather"; r.breather = 0.02;
  }
  function nextWave() {
    var r = run();
    if (!r) { TLDBG.toast("no run in progress"); return }
    r.wave += 1; r.budget += 120; TLDBG.toast("wave " + r.wave);
  }
  function spawnBrute() {
    var sf = H.spawnFoe || (typeof spawnFoe === "function" ? spawnFoe : null);
    if (typeof sf !== "function") { TLDBG.toast("spawnFoe not reachable"); return }
    var ps = pls(), p = ps[0];
    var x = p ? p.x + 220 : 800, y = p ? p.y + 220 : 600;
    sf("brute", x, y, true, false);
    TLDBG.toast("brute spawned");
  }
  function unlockAll() {
    var sv = H.save || (typeof SAVE !== "undefined" ? SAVE : null);
    var pf = H.persist || (typeof persist === "function" ? persist : null);
    if (!sv || typeof pf !== "function") { TLDBG.toast("SAVE not reachable"); return }
    var all = ["pistol", "smg", "shot", "rifle", "tesla", "launch", "flame", "rail"];
    sv.unlocked = sv.unlocked || {};
    sv.unlocked.weapons = all;
    var pt = H.perksTable || (typeof PERKS !== "undefined" ? PERKS : null);
    if (pt) {
      var ids = []; for (var k in pt) ids.push(k);
      sv.unlocked.perks = ids;
    }
    pf();
    TLDBG.toast("all weapons/perks unlocked in save (next run)");
  }

  TLDBG.register({
    game: "arena",
    file: "arena.html",
    state: function () {
      var r = run(), ps = pls(), p = ps[0] || null, QQ = q();
      return {
        STATE: (H.state !== undefined) ? H.state : (typeof STATE !== "undefined" ? STATE : "?"),
        mode: r ? r.mode : "-",
        wave: r ? r.wave : 0,
        waveState: r ? r.waveState : "-",
        score: r ? r.score : 0,
        kills: r ? r.kills : 0,
        budget: r ? Math.round(r.budget) : 0,
        power: r ? Math.round(r.power) : 0,
        dps: r ? Math.round(r.dps) : 0,
        time: r ? Math.round(r.time) : 0,
        foes: foeList().length,
        foeCap: QQ ? QQ.foes : 0,
        players: ps.length,
        hp: p ? Math.round(p.hp) + "/" + p.st.maxhp : "-",
        gun: p && p.gun ? p.gun.n : "-",
        ammo: p ? p.ammo : 0,
        quality: opts() ? opts().quality : "-",
        diff: opts() ? opts().diff : "-",
        god: !!window.__tldbgGod
      };
    },
    params: [
      { id: "pistolDmg", label: "Bolt Pistol damage", unit: "hp", min: 1, max: 200, step: 1,
        get: function () { return gunGet("pistol", "dmg") }, set: function (v) { gunSet("pistol", "dmg", v) },
        code: { file: "arena.html", line: 1192, name: "GUNS.pistol.dmg" },
        doc: "damage per bullet of the starting pistol; applies to the very next shot" },
      { id: "pistolRof", label: "Bolt Pistol rate", unit: "shots/s", min: 0.5, max: 20, step: 0.1,
        get: function () { return gunGet("pistol", "rof") }, set: function (v) { gunSet("pistol", "rof", v) },
        code: { file: "arena.html", line: 1192, name: "GUNS.pistol.rof" },
        doc: "rounds per second; higher = harder to aim, more dps" },
      { id: "smgDmg", label: "Rattler SMG damage", unit: "hp", min: 1, max: 60, step: 0.5,
        get: function () { return gunGet("smg", "dmg") }, set: function (v) { gunSet("smg", "dmg", v) },
        code: { file: "arena.html", line: 1193, name: "GUNS.smg.dmg" },
        doc: "per-bullet damage of the fast SMG" },
      { id: "rifleDmg", label: "Longspike Rifle damage", unit: "hp", min: 1, max: 160, step: 1,
        get: function () { return gunGet("rifle", "dmg") }, set: function (v) { gunSet("rifle", "dmg", v) },
        code: { file: "arena.html", line: 1195, name: "GUNS.rifle.dmg" },
        doc: "single-hit damage of the piercing rifle" },
      { id: "railDmg", label: "Slugrail damage", unit: "hp", min: 1, max: 400, step: 1,
        get: function () { return gunGet("rail", "dmg") }, set: function (v) { gunSet("rail", "dmg", v) },
        code: { file: "arena.html", line: 1198, name: "GUNS.rail.dmg" },
        doc: "the one-shot railgun; also its pierce count is on the same line" },
      { id: "scavHp", label: "Scavenger HP", unit: "hp", min: 1, max: 300, step: 1,
        get: function () { return foeGet("scav", "hp") }, set: function (v) { foeSet("scav", "hp", v) },
        code: { file: "arena.html", line: 1240, name: "FOES.scav.hp" },
        doc: "basic grunt health; the swarm budget counts cost, not hp" },
      { id: "bruteHp", label: "Brute HP", unit: "hp", min: 20, max: 2000, step: 5,
        get: function () { return foeGet("brute", "hp") }, set: function (v) { foeSet("brute", "hp", v) },
        code: { file: "arena.html", line: 1245, name: "FOES.brute.hp" },
        doc: "elite tank health" },
      { id: "wispSpd", label: "Wisp speed", unit: "px/s", min: 20, max: 400, step: 1,
        get: function () { return foeGet("wisp", "spd") }, set: function (v) { foeSet("wisp", "spd", v) },
        code: { file: "arena.html", line: 1244, name: "FOES.wisp.spd" },
        doc: "flying harasser speed; same table holds charg/spit/boil/rav" },
      { id: "charSpd", label: "Rigger move speed", unit: "px/s", min: 60, max: 600, step: 1,
        get: function () { return chrGet("rig", "spd") }, set: function (v) { chrSet("rig", "spd", v) },
        code: { file: "arena.html", line: 1186, name: "CHARS.rig.spd" },
        doc: "base walk speed of the default character (scout 300, bruiser 206, spark 246)" },
      { id: "charHp", label: "Rigger max HP", unit: "hp", min: 20, max: 800, step: 1,
        get: function () { return chrGet("rig", "hp") }, set: function (v) { chrSet("rig", "hp", v) },
        code: { file: "arena.html", line: 1186, name: "CHARS.rig.hp" },
        doc: "applies to newly created players; heal cheat uses it" },
      { id: "diffMed", label: "Normal difficulty multiplier", unit: "x", min: 0.2, max: 5, step: 0.05,
        get: function () { var d = diffMult(); return d ? num(d[1]) : 0 },
        set: function (v) { var d = diffMult(); if (d) d[1] = v },
        code: { file: "arena.html", line: 2257, name: "DIFF_MULT[1]" },
        doc: "scales wave budget and spawn cadence; [0]=easy [2]=hard" },
      { id: "foeCap", label: "Live foe cap (quality)", unit: "foes", min: 4, max: 600, step: 1,
        get: function () { return q() ? num(q().foes) : 0 }, set: function (v) { if (q()) q().foes = v },
        code: { file: "arena.html", line: 758, name: "QUAL[1].foes" },
        doc: "the active quality bucket caps how many foes can be alive at once" },
      { id: "music", label: "Music gain", unit: "", min: 0, max: 1, step: 0.01,
        get: function () { var o = opts(); return o ? num(o.music) : 0 },
        set: function (v) {
          var o = opts(); if (!o) return;
          o.music = v;
          var so = H.saveOpts || (typeof saveOpts === "function" ? saveOpts : null);
          if (so) so();
        },
        code: { file: "arena.html", line: 745, name: "OPT.music" },
        doc: "background music level, also editable in the in-game options" },
      { id: "waveScale", label: "Foe damage per wave", unit: "x/wave", min: 0, max: 0.2, step: 0.001,
        readonly: true,
        get: function () { return 0.025 },
        code: { file: "arena.html", line: 1777, name: "e.dmg=t.dmg*(1+RUN.wave*0.025)" },
        doc: "READ ONLY literal: each wave adds 2.5% damage to every foe; edit the source line to change it" }
    ],
    cheats: [
      { id: "god", label: "God mode", doc: "replaces hurtPlayer with a no-op while on; original restored when off",
        toggle: true, on: function (v) { godMode(v) } },
      { id: "heal", label: "Full heal", doc: "fills health of every living player", run: heal },
      { id: "clearFoes", label: "Clear every foe", doc: "kills all live foes through the game's own damage path", run: clearFoes },
      { id: "skipWave", label: "Finish this wave", doc: "empties the budget and starts the breather immediately", run: skipWave },
      { id: "nextWave", label: "Jump one wave", doc: "increments RUN.wave and tops up the budget", run: nextWave },
      { id: "noSpawn", label: "Stop spawning", doc: "pins RUN.budget at 0 while on (foes already alive stay)", toggle: true, on: function (v) { noSpawn(v) } },
      { id: "ammo", label: "Infinite ammo", doc: "tops every player's magazine up every 200 ms while on", toggle: true, on: function (v) { ammoCheat(v) } },
      { id: "spawnBrute", label: "Spawn a brute", doc: "puts an elite next to player 1 for testing", run: spawnBrute },
      { id: "unlock", label: "Unlock everything", doc: "writes all weapons and perks into the save (next run uses them)", run: unlockAll }
    ],
    hooks: [
      { label: "console.table foes", doc: "every live foe with hp, type, position", run: function () { console.table(foeList().slice(0, 60)) } },
      { label: "console.table players", doc: "player objects: hp, gun, perks", run: function () { console.table(pls()) } },
      { label: "log RUN", doc: "the whole run object (wave, budget, mods, score)", run: function () { console.log(run()) } },
      { label: "log GUNS/FOES", doc: "weapon and foe tables as they now stand", run: function () { console.log(guns(), foesT(), chars()) } }
    ],
    layout: [
      { sel: "#hud", label: "HUD canvas" },
      { sel: "#fps", label: "FPS badge" },
      { sel: "#grain", label: "film grain overlay" },
      { sel: "#scan", label: "scanline overlay" },
      { sel: "#manual", label: "manual panel" },
      { sel: "#keysPad", label: "touch key pad" },
      { sel: "#btnPause", label: "pause button" },
      { sel: "#scrOver .panel", label: "game-over panel" },
      { sel: "#overStats", label: "game-over stats block" },
      { sel: "#scrPause .panel", label: "pause panel" },
      { sel: "#scrOptions .wrap", label: "options screen wrapper" },
      { sel: "#optBody", label: "options body" },
      { sel: "#scrChoice .draftcards", label: "character pick cards" },
      { sel: "#draftCards", label: "level-up draft cards" },
      { sel: "#questList", label: "quest list" },
      { sel: ".btn", label: "every button" }
    ],
    control: [
      { id: "start", label: "Start a run", args: '"survival" | "daily" | "resume"', argDefault: "survival",
        doc: "Clicks the page's own button (#btnSurv Start Survival, #btnDaily Daily Run, #btnResume Resume) — seats, waves and the CPU partner come from there, so bot control needs a run first.",
        run: function (which) {
          var id = String(which || "survival") === "daily" ? "btnDaily" : (String(which) === "resume" ? "btnResume" : "btnSurv");
          var b = document.getElementById(id);
          if (!b) return "no button #" + id;
          b.click();
          return { clicked: "#" + id, state: H.state, players: H.players.length, foes: H.foes.length };
        } },
      { id: "partner", label: "Ally seat mode", args: "1 SOLO · 2 LOCAL CO-OP · 3 CPU ALLY", argDefault: 3,
        doc: "OPT.coop is the #segMode segment (1 solo, 2 local co-op, 3 CPU ally). Setting it and clicking #btnSurv rebuilds the run, so seat 1 exists and cpuControl drives it.",
        run: function (v) {
          var n = Math.max(1, Math.min(3, Math.round(Number(v) || 1)));
          H.opts.coop = n;
          var b = document.getElementById("btnSurv"); if (b) b.click();
          return { coop: H.opts.coop, players: H.players.length, seats: H.players.map(function (p) { return p.cpu ? "CPU" : "human" }) };
        } },
      { id: "seat", label: "Seat human or CPU", args: '[playerIndex, "human" | "cpu"]', argDefault: '[1, "cpu"]',
        doc: "p.cpu routes the seat to cpuControl(p, dt) or to the keyboard mapping in OPT/KEYS, so a seat can be handed to the bot mid-run.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, human|cpu]";
          var p = H.players[+a[0] || 0]; if (!p) return "no seat " + a[0];
          p.cpu = a[1] === "cpu";
          return { seat: +a[0] || 0, cpu: !!p.cpu, char: H.charsTable[p.ch] ? H.charsTable[p.ch].n : p.ch, hp: num(p.hp, 10) };
        } },
      { id: "aiProbe", label: "Read the bot's brain", args: "player index", argDefault: 1,
        doc: "cpuControl keeps aiMode (compete / revive / retreat / cover), aiT (0.12 s retarget countdown), aiBurst (fire gate), aiX/aiY (chosen destination), aiTgt (chosen enemy) and aiVis (enemies inside gun range a bullet can actually reach). Projectile guns will not shoot through walls, wrecks or barrels; rail/tesla/flame (beam:true) resolve along the aim line, so they shoot without sight. destBlocked/loot: the destination is re-picked when it is unwalkable or on fire.",
        run: function (i) {
          var p = H.players[+i || 0]; if (!p) return "no seat " + i;
          if (!p.cpu) return "seat " + (+i || 0) + " is human — cpuControl does not drive it (TLDBG seat [i,\"cpu\"] hands it to the bot)";
          var t = p.aiTgt;
          return { seat: +i || 0, cpu: !!p.cpu, aiMode: p.aiMode || null, aiT: num(p.aiT, 100), aiBurst: num(p.aiBurst, 100),
            visible: p.aiVis | 0, parts: p.parts | 0, mechT: num(p.mechT, 100), beam: p.gun ? !(p.gun.bs > 0) : null,
            dest: p.aiX !== undefined ? [num(p.aiX, 1), num(p.aiY, 1)] : null,
            target: t ? { kind: t.type || t.kind || "foe", hp: num(t.hp), dist: num(Math.hypot(t.x - p.x, t.y - p.y), 10) } : null,
            pos: [num(p.x, 1), num(p.y, 1)], hp: num(p.hp, 10), downT: num(p.downT, 10), dashCd: num(p.dashCd, 100), gun: p.gun ? p.gun.name || p.gunId : null };
        } },
      { id: "forceMode", label: "Pin the bot's behaviour", args: '[index, "compete"|"revive"|"retreat"|"cover"]', argDefault: '[1, "cover"]',
        doc: "Sets p.aiMode and pushes p.aiT out so the retarget tick does not overwrite it — hold a behaviour and watch the positioning it produces.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, mode]";
          var p = H.players[+a[0] || 0]; if (!p) return "no seat " + a[0];
          var mode = String(a[1]);
          if (["compete", "revive", "retreat", "cover"].indexOf(mode) < 0) return "unknown mode " + mode;
          p.aiMode = mode; p.aiT = 6;
          return { seat: +a[0] || 0, aiMode: p.aiMode, aiT: num(p.aiT, 100) };
        } },
      { id: "retarget", label: "Bot retarget timer", args: "[index, seconds]", argDefault: "[1, 0.12]",
        doc: "p.aiT counts down to the decision tick (0.12 s). A long value freezes the chosen target and destination; a short one makes the bot re-evaluate constantly.",
        run: function (a) { if (!Array.isArray(a)) return "want [index, seconds]"; var p = H.players[+a[0] || 0]; if (!p) return "no seat " + a[0]; p.aiT = Number(a[1]); return { seat: +a[0] || 0, aiT: num(p.aiT, 100) }; } },
      { id: "burst", label: "Bot firing gate", args: "[index, seconds]", argDefault: "[1, 1.5]",
        doc: "p.aiBurst is the burst window the controller uses for out.firing (fires within gun range while it is positive, resets to 0.55). Raising it keeps the bot shooting; a negative value stops it.",
        run: function (a) { if (!Array.isArray(a)) return "want [index, seconds]"; var p = H.players[+a[0] || 0]; if (!p) return "no seat " + a[0]; p.aiBurst = Number(a[1]); return { seat: +a[0] || 0, aiBurst: num(p.aiBurst, 100), gunRange: p.gun ? num(p.gun.rng, 10) : null }; } },
      { id: "foeType", label: "Tune an enemy archetype", args: '["scav"|"charg"|"spit"|"boil"|"wisp"|"brute"|"rav", "hp"|"spd"|"r"|"dmg"|"cost"|"sc"|"pts", value]', argDefault: '["scav", "spd", 120]',
        doc: "FOES rows are the archetype table (hp, speed, radius, damage, spawn cost, spawn-scale sc, points, elite/fly flags). New spawns read it; the wave director's budget uses cost.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [name, field, value]";
          var row = H.foesTable[String(a[0])]; if (!row) return "no archetype " + a[0];
          var f = String(a[1]); if (!(f in row)) return "no field " + f;
          row[f] = Number(a[2]);
          return { foe: String(a[0]), field: f, value: row[f], liveFoes: H.foes.length };
        } },
      { id: "spawn", label: "Spawn an enemy", args: '["scav"|"charg"|"spit"|"boil"|"wisp"|"brute"|"rav", elite 0|1]', argDefault: '["charg", 0]',
        doc: "spawnFoe(type, x, y, elite, feud) at a random edge position — the director's own path, so budget and wave bookkeeping stay honest.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [name, elite]";
          var W = H.world;
          var x = a[2] !== undefined ? Number(a[2]) : 60 + Math.random() * (W.w - 120);
          var y = a[3] !== undefined ? Number(a[3]) : 60 + Math.random() * (W.h - 120);
          var e = H.spawnFoe(String(a[0]), x, y, !!Number(a[1]), false);
          return { spawned: !!e, foes: H.foes.length, at: [num(x, 1), num(y, 1)] };
        } },
      { id: "difficulty", label: "Difficulty multipliers", args: "[easy, normal, hard] spawn/damage multipliers", argDefault: "[0.8, 1.35, 3.2]",
        doc: "DIFF_MULT is the array the wave director indexes with OPT.diff; editing it changes what each difficulty means for every future wave.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [three numbers]";
          H.diffMult[0] = Number(a[0]); H.diffMult[1] = Number(a[1]); H.diffMult[2] = Number(a[2]);
          return { diffMult: H.diffMult.slice(), currentDiff: H.opts.diff, active: num(H.diffMult[Math.max(0, Math.min(2, H.opts.diff | 0))], 100) };
        } },
      { id: "aiWatch", label: "Watch bot decisions", args: "seconds (0 stops)", argDefault: 1,
        doc: "console.table of each CPU seat's mode, destination, target distance and firing gate every N seconds; window.__tllAI holds the timer.",
        run: function (s) {
          if (window.__tllAI) { clearInterval(window.__tllAI); window.__tllAI = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllAI = setInterval(function () {
            console.table(H.players.map(function (p, i) {
              var t = p.aiTgt;
              return { seat: i, cpu: !!p.cpu, mode: p.aiMode || "-", aiT: num(p.aiT, 100), aiBurst: num(p.aiBurst, 100),
                dest: p.aiX !== undefined ? num(p.aiX, 1) + "," + num(p.aiY, 1) : "-",
                targetDist: t ? num(Math.hypot(t.x - p.x, t.y - p.y), 10) : "-", hp: num(p.hp, 10), downT: num(p.downT, 10) };
            }));
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "CPU partner on NIGHTMARE, decisions traced",
        doc: "Second seat handed to the bot at the hardest multiplier with a 500 ms decision trace — the standard way to judge cover/retreat thresholds.",
        js: 'var H = window.TLHOOK;\nH.opts.coop = 3; H.opts.diff = 2;\ndocument.getElementById("btnSurv").click();\nif (H.players[1]) H.players[1].cpu = true;\nsetInterval(function () {\n  var p = H.players[1]; if (!p) return;\n  var t = p.aiTgt;\n  console.log("mode", p.aiMode, "hp", Math.round(p.hp), "partner hp", H.players[0] ? Math.round(H.players[0].hp) : "-",\n    "target", t ? Math.round(Math.hypot(t.x - p.x, t.y - p.y)) : "-", "burst", p.aiBurst.toFixed(2), "foes", H.foes.length);\n}, 500);' },
      { label: "Force the bot into COVER by hurting the partner",
        doc: "Drives player 0's HP under the 55% cover threshold, then logs the mode flip — the cover branch in cpuControl.",
        js: 'var H = window.TLHOOK;\nH.opts.coop = 3;\ndocument.getElementById("btnSurv").click();\nvar me = H.players[0], bot = H.players[1];\nif (bot) me.hp = me.st.maxhp * 0.4;\nvar t = setInterval(function () {\n  if (!bot) { clearInterval(t); return; }\n  console.log("bot mode", bot.aiMode, "dest", Math.round(bot.aiX) + "," + Math.round(bot.aiY), "human hp", Math.round(me.hp));\n}, 400);\nsetTimeout(function () { clearInterval(t); }, 10000);' },
      { label: "Archetype table and elite spawn",
        doc: "Prints FOES, then spawns an elite brute so you can test the bot's target scoring against a high-cost enemy.",
        js: 'var H = window.TLHOOK;\nconsole.table(Object.keys(H.foesTable).map(function (k) { var r = H.foesTable[k]; return { foe: k, hp: r.hp, spd: r.spd, dmg: r.dmg, cost: r.cost, sc: r.sc, pts: r.pts, elite: !!r.elite, fly: !!r.fly }; }));\nH.spawnFoe("brute", H.world.w / 2, H.world.h / 2, true, false);\nconsole.log("foes now", H.foes.length, "diff mult", H.diffMult.slice());' },
      { label: "Speed sweep: halve every foe, double the bot's fire",
        doc: "Re-balances the whole FOES table toward a easy run and opens the bot's firing gate — a quick way to see who wins with tweaked numbers.",
        js: 'var H = window.TLHOOK;\nObject.keys(H.foesTable).forEach(function (k) { H.foesTable[k].spd *= 0.6; H.foesTable[k].dmg *= 0.7; });\nH.players.forEach(function (p) { if (p.cpu) p.aiBurst = 2.0; });\nconsole.log("slowed foes", H.foes.length, "live; bots firing gate", H.players.map(function (p) { return p.cpu ? p.aiBurst : "-"; }));' }
    ],

    docs: [
      { topic: "What this panel is", text: "arena.html driven live. STATE shows the run (wave, budget, dps, hp) from the page's own RUN/players/foes objects, refreshed twice a second." },
      { topic: "Balance rows", text: "Gun and foe rows write into the page's own GUNS / FOES / CHARS objects, so they take effect on the next shot or the next spawn. The last row (wave damage scale) is a literal inside the code: it is marked READ ONLY and its source line is exported so the LLM can patch the file." },
      { topic: "Cheats", text: "God mode wraps hurtPlayer (restored when you switch it off), infinite ammo tops magazines, stop-spawning pins the director budget, clear-foes uses the game's own hurtFoe so drops and scores still happen." },
      { topic: "How it reaches the game", text: "arena.html keeps its code inside one strict IIFE. The page exports a small handle, window.TLHOOK, naming RUN/players/foes/GUNS/FOES/CHARS/OPT/SAVE plus hurtPlayer (writable so god mode can wrap and restore it). Nothing in the game reads TLHOOK; it exists only for this panel. Numbers baked into function bodies - spawn cadence 0.35-0.8 s, wave damage scale, tile size - are READ ONLY rows that carry their source line for the JSON patch." },
      { topic: "Layout editing", text: "LAYOUT edits the HUD canvas, overlays, option/pause/game-over panels and card grids per screen mode. The live preview shows the bucket you are editing; EXPORT gives media-wrapped CSS for the page." },
      { topic: "Texts", text: "arena.html uses the shared kit (i18n.js): TEXTS edits the kit table for this page's keys and re-translates immediately." }
    ]
  });
})();
