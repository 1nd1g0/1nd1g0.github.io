/* dbg/tanks.js — developer harness for tanks.html (Battle City style tank game)
 *
 * Load with:  tanks.html?debug=dbg/tanks.js
 * tanks.html wraps its game in a strict IIFE; the last block publishes
 * window.TLHOOK (names only), which everything here reads: update, render,
 * renderHUD, renderMinimap, renderIntro, renderAttract, drawView, drawCell,
 * frame, resize, genLevel, solidTank, cellHasTank, unstuckTank, spawnPow,
 * addEnemyRespawn, fireBullet, playerFire, enemyFire, moveTank, aiDecideState,
 * idx, pickPow, mkPlayer, startCampaign, startLevel, stageClear, nextLevel,
 * showOver, togglePause, toMenu, opName plus BAL, ETYPES, ST, G, VW, VH, STEP.
 */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;
  var H = null;
  function h() { return (H = H || window.TLHOOK); }
  function B() { return h().BAL }
  function S() { return h().ST }
  function W() { return h().G }
  function ensureGame() {
    var G = W();
    if (G && G.pl && G.pl.length) return G;
    var b = document.getElementById("btnDeploy");
    if (b) b.click();
    return W();
  }

  var realUpdate = null, scale = null;
  function wrap(v) {
    var T = h();
    if (!realUpdate) realUpdate = T.update;
    scale = v === null ? null : v;
    if (scale === null) { T.update = realUpdate; return; }
    T.update = function (dt) { realUpdate(dt * scale) };
  }

  function num(x, r) { return typeof x === "number" && isFinite(x) ? Math.round(x * (r || 1000)) / (r || 1000) : 0 }
  function bal(path, v) {
    var k = path.split("."), o = B();
    for (var i = 0; i < k.length - 1; i++) o = o[k[i]];
    if (v === undefined) return o[k[k.length - 1]];
    o[k[k.length - 1]] = v;
  }
  function p0() { var g = W(); return g.pl && g.pl[0] ? g.pl[0] : null }

  TLDBG.register({
    game: "tanks", file: "tanks.html",

    state: function () {
      var T = h(), G = W(), OPT = h().ST, pl = p0();
      return {
        state: G.state, level: G.level, seed: G.seed, opName: typeof T.opName === "function" ? T.opName(G.seed, G.level) : null,
        time: num(G.t, 100), tick: G.tick, score: G.score, hiscore: G.hiscore,
        introTimer: num(G.introT, 100), clearWait: num(G.clearWait, 100), overReason: G.overReason || null,
        players: G.pl.length, playerAlive: pl ? !pl.dead : false, playerOut: pl ? !!pl.out : false,
        playerLives: pl ? pl.lives : 0, playerWeaponLevel: pl ? pl.lvl : 0,
        playerShield: pl ? num(pl.shieldT, 100) : 0, playerSpeedBoost: pl ? num(pl.speedT, 100) : 0,
        playerPos: pl ? [num(pl.x, 1), num(pl.y, 1)] : null, playerDir: pl ? pl.dir : null,
        enemiesAlive: G.enemies.length, enemyRoster: G.roster.length, rosterIndex: G.rosterIx,
        bullets: G.bullets.length, powerups: G.pows.length, explosions: G.booms.length,
        particles: G.parts.length, popups: G.pops.length, spawnMarkers: G.spawns.length,
        enemySpawnTimer: num(G.spawnT, 100), freezeTimer: num(G.freezeT, 100), playerFreezeTimer: num(G.plFreezeT, 100),
        fortifyTimer: num(G.fortifyT, 100), speedMultiplier: num(G.spdMul, 100), fireMultiplier: num(G.fireMul, 100),
        baseHp: G.base ? G.base.hp : 0, basePos: G.base ? [G.base.x, G.base.y] : null,
        grid: G.W + "x" + G.H, camera: [num(G.cam.x, 1), num(G.cam.y, 1)], splitScreen: !!G.split,
        shake: num(G.shake, 10), showMap: !!G.showMap,
        killStats: G.stats ? JSON.parse(JSON.stringify(G.stats)) : null,
        options: { difficulty: OPT.diff, mode: OPT.mode, skill: OPT.skill, rate: OPT.rate, foeSupplies: OPT.foeSup, size: OPT.size, fx: OPT.fx, sound: !!OPT.snd, aiView: OPT.aiView },
        canvas: T.VW + "x" + T.VH, step: T.STEP, accumulator: num(T.acc, 1000)
      };
    },

    params: [
      { id: "tankSpeed", label: "Player tank speed", unit: "px/s", min: 30, max: 160, step: 2,
        get: function () { return bal("player.speed") }, set: function (v) { bal("player.speed", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.speed" },
        doc: "Player movement speed (72). moveTank reads it every tick, so it changes immediately. DriveTime in the stage-clear tally also derives from it." },
      { id: "speedBoost", label: "Overdrive multiplier", unit: "x", min: 1, max: 3, step: 0.05,
        get: function () { return bal("player.speedBoost") }, set: function (v) { bal("player.speedBoost", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.speedBoost" },
        doc: "Speed power-up multiplier (1.45) applied while speedT is active." },
      { id: "lives", label: "Player lives", unit: "lives", min: 1, max: 9, step: 1,
        get: function () { return bal("player.lives") }, set: function (v) { bal("player.lives", Math.max(1, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.lives" },
        doc: "Starting lives baked by mkPlayer (3). Applies to the NEXT campaign (CHEATS: new campaign)." },
      { id: "respawnDelay", label: "Respawn delay", unit: "s", min: 0, max: 6, step: 0.1,
        get: function () { return bal("player.respawnDelay") }, set: function (v) { bal("player.respawnDelay", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.respawnDelay" },
        doc: "Delay before a destroyed player tank returns (1.3 s)." },
      { id: "spawnShield", label: "Spawn shield", unit: "s", min: 0, max: 10, step: 0.5,
        get: function () { return bal("player.spawnShield") }, set: function (v) { bal("player.spawnShield", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.spawnShield" },
        doc: "Invulnerability granted on spawn/respawn (3 s)." },
      { id: "fireCooldown", label: "Fire cooldown (L1)", unit: "s", min: 0.05, max: 2, step: 0.05,
        get: function () { return bal("player.baseCd") }, set: function (v) { bal("player.baseCd", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.baseCd" },
        doc: "Shot cooldown at weapon level 1 (0.36 s). Live in playerFire." },
      { id: "fireCooldownL2", label: "Fire cooldown (L2)", unit: "s", min: 0.05, max: 2, step: 0.05,
        get: function () { return bal("player.cdLvl2") }, set: function (v) { bal("player.cdLvl2", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.cdLvl2" },
        doc: "Cooldown at weapon level 2 (0.85 s — fast tanks use it)." },
      { id: "fireCooldownL3", label: "Fire cooldown (L3)", unit: "s", min: 0.05, max: 2, step: 0.05,
        get: function () { return bal("player.cdLvl3") }, set: function (v) { bal("player.cdLvl3", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.cdLvl3" },
        doc: "Cooldown at weapon level 3 (0.8 s)." },
      { id: "rapidCooldown", label: "Rapid-fire cooldown", unit: "s", min: 0.05, max: 1.5, step: 0.05,
        get: function () { return bal("player.cdRapid") }, set: function (v) { bal("player.cdRapid", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.cdRapid" },
        doc: "Cooldown while the rapid-fire prize is active (0.55 s)." },
      { id: "bulletSpeed", label: "Player bullet speed", unit: "px/s", min: 100, max: 600, step: 10,
        get: function () { return bal("player.bulletSpeed") }, set: function (v) { bal("player.bulletSpeed", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.bulletSpeed" },
        doc: "Bullet velocity at level 1 (280). Bullet-step collisions get tighter as this rises." },
      { id: "bulletSpeedPerLvl", label: "Bullet speed per weapon level", unit: "px/s", min: 0, max: 120, step: 5,
        get: function () { return bal("player.bulletSpeedPerLvl") }, set: function (v) { bal("player.bulletSpeedPerLvl", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.bulletSpeedPerLvl" },
        doc: "Added to bullet speed for each weapon level above 1 (25)." },
      { id: "maxBullets", label: "Player bullets on screen", unit: "bullets", min: 1, max: 10, step: 1,
        get: function () { return bal("player.maxBullets") }, set: function (v) { bal("player.maxBullets", Math.max(1, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.maxBullets" },
        doc: "Shot cap per player (2). Raise it for barrage testing." },
      { id: "shieldTime", label: "Shield prize duration", unit: "s", min: 0, max: 40, step: 1,
        get: function () { return bal("player.shieldTime") }, set: function (v) { bal("player.shieldTime", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.shieldTime" },
        doc: "How long the shield power-up lasts (12 s)." },
      { id: "speedTime", label: "Overdrive duration", unit: "s", min: 0, max: 40, step: 1,
        get: function () { return bal("player.speedTime") }, set: function (v) { bal("player.speedTime", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.player.speedTime" },
        doc: "How long the speed power-up lasts (12 s)." },
      { id: "eagleHp", label: "Eagle hit points", unit: "hp", min: 1, max: 12, step: 1,
        get: function () { return bal("eagle.hp") }, set: function (v) { bal("eagle.hp", Math.max(1, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.eagle.hp" },
        doc: "Base HP; a bullet on the eagle ends the game. Baked into G.base at boot/level build — raise it and rebuild the level to see the extra HP applied." },
      { id: "enemyBasicSpeed", label: "Scout speed", unit: "px/s", min: 10, max: 140, step: 2,
        get: function () { return bal("enemy.types.basic.spd") }, set: function (v) { bal("enemy.types.basic.spd", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.basic.spd" },
        doc: "ARMORED SCOUT speed (44), multiplied by the difficulty speed row." },
      { id: "enemyFastSpeed", label: "Raider speed", unit: "px/s", min: 10, max: 180, step: 2,
        get: function () { return bal("enemy.types.fast.spd") }, set: function (v) { bal("enemy.types.fast.spd", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.fast.spd" },
        doc: "RAIDER speed (76) — the fast rusher." },
      { id: "enemyPowerSpeed", label: "Gunship speed", unit: "px/s", min: 10, max: 140, step: 2,
        get: function () { return bal("enemy.types.power.spd") }, set: function (v) { bal("enemy.types.power.spd", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.power.spd" },
        doc: "GUNSHIP speed (50) with a 265 px/s bullet." },
      { id: "enemyArmorSpeed", label: "Fortress speed", unit: "px/s", min: 10, max: 120, step: 2,
        get: function () { return bal("enemy.types.armor.spd") }, set: function (v) { bal("enemy.types.armor.spd", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.armor.spd" },
        doc: "FORTRESS speed (38)." },
      { id: "enemyArmorHp", label: "Fortress hit points", unit: "hp", min: 1, max: 12, step: 1,
        get: function () { return bal("enemy.types.armor.hp") }, set: function (v) { bal("enemy.types.armor.hp", Math.max(1, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.armor.hp" },
        doc: "Fortress armour (4 shots). New enemies take the current value; existing ones keep theirs." },
      { id: "enemyBulletSpeed", label: "Enemy bullet speed", unit: "px/s", min: 60, max: 500, step: 10,
        get: function () { return bal("enemy.types.basic.bs") }, set: function (v) { bal("enemy.types.basic.bs", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.basic.bs" },
        doc: "Scout bullet speed (170). Gunship (265) and raider (185) have their own rows in the enemy-types hook." },
      { id: "maxConcurrent", label: "Enemies on field", unit: "tanks", min: 1, max: 16, step: 1,
        get: function () { return bal("enemy.maxConcurrent") }, set: function (v) { bal("enemy.maxConcurrent", Math.max(1, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.maxConcurrent" },
        doc: "Simultaneous hostile limit (5). Raise it for swarm stress tests." },
      { id: "spawnInterval", label: "Spawn interval base", unit: "s", min: 0.4, max: 8, step: 0.1,
        get: function () { return bal("enemy.spawnIntBase") }, set: function (v) { bal("enemy.spawnIntBase", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.spawnIntBase" },
        doc: "Seconds between enemy spawns before level/difficulty cuts (2.6, floor 1.2)." },
      { id: "enemyFireBase", label: "Enemy fire interval base", unit: "s", min: 0.2, max: 6, step: 0.1,
        get: function () { return bal("enemy.fireBase") }, set: function (v) { bal("enemy.fireBase", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.fireBase" },
        doc: "Base enemy shot cadence (0.9 s) plus fireVar (1.8) randomness." },
      { id: "enemyAggro", label: "Scout aggression", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { return bal("enemy.types.basic.aggro") }, set: function (v) { bal("enemy.types.basic.aggro", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.basic.aggro" },
        doc: "How directly the AI hunts the eagle/base versus drifting (0.55 for scouts)." },
      { id: "lootChance", label: "Enemy loot drop chance", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { return bal("enemy.lootChance") }, set: function (v) { bal("enemy.lootChance", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.lootChance" },
        doc: "Chance a looted enemy drops a prize (0.65), only when foe supplies are enabled." },
      { id: "cameraSpeed", label: "Camera follow speed", unit: "px/s", min: 1, max: 30, step: 1,
        get: function () { return bal("cam.speed") }, set: function (v) { bal("cam.speed", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.cam.speed" },
        doc: "How fast the camera tracks the tank (5)." },
      { id: "lookahead", label: "Camera lookahead", unit: "px", min: 0, max: 80, step: 2,
        get: function () { return bal("cam.lookahead") }, set: function (v) { bal("cam.lookahead", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.cam.lookahead" },
        doc: "Bias ahead of the tank's facing direction (22 px)." },
      { id: "particles", label: "Particle budget", unit: "particles", min: 0, max: 500, step: 10,
        get: function () { return bal("fx.particles") }, set: function (v) { bal("fx.particles", Math.max(0, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.fx.particles" },
        doc: "Explosion particle cap (140) in FX: HIGH; the LITE toggle halves the effect load." },
      { id: "shakeMax", label: "Screen shake max", unit: "px", min: 0, max: 24, step: 1,
        get: function () { return bal("fx.shakeMax") }, set: function (v) { bal("fx.shakeMax", Math.max(0, v)) },
        code: { file: "tanks.html", line: 262, name: "BAL.fx.shakeMax" },
        doc: "Maximum shake offset (9). 0 keeps the frame locked for screenshots." },
      { id: "pickupScore", label: "Pickup score", unit: "points", min: 0, max: 4000, step: 50,
        get: function () { return bal("prizes.pickupScore") }, set: function (v) { bal("prizes.pickupScore", Math.max(0, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.prizes.pickupScore" },
        doc: "Score for a generic prize pickup (500)." },
      { id: "gemScore", label: "Gem score", unit: "points", min: 0, max: 8000, step: 100,
        get: function () { return bal("prizes.gem") }, set: function (v) { bal("prizes.gem", Math.max(0, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.prizes.gem" },
        doc: "Gem value (1000)." },
      { id: "difficulty", label: "Difficulty", unit: "0-2", min: 0, max: 2, step: 1,
        get: function () { return S().diff },
        set: function (v) { S().diff = Math.max(0, Math.min(2, Math.round(v))); if (typeof h().startLevel === "function") h().startLevel() },
        code: { file: "tanks.html", line: 266, name: "ST.diff" },
        doc: "RECRUIT / VETERAN / ELITE. Feeds genLevel (roster, spawn cadence) and the enemy speed/fire multipliers, so the row restarts the level." },
      { id: "mode", label: "Game mode", unit: "0-3", min: 0, max: 3, step: 1,
        get: function () { return S().mode },
        set: function (v) { S().mode = Math.max(0, Math.min(3, Math.round(v))) },
        code: { file: "tanks.html", line: 266, name: "ST.mode" },
        doc: "0 SOLO, 1 CO-OP HUMAN, 2 CO-OP CPU, 3 CPU DUO. Player creation happens at campaign start — use CHEATS: new campaign." },
      { id: "spawnRate", label: "Spawn rate", unit: "1-3", min: 1, max: 3, step: 1,
        get: function () { return S().rate }, set: function (v) { S().rate = Math.max(1, Math.min(3, Math.round(v))) },
        code: { file: "tanks.html", line: 266, name: "ST.rate" },
        doc: "LOW / NORMAL / HIGH / FLOOD index feeding the spawn cadence in genLevel." },
      { id: "foeSupplies", label: "Enemy supplies", unit: "0-2", min: 0, max: 2, step: 1,
        get: function () { return S().foeSup }, set: function (v) { S().foeSup = Math.max(0, Math.min(2, Math.round(v))) },
        code: { file: "tanks.html", line: 266, name: "ST.foeSup" },
        doc: "0 NO PRIZES, 1 UPGRADES+1UP, 2 FULL (traps). Applies to enemies spawned after the change." },
      { id: "enemyAggroFast", label: "Raider aggression", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { return bal("enemy.types.fast.aggro") }, set: function (v) { bal("enemy.types.fast.aggro", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.fast.aggro" },
        doc: "Raider hunting directness (0.65). The enemy fire cadence divides by this value, so raising it also raises shots per second." },
      { id: "enemyAggroPower", label: "Gunship aggression", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { return bal("enemy.types.power.aggro") }, set: function (v) { bal("enemy.types.power.aggro", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.power.aggro" },
        doc: "Gunship hunting directness (0.8) — the highest-pressure bot; drop it to let the CPU ally win duels." },
      { id: "enemyAggroArmor", label: "Fortress aggression", unit: "0-1", min: 0, max: 1, step: 0.05,
        get: function () { return bal("enemy.types.armor.aggro") }, set: function (v) { bal("enemy.types.armor.aggro", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.types.armor.aggro" },
        doc: "Fortress hunting directness (0.7)." },
      { id: "enemyFireVar", label: "Enemy fire jitter", unit: "s", min: 0, max: 4, step: 0.1,
        get: function () { return bal("enemy.fireVar") }, set: function (v) { bal("enemy.fireVar", v) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.fireVar" },
        doc: "Random term added to the enemy shot interval (1.8 s). 0 makes the bots metronomic — useful for reproducible AI tests." },
      { id: "enemyFlashEvery", label: "Loot-tank every Nth", unit: "index", min: 1, max: 20, step: 1,
        get: function () { return bal("enemy.flashEvery") }, set: function (v) { bal("enemy.flashEvery", Math.max(1, Math.round(v))) },
        code: { file: "tanks.html", line: 262, name: "BAL.enemy.flashEvery" },
        doc: "Every Nth roster entry is a flashing looted tank (7). Applies to the next level build (CHEATS: restart this stage)." },
      { id: "cpuSkillLabel", label: "CPU skill label", unit: "1-2", min: 1, max: 2, step: 1,
        get: function () { return S().skill },
        set: function (v) { S().skill = Math.max(1, Math.min(2, Math.round(v))) },
        code: { file: "tanks.html", line: 266, name: "ST.skill" },
        doc: "CADET / ACE. Honest note: this label reaches the operation name and pause text only — the CPU ally's behaviour comes from aiDecideState and BAL, so tune the aggro/fire rows and CONTROL:decide instead." }
    ],

    cheats: [
      { id: "freeze", label: "Freeze game", toggle: true,
        doc: "update becomes a no-op: tanks, bullets, spawns, timers and AI all stop while render keeps drawing.",
        on: function (v) { wrap(v ? 0 : null) } },
      { id: "slow", label: "Slow motion x0.3", toggle: true,
        doc: "Scales the delta handed to update(): movement, bullets, spawn timers and freeze timers all slow together.",
        on: function (v) { wrap(v ? 0.3 : null) } },
      { id: "playerFire", label: "Player fires now",
        doc: "playerFire() through the page's own path — respects cooldown, weapon level and the bullet cap.",
        run: function () { h().playerFire(p0() || 0); TLDBG.toast("bullets " + W().bullets.length) } },
      { id: "spawnEnemy", label: "Spawn one enemy",
        doc: "addEnemyRespawn() queues another hostile at an enemy spawn point.",
        run: function () { h().addEnemyRespawn(); TLDBG.toast("roster " + W().roster.length) } },
      { id: "spawnPowerup", label: "Drop a random power-up",
        doc: "spawnPow(pickPow()) — a random prize from the page's weighted table.",
        run: function () { h().spawnPow(h().pickPow()); TLDBG.toast("powerups " + W().pows.length) } },
      { id: "shield", label: "Shield the player",
        doc: "Sets the player's shield timer to BAL.player.shieldTime.",
        run: function () { var pl = p0(); if (!pl) { TLDBG.toast("no player"); return; } pl.shieldT = bal("player.shieldTime"); TLDBG.toast("shield " + pl.shieldT + "s") } },
      { id: "overdrive", label: "Overdrive the player",
        doc: "Sets the player's speed-boost timer to BAL.player.speedTime.",
        run: function () { var pl = p0(); if (!pl) { TLDBG.toast("no player"); return; } pl.speedT = bal("player.speedTime"); TLDBG.toast("speed " + pl.speedT + "s") } },
      { id: "maxWeapon", label: "Weapon to level 3",
        doc: "Sets player.lvl = 3 — three-shot spread with the L3 cooldown.",
        run: function () { var pl = p0(); if (!pl) { TLDBG.toast("no player"); return; } pl.lvl = 3; pl.hasRapid = true; TLDBG.toast("weapon L3") } },
      { id: "freezeEnemies", label: "Freeze all enemies",
        doc: "G.freezeT = 8: enemy tanks stop moving for 8 seconds (the timer prize path).",
        run: function () { W().freezeT = 8; TLDBG.toast("enemies frozen 8s") } },
      { id: "fortifyBase", label: "Fortify the base",
        doc: "G.fortifyT = 10: brick walls around the eagle are restored to steel for 10 s.",
        run: function () { W().fortifyT = 10; TLDBG.toast("base fortified 10s") } },
      { id: "nukeEnemies", label: "Nuke all enemies",
        doc: "Kills every enemy on the field right now (the nuke prize effect) and spawns the explosions.",
        run: function () {
          var G = W();
          G.enemies.forEach(function (e) { e.hp = 0 });
          TLDBG.toast("enemies " + G.enemies.length + " marked dead");
        } },
      { id: "healBase", label: "Repair the eagle",
        doc: "Restores G.base.hp to BAL.eagle.hp.",
        run: function () { var G = W(); G.base.hp = bal("eagle.hp"); TLDBG.toast("base hp " + G.base.hp) } },
      { id: "clearBullets", label: "Clear all bullets",
        doc: "Empties G.bullets — useful when a stray shot keeps hitting the base.",
        run: function () { W().bullets.length = 0; TLDBG.toast("bullets cleared") } },
      { id: "levelUp", label: "Next stage",
        doc: "nextLevel(): level++ and rebuild the map for the same seed.",
        run: function () { h().nextLevel(); TLDBG.toast("level " + W().level) } },
      { id: "stageClear", label: "Clear the stage now",
        doc: "stageClear(): tally, bonus, auto-advance timer.",
        run: function () { h().stageClear(); TLDBG.toast("cleared, score " + W().score) } },
      { id: "startLevel", label: "Restart this stage",
        doc: "startLevel(): regenerate the map and re-enter the intro.",
        run: function () { h().startLevel(); TLDBG.toast("stage " + W().level + " rebuilt") } },
      { id: "newCampaign", label: "New campaign (same seed)",
        doc: "startCampaign(false): score 0, level from #lvlIn, players rebuilt with current options.",
        run: function () { h().startCampaign(false); TLDBG.toast("campaign from level " + W().level) } },
      { id: "newSeed", label: "New campaign, new seed",
        doc: "startCampaign(true): fresh random seed and a new map.",
        run: function () { h().startCampaign(true); TLDBG.toast("seed " + W().seed) } },
      { id: "showOver", label: "Force game over",
        doc: "showOver(): ends the run and shows the game-over overlay.",
        run: function () { W().overReason = W().overReason || "reasonArmy"; h().showOver(); TLDBG.toast("game over") } },
      { id: "pause", label: "Pause", toggle: true,
        doc: "togglePause(): the page's own pause path (overlay + input freeze).",
        on: function (v) { var G = W(); if (v && G.state === "play") h().togglePause(); else if (!v && G.state === "pause") h().togglePause() } },
      { id: "liteFx", label: "Lite FX", toggle: true,
        doc: "ST.fx = 'lite' while on — fewer particles and effects; restores 'hi' when off.",
        on: function (v) { S().fx = v ? "lite" : "hi" } },
      { id: "hideHud", label: "Hide HUD and buttons", toggle: true,
        doc: "Display:none on #hudbtns, #touch and #fx for clean captures.",
        on: function (v) { ["hudbtns", "touch", "fx"].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = v ? "none" : "" }) } }
    ],

    hooks: [
      { label: "Console: players", doc: "Each player tank: position, direction, weapon level, lives, timers and CPU flag.",
        run: function () {
          console.table(W().pl.map(function (pl, i) {
            return { i: i, id: pl.id, x: num(pl.x, 1), y: num(pl.y, 1), dir: pl.dir, lvl: pl.lvl, lives: pl.lives,
              dead: !!pl.dead, out: !!pl.out, respawnT: num(pl.respawnT, 100), shieldT: num(pl.shieldT, 100),
              speedT: num(pl.speedT, 100), rapid: !!pl.hasRapid, iceT: num(pl.iceT, 100), cpu: !!pl.isCPU,
              cd: num(pl.cd, 100), anim: num(pl.anim, 10) };
          }));
        } },
      { label: "Console: enemies", doc: "Every hostile: kind, position, direction, hp, speed, state and its AI decision fields.",
        run: function () {
          console.table(W().enemies.map(function (e, i) {
            return { i: i, type: e.type || e.kind || "-", x: num(e.x, 1), y: num(e.y, 1), dir: e.dir, hp: e.hp,
              spd: num(e.spd, 10), bs: e.bs, pts: e.pts, state: e.state || e.aiState || "-", shield: !!e.shield,
              frozen: !!e.frozen, upgraded: !!e.upgraded, rapid: !!e.rapid, spawnT: num(e.spawnT, 100), fireCd: num(e.fireCd !== undefined ? e.fireCd : e.cd, 100) };
          }));
        } },
      { label: "Console: bullets and prizes", doc: "Live bullets (owner, position, velocity) and power-ups on the field.",
        run: function () {
          console.table(W().bullets.map(function (b, i) {
            return { i: i, owner: b.owner !== undefined ? b.owner : (b.player ? "player" : "enemy"),
              x: num(b.x, 1), y: num(b.y, 1), dir: b.dir, spd: num(b.spd, 10), lvl: b.lvl, pierce: !!b.pierce };
          }));
          console.table(W().pows.map(function (p, i) { return { i: i, kind: p.k || p.kind || p.type, x: num(p.x, 1), y: num(p.y, 1), life: num(p.t !== undefined ? p.t : p.life, 100) } }));
        } },
      { label: "Console: balance table", doc: "The whole BAL tuning object with the current overrides, plus ETYPES and the difficulty multipliers.",
        run: function () {
          var T = h();
          console.log({ BAL: JSON.parse(JSON.stringify(T.BAL)), ETYPES: T.ETYPES,
            diffRows: { spd: B().diff.spd, fire: B().diff.fire, levelScale: B().diff.levelScale, levelCap: B().diff.levelCap },
            activeDiff: S().diff, liveMultipliers: { spdMul: num(W().spdMul, 100), fireMul: num(W().fireMul, 100) } });
        } },
      { label: "Console: level and options", doc: "Grid size, roster, spawn points, base position, options and the operation name.",
        run: function () {
          var T = h(), G = W(), S = h().ST;
          console.log({ state: G.state, level: G.level, seed: G.seed,
            op: typeof T.opName === "function" ? T.opName(G.seed, G.level) : null,
            grid: G.W + "x" + G.H, solidCells: (function () { var n = 0; if (!G.grid) return "-"; for (var y = 0; y < G.H; y++) for (var x = 0; x < G.W; x++) if (T.solidTank(G.grid[y * G.W + x])) n++; return n })(),
            base: G.base, playerSpawns: G.playerSpawns, enemySpawns: G.enemySpawns,
            roster: G.roster.join ? G.roster.join(",") : G.roster, rosterIx: G.rosterIx,
            options: { diff: S.diff, size: S.size, mode: S.mode, skill: S.skill, rate: S.rate, foeSup: S.foeSup, fx: S.fx, snd: S.snd, aiView: S.aiView },
            canvas: T.VW + "x" + T.VH, step: T.STEP, stats: G.stats });
        } }
    ],

    layout: [
      { sel: "#cv", label: "Game canvas" },
      { sel: "#fx", label: "Effects/HUD overlay" },
      { sel: "#hudbtns", label: "HUD button row" },
      { sel: "#btnPause", label: "Pause button" },
      { sel: "#btnMap", label: "Minimap toggle" },
      { sel: "#btnHome", label: "Home link" },
      { sel: "#btnSnd", label: "Sound toggle" },
      { sel: "#fxBtn", label: "FX toggle" },
      { sel: "#sndBtn2", label: "Sound button (pause panel)" },
      { sel: "#touch", label: "Touch D-pad" },
      { sel: "#dU", label: "Touch up" },
      { sel: "#dD", label: "Touch down" },
      { sel: "#dL", label: "Touch left" },
      { sel: "#dR", label: "Touch right" },
      { sel: "#bF", label: "Touch fire button" },
      { sel: "#menuOv", label: "Menu overlay" },
      { sel: "#btnDeploy", label: "Deploy (start) button" },
      { sel: "#btnDice", label: "Random seed button" },
      { sel: "#btnNewSeed", label: "New seed button" },
      { sel: "#seedIn", label: "Seed input" },
      { sel: "#lvlIn", label: "Starting level input" },
      { sel: "#segDiff", label: "Difficulty segment" },
      { sel: "#segMode", label: "Mode segment" },
      { sel: "#segSkill", label: "Skill segment" },
      { sel: "#segRate", label: "Spawn rate segment" },
      { sel: "#segSize", label: "Map size segment" },
      { sel: "#segFoe", label: "Enemy supplies segment" },
      { sel: "#segView", label: "View segment" },
      { sel: "#rowSkill", label: "Skill option row" },
      { sel: "#rowView", label: "View option row" },
      { sel: "#opPreview", label: "Operation name preview" },
      { sel: "#hiTxt", label: "Hi-score text" },
      { sel: "#helpTxt", label: "Help text" },
      { sel: "#pauseOv", label: "Pause overlay" },
      { sel: "#pauseInfo", label: "Pause info line" },
      { sel: "#pauseHelp", label: "Pause help block" },
      { sel: "#btnResume", label: "Resume button" },
      { sel: "#btnRestart", label: "Restart button" },
      { sel: "#btnQuit", label: "Quit button" },
      { sel: "#clearOv", label: "Stage-clear overlay" },
      { sel: "#clearOp", label: "Stage-clear operation line" },
      { sel: "#clearScore", label: "Stage-clear score" },
      { sel: "#tallyTbl", label: "Kill tally table" },
      { sel: "#nextIn", label: "Auto-advance countdown" },
      { sel: "#btnNext", label: "Next level button" },
      { sel: "#overOv", label: "Game-over overlay" },
      { sel: "#overReason", label: "Game-over reason" },
      { sel: "#overScore", label: "Game-over score" },
      { sel: "#newRec", label: "New record badge" },
      { sel: "#btnRetry", label: "Retry button" },
      { sel: "#btnMenu2", label: "Menu button (over overlay)" },
      { sel: ".ov", label: "Overlay screens" },
      { sel: ".panel", label: "Overlay panels" },
      { sel: ".btn", label: "Buttons" },
      { sel: ".badge", label: "Badges" },
      { sel: ".hazard", label: "Hazard stripe" },
      { sel: ".help", label: "Help blocks" },
      { sel: ".hr", label: "Rules" },
      { sel: ".row", label: "Option rows" },
      { sel: ".redseg", label: "Red segment group" },
      { sel: ".grn", label: "Green accent" },
      { sel: ".h-stencil", label: "Stencil headings" },
      { sel: ".on", label: "Active control state" },
      { sel: ".hid", label: "Hidden element hook" }
    ],

    control: [
      { id: "decide", label: "Ask the CPU brain", args: "player index 0 or 1", argDefault: 0,
        doc: "Runs aiDecideState on that tank right now and reports {state, target}. Call it repeatedly to see the ally's priority flip between defend, intercept, attack and scavenge.",
        run: function (i) {
          var T = h(), G = ensureGame(), pl = G.pl[+i || 0];
          if (!pl) return "no player " + i;
          var d = T.aiDecideState(pl);
          return { i: +i || 0, cpu: !!pl.isCPU, state: d && d.state,
            target: d && d.target ? { type: d.target.type || d.target.kind || "tank", x: num(d.target.x, 1), y: num(d.target.y, 1), hp: d.target.hp } : null };
        } },
      { id: "aggro", label: "Bot aggression by type", args: '["basic"|"fast"|"power"|"armor", 0-1]', argDefault: '["power", 1]',
        doc: "ETYPES[type].aggro drives how directly the hostile hunts the eagle AND divides its fire interval, so this is the single most powerful enemy-difficulty knob.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [type, value]";
          var t = a[0], v = Number(a[1]);
          if (!B().enemy.types[t]) return "unknown type " + t;
          B().enemy.types[t].aggro = v;
          return { type: t, aggro: v, fireEvery: num((B().enemy.fireBase + B().enemy.fireVar) / v, 100) };
        } },
      { id: "cadence", label: "Enemy shot cadence", args: "[fireBase, fireVar]", argDefault: "[0.4, 0]",
        doc: "BAL.enemy.fireBase (0.9) plus jitter fireVar (1.8). [0.4, 0] makes every bot fire on the same metronome — deterministic AI tests.",
        run: function (a) { if (!Array.isArray(a)) return "want [base, var]"; B().enemy.fireBase = Number(a[0]); B().enemy.fireVar = Number(a[1]); return { fireBase: B().enemy.fireBase, fireVar: B().enemy.fireVar }; } },
      { id: "swarm", label: "Swarm settings", args: "[maxConcurrent, spawnInterval]", argDefault: "[10, 0.8]",
        doc: "BAL.enemy.maxConcurrent (5) and spawnIntBase (2.6). The spawn loop reads both every tick, so a swarm starts immediately.",
        run: function (a) { if (!Array.isArray(a)) return "want [max, seconds]"; B().enemy.maxConcurrent = Math.max(1, Math.round(Number(a[0]))); B().enemy.spawnIntBase = Math.max(0.1, Number(a[1])); return { max: B().enemy.maxConcurrent, spawnInt: B().enemy.spawnIntBase }; } },
      { id: "spectate", label: "Switch player mode now", args: "0 SOLO · 1 CO-OP HUMAN · 2 CO-OP CPU · 3 CPU DUO", argDefault: 3,
        doc: "ST.mode plus a campaign restart: the CPU ally / CPU duo tanks are built by mkPlayer at campaign start, so this is the way to get bots into the fight mid-run.",
        run: function (m) { S().mode = Math.max(0, Math.min(3, Math.round(Number(m) || 0))); h().startCampaign(false); return { mode: S().mode, players: W().pl.map(function (p) { return p.isCPU ? "CPU" : "human" }) }; } },
      { id: "spawnType", label: "Queue a specific enemy type", args: '"basic" | "fast" | "power" | "armor"', argDefault: "armor",
        doc: "Pushes an explicit roster entry instead of the random pick, so the next spawn point delivers the tank you want to test the CPU ally against.",
        run: function (t) {
          var name = typeof t === "string" ? t : "basic";
          if (!B().enemy.types[name]) return "unknown type " + name;
          W().roster.push({ type: name, drop: false, forcePow: null });
          return { roster: W().roster.length, left: W().roster.length - W().rosterIx };
        } },
      { id: "teleport", label: "Teleport a tank", args: "[playerIndex, xCells, yCells]", argDefault: "[0, 8, 10]",
        doc: "moveTank() with the full delta, so the wall check still applies: it slides the tank to the cell or stops at the first solid cell.",
        run: function (a) {
          if (!Array.isArray(a)) return "want [index, cellX, cellY]";
          var T = h(), G = ensureGame(), pl = G.pl[+a[0] || 0];
          if (!pl) return "no player " + a[0];
          T.moveTank(pl, a[1] * T.CELL - pl.x, a[2] * T.CELL - pl.y, pl);
          return { x: num(pl.x, 1), y: num(pl.y, 1) };
        } },
      { id: "seed", label: "Force a seed and rebuild", args: "seed text, e.g. \"B7\"", argDefault: "B7",
        doc: "ST.seed = value, then genLevel with the current size/difficulty/level — the fastest way to make an AI situation reproducible.",
        run: function (s) { S().seed = String(s || "A1"); W().seed = S().seed; h().startLevel(); return { seed: W().seed, level: W().level, state: W().state }; } },
      { id: "fireFrom", label: "Fire from any tank", args: "[playerIndex]", argDefault: 0,
        doc: "playerFire(pl) through the page's own cooldown/cap path — use it to test what the CPU ally would do when it shoots on a given frame.",
        run: function (i) { var G = ensureGame(), pl = G.pl[+i || 0]; if (!pl) return "no player " + i; h().playerFire(pl); return { bullets: G.bullets.length, cooldown: num(pl.cd, 100) }; } },
      { id: "enemyFire", label: "Force one enemy to shoot", args: "enemy index", argDefault: 0,
        doc: "enemyFire(e) ignores its timer — fires the chosen hostile now, respecting the one-shot-per-enemy cap.",
        run: function (i) { var G = W(), e = G.enemies[+i || 0]; if (!e) return "no enemy " + i; h().enemyFire(e); return { enemies: G.enemies.length, bullets: G.bullets.length }; } },
      { id: "aiWatch", label: "Log CPU decisions on an interval", args: "seconds (0 stops)", argDefault: 1,
        doc: "console.table of aiDecideState for every CPU tank every N seconds; window.__tllAIWatch holds the timer id.",
        run: function (s) {
          if (window.__tllAIWatch) { clearInterval(window.__tllAIWatch); window.__tllAIWatch = null; }
          var sec = Number(s);
          if (!(sec > 0)) return "watch stopped";
          var T = h(), G = W();
          window.__tllAIWatch = setInterval(function () {
            console.table(G.pl.map(function (pl, i) {
              var d = T.aiDecideState(pl);
              return { i: i, cpu: !!pl.isCPU, dead: !!pl.dead, state: d && d.state,
                target: d && d.target ? (d.target.type || "tank") : "-",
                x: num(pl.x, 1), y: num(pl.y, 1), dir: pl.dir };
            }));
          }, sec * 1000);
          return "watching every " + sec + "s (TLDBG.do('aiWatch', 0) stops)";
        } }
    ],

    recipes: [
      { label: "CPU DUO spectate, ACE, aggressive gunships",
        doc: "Turns the run into a fully CPU war and makes the hostiles hunt hard — the standard way to watch the AI against the AI.",
        js: 'var T = window.TLHOOK;\nT.ST.mode = 3; T.ST.skill = 2;\nT.BAL.enemy.types.power.aggro = 1;\nT.BAL.enemy.types.fast.aggro = 0.9;\nT.BAL.enemy.fireBase = 0.6; T.BAL.enemy.fireVar = 0.6;\nT.startCampaign(true);\nconsole.log("CPU DUO, seed " + T.G.seed, T.G.pl.map(p => p.isCPU ? "CPU" : "human"));' },
      { label: "Bot stress test: swarm plus metronome fire",
        doc: "Ten hostiles at once on a fixed shot cadence — exposes pathing and target-selection failures in aiDecideState.",
        js: 'var T = window.TLHOOK;\nT.BAL.enemy.maxConcurrent = 10;\nT.BAL.enemy.spawnIntBase = 0.8;\nT.BAL.enemy.fireBase = 0.4; T.BAL.enemy.fireVar = 0;\n["basic","fast","power","armor"].forEach(function (k) { T.BAL.enemy.types[k].aggro = 1; });\nT.startLevel();\nsetInterval(function () { console.log("enemies", T.G.enemies.length, "bullets", T.G.bullets.length, "base", T.G.base.hp); }, 1000);' },
      { label: "Reproducible AI duel",
        doc: "Fixes the seed, freezes jitter and prints each CPU decision every second — replay by re-running the same snippet.",
        js: 'var T = window.TLHOOK;\nT.ST.seed = "B7"; T.BAL.enemy.fireVar = 0;\nT.startCampaign(false);\nwindow.__tllAIWatch = setInterval(function () {\n  console.table(T.G.pl.map(function (pl, i) {\n    var d = T.aiDecideState(pl);\n    return { i: i, cpu: !!pl.isCPU, state: d && d.state, target: d && d.target ? (d.target.type || "tank") : "-" };\n  }));\n}, 1000);' },
      { label: "Difficulty sweep: measure clear time per difficulty",
        doc: "Runs the three difficulty levels in sequence with a fresh seed and logs how long each takes; watch the console.",
        js: 'var T = window.TLHOOK;\nvar t0 = performance.now(), diff = 0;\nfunction step() {\n  if (diff > 2) { clearInterval(win); console.table(rows); return; }\n  T.ST.diff = diff; T.startCampaign(true);\n  var t = performance.now();\n  win = setInterval(function () {\n    if (T.G.state === "over" || T.G.base.hp <= 0) {\n      rows.push({ diff: T.ST.diff, seed: T.G.seed, level: T.G.level, score: T.G.score, seconds: Math.round((performance.now() - t) / 100) / 10 });\n      clearInterval(win); diff++; step();\n    }\n  }, 250);\n}\nvar rows = [], win = null; step();' }
    ],

    docs: [
      { topic: "What this panel is", text: "STATE is the live run (phase, level, operation name, players, enemies, bullets, prizes, base HP, timers, options). BALANCE edits the whole BAL tuning object and the option flags. CHEATS changes the run. LAYOUT resizes and repositions the canvas, HUD buttons, touch pad, menu, pause, tally and game-over overlays per screen mode. ELEMENTS lists selectors with classes, attributes and computed boxes." },
      { topic: "Bridge", text: "tanks.html wraps its game in a strict IIFE. Its last block publishes window.TLHOOK: update, render, renderHUD, renderMinimap, renderIntro, renderAttract, drawView, drawCell, frame, resize, genLevel, solidTank, cellHasTank, unstuckTank, spawnPow, addEnemyRespawn, fireBullet, playerFire, enemyFire, moveTank, aiDecideState, idx, pickPow, mkPlayer, startCampaign, startLevel, stageClear, nextLevel, showOver, togglePause, toMenu, opName; plus BAL, ETYPES, ST, G, VW, VH, STEP. No game code runs in that block." },
      { topic: "BAL is the tuning surface", text: "BAL is a plain nested object (ui, cam, fx, player, eagle, enemy, diff, prizes). Every row here writes straight into it and update/playerFire/enemyFire read it each tick, so changes are live. Values baked at level build (eagle.hp, roster sizes, grid) need CHEATS: restart this stage." },
      { topic: "ST is the options object", text: "ST mirrors the menu segments (difficulty, mode, skill, spawn rate, enemy supplies, map size, FX, sound, AI view) and persists to localStorage under iv90_* keys. Changing mode or skill takes effect on the next campaign start." },
      { topic: "Fixed timestep", text: "frame accumulates real time and calls update(STEP) with STEP = 1/60 (accumulator capped at 0.2 s). Freeze and slow motion wrap update(), so render keeps drawing while the simulation stops." },
      { topic: "AI internals are reachable", text: "aiDecideState, aiLineOfSight and the A* helpers run inside the IIFE; the bridge exposes aiDecideState so you can call it on an enemy, and the enemy hook prints each tank's AI decision fields." },
      { topic: "Not reachable", text: "Sprite canvases (tankSet output), the audio graph (AUD, AC, masterG, noiseBuf, SFX internals) and the minimap buffers stay private. Level grid, entity state and the balance table are all visible through the hooks." }
    ]
  });
})();
