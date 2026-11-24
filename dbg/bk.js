/* Developer harness script for bk.html (BENCHKIT - browser benchmark & diagnostics).
   Loaded by the page loader when the URL has ?debug=dbg/bk.js, after dbg/_harness.js.
   bk.html declares everything at the top level of its script, so this script reads the
   page's own globals (LOOP, HY, R, TESTS, GPU_STATE, GUARD, I18N) directly - no
   window.TLHOOK bridge is needed here. */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  function loop() { return (typeof LOOP !== "undefined") ? LOOP : { running: false, abort: false, passes: 0, stats: {} } }
  function hy() { return (typeof HY !== "undefined") ? HY : null }
  function res() { return (typeof R !== "undefined") ? R : {} }
  function val(id) { var e = document.getElementById(id); return e ? e.value : "" }
  function put(id, v) {
    var e = document.getElementById(id); if (!e) return false;
    if (e.tagName === "SELECT" && e.options.length) {
      var want = String(v), best = null, bd = Infinity;
      for (var i = 0; i < e.options.length; i++) {
        var ov = e.options[i].value;
        if (ov === want) { best = ov; break }
        var d = Math.abs(parseFloat(ov) - parseFloat(v));
        if (isFinite(d) && d < bd) { bd = d; best = ov }
      }
      if (best === null) return false;
      e.value = best;
    } else {
      e.value = v;
    }
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function click(id) { var e = document.getElementById(id); if (e) e.click(); return !!e }
  function counts() {
    var r = res(), ok = 0, warn = 0, bad = 0, info = 0;
    for (var k in r) { var st = r[k] && r[k].st; if (st === "pass") ok++; else if (st === "warn") warn++; else if (st === "fail") bad++; else if (st === "info") info++ }
    return { ok: ok, warn: warn, bad: bad, info: info };
  }

  TLDBG.register({
    game: "benchkit",
    file: "bk.html",
    state: function () {
      var l = loop(), h = hy(), c = counts();
      var g = (typeof GPU_STATE !== "undefined") ? GPU_STATE : {};
      var gd = (typeof GUARD !== "undefined") ? GUARD : {};
      var tests = (typeof TESTS !== "undefined") ? TESTS.length : 0;
      return {
        lang: (typeof currentLang !== "undefined") ? currentLang : "?",
        running: !!l.running,
        abort: !!l.abort,
        passes: l.passes || 0,
        statKeys: Object.keys(l.stats || {}).length,
        tests: tests,
        results: Object.keys(res()).length,
        pass: c.ok, warn: c.warn, fail: c.bad,
        stressActive: h ? !!h.active : false,
        stressEndless: h ? !!h.endless : false,
        stressWorkers: h ? (h.ws ? h.ws.length : 0) : 0,
        stressDur: h ? (h.dur || 0) : 0,
        cpuAcc: h ? Math.round(h.acc ? h.acc.cpu : 0) : 0,
        ramErrs: h ? (h.ramPErrs || 0) : 0,
        gpuLosses: g.losses != null ? g.losses : 0,
        gpuRestored: g.restored !== undefined ? !!g.restored : true,
        guard: !!gd.active,
        labDur: +val("labDur") || 0,
        labThreads: +val("labThreads") || 0,
        passSel: val("loopSel") || "-"
      };
    },
    params: [
      { id: "labDur", label: "Stress duration", unit: "ms", min: 0, max: 600000, step: 1000,
        get: function () { return +val("labDur") || 0 },
        set: function (v) { put("labDur", v) },
        code: { file: "bk.html", line: 1742, name: "$(\"#labDur\").value" },
        doc: "Hybrid stress run length read straight from the select box; 0 means endless. The select only offers 30 s / 1 min / 2 min / 5 min / endless, so a write snaps to the nearest real option" },
      { id: "labThreads", label: "CPU threads pinned", unit: "workers", min: 0, max: 64, step: 1,
        get: function () { return +val("labThreads") || 0 },
        set: function (v) { put("labThreads", v) },
        code: { file: "bk.html", line: 1744, name: "$(\"#labThreads\").value" },
        doc: "Worker count the stress lab spawns; capped by navigator.hardwareConcurrency" },
      { id: "passes", label: "Bench passes", unit: "passes", min: 1, max: 20, step: 1,
        get: function () { return +val("loopSel") || 1 },
        set: function (v) { put("loopSel", v) },
        code: { file: "bk.html", line: 2667, name: "LOOP / #loopSel" },
        doc: "How many times the whole suite runs; multi-pass scores min/avg/max and flags trends below -15%" },
      { id: "safePreset", label: "PRESET safe: dur / half threads", unit: "ms", min: 1000, max: 120000, step: 1000,
        readonly: true,
        get: function () { return 30000 },
        code: { file: "bk.html", line: 1639, name: "set(\"labDur\",30000)" },
        doc: "READ ONLY literal: the SAFE preset sets 30 s and half the threads" },
      { id: "stdPreset", label: "PRESET standard: dur / all threads", unit: "ms", min: 1000, max: 300000, step: 1000,
        readonly: true,
        get: function () { return 60000 },
        code: { file: "bk.html", line: 1641, name: "set(\"labDur\",60000)" },
        doc: "READ ONLY literal: the STANDARD preset sets 60 s and all threads" },
      { id: "extremePreset", label: "PRESET extreme: dur / all threads", unit: "ms", min: 1000, max: 900000, step: 1000,
        readonly: true,
        get: function () { return 300000 },
        code: { file: "bk.html", line: 1643, name: "set(\"labDur\",300000)" },
        doc: "READ ONLY literal: the EXTREME preset sets 300 s and all threads" },
      { id: "runnerTimeout", label: "Runner watchdog", unit: "ms", min: 10000, max: 600000, step: 1000,
        readonly: true,
        get: function () { return 120000 },
        code: { file: "bk.html", line: 2687, name: "withTimeout(...,120000)" },
        doc: "READ ONLY literal: a test that has not reported in 120 s is failed as TIMEOUT" },
      { id: "codecN", label: "Codec block size N / K", unit: "px", min: 32, max: 1024, step: 16,
        readonly: true,
        get: function () { return 256 },
        code: { file: "bk.html", line: 1439, name: "N=256,K=24" },
        doc: "READ ONLY consts: the codec probe works on a 256 px buffer with 24 frames" },
      { id: "stressCanvas", label: "Stress canvas size", unit: "px", min: 320, max: 3840, step: 40,
        readonly: true,
        get: function () { return 1280 },
        code: { file: "bk.html", line: 1519, name: "W=1280,H=720" },
        doc: "READ ONLY consts: offscreen canvas used by the 2D/3D/codec stress channels" },
      { id: "torusSeg", label: "Torus segments / tube", unit: "seg", min: 64, max: 1024, step: 4,
        readonly: true,
        get: function () { return 260 },
        code: { file: "bk.html", line: 1297, name: "SEG=260,TUB=64" },
        doc: "READ ONLY consts: geometry density of the WebGL 3D scene that measures frame rate" },
      { id: "stressWindow", label: "Stability window", unit: "samples", min: 2, max: 60, step: 1,
        readonly: true,
        get: function () { return (hy() && hy().win) || 0 },
        code: { file: "bk.html", line: 1623, name: "HY.win" },
        doc: "READ ONLY during a run: sample window the trend check uses; live value shown here" }
    ],
    cheats: [
      { id: "abortSuite", label: "Abort bench suite", doc: "sets LOOP.abort=true, the page's own stop switch",
        run: function () { loop().abort = true; TLDBG.toast("LOOP.abort=true") } },
      { id: "clickStop", label: "Press Stop", doc: "clicks the real #btnStopAll button", run: function () { TLDBG.toast(click("btnStopAll") ? "#btnStopAll clicked" : "#btnStopAll not found") } },
      { id: "stopLab", label: "Stop stress lab", doc: "clicks #btnLabAbort to end hybrid stress", run: function () { TLDBG.toast(click("btnLabAbort") ? "#btnLabAbort clicked" : "#btnLabAbort not found") } },
      { id: "endless", label: "Force endless stress", doc: "sets #labDur to 0, which the page reads as endless", run: function () { put("labDur", 0); TLDBG.toast("labDur=0 (endless)") } },
      { id: "allChannels", label: "Enable every load channel", doc: "ticks all stress channel checkboxes (GPU 2D/3D/AI/RAM/RAM-pool/IO/codec/video)",
        run: function () {
          var ids = ["chG2d", "chG3d", "chAi", "chRam", "chRamP", "chIo", "chCodec", "chV", "chH"], n = 0;
          ids.forEach(function (id) { var e = document.getElementById(id); if (e && !e.checked) { e.checked = true; n++ } });
          TLDBG.toast("enabled " + n + " channel(s)");
        } },
      { id: "gpuLoss", label: "Simulate GPU context loss", doc: "calls the page's own gpuLoss() on the WebGL canvas to test recovery",
        run: function () { if (typeof gpuLoss === "function") { gpuLoss("cvGL"); TLDBG.toast("gpuLoss('cvGL') called") } else TLDBG.toast("gpuLoss() not reachable") } },
      { id: "redetect", label: "Re-detect hardware", doc: "clicks #btnReDetect to re-run the identification pass", run: function () { TLDBG.toast(click("btnReDetect") ? "#btnReDetect clicked" : "#btnReDetect not found") } },
      { id: "ledsBad", label: "Force LEDs to warn/bad", doc: "paints the PWR/NET/BATT LEDs red - useful to photograph the layout states",
        run: function () {
          ["ledAll", "ledNet", "ledBat"].forEach(function (id) { var e = document.getElementById(id); if (e) e.className = "led bad" });
          TLDBG.toast("LEDs forced bad");
        } },
      { id: "guardOn", label: "Keep GPU guard alive", doc: "marks GUARD.active so the page keeps a wake lock / oscillator running",
        run: function () { if (typeof GUARD !== "undefined") { GUARD.active = true; TLDBG.toast("GUARD.active=true") } else TLDBG.toast("GUARD not reachable") } },
      { id: "onePass", label: "Force single pass", doc: "sets the pass select to 1 so the suite finishes fast", run: function () { put("loopSel", "1"); TLDBG.toast("passes=1") } }
    ],
    hooks: [
      { label: "console.table(TESTS)", doc: "the whole test registry: id + human label",
        run: function () { console.table((typeof TESTS !== "undefined") ? TESTS.map(function (x) { return { id: x[0], label: x[1] } }) : []) } },
      { label: "log R (results)", doc: "every test card: status, value, detail, timestamp",
        run: function () { console.log(res()) } },
      { label: "log HY (stress state)", doc: "active flags, accumulated counters, samples, worker list",
        run: function () { console.log(hy()) } },
      { label: "log SPECS / GPU_STATE / GUARD", doc: "detected spec rows and the GPU-loss bookkeeping",
        run: function () { console.log((typeof SPECS !== "undefined") ? SPECS : null, (typeof GPU_STATE !== "undefined") ? GPU_STATE : null, (typeof GUARD !== "undefined") ? GUARD : null) } },
      { label: "log missing translations", doc: "keys the current language table lacks compared with en",
        run: function () {
          var t = (typeof I18N !== "undefined") ? I18N : {};
          var en = t.en || {}, cur = t[(typeof currentLang !== "undefined") ? currentLang : "en"] || en;
          var missing = Object.keys(en).filter(function (k) { return cur[k] == null });
          console.log("language " + (typeof currentLang !== "undefined" ? currentLang : "en") + " missing " + missing.length + " of " + Object.keys(en).length, missing);
        } }
    ],
    layout: [
      { sel: "#topbar", label: "top bar (ticket, LEDs, clock)" },
      { sel: "#buildTag", label: "build tag" },
      { sel: "#langSel", label: "language select" },
      { sel: "#runbar", label: "run meter bar" },
      { sel: "#runFill", label: "run meter fill" },
      { sel: "#sysCard", label: "system card" },
      { sel: "#specStrip", label: "detected spec strip" },
      { sel: ".sec", label: "each numbered section" },
      { sel: ".btn", label: "buttons" },
      { sel: "[data-t]", label: "one test card" },
      { sel: "#latPad", label: "latency pad" },
      { sel: "#cv2d", label: "2D test canvas" },
      { sel: "#cvGL", label: "WebGL test canvas" },
      { sel: "#codecCaps", label: "codec capability table" },
      { sel: "#preSafe", label: "SAFE preset chip" },
      { sel: "#preStd", label: "STANDARD preset chip" },
      { sel: "#preExt", label: "EXTREME preset chip" },
      { sel: "#labElapsed", label: "stress elapsed readout" },
      { sel: "#labDur", label: "stress duration select" },
      { sel: "#labThreads", label: "thread count select" },
      { sel: "#lbG3d", label: "stress 3D viewport" },
      { sel: "#bL", label: "report line left" },
      { sel: "#bR", label: "report line right" }
    ],
    texts: {
      langs: function () { return (typeof I18N !== "undefined") ? Object.keys(I18N) : ["en"] },
      keys: function (l) { var t = (typeof I18N !== "undefined") ? (I18N[l] || I18N.en) : {}; return Object.keys(t) },
      get: function (l, k) { var t = (typeof I18N !== "undefined") ? I18N : {}; return (t[l] && t[l][k] != null) ? t[l][k] : ((t.en && t.en[k] != null) ? t.en[k] : "") },
      set: function (l, k, v) { if (typeof I18N === "undefined") return; I18N[l] = I18N[l] || {}; I18N[l][k] = v },
      apply: function () { if (typeof applyTranslations === "function") applyTranslations() }
    },
    control: [
      { id: "run", label: "Run the bench or stop it", args: '"all" | "stop" — or a test id to run one', argDefault: "all",
        doc: "runLoop() runs the whole queue for the selected pass count; a test id (cpuSingle, gpu3d, net, …) runs just that runner, the same path the card's RUN button takes.",
        run: async function (w) {
          var s = String(w || "all");
          if (s === "stop") { LOOP.abort = true; return { running: !!LOOP.running, passes: LOOP.passes }; }
          if (s === "all") { if (LOOP.running) return "already running"; runLoop(); return { started: true, passesTarget: +( ($("#loopSel") || {}).value || 1 ) }; }
          var fn = RUN[s];
          if (typeof fn !== "function") return "no runner for " + s + " — ids: " + Object.keys(RUN).join(", ");
          if (LOOP.running) return "full bench is running — stop it first";
          await fn();
          return { test: s, status: R[s] ? (R[s].status || "?") : "?", value: R[s] ? R[s].value : undefined };
        } },
      { id: "passes", label: "Set the loop pass count", args: "passes (0 = infinite)", argDefault: 3,
        doc: "Writes #loopSel, the pass count runLoop() honours — multiple passes give min/avg/max in the ledger, which is what separates noise from a regression.",
        run: function (n) {
          var sel = document.getElementById("loopSel"); if (!sel) return "no pass selector on this page";
          sel.value = String(Math.max(0, Math.round(Number(n) || 1)));
          sel.dispatchEvent(new Event("change"));
          return { passes: sel.value };
        } },
      { id: "queue", label: "Run a chosen subset of tests", args: "array of test ids", argDefault: '["cpuSingle", "memBW", "refresh"]',
        doc: "Runs the listed runners in order and prints each status — the targeted suite for one subsystem (CPU, memory, GPU, network).",
        run: async function (ids) {
          if (!Array.isArray(ids)) return "want an array of test ids";
          var out = [];
          for (var i = 0; i < ids.length; i++) {
            var id = String(ids[i]), fn = RUN[id];
            if (typeof fn !== "function") { out.push({ test: id, status: "missing" }); continue; }
            try { await fn(); } catch (e) { out.push({ test: id, status: "error", message: e && e.message }); continue; }
            out.push({ test: id, status: R[id] ? R[id].status : "?", value: R[id] ? R[id].value : undefined, detail: R[id] ? R[id].detail : undefined });
          }
          console.table(out);
          return out;
        } },
      { id: "mark", label: "Mark a card pass or fail", args: '["testId", "pass"|"fail"]', argDefault: '["gpu3d", "pass"]',
        doc: "setStatus(...) — the technician sign-off the card buttons write; useful when a runner's own verdict is wrong.",
        run: function (a) {
          if (!Array.isArray(a)) return 'want ["testId", "pass"|"fail"]';
          var id = String(a[0]), pass = String(a[1]) !== "fail";
          if (typeof setStatus === "function") setStatus(id, pass ? "pass" : "fail", pass ? "PASS" : "FAIL", "Set from the debug harness.");
          return { test: id, status: R[id] ? R[id].status : "?" };
        } },
      { id: "gpu", label: "Re-detect GPU and tech features", args: '"tech" | "codec"', argDefault: "tech",
        doc: "runTechDetect() / runCodecTech() refresh GPU_STATE — the WebGL/WebGPU/codec capability probe the report prints.",
        run: async function (w) {
          if (String(w) === "codec") { try { await runCodecTech(); } catch (e) { return "codec probe failed: " + (e && e.message); } }
          else runTechDetect();
          return { gpu: GPU_STATE ? (GPU_STATE.gpu || GPU_STATE.renderer || "?") : "?", webgpu: GPU_STATE ? !!GPU_STATE.webgpu : false, webgl: GPU_STATE ? !!GPU_STATE.webgl : false };
        } },
      { id: "probe", label: "Read the bench state", args: "unused",
        doc: "Whether the loop is running, passes done, the queue and registered runners, every recorded result (status/value/detail), heap usage and the hardware summary.",
        run: function () {
          var res = {};
          Object.keys(R).forEach(function (k) { var r = R[k]; res[k] = { status: r.status || "-", value: r.value, detail: r.detail } });
          return { running: !!LOOP.running, aborted: !!LOOP.abort, passes: LOOP.passes,
            queue: typeof QUEUE !== "undefined" ? QUEUE : [], runners: Object.keys(RUN),
            results: res,
            heap: performance.memory ? { usedMB: num(performance.memory.usedJSHeapSize / 1048576, 1), limitMB: num(performance.memory.jsHeapSizeLimit / 1048576, 1) } : null,
            gpu: GPU_STATE ? { renderer: GPU_STATE.gpu || GPU_STATE.renderer, webgl: !!GPU_STATE.webgl, webgpu: !!GPU_STATE.webgpu } : null };
        } },
      { id: "watch", label: "Log the run every N seconds", args: "seconds (0 stops)", argDefault: 1,
        doc: "Pass count, current step text and heap each interval while the bench runs; window.__tllBench holds the timer.",
        run: function (s) {
          if (window.__tllBench) { clearInterval(window.__tllBench); window.__tllBench = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllBench = setInterval(function () {
            var step = document.getElementById("runStep");
            console.log("running", LOOP.running, "passes", LOOP.passes, "step", step ? step.textContent : "-",
              "heapMB", performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) : "n/a");
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Full suite then a result table",
        doc: "Runs three passes of the whole queue, then prints a status/value table — the regression snapshot for this machine.",
        js: 'var sel = document.getElementById("loopSel");\nif (sel) { sel.value = "3"; sel.dispatchEvent(new Event("change")); }\nrunLoop().then(function () {\n  var rows = Object.keys(R).map(function (k) { return { test: k, status: R[k].status || "-", value: R[k].value, detail: R[k].detail }; });\n  console.table(rows);\n});' },
      { label: "CPU/memory subset with heap deltas",
        doc: "Runs only the CPU and memory runners, printing heap before and after each — shows which test actually grows the heap.",
        js: 'var ids = ["cpuSingle", "cpuMulti", "cpuFloat", "memBW", "memLat", "memCheck"];\nvar out = [];\n(async function () {\n  for (var i = 0; i < ids.length; i++) {\n    var before = performance.memory ? performance.memory.usedJSHeapSize : 0;\n    await RUN[ids[i]]();\n    out.push({ test: ids[i], status: R[ids[i]].status, value: R[ids[i]].value, heapDeltaMB: performance.memory ? ((performance.memory.usedJSHeapSize - before) / 1048576).toFixed(1) : "n/a" });\n  }\n  console.table(out);\n})();' }
    ],

    docs: [
      { topic: "What this panel is", text: "BENCHKIT driven live: STATE polls the page's own LOOP (suite running/abort/passes), HY (hybrid stress counters, workers, samples), R (per-test results) and GPU_STATE every 700 ms." },
      { topic: "How it reaches the page", text: "bk.html keeps all of its names at the top level of its script, so no window.TLHOOK bridge is needed - the panel reads LOOP, HY, R, TESTS, SPECS, GPU_STATE, GUARD and I18N directly, and drives the UI by setting the page's own select/checkbox values and clicking its own buttons." },
      { topic: "Editable vs documented", text: "Stress duration, thread count and pass count write into the real controls (and fire their input/change events, so the page re-reads them). The presets (30 s / 60 s / 300 s at lines 1639/1641/1643), the 120 s runner watchdog (2687), the codec block N/K (1439), the offscreen canvas size (1519) and the torus density SEG/TUB (1297) are literals/consts inside functions: READ ONLY rows that export their exact source line for the LLM to patch." },
      { topic: "Cheats", text: "Abort the suite (LOOP.abort), stop the stress lab, force endless, enable all load channels, force a GPU context loss through the page's own gpuLoss() so you can watch the recovery path, re-detect hardware, force LED states for layout screenshots, keep the GPU guard active, force a single pass." },
      { topic: "Layout editing", text: "LAYOUT resizes and repositions the top bar, run meter, spec strip, test cards, canvases and preset chips per screen mode. The preview applies the bucket you are editing; the export wraps each bucket in its media query." },
      { topic: "Texts", text: "The page keeps its own I18N table (en + ru, flat keys with {n} placeholders) and re-renders with applyTranslations(). TEXTS edits I18N for the selected language and re-applies immediately; CODE logs keys the current table is missing." }
    ]
  });
})();
