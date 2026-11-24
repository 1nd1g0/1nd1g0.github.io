/* dbg/oilstorm.js — developer harness for oilstorm.html (vector arena)
 *
 * Load with:  oilstorm.html?debug=dbg/oilstorm.js
 * oilstorm.html declares its whole engine at script top level with `var` and
 * `function`, so G, CFG, META, DIFF/DIFFS, CAM, AR, F, PT, DC, TX, FX, A, EN,
 * BU, PK, POWERS, PERKS, FRAMES, EDEF, MUTS, CHARS, QUESTS, UI, W/H/TILE/FC and
 * every control function are ordinary window properties. Nothing in
 * oilstorm.html was modified.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 1000)) / (r || 1000) : 0 }
  function iv(v, lo, hi) { return isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null }
  function ensureRun() {
    if (typeof G !== "undefined" && G.players && G.players.length) return;
    var b = document.getElementById("btnLaunch");
    if (b) b.click();
  }
  function P() { return G.players && G.players[0] }
  function aliveEnemies() { var n = 0; for (var i = 0; i < EN.length; i++) if (EN[i] && EN[i].alive) n++; return n }
  function bossRef() { return G.bossRef || null }
  function fieldCells(t) { var n = 0; for (var i = 0; i < F.type.length; i++) if (F.type[i] === t) n++; return n }
  function fxOn() { var n = 0; for (var i = 0; i < FX.length; i++) if (FX[i].on) n++; return n }
  function perkCount(p) { if (!p || !p.perks) return 0; var n = 0; for (var k in p.perks) n += p.perks[k]; return n }
  function wpnName(p) { return p && p.wpn ? (p.wpn.evolved || (p.wpn.e && p.wpn.e.name) || p.wpn.frame || "?") + " Lv" + (p.wpn.lv || 1) : null }
  function opt(key) { return CFG[key] }
  function setOpt(key, v) { CFG[key] = v; if (key === "res") resize(); if (key === "music" || key === "sfx") A.applyVol(); if (key === "decals") DC.n = Math.min(DC.n, CFG.decals); UI.dirtyMeta = true }

  TLDBG.register({
    game: "oilstorm", file: "oilstorm.html",

    state: function () {
      var p = P();
      return {
        state: G.state, attract: !!G.attract, mode: G.mode, stage: G.stage, biome: G.biome,
        wave: G.wave, waveState: G.waveState, interT: num(G.interT), budget: num(G.budget),
        budgetTotal: num(G.budgetTotal), costDone: num(G.costDone), spawnT: num(G.spawnT),
        eventT: num(G.eventT), lastEvent: G.lastEvent, freezeT: num(G.freezeT), flash: num(G.flash),
        time: num(G.time), ts: num(G.ts), runSeed: G.runSeed,
        score: G.score, kills: G.kills, gems: G.gems, shots: G.shots, hits: G.hits,
        damage: num(G.dmg), maxCombo: G.maxCombo, dpsEMA: num(G.dpsEMA),
        coop: G.coop, difficulty: DIFF.name, diffIndex: CFG.diff,
        players: (G.players || []).map(function (q) {
          return { id: q.id, char: q.char, alive: !!q.alive, downed: !!q.downed, hp: num(q.hp), maxhp: num(q.maxhp),
            level: q.level, xp: num(q.xp), xpNext: q.xpNext, perks: perkCount(q), weapon: wpnName(q),
            pos: num(q.x) + "," + num(q.y), speed: num(q.spd), dashCd: num(q.dashCd), iT: num(q.iT),
            combo: q.combo, kills: q.kills, human: !!q.human };
        }),
        enemiesAlive: aliveEnemies(), enemyPool: EN.length, enemyFreeList: ENfree.length,
        boss: bossRef() ? { name: bossRef().name || "WARDEN", hp: num(bossRef().hp), maxhp: num(bossRef().maxhp), mut: bossRef().mut || 0 } : null,
        bullets: BU.length, pickups: PK.length, particles: PT.n, decals: DC.n, fxActive: fxOn(),
        freeTexts: TX.filter(function (t) { return t.on }).length,
        spawnQueue: (G.spawnQueue || []).length, blastQueue: (G.blastQueue || []).length,
        meteors: (G.meteors || []).length, fogs: (G.fogs || []).length, drafts: (G.draftQueue || []).length,
        mutators: (G.muts || []).slice(),
        arena: { pillars: AR.pillars.length, barrels: AR.barrels.length, crates: AR.crates.length, mud: AR.mud.length, vents: AR.vents.length, dynWalls: AR.dynWalls.length },
        oilCells: fieldCells(1), fuelCells: fieldCells(2), fireCells: fieldCells(3),
        world: { W: W, H: H, tile: TILE, fieldCell: FC, cols: FXW, rows: FYH, step: num(STEP) },
        camera: { x: num(CAM.x), y: num(CAM.y), zoom: num(CAM.z), targetZoom: num(CAM.tz), trauma: num(CAM.trauma) },
        wind: { x: G.wind.x, y: G.wind.y, angle: num(G.wind.a) },
        render: { gl: !!R.gl, width: R.w, height: R.h, scale: num(R.k), lost: !!R.lost, batches: R.batches ? R.batches.length : 0 },
        options: { res: CFG.res, part: CFG.part, decals: CFG.decals, shake: CFG.shake, music: CFG.music, sfx: CFG.sfx,
          glow: !!CFG.glow, smoke: !!CFG.smoke, nums: !!CFG.nums, autofire: !!CFG.autofire, qual: CFG.qual, muted: !!CFG.muted },
        autoQuality: { scale: num(G.autoScale), part: num(G.autoPart), fps: UI.fps },
        audio: { on: !!A.on, ctx: A.ctx ? A.ctx.state : "none" },
        best: META.best || null, touchUsed: !!G.touchUsed, subtitle: UI.sub || null
      };
    },

    params: [
      { id: "timescale", label: "Time scale", unit: "x", min: 0, max: 3, step: 0.05,
        get: function () { return G.ts }, set: function (v) { if (isFinite(v)) G.ts = Math.max(0, v) },
        code: { file: "oilstorm.html", line: 714, name: "G.ts" },
        doc: "Simulation speed: frame() accumulates dt*G.ts into the fixed 1/60 s update() steps. 0 freezes the whole sim (camera, particles, enemies) while rendering continues; 2.2 is fast-forward." },
      { id: "difficulty", label: "Difficulty index", unit: "0-2", min: 0, max: 2, step: 1,
        get: function () { return CFG.diff }, set: function (v) { var n = iv(v, 0, 2); if (n === null) return; CFG.diff = n; DIFF = DIFFS[n]; UI.dirtyMeta = true },
        code: { file: "oilstorm.html", line: 1752, name: "DIFF = DIFFS[CFG.diff]" },
        doc: "RECRUIT / VETERAN / NIGHTMARE enemy HP, damage and spawn budget multiplier. Applied on startRun; setting it here takes effect immediately for new spawns." },
      { id: "coop", label: "Co-op players", unit: "players", min: 0, max: 2, step: 1,
        get: function () { return CFG.coop }, set: function (v) { var n = iv(v, 0, 2); if (n === null) return; CFG.coop = n; UI.dirtyMeta = true },
        code: { file: "oilstorm.html", line: 703, name: "CFG.coop" },
        doc: "Second seat (CPU partner) on the next run; G.coop is read at startRun." },
      { id: "resolution", label: "Render resolution", unit: "%", min: 25, max: 100, step: 5,
        get: function () { return CFG.res }, set: function (v) { var n = iv(v, 25, 100); if (n !== null) setOpt("res", n) },
        code: { file: "oilstorm.html", line: 702, name: "CFG.res" },
        doc: "Options slider (#oRes, default 100). Setter calls resize() like the slider does." },
      { id: "particles", label: "Particle density", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return CFG.part }, set: function (v) { var n = iv(v, 0, 100); if (n !== null) setOpt("part", n) },
        code: { file: "oilstorm.html", line: 702, name: "CFG.part" },
        doc: "Chance a particle is emitted (793: G.crng() > CFG.part/100 * G.autoPart skips it)." },
      { id: "decals", label: "Decal capacity", unit: "decals", min: 0, max: 2000, step: 50,
        get: function () { return CFG.decals }, set: function (v) { var n = iv(v, 0, 2000); if (n !== null) setOpt("decals", n) },
        code: { file: "oilstorm.html", line: 702, name: "CFG.decals" },
        doc: "Persistent floor stains (default 700). Lowering clamps DC.n immediately." },
      { id: "shake", label: "Screen shake", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return CFG.shake }, set: function (v) { var n = iv(v, 0, 100); if (n !== null) setOpt("shake", n) },
        code: { file: "oilstorm.html", line: 702, name: "CFG.shake" },
        doc: "Camera trauma scaling in updateCamera (default 100)." },
      { id: "music", label: "Music volume", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return CFG.music }, set: function (v) { var n = iv(v, 0, 100); if (n !== null) setOpt("music", n) },
        code: { file: "oilstorm.html", line: 702, name: "CFG.music" },
        doc: "A.applyVol maps it to the music gain (music/100*.5)." },
      { id: "sfx", label: "Sound-effect volume", unit: "%", min: 0, max: 100, step: 5,
        get: function () { return CFG.sfx }, set: function (v) { var n = iv(v, 0, 100); if (n !== null) setOpt("sfx", n) },
        code: { file: "oilstorm.html", line: 702, name: "CFG.sfx" },
        doc: "A.applyVol maps it to the SFX bus gain." },
      { id: "playerSpeed", label: "Player speed", unit: "px/s", min: 40, max: 400, step: 5,
        get: function () { var p = P(); return p ? p.spd : 0 }, set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; (G.players || []).forEach(function (q) { q.spd = n }) },
        code: { file: "oilstorm.html", line: 1500, name: "player.spd" },
        doc: "Base walk speed from CHARS[char].spd; the stats multiplier (spdMult) is applied on top in updatePlayers." },
      { id: "playerMaxHp", label: "Player max HP", unit: "hp", min: 10, max: 500, step: 5,
        get: function () { var p = P(); return p ? p.maxhp : 0 }, set: function (v) { var n = iv(v, 1, 1e9); if (n === null) return; (G.players || []).forEach(function (q) { q.maxhp = n; if (q.hp > n) q.hp = n }) },
        code: { file: "oilstorm.html", line: 1500, name: "player.maxhp" },
        doc: "healPlayer clamps to this; hurtPlayer downs the player at 0." },
      { id: "damageMult", label: "Damage multiplier", unit: "x", min: 0.1, max: 8, step: 0.1,
        get: function () { var p = P(); return p && p.stats ? p.stats.dmgMult : 1 },
        set: function (v) { if (!isFinite(v)) return; (G.players || []).forEach(function (q) { if (q.stats) q.stats.dmgMult = Math.max(0.05, v) }) },
        code: { file: "oilstorm.html", line: 1461, name: "stats.dmgMult" },
        doc: "Applied in fireWeapon to every projectile. recalcStats() rebuilds it from character + perks, so a level-up or perk pick overwrites this." },
      { id: "rateMult", label: "Fire rate multiplier", unit: "x", min: 0.2, max: 6, step: 0.1,
        get: function () { var p = P(); return p && p.stats ? p.stats.rateMult : 1 },
        set: function (v) { if (!isFinite(v)) return; (G.players || []).forEach(function (q) { if (q.stats) q.stats.rateMult = Math.max(0.05, v) }) },
        code: { file: "oilstorm.html", line: 1461, name: "stats.rateMult" },
        doc: "Cooldown divisor in fireWeapon; perks like rapid fire also raise it." },
      { id: "dashCooldown", label: "Dash cooldown", unit: "s", min: 0.2, max: 6, step: 0.1,
        get: function () { var p = P(); return p && p.stats ? p.stats.dashCd : 2.6 },
        set: function (v) { if (!isFinite(v)) return; (G.players || []).forEach(function (q) { if (q.stats) q.stats.dashCd = Math.max(0.05, v) }) },
        code: { file: "oilstorm.html", line: 1461, name: "stats.dashCd" },
        doc: "Seconds between dashes (CHARS default, perk-modified)." },
      { id: "magnetRange", label: "Gem magnet radius", unit: "px", min: 0, max: 400, step: 10,
        get: function () { var p = P(); return p && p.stats ? p.stats.magnet : 95 },
        set: function (v) { var n = iv(v, 0, 1e9); if (n === null) return; (G.players || []).forEach(function (q) { if (q.stats) q.stats.magnet = n }) },
        code: { file: "oilstorm.html", line: 1461, name: "stats.magnet" },
        doc: "updatePickups pulls gems within this radius toward the player (default 95)." },
      { id: "armor", label: "Armor", unit: "reduction", min: 0, max: 1, step: 0.05,
        get: function () { var p = P(); return p && p.stats ? p.stats.armor : 0 },
        set: function (v) { if (!isFinite(v)) return; (G.players || []).forEach(function (q) { if (q.stats) q.stats.armor = Math.max(0, Math.min(1, v)) }) },
        code: { file: "oilstorm.html", line: 1461, name: "stats.armor" },
        doc: "Fraction of incoming damage ignored in hurtPlayer." },
      { id: "waveGap", label: "Inter-wave delay", unit: "s", min: 0, max: 20, step: 0.5,
        get: function () { return G.interT }, set: function (v) { if (isFinite(v)) G.interT = Math.max(0, v) },
        code: { file: "oilstorm.html", line: 714, name: "G.interT" },
        doc: "Countdown between waves in the director; 0 starts the next wave immediately after the current one clears." },
      { id: "eventGap", label: "Event timer", unit: "s", min: 0, max: 120, step: 5,
        get: function () { return G.eventT }, set: function (v) { if (isFinite(v)) G.eventT = Math.max(0, v) },
        code: { file: "oilstorm.html", line: 714, name: "G.eventT" },
        doc: "directorTick fires triggerEvent() when this reaches 0 (meteors, supply drops, fogs)." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze simulation", toggle: true,
        doc: "G.ts=0 while on — update() stops accumulating, so enemies, bullets, particles, oil spread, camera and timers all hold; rendering keeps drawing the frozen frame. Off restores 1.",
        on: function (v) { if (v) { if (window.__tllTs === undefined) window.__tllTs = G.ts; G.ts = 0 } else { G.ts = window.__tllTs !== undefined ? window.__tllTs : 1; delete window.__tllTs } } },
      { id: "slowMotion", label: "Slow motion", toggle: true,
        doc: "G.ts=0.35 — the fixed-step sim simply runs fewer steps per frame.",
        on: function (v) { if (v) { if (window.__tllTs === undefined) window.__tllTs = G.ts; G.ts = 0.35 } else { G.ts = window.__tllTs !== undefined ? window.__tllTs : 1; delete window.__tllTs } } },
      { id: "fastForward", label: "Fast forward", toggle: true,
        doc: "G.ts=2.2; frame() caps at 4 fixed steps per frame, so very high values clamp rather than run unbounded.",
        on: function (v) { if (v) { if (window.__tllTs === undefined) window.__tllTs = G.ts; G.ts = 2.2 } else { G.ts = window.__tllTs !== undefined ? window.__tllTs : 1; delete window.__tllTs } } },
      { id: "pause", label: "Game pause", toggle: true,
        doc: "pauseGame()/resumeGame() — swaps body class to st-pause and opens the pause screen.",
        on: function (v) { if (v) { if (G.state === "play") pauseGame() } else if (G.state === "pause") resumeGame() } },
      { id: "startSurvival", label: "Run: survival", toggle: true,
        doc: "startRun('survival',0); off returns to the title (toTitle()).",
        on: function (v) { if (v) startRun("survival", 0); else toTitle() } },
      { id: "startQuest", label: "Run: quest stage 0", toggle: true,
        doc: "startRun('quest',0) — seeded quest configuration from QUESTS[stage].",
        on: function (v) { if (v) startRun("quest", 0); else toTitle() } },
      { id: "startDaily", label: "Run: daily", toggle: true,
        doc: "startRun('daily',0) — date-seeded arena with the day's mutators.",
        on: function (v) { if (v) startRun("daily", 0); else toTitle() } },
      { id: "nextWave", label: "Force next wave",
        doc: "startWave(G.wave+1): resets the wave state and refills the spawn budget.",
        run: function () { startWave(G.wave + 1); TLDBG.toast("wave " + G.wave) } },
      { id: "endWave", label: "End current wave",
        doc: "Clears live enemies and the spawn queue so the director rolls the inter-wave timer.",
        run: function () {
          for (var i = EN.length - 1; i >= 0; i--) if (EN[i] && EN[i].alive) killEnemy(EN[i], P());
          G.spawnQueue.length = 0; G.waveState = "inter"; G.interT = 2; TLDBG.toast("wave ended")
        } },
      { id: "spawnDrone", label: "Spawn DRONE pack", doc: "queueSpawn(0,...) six drones around the player.",
        run: function () { spawnN(0, 6); TLDBG.toast("alive " + aliveEnemies()) } },
      { id: "spawnStinger", label: "Spawn STINGER pack", doc: "queueSpawn(1,...) six stingers.",
        run: function () { spawnN(1, 6); TLDBG.toast("alive " + aliveEnemies()) } },
      { id: "spawnBlade", label: "Spawn BLADE pack", doc: "queueSpawn(2,...) four blades.",
        run: function () { spawnN(2, 4); TLDBG.toast("alive " + aliveEnemies()) } },
      { id: "spawnSpitter", label: "Spawn SPITTER pack", doc: "queueSpawn(3,...) four spitters.",
        run: function () { spawnN(3, 4); TLDBG.toast("alive " + aliveEnemies()) } },
      { id: "spawnBomber", label: "Spawn BOMBER pack", doc: "queueSpawn(4,...) four bombers.",
        run: function () { spawnN(4, 4); TLDBG.toast("alive " + aliveEnemies()) } },
      { id: "spawnBrute", label: "Spawn BRUTE", doc: "queueSpawn(5,...) one brute (12 budget points).",
        run: function () { spawnN(5, 1); TLDBG.toast("alive " + aliveEnemies()) } },
      { id: "spawnBoss", label: "Spawn WARDEN boss", doc: "queueSpawn(6,...) one boss (60 budget points).",
        run: function () { spawnN(6, 1); TLDBG.toast("alive " + aliveEnemies()) } },
      { id: "killAll", label: "Kill all enemies",
        doc: "hurtEnemy(e, 1e6) on every live enemy — same scoring path as a real hit.",
        run: function () {
          var p = P();
          for (var i = EN.length - 1; i >= 0; i--) if (EN[i] && EN[i].alive) hurtEnemy(EN[i], 1e6, p, { silent: true });
          TLDBG.toast("kills " + G.kills)
        } },
      { id: "nuke", label: "Power: NUKE", doc: "applyPower(0,player) — screen flash, 90 damage to every enemy, smoke and decals.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); applyPower(0, p); TLDBG.toast("nuke") } },
      { id: "powerFreeze", label: "Power: FREEZE", doc: "applyPower(1,player) — G.freezeT=5, hostiles locked for 5 s, #frzTint overlay on.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); applyPower(1, p); TLDBG.toast("freeze " + num(G.freezeT) + "s") } },
      { id: "powerDoubleXp", label: "Power: DOUBLE XP", doc: "applyPower(2,player) — 10 s double experience.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); applyPower(2, p); TLDBG.toast("dblT " + num(p.dblT)) } },
      { id: "powerFireBullets", label: "Power: FIRE BULLETS", doc: "applyPower(3,player) — 12 s incendiary rounds.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); applyPower(3, p); TLDBG.toast("fireT " + num(p.fireT)) } },
      { id: "powerShield", label: "Power: SHIELD", doc: "applyPower(4,player) — temporary shield.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); applyPower(4, p); TLDBG.toast("shieldT " + num(p.shieldT)) } },
      { id: "powerMedkit", label: "Power: MEDKIT", doc: "applyPower(5,player) — heal.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); applyPower(5, p); TLDBG.toast("hp " + num(p.hp)) } },
      { id: "heal", label: "Heal players", doc: "healPlayer(p, maxhp) on every seat.",
        run: function () { (G.players || []).forEach(function (q) { healPlayer(q, q.maxhp) }); TLDBG.toast("hp " + (P() ? num(P().hp) : 0)) } },
      { id: "hurt", label: "Damage player (10)", doc: "hurtPlayer(p,10) — respects i-frames and dash invulnerability.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); hurtPlayer(p, 10); TLDBG.toast("hp " + num(p.hp)) } },
      { id: "godMode", label: "Invulnerable (i-frames)", toggle: true,
        doc: "Sets p.iT high while on (hurtPlayer returns early); off restores 0.",
        on: function (v) { (G.players || []).forEach(function (q) { if (v) { if (q.__tllIt === undefined) q.__tllIt = q.iT; q.iT = 1e6 } else { q.iT = q.__tllIt !== undefined ? q.__tllIt : 0; delete q.__tllIt } }) } },
      { id: "dash", label: "Dash", doc: "Sets p.dashReq so updatePlayers performs the dash (respects dashCd).",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); p.dashReq = true; TLDBG.toast("dashCd " + num(p.dashCd)) } },
      { id: "blast", label: "Explosion at player",
        doc: "doBlast({x,y,r:220}) — same blast path bullets use: damage, knockback, fire spread, decals.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); doBlast({ x: p.x, y: p.y, r: 220 }); TLDBG.toast("blast") } },
      { id: "spawnGem", label: "Drop gem", doc: "spawnPickup('gem',x,y,1) next to the player.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); spawnPickup("gem", p.x + 40, p.y, 1); TLDBG.toast("pickups " + PK.length) } },
      { id: "spawnMed", label: "Drop medkit pickup", doc: "spawnPickup('med',x,y).",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); spawnPickup("med", p.x + 40, p.y); TLDBG.toast("pickups " + PK.length) } },
      { id: "spawnCell", label: "Drop mech cell", doc: "spawnPickup('cell',x,y) — three cells bring the mech online.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); spawnPickup("cell", p.x + 40, p.y); TLDBG.toast("cells " + p.mechCells) } },
      { id: "spawnCrate", label: "Drop weapon crate", doc: "spawnPickup('crate',x,y,genWeapon(level)) — upgrades or replaces the weapon.",
        run: function () {
          var p = P(); if (!p) return TLDBG.toast("no player");
          spawnPickup("crate", p.x + 40, p.y, 1, genWeapon(Math.min(4, (p.wpn ? p.wpn.lv : 1) + 1), p.char));
          TLDBG.toast("crate dropped")
        } },
      { id: "levelUp", label: "Add XP (level up)", doc: "addXP(player, xpNext) — opens the perk draft when it crosses a level.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); addXP(p, p.xpNext); TLDBG.toast("level " + p.level) } },
      { id: "rollPerks", label: "Roll 3 perks", doc: "rollPerks(player): the draft card list used by openDraft().",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); var r = rollPerks(p); TLDBG.toast("rolled " + (r && r.length ? r.length : 0)) } },
      { id: "upgradeWeapon", label: "Weapon level +1", doc: "Raises p.wpn.lv (max 3) and recalculates with calcWeapon().",
        run: function () { var p = P(); if (!p || !p.wpn) return TLDBG.toast("no weapon"); p.wpn.lv = Math.min(3, (p.wpn.lv || 1) + 1); calcWeapon(p.wpn); TLDBG.toast(wpnName(p)) } },
      { id: "spreadOil", label: "Spread oil under player", doc: "Writes type-1 oil cells into the field grid around the player; the fire sim will catch them if a flame cell is nearby.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); paintField(p.x, p.y, 200, 1); TLDBG.toast("oil cells " + fieldCells(1)) } },
      { id: "spreadFuel", label: "Spread fuel under player", doc: "Type-2 fuel cells (burn faster and hotter).",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); paintField(p.x, p.y, 200, 2); TLDBG.toast("fuel cells " + fieldCells(2)) } },
      { id: "ignite", label: "Ignite field (fire cells)", doc: "Writes type-3 fire cells over the same radius, bypassing the ignition check.",
        run: function () { var p = P(); if (!p) return TLDBG.toast("no player"); paintField(p.x, p.y, 200, 3); TLDBG.toast("fire cells " + fieldCells(3)) } },
      { id: "clearField", label: "Clear oil/fuel/fire", doc: "Zeroes F.type and F.amt across the whole field grid.",
        run: function () { F.type.fill(0); F.amt.fill(0); TLDBG.toast("field cleared") } },
      { id: "mute", label: "Mute (M)", toggle: true,
        doc: "toggleMute(): CFG.muted plus A.applyVol().",
        on: function (v) { if (!!CFG.muted !== !!v) toggleMute() } },
      { id: "autofire", label: "Auto-fire", toggle: true,
        doc: "CFG.autofire — aim assist holds the trigger.",
        on: function (v) { CFG.autofire = !!v; UI.dirtyMeta = true; refreshOptions() } },
      { id: "glow", label: "Glow pass", toggle: true,
        doc: "CFG.glow — additive glow batch.",
        on: function (v) { CFG.glow = !!v; UI.dirtyMeta = true; refreshOptions() } },
      { id: "smoke", label: "Smoke particles", toggle: true,
        doc: "CFG.smoke — smoke emission is skipped when off (line 793).",
        on: function (v) { CFG.smoke = !!v; UI.dirtyMeta = true; refreshOptions() } },
      { id: "numbers", label: "Damage numbers", toggle: true,
        doc: "CFG.nums — addText() returns early when off.",
        on: function (v) { CFG.nums = !!v; UI.dirtyMeta = true; refreshOptions() } },
      { id: "qualityLow", label: "Quality: low", toggle: true,
        doc: "applyPreset('low') — the options preset (resolution, particles, decals, glow).",
        on: function (v) { if (v) applyPreset("low"); else applyPreset("high") } },
      { id: "reseed", label: "Re-seed arena text", doc: "CFG.seed = a random seed; applied on the next startRun().",
        run: function () { CFG.seed = "OIL-" + Math.floor(Math.random() * 1e6); UI.dirtyMeta = true; TLDBG.toast(CFG.seed) } },
      { id: "gameOver", label: "End the run now", doc: "gameOver(): stats screen, best-score record update.",
        run: function () { gameOver(); TLDBG.toast("over, score " + G.score) } }
    ],

    hooks: [
      { label: "Console: players", doc: "Every seat with hp, level, perks map, weapon object, stats and timers.",
        run: function () {
          console.log((G.players || []).map(function (q) {
            return { id: q.id, char: q.char, human: q.human, alive: q.alive, downed: q.downed,
              hp: num(q.hp), maxhp: num(q.maxhp), level: q.level, xp: num(q.xp), xpNext: q.xpNext,
              perks: q.perks, weapon: q.wpn, stats: q.stats,
              timers: { dashCd: num(q.dashCd), iT: num(q.iT), adrenT: num(q.adrenT), burnT: num(q.burnT), fireT: num(q.fireT), dblT: num(q.dblT), shieldT: num(q.shieldT), mechT: num(q.mechT) },
              combo: q.combo, kills: q.kills };
          }));
        } },
      { label: "Console: enemies", doc: "Live enemies with type name, hp, position, mutation, state and target.",
        run: function () {
          console.log(EN.filter(function (e) { return e && e.alive }).map(function (e) {
            return { name: (EDEF[e.type] || {}).name, type: e.type, boss: !!e.boss, hp: num(e.hp), maxhp: num(e.maxhp),
              pos: num(e.x) + "," + num(e.y), spd: num(e.spd), state: e.state, mut: e.mut, slow: num(e.slow),
              shield: num(e.shield), burn: num(e.burn), acid: num(e.acid), flash: num(e.flash),
              target: e.target ? (e.target.id !== undefined ? "player" + e.target.id : "enemy") : null };
          }));
        } },
      { label: "Console: director", doc: "Wave state, budget, spawn queue, event timer, mutators and meteor/fog/supply lists.",
        run: function () {
          console.log({ wave: G.wave, waveState: G.waveState, interT: num(G.interT), budget: num(G.budget),
            budgetTotal: num(G.budgetTotal), costDone: num(G.costDone), spawnT: num(G.spawnT), eventT: num(G.eventT),
            lastEvent: G.lastEvent, spawnQueue: (G.spawnQueue || []).slice(0, 12), meteors: (G.meteors || []).length,
            fogs: (G.fogs || []).length, supply: G.supply, muts: (G.muts || []).slice(),
            dpsEMA: num(G.dpsEMA), dirMult: num(G.dirMult), autoScale: num(G.autoScale) });
        } },
      { label: "Console: field and arena", doc: "Oil/fuel/fire cell counts, arena obstacle counts and camera.",
        run: function () {
          console.log({ oil: fieldCells(1), fuel: fieldCells(2), fire: fieldCells(3),
            arena: { pillars: AR.pillars.length, barrels: AR.barrels.length, crates: AR.crates.length, mud: AR.mud.length, vents: AR.vents.length, dynWalls: AR.dynWalls.length },
            camera: { x: num(CAM.x), y: num(CAM.y), z: num(CAM.z), tz: num(CAM.tz), trauma: num(CAM.trauma) },
            view: { x0: num(VIEW.x0), y0: num(VIEW.y0), x1: num(VIEW.x1), y1: num(VIEW.y1) } });
        } },
      { label: "Console: effect pools", doc: "Particle count and capacity, decal count, active FX and text popups.",
        run: function () {
          console.log({ particles: { n: PT.n, cap: PT.x.length }, decals: { n: DC.n, cap: DC.x && DC.x.length },
            fxActive: fxOn(), fxCap: FX.length, textsOn: TX.filter(function (t) { return t.on }).length,
            bullets: BU.length, pickups: PK.length, freeLists: { enemies: ENfree.length, bullets: BUfree.length, pickups: PKfree.length } });
        } },
      { label: "Console: config and meta", doc: "CFG, DEF_OPTS defaults, difficulty table, character roster and stored meta.",
        run: function () {
          console.log({ cfg: JSON.parse(JSON.stringify(CFG)), defaults: JSON.parse(JSON.stringify(DEF_OPTS)),
            difficulty: { current: DIFF.name, table: DIFFS.map(function (d) { return d.name }) },
            chars: CHARS.map(function (c) { return c.name || c }), powers: POWERS.map(function (p) { return p.n }),
            enemyDefs: EDEF.map(function (e) { return { name: e.name, hp: e.hp, spd: e.spd, dmg: e.dmg, cost: e.cost } }),
            muts: MUTS.map(function (m) { return m.n }), meta: JSON.parse(JSON.stringify(META)) });
        } }
    ],

    layout: [
      { sel: "#cv", label: "WebGL canvas" },
      { sel: "#fx", label: "2D overlay canvas" },
      { sel: "#screens", label: "Screen container" },
      { sel: "#scrTitle", label: "Title screen" },
      { sel: "#scrOptions", label: "Options screen" },
      { sel: "#scrManual", label: "Manual screen" },
      { sel: "#scrQuest", label: "Quest screen" },
      { sel: "#scrDaily", label: "Daily screen" },
      { sel: "#scrPause", label: "Pause screen" },
      { sel: "#scrOver", label: "Game-over screen" },
      { sel: "#scrClear", label: "Stage-clear screen" },
      { sel: "#scrDraft", label: "Perk draft screen" },
      { sel: "#scrBranch", label: "Branch choice screen" },
      { sel: "#setupPanel", label: "Setup panel" },
      { sel: "#titleGrid", label: "Title mode grid" },
      { sel: "#charRow", label: "Character row" },
      { sel: "#coopSeg", label: "Co-op segment control" },
      { sel: "#diffSeg", label: "Difficulty segment control" },
      { sel: "#seedInp", label: "Seed input" },
      { sel: "#btnDice", label: "Random seed button" },
      { sel: "#btnLaunch", label: "Launch button" },
      { sel: "#mSurvival", label: "Survival mode card" },
      { sel: "#mQuest", label: "Quest mode card" },
      { sel: "#mDaily", label: "Daily mode card" },
      { sel: "#btnOptions", label: "Options button" },
      { sel: "#btnManual", label: "Manual button" },
      { sel: "#btnHome", label: "Home link" },
      { sel: "#btnMute", label: "Mute button" },
      { sel: "#icoSnd", label: "Sound icon" },
      { sel: "#sndSlash", label: "Sound slash" },
      { sel: "#sndWaves", label: "Sound waves" },
      { sel: "#titleFoot", label: "Title footer" },
      { sel: "#logo", label: "Logo" },
      { sel: "#tagline", label: "Tagline" },
      { sel: "#tagSub", label: "Subtitle" },
      { sel: "#bestLine", label: "Best score line" },
      { sel: "#dailyBoard", label: "Daily leaderboard" },
      { sel: "#dailyMuts", label: "Daily mutator list" },
      { sel: "#dailySeedLbl", label: "Daily seed label" },
      { sel: "#btnDailyLaunch", label: "Daily launch button" },
      { sel: "#questGrid", label: "Quest grid" },
      { sel: "#topbar", label: "Top bar" },
      { sel: "#tb-left", label: "Top bar left" },
      { sel: "#tb-mid", label: "Top bar middle" },
      { sel: "#tb-right", label: "Top bar right" },
      { sel: "#scoreLbl", label: "Score label" },
      { sel: "#timeLbl", label: "Time label" },
      { sel: "#comboLbl", label: "Combo label" },
      { sel: "#waveLbl", label: "Wave label" },
      { sel: "#waveBarWrap", label: "Wave bar wrapper" },
      { sel: "#waveBar", label: "Wave bar" },
      { sel: "#windWrap", label: "Wind indicator" },
      { sel: "#windArrow", label: "Wind arrow" },
      { sel: "#bossWrap", label: "Boss bar wrapper" },
      { sel: "#bossBar", label: "Boss bar" },
      { sel: "#bossName", label: "Boss name" },
      { sel: "#phud0", label: "Player 1 HUD" },
      { sel: "#phud1", label: "Player 2 HUD" },
      { sel: "#dmgFlash", label: "Damage flash" },
      { sel: "#frzTint", label: "Freeze tint" },
      { sel: "#banner", label: "Banner" },
      { sel: "#bannerTxt", label: "Banner title" },
      { sel: "#bannerSub", label: "Banner subtitle" },
      { sel: "#toasts", label: "Toast container" },
      { sel: "#perfBadge", label: "Performance badge" },
      { sel: "#rendBadge", label: "Renderer badge" },
      { sel: "#draftTitle", label: "Draft title" },
      { sel: "#draftWho", label: "Draft player label" },
      { sel: "#draftWho2", label: "Draft player 2 label" },
      { sel: "#draftCards", label: "Draft cards" },
      { sel: "#draftBuild", label: "Draft build line" },
      { sel: "#branchTitle", label: "Branch title" },
      { sel: "#branchCards", label: "Branch cards" },
      { sel: "#ovTitle", label: "Game-over title" },
      { sel: "#ovScore", label: "Game-over score" },
      { sel: "#ovFlavor", label: "Game-over flavour" },
      { sel: "#ovStats", label: "Game-over stats" },
      { sel: "#ovBest", label: "Game-over best line" },
      { sel: "#ovRetry", label: "Retry button" },
      { sel: "#ovNew", label: "New run button" },
      { sel: "#ovHome", label: "Game-over home" },
      { sel: "#ovName", label: "Name input" },
      { sel: "#ovNameRow", label: "Name row" },
      { sel: "#ovSave", label: "Save name button" },
      { sel: "#clStats", label: "Stage-clear stats" },
      { sel: "#clNext", label: "Stage-clear next" },
      { sel: "#clRetry", label: "Stage-clear retry" },
      { sel: "#clHome", label: "Stage-clear home" },
      { sel: "#clUnlock", label: "Unlock line" },
      { sel: "#clMedal", label: "Medal line" },
      { sel: "#clTitle", label: "Stage-clear title" },
      { sel: "#mcBestS", label: "Best survival chip" },
      { sel: "#mcBestQ", label: "Best quest chip" },
      { sel: "#mcBestD", label: "Best daily chip" },
      { sel: "#pzResume", label: "Pause: resume" },
      { sel: "#pzStats", label: "Pause: stats" },
      { sel: "#pzPerks", label: "Pause: perks" },
      { sel: "#pzRecipes", label: "Pause: recipes" },
      { sel: "#pzOptions", label: "Pause: options" },
      { sel: "#pzQuit", label: "Pause: quit" },
      { sel: "#pzManual", label: "Pause: manual" },
      { sel: "#btnPause", label: "Pause button" },
      { sel: "#btnPauseB", label: "Pause button (alt)" },
      { sel: "#optBack", label: "Options back" },
      { sel: "#manBack", label: "Manual back" },
      { sel: "#qBack", label: "Quest back" },
      { sel: "#dBack", label: "Daily back" },
      { sel: "#oRes", label: "Resolution slider" },
      { sel: "#oResV", label: "Resolution value" },
      { sel: "#oPart", label: "Particle slider" },
      { sel: "#oPartV", label: "Particle value" },
      { sel: "#oDecals", label: "Decal slider" },
      { sel: "#oDecalsV", label: "Decal value" },
      { sel: "#oShake", label: "Shake slider" },
      { sel: "#oShakeV", label: "Shake value" },
      { sel: "#oMusic", label: "Music slider" },
      { sel: "#oMusicV", label: "Music value" },
      { sel: "#oSfx", label: "SFX slider" },
      { sel: "#oSfxV", label: "SFX value" },
      { sel: "#oQual", label: "Quality preset select" },
      { sel: "#qualNote", label: "Quality note" },
      { sel: "#oGlow", label: "Glow toggle" },
      { sel: "#oSmoke", label: "Smoke toggle" },
      { sel: "#oNums", label: "Numbers toggle" },
      { sel: "#oAutoFire", label: "Auto-fire toggle" },
      { sel: "#oAssist", label: "Assist toggle" },
      { sel: ".screen", label: "Screens" },
      { sel: ".panel", label: "Panels" },
      { sel: ".mpanel", label: "Mode panels" },
      { sel: ".modecard", label: "Mode cards" },
      { sel: ".charcard", label: "Character cards" },
      { sel: ".optgrid", label: "Options grid" },
      { sel: ".optrow", label: "Option rows" },
      { sel: ".tgl", label: "Toggle buttons" },
      { sel: ".sw", label: "Switches" },
      { sel: ".btn", label: "Buttons" },
      { sel: ".btnrow", label: "Button rows" },
      { sel: ".icobtn", label: "Icon buttons" },
      { sel: ".seg", label: "Segment controls" },
      { sel: ".fld", label: "Field rows" },
      { sel: ".setuprow", label: "Setup rows" },
      { sel: ".stat", label: "Stat blocks" },
      { sel: ".statline", label: "Stat lines" },
      { sel: ".bar", label: "Bars" },
      { sel: ".hp", label: "HP bars" },
      { sel: ".ammo", label: "Ammo bars" },
      { sel: ".xp", label: "XP bars" },
      { sel: ".buff", label: "Buff chips" },
      { sel: ".phud", label: "Player HUD blocks" },
      { sel: ".ph-row", label: "HUD rows" },
      { sel: ".ph-head", label: "HUD headers" },
      { sel: ".ph-wpn", label: "HUD weapon line" },
      { sel: ".ph-cells", label: "HUD mech cells" },
      { sel: ".ph-buffs", label: "HUD buffs" },
      { sel: ".ph-tag", label: "HUD tags" },
      { sel: ".ph-mini", label: "HUD mini line" },
      { sel: ".ph-k", label: "HUD keys" },
      { sel: ".k", label: "Key legends" },
      { sel: ".key", label: "Key rows" },
      { sel: ".recipe", label: "Recipe cards" },
      { sel: ".reward", label: "Reward lines" },
      { sel: ".trait", label: "Trait lines" },
      { sel: ".tier", label: "Tier markers" },
      { sel: ".rar", label: "Rarity markers" },
      { sel: ".mut", label: "Mutator chips" },
      { sel: ".tags", label: "Tag groups" },
      { sel: ".tag", label: "Tags" },
      { sel: ".danger", label: "Danger state" },
      { sel: ".gold", label: "Gold state" },
      { sel: ".unl", label: "Unlock lines" },
      { sel: ".on", label: "Active toggle state" },
      { sel: ".sub", label: "Sub-note text" },
      { sel: ".small", label: "Small text" },
      { sel: ".wrap", label: "Wrappers" },
      { sel: ".center", label: "Centred blocks" },
      { sel: ".scr-title", label: "Screen titles" },
      { sel: ".pausegrid", label: "Pause grid" },
      { sel: ".manualgrid", label: "Manual grid" },
      { sel: ".fluidrow", label: "Fluid legend row" },
      { sel: ".p2", label: "Player 2 block" },
      { sel: ".p2tag", label: "Player 2 tag" },
      { sel: ".own", label: "Own-player marker" },
      { sel: ".mc-right", label: "Mode card right column" },
      { sel: ".sb", label: "Scoreboard block" },
      { sel: ".rise", label: "Rising text hook" },
      { sel: ".risk", label: "Risk marker" },
      { sel: ".downmsg", label: "Downed message" },
      { sel: ".st-title", label: "Title state class" }
    ],

    control: [
      { id: "seat", label: "Seat mode", args: '[playerIndex, "human" | "cpu"]', argDefault: '[0, "cpu"]',
        doc: "p.cpu decides whether cpuThink(p) or resolveInput(p) writes p.in each tick, so this hands the seat to the bot or back to the keyboard. Index 0 is the solo seat; index 1 exists only when CFG.coop is 1 or 2.",
        run: function (a) { if (!Array.isArray(a)) return "want [index, human|cpu]"; ensureRun(); var p = G.players[+a[0] || 0]; if (!p) return "no seat " + a[0]; p.cpu = a[1] === "cpu"; return { seat: +a[0] || 0, cpu: !!p.cpu, human: !!p.human }; } },
      { id: "think", label: "Run one bot decision frame", args: "player index", argDefault: 0,
        doc: "cpuThink(p, 1/60) exactly as updatePlayers calls it, then reports the resulting brain state: mode, target distance, aim and whether it pulled the trigger.",
        run: function (i) {
          ensureRun(); var p = G.players[+i || 0]; if (!p) return "no seat " + i;
          cpuThink(p, 1 / 60);
          var t = p.cpuTarget;
          return { seat: +i || 0, cpuMode: p.cpuMode, cpuT: num(p.cpuT), styleEMA: num(p.styleEMA, 100),
            target: t ? { kind: t.kind || "enemy", hp: num(t.hp), dist: num(Math.sqrt(d2(p.x, p.y, t.x, t.y)), 10) } : null,
            move: [num(p.in.mx, 100), num(p.in.my, 100)], aim: [num(p.in.ax, 1), num(p.in.ay, 1)], fire: !!p.in.fire, dash: !!p.dashReq };
        } },
      { id: "forceMode", label: "Pin the bot's behaviour", args: '[index, "HUNT"|"COVER"|"REVIVE"]', argDefault: '[0, "COVER"]',
        doc: "Sets p.cpuMode and pushes p.cpuT out to 6 s so the retarget tick does not overwrite it — the way to hold the bot in one behaviour and read its positioning.",
        run: function (a) { if (!Array.isArray(a)) return "want [index, mode]"; ensureRun(); var p = G.players[+a[0] || 0]; if (!p) return "no seat " + a[0]; p.cpuMode = String(a[1]); p.cpuT = 6; return { seat: +a[0] || 0, cpuMode: p.cpuMode, cpuT: p.cpuT }; } },
      { id: "retarget", label: "Bot retarget timer", args: "[index, seconds]", argDefault: "[0, 0.15]",
        doc: "p.cpuT counts down to the retarget tick inside cpuThink (0.15 s default). Large value = frozen target, small = twitchy reacquisition.",
        run: function (a) { if (!Array.isArray(a)) return "want [index, seconds]"; ensureRun(); var p = G.players[+a[0] || 0]; if (!p) return "no seat " + a[0]; p.cpuT = Number(a[1]); return { seat: +a[0] || 0, cpuT: num(p.cpuT) }; } },
      { id: "style", label: "Bot caution bias", args: "[index, 0-1]", argDefault: "[0, 0.9]",
        doc: "p.styleEMA is the smoothed COVER tendency; the movement blend in cpuThink reads it, so pushing it toward 1 makes the partner hug the human.",
        run: function (a) { if (!Array.isArray(a)) return "want [index, 0-1]"; ensureRun(); var p = G.players[+a[0] || 0]; if (!p) return "no seat " + a[0]; p.styleEMA = Math.max(0, Math.min(1, Number(a[1]))); return { seat: +a[0] || 0, styleEMA: num(p.styleEMA, 100) }; } },
      { id: "botTarget", label: "Force the bot's target", args: "[index, enemyIndex]", argDefault: "[0, 0]",
        doc: "Assigns p.cpuTarget straight from EN, bypassing the scoring loop — test how the bot pathing/lead-aim behaves against a chosen hostile.",
        run: function (a) { if (!Array.isArray(a)) return "want [index, enemyIndex]"; ensureRun(); var p = G.players[+a[0] || 0], e = EN[+a[1] || 0]; if (!p) return "no seat " + a[0]; if (!e || !e.alive) return "no live enemy " + a[1]; p.cpuTarget = e; p.cpuT = 6; return { seat: +a[0] || 0, target: { type: e.type, name: EDEF[e.type].name, hp: num(e.hp), dist: num(Math.sqrt(d2(p.x, p.y, e.x, e.y)), 10) } }; } },
      { id: "botDash", label: "Bot dashes now", args: "player index", argDefault: 0,
        doc: "Sets p.dashReq; updatePlayers consumes it subject to stats.dashCd.",
        run: function (i) { ensureRun(); var p = G.players[+i || 0]; if (!p) return "no seat " + i; p.dashReq = true; return { seat: +i || 0, dashCd: num(p.stats ? p.stats.dashCd : 0) }; } },
      { id: "enemyAi", label: "Tune an enemy archetype", args: '[typeIndex 0-6, "spd"|"hp"|"dmg"|"r"|"cost", value]', argDefault: '[0, "spd", 150]',
        doc: "EDEF rows are the archetype table read by spawnEnemy: DRONE 0, STINGER 1, BLADE 2, SPITTER 3, BOMBER 4, BRUTE 5, WARDEN 6. New spawns take the new numbers; live enemies keep theirs.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [type, field, value]";
          var D = EDEF[+a[0] || 0]; if (!D) return "no archetype " + a[0];
          var f = String(a[1]); if (!(f in D)) return "no field " + f;
          D[f] = Number(a[2]);
          return { name: D.name, field: f, value: D[f], live: aliveEnemies() };
        } },
      { id: "spawn", label: "Queue an enemy", args: '[type 0-6, elite 0|1, x?, y?]', argDefault: '[4, 0]',
        doc: "queueSpawn(type, faction, x, y, delay, elite, mutator) around the player — the same path the wave director uses.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [type, elite, x, y]";
          var p = P(); var t = +a[0] || 0;
          if (!EDEF[t]) return "no archetype " + a[0];
          var x = a[2] !== undefined ? Number(a[2]) : (p ? p.x + 220 : W / 2);
          var y = a[3] !== undefined ? Number(a[3]) : (p ? p.y + 120 : H / 2);
          queueSpawn(t, 0, x, y, 0.1, !!Number(a[1]), undefined);
          return { queued: G.spawnQueue.length, name: EDEF[t].name, budget: num(G.budget) };
        } },
      { id: "waveBudget", label: "Wave budget", args: "[total, spent?] to force a wave pace", argDefault: "[40, 0]",
        doc: "G.budgetTotal / G.budget drive the director's spend per wave; raising the total spawns a heavier wave without changing difficulty.",
        run: function (a) { if (!Array.isArray(a)) return "want [total, spent]"; G.budgetTotal = Number(a[0]); if (a[1] !== undefined) G.budget = Number(a[1]); return { budgetTotal: num(G.budgetTotal), budget: num(G.budget) }; } },
      { id: "run", label: "Start a run", args: '[mode 0 survival | 1 quest | 2 daily, stage]', argDefault: '[0, 0]',
        doc: "startRun(mode, stage) — rebuilds players (so CFG.coop and CFG.diff apply), the arena, and the wave director.",
        run: function (a) { if (!Array.isArray(a)) return "want [mode, stage]"; startRun(+a[0] || 0, +a[1] || 0); return { mode: G.mode, stage: G.stage, players: (G.players || []).length, coop: G.coop, diff: DIFF.name }; } }
    ],

    recipes: [
      { label: "NIGHTMARE with a CPU partner, spectate",
        doc: "Co-op seat filled by the bot at the hardest multiplier, then a 10x time scale so the whole run plays out in seconds.",
        js: 'CFG.coop = 1; CFG.diff = 2; DIFF = DIFFS[2];\nstartRun(0, 0);\nG.ts = 2.2;\nsetInterval(function () {\n  var bot = G.players[1];\n  console.log("wave", G.wave, "enemies", EN.filter(function (e) { return e.alive }).length,\n    "bot", bot ? (bot.cpuMode + " hp " + Math.round(bot.hp)) : "none",\n    "human hp", G.players[0] ? Math.round(G.players[0].hp) : "-");\n}, 1000);' },
      { label: "Bot brain probe every 250 ms",
        doc: "Logs the partner's behaviour mode, target distance, aim vector and trigger state — the trace you need to judge HUNT/COVER switching.",
        js: 'if (window.__tllBot) clearInterval(window.__tllBot);\nwindow.__tllBot = setInterval(function () {\n  var b = G.players[1]; if (!b) return;\n  var t = b.cpuTarget;\n  console.table([{ seat: 1, mode: b.cpuMode, cpuT: +b.cpuT.toFixed(2), style: +b.styleEMA.toFixed(2),\n    target: t ? (EDEF[t.type] ? EDEF[t.type].name : "pickup") : "-",\n    dist: t ? Math.round(Math.sqrt(d2(b.x, b.y, t.x, t.y))) : "-",\n    move: [+b.in.mx.toFixed(2), +b.in.my.toFixed(2)], fire: b.in.fire, dash: b.dashReq }]);\n}, 250);' },
      { label: "REVIVE pressure test",
        doc: "Downs the human seat and watches the bot switch to REVIVE and close the distance; clears the probe afterwards.",
        js: 'var h = G.players[0], bot = G.players[1];\nif (!bot) { CFG.coop = 1; startRun(0, 0); bot = G.players[1]; }\nh.hp = 0; hurtPlayer(h, 1);\nvar t = setInterval(function () {\n  console.log(bot.cpuMode, "downed", !!h.downed, "dist", Math.round(Math.sqrt(d2(bot.x, bot.y, h.x, h.y))));\n}, 400);\nsetTimeout(function () { clearInterval(t); console.log("final mode", bot.cpuMode, "human hp", Math.round(h.hp)); }, 12000);' },
      { label: "Archetype sweep: speed versus HP trade",
        doc: "Rebuilds the archetype rows to a chosen profile and logs the table — the numbers spawnEnemy copies into every new hostile.",
        js: 'EDEF.forEach(function (D, i) {\n  console.log(i, D.name, "hp", D.hp, "spd", D.spd, "dmg", D.dmg, "r", D.r, "cost", D.cost, "ai", D.ai);\n});\nEDEF[0].spd = 150; EDEF[1].hp = 18; EDEF[5].spd = 34; EDEF[4].dmg = 40;\nG.budgetTotal *= 1.5;\nstartRun(0, 0);\nconsole.log("wave 1 budget", G.budgetTotal, DIFF.name);' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live run (state, mode, wave, director budget, players, enemy counts, pools, field grid, camera, options). BALANCE edits time scale, difficulty, resolution/particle/decal/shake/volume options and player stats. CHEATS drives runs, waves, spawns, powers, pickups, field painting and quality. LAYOUT resizes and repositions the canvas, overlays, screens, HUDs, sliders and cards. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "No page bridge needed", text: "oilstorm.html declares its engine at script top level with var/function, so G, CFG, META, DIFF/DIFFS, CAM, AR, F, PT, DC, TX, FX, A, EN, BU, PK, POWERS, PERKS, FRAMES, EDEF, MUTS, CHARS, QUESTS, UI and the control functions are ordinary window properties. Nothing in oilstorm.html was modified." },
      { topic: "Time scale is the freeze", text: "frame() accumulates dt*G.ts and runs whole 1/60 s update() steps (max 4 per frame). G.ts=0 freezes the simulation exactly — nothing advances while rendering continues. Slow motion and fast forward are the same knob; very high values clamp at 4 steps per frame." },
      { topic: "Director", text: "directorTick spends G.budget on enemy costs (EDEF cost) inside the wave, G.eventT triggers events (meteors, supply, fogs), and G.budgetTotal scales with wave and difficulty. 'Force next wave' calls startWave directly; 'End current wave' kills everything and re-arms the inter-wave countdown." },
      { topic: "Field grid", text: "F.type/F.amt are FXW x FYH cell arrays (40 px cells): 1 oil, 2 fuel, 3 fire. The fire sim ignites neighbours by its own rules; CHEATS paint cells directly, so 'Ignite' bypasses ignition and 'Clear' wipes both maps." },
      { topic: "Stats are perk-derived", text: "recalcStats() rebuilds player.stats from baseStats() plus character plus perk applications, so BALANCE edits to dmgMult/rateMult/dashCd/magnet/armor survive only until the next level-up or perk pick." },
      { topic: "Audio needs a gesture", text: "A.init() runs on the first real key/click. CHEATS toggles flip CFG flags and call applyVol even while the AudioContext is still closed — STATE shows the context state." },
      { topic: "No translation table", text: "oilstorm.html ships single-language markup with no i18n records (no data-t attributes, no TLI18N.add calls), so the TEXTS tab is empty by design. All copy is baked into the markup and into banner()/toast() strings." },
      { topic: "Not reachable", text: "WebGL shader programs, VAO batches and the floor buffer stay private; context state is visible in STATE.render. Enemy/player objects, pools, field grid, director state and config are all live." }
    ]
  });

  function spawnN(type, n) {
    var p = P();
    var bx = p ? p.x : W / 2, by = p ? p.y : H / 2;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      queueSpawn(type, 0, bx + Math.cos(a) * 260, by + Math.sin(a) * 260, 0.05 * i, false, 0);
    }
  }
  function paintField(x, y, rad, type) {
    var cx0 = Math.max(0, ((x - rad) / FC) | 0), cx1 = Math.min(FXW - 1, ((x + rad) / FC) | 0);
    var cy0 = Math.max(0, ((y - rad) / FC) | 0), cy1 = Math.min(FYH - 1, ((y + rad) / FC) | 0);
    for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
      var dx = (cx + 0.5) * FC - x, dy = (cy + 0.5) * FC - y;
      if (dx * dx + dy * dy <= rad * rad) { var i = cy * FXW + cx; F.type[i] = type; F.amt[i] = Math.max(F.amt[i], 60) }
    }
  }
})();
