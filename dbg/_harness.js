/* ============================================================================
   dbg/_harness.js — shared developer harness engine for every page of this
   site. Loaded ONLY when the URL carries ?debug=..., never in normal play:

       game.html?debug=dbg/game.js

   The page's own loader (a few lines near </body>) fetches this file first,
   then the game-specific script named in the parameter. That script calls
   TLDBG.register({...}) and nothing else. When the script is missing, fails
   to load, or throws, the game runs completely unchanged: the loader logs one
   console warning and does nothing else.

   What the panel gives a developer
     STATE     live snapshot of the game's own variables, refreshed continuously
     ELEMENTS  every element with its name/classes/attributes/rect/computed
               style, plus a click-to-pick mode and a highlight overlay
     LAYOUT    sizes, positions, alignment and typography per screen mode
               (portrait/landscape x mobile/desktop, plus "any"), applied with
               media queries so several modes coexist
     TEXTS     every translation key of every language, editable live
     BALANCE   the game's numbers and coefficients, editable live
     CHEATS    the game script's debugging cheats (god mode, refill, skip, ...)
     CODE      free CSS/JS the developer runs against the live page
     EXPORT    JSON of all edits + element map + state snapshot, downloadable
               for an LLM harness to fold back into the game's source files
     DOCS      what each control is, written by the game script

   All edits are also kept in localStorage under tll:dbg:<game>, so a reload
   keeps the tuning session. See dbg/README.md for the export schema.
   ========================================================================= */
(function () {
  "use strict";
  if (window.TLDBG && window.TLDBG.version) return;      // one engine per page

  var VER = "2026.11.23.2";
  var MODES = ["portrait-mobile", "portrait-desktop", "landscape-mobile", "landscape-desktop", "any"];
  var PROPS = [
    ["width", "width"], ["height", "height"], ["min-width", "min-width"], ["max-width", "max-width"],
    ["position", "position"], ["top", "top"], ["left", "left"], ["right", "right"], ["bottom", "bottom"],
    ["display", "display"], ["flex-direction", "flex-direction"], ["justify-content", "justify"],
    ["align-items", "align-items"], ["gap", "gap"], ["padding", "padding"], ["margin", "margin"],
    ["font-size", "font-size"], ["letter-spacing", "letter-spacing"], ["text-align", "text-align"],
    ["line-height", "line-height"], ["border-radius", "border-radius"], ["opacity", "opacity"],
    ["z-index", "z-index"], ["overflow", "overflow"], ["transform", "transform"]
  ];
  var ALIGN_PRESETS = {
    "flex row center": "display:flex;flex-direction:row;align-items:center;justify-content:center",
    "flex column center": "display:flex;flex-direction:column;align-items:center;justify-content:center",
    "flex row spread": "display:flex;flex-direction:row;align-items:center;justify-content:space-between",
    "flex column start": "display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start",
    "grid 2 cols": "display:grid;grid-template-columns:1fr 1fr;gap:8px",
    "block centered": "display:block;text-align:center",
    "absolute left-bottom": "position:absolute;left:12px;bottom:12px",
    "absolute right-top": "position:absolute;right:12px;top:12px"
  };

  var spec = null;
  var game = "page", storageKey = "tll:dbg:page";
  var edits = { layout: {}, texts: {}, balance: {}, css: "", js: "", notes: "", cheatsUsed: [],
    elText: {}, classes: {}, attrs: {}, comments: {} };
  var base = { layout: {}, texts: {}, elText: {}, balance: {}, classes: {}, attrs: {} };
  var sel = "#";                              // element the Layout tab edits
  var picked = null, overlay = null, pickMode = false;
  var wys = { on: false, pinned: false, el: null };   // WYSIWYG hover editor
  var wysPanel = null, wysMark = null, wysBound = false;
  var styleEl = null, panel = null, tab = "STATE", open = true;
  var stateTimer = 0, storeTimer = 0;
  var textCache = null, textLang = null;

  /* ---------------------------------------------------------------- storage */
  function lget(k) { try { return localStorage.getItem(k) } catch (e) { return null } }
  function lset(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function ldel(k) { try { localStorage.removeItem(k) } catch (e) {} }
  function loadEdits() {
    try {
      var raw = lget(storageKey);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && typeof o === "object") {
        edits.layout = o.layout || {}; edits.texts = o.texts || {}; edits.balance = o.balance || {};
        edits.css = o.css || ""; edits.js = o.js || ""; edits.notes = o.notes || "";
        edits.cheatsUsed = o.cheatsUsed || [];
        edits.elText = o.elText || {}; edits.classes = o.classes || {}; edits.attrs = o.attrs || {};
        edits.comments = o.comments || {};
        if (o.base && typeof o.base === "object") base = o.base;
      }
    } catch (e) {}
  }
  function saveEdits() {
    clearTimeout(storeTimer);
    storeTimer = setTimeout(function () { try { lset(storageKey, JSON.stringify({ layout: edits.layout, texts: edits.texts, balance: edits.balance, css: edits.css, js: edits.js, notes: edits.notes, cheatsUsed: edits.cheatsUsed, elText: edits.elText, classes: edits.classes, attrs: edits.attrs, comments: edits.comments, base: base })) } catch (e) {} }, 350);
  }

  /* ------------------------------------------------------------ screen mode */
  function mq(q) { try { return window.matchMedia(q).matches } catch (e) { return false } }
  function screenMode() {
    var orient = mq("(orientation: portrait)") ? "portrait" : "landscape";
    var kind = mq("(pointer: coarse)") || mq("(max-width: 720px)") ? "mobile" : "desktop";
    return orient + "-" + kind;
  }
  function mediaOf(mode) {
    if (mode === "any") return "";
    var p = mode.split("-");
    return "@media (orientation: " + p[0] + ") and (pointer: " + (p[1] === "mobile" ? "coarse" : "fine") + ")";
  }

  /* ------------------------------------------------------------- language */
  function kit() { return (window.TLI18N && typeof TLI18N.t === "function") ? TLI18N : null; }
  function langs() {
    var l = (spec && spec.texts && spec.texts.langs) || null;   // array or getter function
    if (l) { try { l = (typeof l === "function") ? l() : l } catch (e) { l = null } }
    if (l && l.length) return l;
    var k = kit();
    return k ? k.codes : ["en"];
  }
  /* the language the page is actually showing right now */
  function activeLang() {
    var k = kit();
    if (k) { try { var l = k.lang(); if (l) return l } catch (e) {} }
    if (spec && spec.texts && typeof spec.texts.lang === "function") {
      try { var s = spec.texts.lang(); if (s) return s } catch (e) {}
    }
    var dl = document.documentElement.lang;
    if (dl) {
      var code = String(dl).split("-")[0].toLowerCase(), ls = langs();
      if (ls.indexOf(code) >= 0) return code;
    }
    return textLang || langs()[0] || "en";
  }
  function textKeys(lang) {
    if (textCache && textLang === lang) return textCache;
    var out = [];
    if (spec && spec.texts && typeof spec.texts.keys === "function") {
      try { out = spec.texts.keys(lang) || [] } catch (e) { out = [] }
    } else {
      var k = kit();
      if (k && typeof k.keys === "function") { try { out = k.keys(lang) || [] } catch (e) { out = [] } }
    }
    textCache = out; textLang = lang; return out;
  }
  function textGet(lang, key) {
    if (spec && spec.texts && typeof spec.texts.get === "function") {
      try { return spec.texts.get(lang, key) } catch (e) { return "" }
    }
    var k = kit();
    if (k && typeof k.table === "function") {
      try { var T = k.table(); return (T[lang] && T[lang][key] != null) ? T[lang][key] : (T.en && T.en[key] != null ? T.en[key] : "") } catch (e) { return "" }
    }
    return "";
  }
  function recBase(store, key, val) {
    if (base[store] && base[store][key] === undefined) { base[store][key] = val === undefined ? "" : val; saveEdits(); }
  }
  function textSet(lang, key, val) {
    recBase("texts", lang + "|" + key, textGet(lang, key));
    (edits.texts[lang] = edits.texts[lang] || {})[key] = val;
    if (spec && spec.texts && typeof spec.texts.set === "function") {
      try { spec.texts.set(lang, key, val); if (spec.texts.apply) spec.texts.apply(); } catch (e) {}
    } else {
      var k = kit();
      if (k && typeof k.setKey === "function") { try { k.setKey(lang, key, val) } catch (e) {} }
    }
    saveEdits();
  }
  function applyTextsAll() {
    if (spec && spec.texts && spec.texts.apply) { try { spec.texts.apply() } catch (e) {} }
    else { var k = kit(); if (k) { try { k.apply() } catch (e) {} } }
  }

  /* ------------------------------------------------------------- layout css */
  function buildCss() {
    /* The live preview applies the bucket you are editing UNWRAPPED, so you see
       your change even when the window does not match that screen mode. The
       export wraps every bucket in its media query (applyHints), which is what
       lands in the page. */
    var live = editMode || screenMode();
    var css = "", body = "";
    for (var p0 in edits.layout[live] || {}) {
      var o0 = edits.layout[live][p0], d0 = "";
      for (var q0 in o0) if (o0[q0] !== "" && o0[q0] != null) d0 += q0 + ":" + o0[q0] + " !important;";
      if (d0) body += p0 + "{" + d0 + "}\n";
    }
    css += body;
    for (var i = 0; i < MODES.length; i++) {
      var mode = MODES[i], set = edits.layout[mode], b2 = "";
      if (!set || mode === live) continue;
      for (var s in set) {
        var props = set[s], decl = "";
        for (var p in props) {
          var v = props[p];
          if (v === "" || v == null) continue;
          decl += p + ":" + v + " !important;";
        }
        if (decl) b2 += s + "{" + decl + "}\n";
      }
      if (!b2) continue;
      var m = mediaOf(mode);
      css += m ? m + "{\n" + b2 + "}\n" : b2;
    }
    if (edits.css) css += "\n/* developer CSS */\n" + edits.css + "\n";
    return css;
  }
  function applyCss() {
    if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "tll-dbg-style"; document.head.appendChild(styleEl); }
    styleEl.textContent = buildCss();
  }
  function applyStoredEdits() {
    for (var s in edits.elText) { var e = document.querySelector(s); if (e) e.textContent = edits.elText[s] }
    for (var s2 in edits.classes) { var e2 = document.querySelector(s2); if (e2 && typeof e2.className === "string") e2.className = (edits.classes[s2] || []).join(" ") }
    for (var s3 in edits.attrs) { var e3 = document.querySelector(s3); if (e3) { for (var k in edits.attrs[s3]) e3.setAttribute(k, edits.attrs[s3][k]) } }
  }
  function setProp(selector, prop, val) {
    var mode = editMode || screenMode();
    var probeEl = null; try { probeEl = document.querySelector(selector) } catch (e) {}
    recBase("layout", mode + "|" + selector + "|" + prop,
      probeEl ? (window.getComputedStyle(probeEl)[prop] || "") : "");
    var bucket = (edits.layout[mode] = edits.layout[mode] || {});
    var one = (bucket[selector] = bucket[selector] || {});
    if (val === "" || val == null) delete one[prop]; else one[prop] = val;
    if (!Object.keys(one).length) delete bucket[selector];
    applyCss(); saveEdits();
  }
  function applyPreset(selector, preset) {
    var mode = editMode || screenMode();
    var probeEl = null; try { probeEl = document.querySelector(selector) } catch (e) {}
    var one = ((edits.layout[mode] = edits.layout[mode] || {})[selector] = edits.layout[mode][selector] || {});
    var parts = (ALIGN_PRESETS[preset] || preset).split(";");
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split(":");
      if (kv.length === 2) {
        recBase("layout", mode + "|" + selector + "|" + kv[0].trim(),
          probeEl ? (window.getComputedStyle(probeEl)[kv[0].trim()] || "") : "");
        one[kv[0].trim()] = kv[1].trim();
      }
    }
    applyCss(); saveEdits();
  }

  /* ---------------------------------------------------------------- element */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }) }
  function selectorOf(el) {
    if (!el || el === document.body) return "body";
    if (el.id) return "#" + el.id;
    var cls = (el.className && typeof el.className === "string") ? el.className.trim().split(/\s+/).filter(function (c) { return c && !/[^\w-]/.test(c) }) : [];
    var base = el.tagName.toLowerCase() + (cls.length ? "." + cls.slice(0, 2).join(".") : "");
    var par = el.parentNode, kids = par ? [].slice.call(par.children).filter(function (c) { return c.tagName === el.tagName }) : [];
    return base + (kids.length > 1 ? ":nth-child(" + ([].slice.call(par.children).indexOf(el) + 1) + ")" : "");
  }
  function info(el) {
    if (!el) return null;
    var cs = window.getComputedStyle(el), r = el.getBoundingClientRect(), attrs = {};
    for (var i = 0; i < el.attributes.length; i++) attrs[el.attributes[i].name] = el.attributes[i].value;
    return {
      selector: selectorOf(el), tag: el.tagName, id: el.id || "", classes: (el.className && typeof el.className === "string") ? el.className.trim().split(/\s+/) : [],
      attrs: attrs, dataT: el.getAttribute("data-t") || el.getAttribute("data-i18n") || "",
      text: (el.textContent || "").trim().slice(0, 60),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      computed: {
        "position": cs.position, "display": cs.display, "width": cs.width, "height": cs.height,
        "top": cs.top, "left": cs.left, "font-size": cs.fontSize, "letter-spacing": cs.letterSpacing,
        "text-align": cs.textAlign, "justify-content": cs.justifyContent, "align-items": cs.alignItems,
        "gap": cs.gap, "padding": cs.padding, "margin": cs.margin, "opacity": cs.opacity, "z-index": cs.zIndex
      },
      screenMode: screenMode()
    };
  }
  function interesting() {
    var all = [].slice.call(document.querySelectorAll("body *"));
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (panel && panel.contains(el)) continue;
      if (overlay && overlay.contains(el)) continue;
      var hasData = el.hasAttribute("data-t") || el.hasAttribute("data-i18n") || el.hasAttribute("data-ph") || el.hasAttribute("data-tip");
      var interactive = /^(BUTTON|INPUT|SELECT|A|CANVAS|LABEL)$/.test(el.tagName);
      var named = el.id || (el.className && typeof el.className === "string" && el.className.trim());
      if (hasData || interactive || named) out.push(el);
      if (out.length >= 420) break;
    }
    return out;
  }
  function show(el) {
    picked = el; sel = selectorOf(el);
    if (!overlay) { overlay = document.createElement("div"); document.body.appendChild(overlay); }
    overlay.style.cssText = "position:fixed;pointer-events:none;z-index:2147483002;border:2px solid #ffd76a;" +
      "box-shadow:0 0 14px rgba(255,215,106,.45) inset;background:rgba(255,215,106,.08);display:none";
    moveOverlay();
    renderTab();
  }
  function moveOverlay() {
    if (!overlay || !picked) return;
    var r = picked.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.left = r.x + "px"; overlay.style.top = r.y + "px";
    overlay.style.width = r.width + "px"; overlay.style.height = r.height + "px";
  }
  function startPick() { startWys(); }

  /* --------------------------------------------------- WYSIWYG hover editor
     Pick mode: hover to inspect any element, click to pin it, and edit text,
     classes, attributes, every layout property and transforms live in a popup
     next to the object. Esc exits. Keys and clicks do not reach the game while
     the popup is engaged.                                                        */
  function wysEnsure() {
    if (!wysMark) { wysMark = document.createElement("div"); wysMark.className = "tldbg-mark"; document.body.appendChild(wysMark); }
    if (!wysPanel) {
      wysPanel = document.createElement("div");
      wysPanel.className = "tldbg-wys";
      wysPanel.addEventListener("keydown", function (e) { e.stopPropagation() }, true);
      wysPanel.addEventListener("pointerdown", function (e) { e.stopPropagation() }, true);
      wysPanel.addEventListener("wheel", function (e) { e.stopPropagation() }, true);
      document.body.appendChild(wysPanel);
    }
  }
  function markRect(el) {
    if (!wysMark || !el) return;
    var r = el.getBoundingClientRect();
    wysMark.style.display = "block";
    wysMark.style.left = r.x + "px"; wysMark.style.top = r.y + "px";
    wysMark.style.width = r.width + "px"; wysMark.style.height = r.height + "px";
  }
  function placeWys(el) {
    if (!wysPanel || !el) return;
    var r = el.getBoundingClientRect(), pw = wysPanel.offsetWidth || 296, ph = wysPanel.offsetHeight || 280;
    var x = r.x + r.width + 12, y = r.y + 12;
    if (x + pw > window.innerWidth - 8) x = r.x - pw - 12;
    if (x < 8) x = 8;
    if (y + ph > window.innerHeight - 8) y = Math.max(8, window.innerHeight - ph - 8);
    wysPanel.style.left = x + "px"; wysPanel.style.top = y + "px";
  }
  function bucketOf(s) {
    var mode = editMode || screenMode();
    return ((edits.layout[mode] || {})[s] || {});
  }
  function ownText(el) {
    var t = "";
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) t += n.nodeValue;
    return t.trim() || (el.textContent || "").trim();
  }
  function applyElText(el, val) {
    var s = selectorOf(el);
    var key = textKeyOf(el);
    if (key) {
      /* the markup holds no copy of this string: the delta must point at the
         table entry in the language the page shows, not at the element */
      textSet(activeLang(), key, val);
      el.textContent = val;
      applyTextsAll();
      if (edits.elText[s] !== undefined) delete edits.elText[s];
    } else {
      recBase("elText", s, el.textContent || "");
      edits.elText[s] = val;
      el.textContent = val;
    }
    saveEdits();
  }
  function applyClasses(el, val) {
    var s = selectorOf(el);
    recBase("classes", s, (typeof el.className === "string") ? el.className : "");
    var want = String(val || "").trim().split(/\s+/).filter(Boolean);
    edits.classes[s] = want;
    if (typeof el.className === "string") el.className = want.join(" ");
    saveEdits();
  }
  function applyAttr(el, name, val) {
    var s = selectorOf(el);
    if (!name) return;
    var rec = (edits.attrs[s] = edits.attrs[s] || {});
    recBase("attrs", s + "|" + name, el.getAttribute(name) === null ? "" : el.getAttribute(name));
    if (val === "" || val == null) { el.removeAttribute(name); delete rec[name]; }
    else { el.setAttribute(name, val); rec[name] = val; }
    saveEdits();
  }
  function nudgeNum(el, prop, amount, unit) {
    var cs = window.getComputedStyle(el);
    var s = selectorOf(el);
    var b = bucketOf(s);
    var cur = b[prop] !== undefined ? b[prop] : (cs[prop] || "");
    var n = parseFloat(cur); if (!isFinite(n)) n = 0;
    setProp(s, prop, (n + amount) + (unit || ""));
  }
  function transformAdd(el, frag) {
    var cs = window.getComputedStyle(el);
    var cur = cs.transform === "none" ? "" : cs.transform;
    setProp(selectorOf(el), "transform", (cur ? cur + " " : "") + frag);
  }
  function startWys() {
    wysEnsure();
    dragEnsure();
    wys.on = true; wys.pinned = false; wys.el = picked;
    wysPanel.classList.add("on");
    if (!wysBound) {
      wysBound = true;
      window.addEventListener("pointermove", wysMove, true);
      window.addEventListener("pointerup", wysUp, true);
      document.addEventListener("pointerdown", wysDown, true);
      document.addEventListener("click", wysClick, true);
      document.addEventListener("dblclick", wysDbl, true);
      document.addEventListener("keydown", wysKey, true);
    }
    if (wys.el) { markRect(wys.el); placeWys(wys.el); showHandles(wys.el); }
    renderWys();
    toast("WYSIWYG: hover to inspect · drag from the middle to move (auto-align) · corners to resize · double-click for text · Esc to exit");
  }
  function stopWys() {
    cancelDrag(); closeTedit(); showHandles(null); lastTap = null;
    wys.on = false; wys.pinned = false;
    if (wysPanel) wysPanel.classList.remove("on");
    if (wysMark) wysMark.style.display = "none";
    if (wysBound) {
      wysBound = false;
      window.removeEventListener("pointermove", wysMove, true);
      window.removeEventListener("pointerup", wysUp, true);
      document.removeEventListener("pointerdown", wysDown, true);
      document.removeEventListener("click", wysClick, true);
      document.removeEventListener("dblclick", wysDbl, true);
      document.removeEventListener("keydown", wysKey, true);
    }
  }
  function wysMove(e) {
    if (!wys.on) return;
    if (drag) { dragMove(e); return; }
    if (press && Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) > 6) {
      var target = press.el, sx = press.x, sy = press.y; press = null;
      beginDrag(target, null, sx, sy);
      dragMove(e);
      return;
    }
    if (wysPanel.contains(e.target) || wysPanel.contains(document.activeElement) || tedit) return;
    if (wys.pinned) { showHandles(wys.el); return }
    if (hitHandle(e.clientX, e.clientY)) return;   // pointer is over a resize handle: keep that element
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.documentElement || el === document.body || el === wysMark || harnessNode(el)) return;
    wys.el = el; picked = el; sel = selectorOf(el);
    markRect(el); placeWys(el); showHandles(el); renderWys();
  }
  function wysDown(e) {
    if (!wys.on || e.button !== 0) return;
    if (wysPanel.contains(e.target) || (tedit && tedit.contains(e.target))) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || wysPanel.contains(el) || harnessNode(el)) return;
    e.preventDefault(); e.stopPropagation();
    if (tedit) { commitTedit(wys.el); return }
    var h = hitHandle(e.clientX, e.clientY);
    if (h && wys.el) { beginDrag(wys.el, h, e.clientX, e.clientY); showHandles(wys.el); renderWys(); return }
    wys.el = el; picked = el; sel = selectorOf(el);
    markRect(el); placeWys(el); show(el); showHandles(el); renderWys();
    press = { el: el, x: e.clientX, y: e.clientY };
  }
  function wysUp(e) {
    if (!wys.on) return;
    if (drag) { e.preventDefault(); e.stopPropagation(); commitDrag(); return }
    if (!press) return;
    var moved = Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) > 6;
    press = null;
    if (moved) { lastTap = null; return }
    var now = Date.now();
    /* the native dblclick never arrives here: preventing the default on
       pointerdown suppresses the compatibility mouse sequence, so recognise the
       second quick press on the same element by hand. */
    if (lastTap && lastTap.el === wys.el && now - lastTap.t < 450) {
      lastTap = null;
      wys.pinned = true;
      openTedit(wys.el);
      renderWys();
      return;
    }
    lastTap = { t: now, el: wys.el };
    wys.pinned = true;
    toast("pinned " + selectorOf(wys.el) + " — drag to move, handles to resize, double-click for text");
    renderWys();
  }
  function wysClick(e) {
    if (wys.on && !wysPanel.contains(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }
  function wysKey(e) {
    if (!wys.on) return;
    var act = document.activeElement;
    if (wysPanel.contains(e.target) || wysPanel.contains(act) || (tedit && (tedit.contains(e.target) || tedit.contains(act)))) return;
    if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      if (drag) { cancelDrag(); renderWys(); toast("drag cancelled"); return }
      if (tedit) { closeTedit(); return }
      stopWys(); toast("WYSIWYG off"); return;
    }
    if (e.key === "Enter" && drag) { e.preventDefault(); e.stopPropagation(); commitDrag(); return }
    if (e.key === "Enter" && !wys.pinned && wys.el) { wys.pinned = true; toast("pinned " + selectorOf(wys.el)); return; }
    e.preventDefault(); e.stopPropagation();
  }

  /* ------------------------------------------------------------ drag + resize
     Press and drag from the middle of an element: a ghost copy of it follows the
     pointer while the editor reads the neighbours, their edges and corners, the
     container and the viewport, and proposes the most fitting rules — edge
     alignment, centre alignment, equal spacing, viewport margin — as absolute
     positioning or as a transform. Guides and a label name the rule; the ghost
     shows the box the element would land in. Corner and edge handles resize with
     the same rules. Release keeps the selected proposal (best one by default,
     click another row to pick it); Esc cancels. Double-click opens the element's
     text editor in the active language; Enter keeps the change.                 */
  var SNAP = 9;
  var drag = null, press = null, lastTap = null, ghost = null, snapLayer = null, handleList = null, tedit = null;

  function harnessNode(e) {
    if (!e || e.nodeType !== 1) return false;
    var cl = e.classList;
    if (cl && (cl.contains("tldbg-mark") || cl.contains("tldbg-ghost") || cl.contains("tldbg-handle") ||
      cl.contains("tldbg-snap") || cl.contains("tldbg-toast") || cl.contains("tldbg-tedit"))) return true;
    return !!(e.closest && (e.closest(".tldbg") || e.closest(".tldbg-wys")));
  }
  function dragEnsure() {
    if (!ghost) { ghost = document.createElement("div"); ghost.className = "tldbg-ghost"; ghost.setAttribute("aria-hidden", "true"); document.body.appendChild(ghost); }
    if (!snapLayer) { snapLayer = document.createElement("div"); snapLayer.className = "tldbg-snap"; document.body.appendChild(snapLayer); }
    if (!handleList) {
      handleList = [];
      ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach(function (n) {
        var h = document.createElement("div"); h.className = "tldbg-handle"; h.setAttribute("data-h", n);
        document.body.appendChild(h); handleList.push(h);
      });
    }
  }
  function showHandles(el) {
    if (!handleList) return;
    if (!el) { handleList.forEach(function (h) { h.style.display = "none" }); return; }
    var r = el.getBoundingClientRect();
    var pos = { nw: [r.left, r.top], n: [r.left + r.width / 2, r.top], ne: [r.right, r.top],
      e: [r.right, r.top + r.height / 2], se: [r.right, r.bottom], s: [r.left + r.width / 2, r.bottom],
      sw: [r.left, r.bottom], w: [r.left, r.top + r.height / 2] };
    handleList.forEach(function (h) {
      var p = pos[h.getAttribute("data-h")];
      h.style.display = "block"; h.style.left = p[0] + "px"; h.style.top = p[1] + "px";
    });
  }
  function hitHandle(x, y) {
    if (!wys.el || !handleList) return null;
    var r = wys.el.getBoundingClientRect(), T = 6;
    if (x < r.left - T || x > r.right + T || y < r.top - T || y > r.bottom + T) return null;
    var n = Math.abs(y - r.top) <= T, s = Math.abs(y - r.bottom) <= T;
    var w = Math.abs(x - r.left) <= T, e = Math.abs(x - r.right) <= T;
    /* an element thinner or shorter than the tolerance has no side handles:
       the middle of it stays a move, so small elements keep double-click text. */
    if ((w && e) || (n && s)) return null;
    if (Math.abs(x - (r.left + r.width / 2)) <= T && Math.abs(y - (r.top + r.height / 2)) <= T) return null;
    var name = (n ? "n" : s ? "s" : "") + (w ? "w" : e ? "e" : "");
    return name || null;
  }
  function prettyTransform(t) {
    if (!t || t === "none") return "";
    var m = /^matrix\(([^)]+)\)$/.exec(t.trim());
    if (!m) return t;
    var n = m[1].split(",").map(function (s) { return parseFloat(s) });
    if (n.length === 6 && n[0] === 1 && n[1] === 0 && n[2] === 0 && n[3] === 1) {
      if (!n[4] && !n[5]) return "";
      return "translate(" + Math.round(n[4] * 100) / 100 + "px, " + Math.round(n[5] * 100) / 100 + "px)";
    }
    return t;
  }
  function baseTransformOf(el) {
    var s = selectorOf(el), b = bucketOf(s);
    if (b.transform !== undefined) return b.transform;
    return prettyTransform(window.getComputedStyle(el).transform);
  }
  function snapTargets(el) {
    var t = [], W = window.innerWidth, H = window.innerHeight;
    function push(ax, kind, pos, label, ref) { t.push({ ax: ax, kind: kind, pos: pos, label: label, ref: ref || "" }) }
    push("x", "margin", 8, "8px from the left viewport edge");
    push("x", "margin", W - 8, "8px from the right viewport edge");
    push("x", "centre", W / 2, "centred in the viewport");
    push("y", "margin", 8, "8px from the top viewport edge");
    push("y", "margin", H - 8, "8px from the bottom viewport edge");
    push("y", "centre", H / 2, "centred in the viewport");
    var par = el.parentElement;
    if (par && !harnessNode(par)) {
      var pr = par.getBoundingClientRect(), ps = selectorOf(par);
      push("x", "container", pr.left, "left edge of " + ps, ps);
      push("x", "container", pr.right, "right edge of " + ps, ps);
      push("x", "container", pr.left + pr.width / 2, "centred in " + ps, ps);
      push("y", "container", pr.top, "top edge of " + ps, ps);
      push("y", "container", pr.bottom, "bottom edge of " + ps, ps);
      push("y", "container", pr.top + pr.height / 2, "centred in " + ps, ps);
    }
    var all = document.querySelectorAll("body *"), seen = 0, marks = [];
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e === el || harnessNode(e) || el.contains(e) || e.contains(el)) continue;
      var cs = window.getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
      var r = e.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      if (r.bottom < -80 || r.top > H + 80 || r.right < -80 || r.left > W + 80) continue;
      if (seen < 90) {
        seen++;
        var s = selectorOf(e);
        push("x", "edge", r.left, "left edge of " + s, s);
        push("x", "edge", r.right, "right edge of " + s, s);
        push("x", "edge", r.left + r.width / 2, "centred on " + s, s);
        push("y", "edge", r.top, "top edge of " + s, s);
        push("y", "edge", r.bottom, "bottom edge of " + s, s);
        push("y", "edge", r.top + r.height / 2, "centred on " + s, s);
      }
      if (marks.length < 40) marks.push({ l: r.left, r: r.right, s: selectorOf(e) });
    }
    /* spacing rule: land so the gap to a neighbour equals a gap that already
       exists between two other elements. */
    marks.sort(function (a, b) { return a.l - b.l });
    var uniq = {};
    for (var m = 1; m < marks.length && Object.keys(uniq).length < 5; m++) {
      var g = Math.round(marks[m].l - marks[m - 1].r);
      if (g >= 4 && g <= 64 && !uniq[g]) { uniq[g] = true; push("x", "gap", marks[m].l - g, "same gap (" + g + "px) before " + marks[m].s, marks[m].s); push("x", "gap", marks[m].r + g, "same gap (" + g + "px) after " + marks[m].s, marks[m].s); }
    }
    return t;
  }
  function sizesOf(el) {
    var out = [], all = document.querySelectorAll("body *");
    for (var i = 0; i < all.length && out.length < 40; i++) {
      var e = all[i];
      if (e === el || harnessNode(e) || el.contains(e) || e.contains(el)) continue;
      var cs = window.getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      var r = e.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) continue;
      out.push({ w: r.width, h: r.height, s: selectorOf(e) });
    }
    return out;
  }
  function axisSnaps(ax, raw, size, targets) {
    var out = [];
    targets.forEach(function (t) {
      if (t.ax !== ax) return;
      [["start", t.pos], ["end", t.pos - size], ["centre", t.pos - size / 2]].forEach(function (o) {
        var d = Math.abs(o[1] - raw);
        if (d <= SNAP) out.push({ ax: ax, pos: o[1], dist: d, how: o[0], kind: t.kind, label: t.label, guide: t.pos });
      });
    });
    out.sort(function (a, b) { return a.dist - b.dist });
    return out.slice(0, 3);
  }
  function positionCss(el, x, y) {
    var cs = window.getComputedStyle(el), out = {};
    var fixed = cs.position === "fixed";
    var op = el.offsetParent;
    var base = fixed ? { left: 0, top: 0 } : (op ? op.getBoundingClientRect() : { left: 0, top: 0 });
    if (!fixed && cs.position === "static" && !op) return null;
    if (!fixed && cs.position === "static") out.position = "absolute";
    out.left = Math.round(x - base.left) + "px";
    out.top = Math.round(y - base.top) + "px";
    return out;
  }
  function translateCss(el, x, y) {
    var o = (drag && drag.el === el) ? drag.origin : el.getBoundingClientRect();
    var dx = Math.round(x - o.left), dy = Math.round(y - o.top);
    if (!dx && !dy) return null;
    return { transform: ((baseTransformOf(el) || "") + " translate(" + dx + "px, " + dy + "px)").trim() };
  }
  function buildProposals(el, gx, gy, gw, gh, targets) {
    var xs = axisSnaps("x", gx, gw, targets), ys = axisSnaps("y", gy, gh, targets);
    var combos = [], rel = { container: 0, centre: 0, margin: 0, edge: 1, gap: 2 };
    (xs.length ? xs : [null]).forEach(function (X) {
      (ys.length ? ys : [null]).forEach(function (Y) {
        var x = X ? X.pos : gx, y = Y ? Y.pos : gy;
        [[positionCss(el, x, y), "absolute"], [translateCss(el, x, y), "translate"]].forEach(function (v) {
          if (!v[0]) return;
          combos.push({ x: x, y: y, css: v[0], form: v[1], axes: [X, Y],
            score: (X ? 2 : 0) + (Y ? 2 : 0), dist: (X ? X.dist : 0) + (Y ? Y.dist : 0),
            label: (X ? X.label : "free position") + (Y ? ", " + Y.label : "") });
        });
      });
    });
    combos.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (a.dist !== b.dist) return a.dist - b.dist;
      var ka = a.axes[0] ? rel[a.axes[0].kind] : 3, kb = b.axes[0] ? rel[b.axes[0].kind] : 3;
      if (ka !== kb) return ka - kb;
      return a.form === "translate" ? -1 : 1;
    });
    var out = [], seen = {};
    combos.forEach(function (c) {
      var k = Object.keys(c.css).map(function (p) { return c.css[p] }).join("|");
      if (seen[k]) return; seen[k] = true; out.push(c);
    });
    return out.slice(0, 5);
  }
  function resizeCss(el, rect, handle) {
    var cs = window.getComputedStyle(el), out = {};
    out.width = Math.round(rect.w) + "px";
    out.height = Math.round(rect.h) + "px";
    var fixed = cs.position === "fixed", abs = fixed || cs.position === "absolute";
    var op = el.offsetParent, base = fixed ? { left: 0, top: 0 } : (op ? op.getBoundingClientRect() : { left: 0, top: 0 });
    if (abs) {
      if (handle.indexOf("w") >= 0) out.left = Math.round(rect.left - base.left) + "px";
      if (handle.indexOf("n") >= 0) out.top = Math.round(rect.top - base.top) + "px";
    } else if (handle.indexOf("w") >= 0 || handle.indexOf("n") >= 0) {
      var o = drag.origin, dx = Math.round(rect.left - o.left), dy = Math.round(rect.top - o.top);
      if (dx || dy) out.transform = ((baseTransformOf(el) || "") + " translate(" + dx + "px, " + dy + "px)").trim();
    }
    return out;
  }
  function snapResize(el, handle, px, py) {
    var o = drag.origin, L = o.left, T = o.top, R = o.left + o.w, B = o.top + o.h;
    if (handle.indexOf("w") >= 0) L = px;
    if (handle.indexOf("e") >= 0) R = px;
    if (handle.indexOf("n") >= 0) T = py;
    if (handle.indexOf("s") >= 0) B = py;
    if (L > R) { var a = L; L = R; R = a }
    if (T > B) { var b = T; T = B; B = b }
    var guides = [], rules = [];
    function snapEdge(ax, pos, set) {
      var best = null;
      drag.targets.forEach(function (t) {
        if (t.ax !== ax) return;
        var d = Math.abs(pos - t.pos);
        if (d <= SNAP && (!best || d < best.d)) best = { d: d, pos: t.pos, label: t.label };
      });
      if (best) { set(best.pos); guides.push({ ax: ax, pos: best.pos }); rules.push(best.label + " (" + ax + " edge)"); }
    }
    if (handle.indexOf("w") >= 0) snapEdge("x", L, function (v) { L = v });
    if (handle.indexOf("e") >= 0) snapEdge("x", R, function (v) { R = v });
    if (handle.indexOf("n") >= 0) snapEdge("y", T, function (v) { T = v });
    if (handle.indexOf("s") >= 0) snapEdge("y", B, function (v) { B = v });
    var W = R - L, H = B - T;
    drag.sizes.forEach(function (sz) {
      if (Math.abs(W - sz.w) <= SNAP) {
        W = sz.w; if (handle.indexOf("w") >= 0) L = R - W; else R = L + W;
        rules.push("same width as " + sz.s);
      }
      if (Math.abs(H - sz.h) <= SNAP) {
        H = sz.h; if (handle.indexOf("n") >= 0) T = B - H; else B = T + H;
        rules.push("same height as " + sz.s);
      }
    });
    var rect = { left: L, top: T, w: Math.max(10, R - L), h: Math.max(10, B - T) };
    return { rect: rect, guides: guides, proposal: { css: resizeCss(el, rect, handle), form: "resize",
      x: rect.left, y: rect.top, axes: [], label: rules.length ? rules.join(", ") : Math.round(rect.w) + "×" + Math.round(rect.h) + "px" } };
  }
  function ghostImitate(el) {
    dragEnsure();
    ghost.innerHTML = "";
    var clone = el.cloneNode(true);
    clone.removeAttribute("id");
    ["position", "margin", "transform", "left", "top", "right", "bottom", "opacity", "visibility"].forEach(function (p) { clone.style[p] = "" });
    clone.style.position = "static"; clone.style.margin = "0"; clone.style.transform = "none";
    clone.style.visibility = "visible"; clone.style.opacity = "1";
    clone.style.width = "100%"; clone.style.height = "100%";
    clone.style.maxWidth = "100%"; clone.style.maxHeight = "100%";
    ghost.appendChild(clone);
  }
  function drawGhost(rect, label) {
    if (!ghost) dragEnsure();
    ghost.style.display = "block";
    ghost.style.left = rect.left + "px"; ghost.style.top = rect.top + "px";
    ghost.style.width = rect.w + "px"; ghost.style.height = rect.h + "px";
    ghost.setAttribute("data-label", label || "");
  }
  function drawGuides(list) {
    if (!snapLayer) dragEnsure();
    snapLayer.innerHTML = "";
    (list || []).slice(0, 6).forEach(function (g) {
      var d = document.createElement("div"); d.className = "tldbg-guide";
      if (g.ax === "x") { d.style.left = g.pos + "px"; d.style.top = "0px"; d.style.width = "1px"; d.style.height = window.innerHeight + "px" }
      else { d.style.top = g.pos + "px"; d.style.left = "0px"; d.style.width = window.innerWidth + "px"; d.style.height = "1px" }
      snapLayer.appendChild(d);
    });
  }
  function beginDrag(el, handle, px, py) {
    dragEnsure();
    lastTap = null;
    var r = el.getBoundingClientRect(), s = selectorOf(el);
    drag = { el: el, s: s, handle: handle, rect: r, picked: 0, proposals: [],
      origin: { left: r.left, top: r.top, w: r.width, h: r.height },
      grabX: px - r.left, grabY: py - r.top,
      targets: snapTargets(el), sizes: sizesOf(el) };
    ghostImitate(el);
  }
  function cancelDrag() {
    drag = null; press = null;
    if (ghost) { ghost.style.display = "none"; ghost.innerHTML = ""; ghost.removeAttribute("data-label") }
    if (snapLayer) snapLayer.innerHTML = "";
  }
  function dragMove(e) {
    if (!drag) return;
    e.preventDefault(); e.stopPropagation();
    if (drag.handle) {
      var rr = snapResize(drag.el, drag.handle, e.clientX, e.clientY);
      drag.rect = rr.rect; drag.picked = 0; drag.proposals = [rr.proposal];
      drawGhost(rr.rect, rr.proposal.label); drawGuides(rr.guides);
    } else {
      var gx = e.clientX - drag.grabX, gy = e.clientY - drag.grabY;
      drag.proposals = buildProposals(drag.el, gx, gy, drag.origin.w, drag.origin.h, drag.targets);
      if (!drag.proposals.length) drag.picked = 0;
      var best = drag.proposals[Math.min(drag.picked, drag.proposals.length - 1)] || { x: gx, y: gy, label: "free position", axes: [] };
      drag.rect = { left: best.x, top: best.y, w: drag.origin.w, h: drag.origin.h };
      drawGhost(drag.rect, best.label);
      drawGuides((best.axes || []).filter(Boolean).map(function (a) { return { ax: a.ax, pos: a.guide } }));
    }
    renderWys();
  }
  function commitDrag() {
    if (!drag) return;
    var el = drag.el, s = drag.s, handle = drag.handle;
    var p = drag.proposals[Math.min(drag.picked, drag.proposals.length - 1)];
    cancelDrag();
    if (!p) { toast("nothing to apply"); return }
    for (var prop in p.css) setProp(s, prop, p.css[prop]);
    noteRule(s, (handle ? "resized by dragging the " + handle + " handle: " : "dragged into place: ") + p.label);
    markRect(el); showHandles(el); renderWys();
    toast((handle ? "resized " : "moved ") + s + " — " + p.label);
  }
  function noteRule(sel, text) {
    edits.comments = edits.comments || {};
    if (!edits.comments[sel]) edits.comments[sel] = text;
    saveEdits();
  }

  /* ------------------------------------------------------------- text editor */
  function textKeyOf(el) { return el.getAttribute("data-t") || el.getAttribute("data-i18n") || "" }
  /* double-clicking a picture inside a card means the card's label: climb to the
     nearest element that actually holds text. */
  function textHost(el) {
    var e = el;
    for (var i = 0; i < 5 && e && e !== document.body; i++) {
      if (ownText(e)) return e;
      e = e.parentElement;
    }
    return null;
  }
  function openTedit(el) {
    closeTedit();
    var host = textHost(el);
    if (!host) { toast("no text to edit at " + selectorOf(el)); return null }
    el = host;
    var r = el.getBoundingClientRect();
    var box = document.createElement("div"); box.className = "tldbg-tedit";
    var ta = document.createElement("textarea"); ta.className = "tldbg-tedit-in"; ta.rows = 2;
    ta.value = ownText(el);
    var hint = document.createElement("div"); hint.className = "tldbg-note";
    hint.textContent = "text in " + activeLang() +
      (textKeyOf(el) ? " → key " + textKeyOf(el) : " → element markup") + " · Enter keeps, Esc cancels";
    box.appendChild(ta); box.appendChild(hint);
    document.body.appendChild(box); tedit = box;
    box.__el = el;
    wys.el = el; picked = el; sel = selectorOf(el);
    markRect(el); placeWys(el); show(el); showHandles(el);
    box.addEventListener("pointerdown", function (e) { e.stopPropagation() }, true);
    /* let keys reach the textarea (a capture stop here would block its own
       listener), but keep everything else away from the game */
    box.addEventListener("keydown", function (e) { if (e.target !== ta) e.stopPropagation() }, true);
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); commitTedit(el) }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeTedit(); toast("text edit cancelled") }
    });
    var w = Math.min(360, Math.max(190, r.width + 40));
    box.style.width = w + "px";
    box.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + "px";
    box.style.top = (r.bottom + 100 > window.innerHeight ? Math.max(8, r.top - 100) : r.bottom + 10) + "px";
    setTimeout(function () { ta.focus(); ta.select() }, 0);
  }
  function commitTedit(el) {
    if (!tedit) return;
    var host = tedit.__el || el;
    var v = tedit.querySelector("textarea").value;
    closeTedit();
    if (v === (host.textContent || "")) { toast("text unchanged"); return }
    applyElText(host, v);
    markRect(host); showHandles(host); renderWys();
    toast("text kept: " + (v.length > 44 ? v.slice(0, 44) + "…" : v));
  }
  function closeTedit() { if (tedit) { tedit.remove(); tedit = null } }
  function wysDbl(e) {
    if (!wys.on || tedit) return;
    if (wysPanel.contains(e.target)) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || harnessNode(el)) return;
    e.preventDefault(); e.stopPropagation();
    wys.el = el; wys.pinned = true; picked = el; sel = selectorOf(el);
    markRect(el); placeWys(el); show(el); renderWys(); openTedit(el);
  }

  function renderDragPanel() {
    if (!wysPanel || !drag) return;
    wysPanel.innerHTML = "<h4>" + esc(drag.s) + "</h4>" +
      "<div class='tldbg-note'>" + (drag.handle ? "resizing from the " + drag.handle + " handle" : "moving") +
      " · release keeps it, Esc cancels</div>";
    var list = el0("div", "tldbg-dlist");
    drag.proposals.forEach(function (p, i) {
      var row = el0("div", "tldbg-drow" + (i === drag.picked ? " on" : ""));
      row.appendChild(el0("div", "tldbg-dkind", p.form));
      row.appendChild(el0("div", "tldbg-dlabel", p.label));
      row.appendChild(el0("div", "tldbg-dcss", Object.keys(p.css).map(function (k) { return k + ": " + p.css[k] }).join("; ")));
      row.onclick = function () {
        if (!drag) return;
        drag.picked = i;
        if (!drag.handle) {
          drawGhost({ left: p.x, top: p.y, w: drag.origin.w, h: drag.origin.h }, p.label);
          drawGuides((p.axes || []).filter(Boolean).map(function (a) { return { ax: a.ax, pos: a.guide } }));
        }
        renderWys();
      };
      list.appendChild(row);
    });
    wysPanel.appendChild(list);
    if (drag.handle) wysPanel.appendChild(el0("div", "tldbg-dcss", "box " + Math.round(drag.rect.w) + "×" + Math.round(drag.rect.h) + "px at " + Math.round(drag.rect.left) + "," + Math.round(drag.rect.top)));
    var btns = el0("div", "tldbg-btns");
    var keep = el0("button", "tldbg-b", "KEEP"); keep.onclick = commitDrag; btns.appendChild(keep);
    var cx = el0("button", "tldbg-b", "CANCEL"); cx.onclick = function () { cancelDrag(); renderWys() }; btns.appendChild(cx);
    var dd = el0("button", "tldbg-b", "DELTA COPY"); dd.onclick = copyDelta; btns.appendChild(dd);
    wysPanel.appendChild(btns);
  }

  function renderWys() {
    if (!wysPanel) return;
    if (drag) { renderDragPanel(); return }
    var el = wys.el;
    if (!el) { wysPanel.innerHTML = "<h4>WYSIWYG</h4><div class='tldbg-note'>move the pointer over the page — any element you hover appears here. Click to pin it; Esc to exit.</div>"; return; }
    var s = selectorOf(el), i = info(el), cur = bucketOf(s);
    var html = "<h4>" + esc(s) + "</h4>" +
      "<div class='tldbg-note'>" + esc(i.tag + (i.id ? "#" + i.id : "") + " " + i.rect.w + "x" + i.rect.h +
      (i.dataT ? " [" + i.dataT + "]" : "") + " · " + screenMode()) + "</div>";
    wysPanel.innerHTML = html;

    var rows = [];
    rows.push(["TEXT", edits.elText[s] !== undefined ? edits.elText[s] : ownText(el), function (v) { applyElText(el, v); }]);
    rows.push(["CLASSES", edits.classes[s] !== undefined ? edits.classes[s].join(" ") : (typeof el.className === "string" ? el.className : ""), function (v) { applyClasses(el, v); }]);
    rows.forEach(function (r) {
      var row = el0("div", "tldbg-row");
      row.appendChild(el0("div", "tldbg-k", r[0]));
      var inp = el0("input", "tldbg-in"); inp.value = r[1];
      inp.onchange = function () { r[2](inp.value); renderWys(); };
      row.appendChild(inp); wysPanel.appendChild(row);
    });

    var arow = el0("div", "tldbg-row");
    var an = el0("input", "tldbg-in"); an.placeholder = "attribute";
    var av = el0("input", "tldbg-in"); av.placeholder = "value ('' removes)";
    var ab = el0("button", "tldbg-b", "SET");
    ab.onclick = function () { applyAttr(el, an.value.trim(), av.value); renderWys(); };
    arow.appendChild(an); arow.appendChild(av); arow.appendChild(ab); wysPanel.appendChild(arow);

    var props = el0("div");
    PROPS.forEach(function (pr) {
      var r2 = el0("div", "tldbg-row");
      var k = el0("div", "tldbg-k", pr[1]);
      k.title = "current: " + (i.computed[pr[1]] || "-");
      var v = el0("input", "tldbg-in");
      v.value = cur[pr[0]] !== undefined ? cur[pr[0]] : "";
      v.placeholder = i.computed[pr[1]] || "";
      v.oninput = function () { setProp(s, pr[0], v.value.trim()); };
      v.onchange = function () { setProp(s, pr[0], v.value.trim()); renderWys(); };
      r2.appendChild(k); r2.appendChild(v); props.appendChild(r2);
    });
    wysPanel.appendChild(props);

    var crow = el0("div", "tldbg-row");
    var cp = el0("input", "tldbg-in"); cp.placeholder = "any css property";
    var cv = el0("input", "tldbg-in"); cv.placeholder = "value";
    var cb = el0("button", "tldbg-b", "APPLY");
    cb.onclick = function () { if (cp.value.trim()) { setProp(s, cp.value.trim(), cv.value); renderWys(); } };
    crow.appendChild(cp); crow.appendChild(cv); crow.appendChild(cb); wysPanel.appendChild(crow);

    var btns = el0("div", "tldbg-btns");
    Object.keys(ALIGN_PRESETS).forEach(function (name) {
      var bt = el0("button", "tldbg-b", name); bt.title = ALIGN_PRESETS[name];
      bt.onclick = function () { applyPreset(s, name); renderWys(); };
      btns.appendChild(bt);
    });
    [["font +2", function () { nudgeNum(el, "font-size", 2, "px") }],
     ["font -2", function () { nudgeNum(el, "font-size", -2, "px") }],
     ["w +10px", function () { nudgeNum(el, "width", 10, "px") }],
     ["w -10px", function () { nudgeNum(el, "width", -10, "px") }],
     ["scale +10%", function () { transformAdd(el, "scale(1.1)") }],
     ["scale -10%", function () { transformAdd(el, "scale(0.9)") }],
     ["move +5px", function () { transformAdd(el, "translate(5px,0)") }],
     ["move -5px", function () { transformAdd(el, "translate(-5px,0)") }],
     ["down +5px", function () { transformAdd(el, "translate(0,5px)") }],
     ["rotate +15", function () { transformAdd(el, "rotate(15deg)") }],
     ["opacity -.1", function () { nudgeNum(el, "opacity", -0.1, "") }],
     ["opacity +.1", function () { nudgeNum(el, "opacity", 0.1, "") }]].forEach(function (n) {
      var bt = el0("button", "tldbg-b", n[0]); bt.onclick = function () { n[1](); renderWys(); };
      btns.appendChild(bt);
    });
    var clr = el0("button", "tldbg-b", "CLEAR TARGET");
    clr.onclick = function () {
      var mode = editMode || screenMode();
      if (edits.layout[mode]) delete edits.layout[mode][s];
      if (edits.elText[s] !== undefined) { el.textContent = base.elText[s] !== undefined ? base.elText[s] : (el.textContent || ""); delete edits.elText[s]; }
      if (edits.classes[s] !== undefined) { el.className = base.classes[s] !== undefined ? base.classes[s] : ""; delete edits.classes[s]; }
      if (edits.attrs[s]) { for (var k in edits.attrs[s]) el.removeAttribute(k); delete edits.attrs[s]; }
      applyCss(); saveEdits(); renderWys(); toast("cleared " + s);
    };
    btns.appendChild(clr);
    var unpin = el0("button", "tldbg-b" + (wys.pinned ? " on" : ""), wys.pinned ? "UNPIN" : "PINNED?—CLICK PAGE");
    unpin.onclick = function () { wys.pinned = false; renderWys(); };
    btns.appendChild(unpin);
    var exit = el0("button", "tldbg-b", "EXIT WYSIWYG");
    exit.onclick = function () { stopWys(); };
    btns.appendChild(exit);
    var dc = el0("button", "tldbg-b", "DELTA COPY"); dc.onclick = copyDelta; btns.appendChild(dc);
    var dd = el0("button", "tldbg-b", "DELTA DOWNLOAD"); dd.onclick = downloadDelta; btns.appendChild(dd);
    wysPanel.appendChild(btns);

    var cm = el0("textarea", "tldbg-ta");
    cm.placeholder = "comment for the LLM: why this element changed";
    cm.value = edits.comments[s] || "";
    cm.onchange = function () { edits.comments[s] = cm.value; saveEdits(); };
    wysPanel.appendChild(cm);
    wysPanel.appendChild(el0("div", "tldbg-note", "edits apply live; DELTA exports only what you changed, with before → after and your comment. Drag from the middle to move with auto-alignment, drag a handle to resize, double-click the element to edit its text."));
    if (wys.el) showHandles(wys.el);
  }
  function el0(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* ------------------------------------------------------------ live state */
  function liveState() {
    if (!spec || typeof spec.state !== "function") return null;
    try { return spec.state() } catch (e) { return { error: String(e && e.message || e) } }
  }
  function safe(v, depth) {
    try {
      if (v === null || v === undefined) return v;
      var t = typeof v;
      if (t === "number" || t === "string" || t === "boolean") return v;
      if (t === "function") return "[function " + (v.name || "anon") + "]";
      if (depth >= 3) return Array.isArray(v) ? "[array " + v.length + "]" : "[object]";
      if (Array.isArray(v)) return v.slice(0, 40).map(function (x) { return safe(x, depth + 1) });
      if (v instanceof HTMLElement) return "[DOM " + selectorOf(v) + "]";
      var o = {}; var n = 0;
      for (var k in v) { if (!Object.prototype.hasOwnProperty.call(v, k)) continue; if (++n > 60) { o["..."] = "truncated"; break } o[k] = safe(v[k], depth + 1) }
      return o;
    } catch (e) { return "[unreadable: " + String(e && e.message || e) + "]" }
  }

  /* --------------------------------------------------------------- exports */
  function applyHints() {
    var hints = [];
    for (var mode in edits.layout) for (var s in edits.layout[mode]) {
      hints.push({ kind: "layout", file: spec.file || (game + ".html"), screenMode: mode, selector: s,
        props: edits.layout[mode][s], action: "set these CSS declarations on the selector, inside the media query for that screen mode" });
    }
    for (var lang in edits.texts) {
      hints.push({ kind: "texts", file: spec.file || (game + ".html"), language: lang, keys: edits.texts[lang],
        action: "update these translation keys in that language's table (kit i18n.js table for shared keys, the page's own table otherwise), keeping {placeholder} tokens intact",
        kit: !!kit() });
    }
    for (var id in edits.balance) {
      var p = paramById(id);
      hints.push({ kind: "balance", file: p && p.code ? p.code.file : (spec.file || (game + ".html")),
        param: id, value: edits.balance[id], source: p && p.code ? p.code : null,
        action: "change that constant/expression to the new value" });
    }
    if (edits.css) hints.push({ kind: "css", file: spec.file || (game + ".html"), css: edits.css, action: "append to the page's stylesheet block" });
    if (edits.js) hints.push({ kind: "js", file: spec.file || (game + ".html"), js: edits.js, action: "fold into the page script where the developer intends" });
    return hints;
  }
  function exportJson() {
    var els = [];
    var list = interesting();
    for (var i = 0; i < list.length; i++) els.push(info(list[i]));
    var paramInfo = [];
    if (spec && spec.params) for (var j = 0; j < spec.params.length; j++) {
      var p = spec.params[j], v;
      try { v = p.get() } catch (e) { v = null }
      paramInfo.push({ id: p.id, label: p.label, value: v, unit: p.unit || "", min: p.min, max: p.max,
        code: p.code || null, doc: p.doc || "", readonly: !!p.readonly || typeof p.set !== "function",
        edited: edits.balance[p.id] !== undefined });
    }
    return {
      tllDebugExport: 1, harnessVersion: VER, generated: new Date().toISOString(),
      game: game, page: spec.file || (game + ".html"), harness: "dbg/" + game + ".js",
      url: location.href, language: kit() ? kit().lang() : "en", screenMode: screenMode(),
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      edits: edits, applyHints: applyHints(),
      balance: paramInfo, cheats: (spec && spec.cheats ? spec.cheats.map(function (c) { return { id: c.id || c.label, doc: c.doc || "" } }) : []),
      elements: els, state: safe(liveState(), 0), notes: edits.notes,
      docs: (spec && spec.docs) || []
    };
  }
  /* ---------------------------------------------------------------- DELTA
     Only what actually changed, each entry with before → after and the designer's
     comment, so an LLM can make the change permanent in the source file.        */
  function commentFor(key) {
    return (edits.comments && edits.comments[key]) || edits.notes || "";
  }
  function deltaJson() {
    var file = spec && spec.file ? spec.file : (game + ".html");
    var ch = [];
    for (var mode in edits.layout) for (var s in edits.layout[mode]) for (var p in edits.layout[mode][s]) {
      var v = edits.layout[mode][s][p]; if (v === "" || v == null) continue;
      ch.push({ kind: "layout", file: file, screenMode: mode, media: mediaOf(mode), selector: s, prop: p,
        before: base.layout[mode + "|" + s + "|" + p] !== undefined ? base.layout[mode + "|" + s + "|" + p] : null,
        after: v, comment: commentFor(s),
        action: "set " + p + ": " + v + " on " + s + (mode === "any" ? "" : " inside " + mediaOf(mode)) });
    }
    for (var lang in edits.texts) for (var key in edits.texts[lang]) {
      ch.push({ kind: "text", file: file, language: lang, key: key,
        before: base.texts[lang + "|" + key] !== undefined ? base.texts[lang + "|" + key] : null,
        after: edits.texts[lang][key], comment: commentFor("text:" + key), kit: !!kit(),
        action: "update the translation key " + key + " in " + lang + " (" + (kit() ? "kit i18n.js table" : "page table") + "), keep {placeholder} tokens" });
    }
    for (var s2 in edits.elText) {
      ch.push({ kind: "element-text", file: file, selector: s2,
        before: base.elText[s2] !== undefined ? base.elText[s2] : null, after: edits.elText[s2],
        comment: commentFor(s2),
        action: "replace that element's text in the markup (if it carries a data-t key, change the table entry instead)" });
    }
    for (var s3 in edits.classes) {
      ch.push({ kind: "class", file: file, selector: s3,
        before: base.classes[s3] !== undefined ? base.classes[s3] : null,
        after: (edits.classes[s3] || []).join(" "), comment: commentFor(s3),
        action: "set the class attribute of that element to the listed classes" });
    }
    for (var s4 in edits.attrs) for (var a in edits.attrs[s4]) {
      ch.push({ kind: "attribute", file: file, selector: s4, attr: a,
        before: base.attrs[s4 + "|" + a] !== undefined ? base.attrs[s4 + "|" + a] : null,
        after: edits.attrs[s4][a], comment: commentFor(s4),
        action: "set " + a + "=\"" + edits.attrs[s4][a] + "\" on that element in the markup" });
    }
    for (var id in edits.balance) {
      var pm = paramById(id);
      ch.push({ kind: "balance", file: pm && pm.code ? pm.code.file : file, param: id,
        before: base.balance[id] !== undefined ? base.balance[id] : null, after: edits.balance[id],
        source: pm && pm.code ? pm.code : null, label: pm ? pm.label : id, unit: pm ? (pm.unit || "") : "",
        comment: commentFor("balance:" + id),
        action: pm && pm.code ? ("change " + pm.code.name + " at " + pm.code.file + ":" + pm.code.line + " to " + edits.balance[id])
          : "change the value behind BALANCE param " + id + " to " + edits.balance[id] });
    }
    if (edits.css) ch.push({ kind: "css", file: file, before: "", after: edits.css,
      comment: commentFor("css"), action: "append these rules to the page's style block" });
    if (edits.js) ch.push({ kind: "js", file: file, before: "", after: edits.js,
      comment: commentFor("js"), action: "fold this into the page script where the developer intends" });
    (edits.cheatsUsed || []).forEach(function (c) {
      ch.push({ kind: "cheat", file: file, id: c, before: null, after: "used", comment: commentFor("cheat:" + c),
        action: "reproducible only: this cheat was exercised, nothing in the source should change" });
    });
    (edits.controls || []).forEach(function (c) {
      ch.push({ kind: "control", file: file, id: c, before: null, after: "run", comment: commentFor("control:" + c),
        action: "programmatic control used during the session, no source change implied" });
    });
    var sum = {};
    ch.forEach(function (c) { sum[c.kind] = (sum[c.kind] || 0) + 1 });
    return {
      tllDebugDelta: 1, harnessVersion: VER, generated: new Date().toISOString(),
      game: game, page: file, harness: "dbg/" + game + ".js", url: location.href,
      language: activeLang(), screenMode: screenMode(), editMode: editMode || screenMode(),
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      target: picked ? info(picked) : null,
      summary: sum, total: ch.length, changes: ch,
      notes: edits.notes, comments: edits.comments || {}
    };
  }
  function downloadDelta() {
    var json = JSON.stringify(deltaJson(), null, 1);
    var blob = new Blob([json], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = game + "-debug-delta.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { try { URL.revokeObjectURL(a.href) } catch (e) {} }, 4000);
    toast("delta exported " + a.download);
  }
  function copyDelta() {
    var json = JSON.stringify(deltaJson(), null, 1);
    try { navigator.clipboard.writeText(json); toast("delta copied " + json.length + " chars") }
    catch (e) { toast("clipboard blocked — use DELTA DOWNLOAD") }
  }

  function download() {
    var json = JSON.stringify(exportJson(), null, 1);
    var blob = new Blob([json], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = game + "-debug-edits.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { try { URL.revokeObjectURL(a.href) } catch (e) {} }, 4000);
    toast("exported " + a.download);
  }
  function copy() {
    var json = JSON.stringify(exportJson(), null, 1);
    try { navigator.clipboard.writeText(json); toast("copied " + json.length + " chars") }
    catch (e) { toast("clipboard blocked — use Download") }
  }

  /* ---------------------------------------------------------------- cheats */
  function paramById(id) {
    if (!spec || !spec.params) return null;
    for (var i = 0; i < spec.params.length; i++) if (spec.params[i].id === id) return spec.params[i];
    return null;
  }
  function setBalance(id, v) {
    var p = paramById(id);
    if (!p) return;
    if (p.readonly || typeof p.set !== "function") {
      toast(p.label + " is READ ONLY" + (p.code ? " — edit " + p.code.file + ":" + p.code.line : ""));
      return;
    }
    try { recBase("balance", id, p.get()); p.set(v); (edits.balance[id] = v); saveEdits(); toast(p.label + " = " + v) }
    catch (e) { toast("set failed: " + (e && e.message)) }
  }
  function runCheat(c) {
    try {
      if (c.toggle) { c.on(!c._on); c._on = !c._on; }
      else { c.run(); }
      if (edits.cheatsUsed.indexOf(c.id || c.label) < 0) edits.cheatsUsed.push(c.id || c.label);
      saveEdits(); toast((c.id || c.label) + (c.toggle ? " " + (c._on ? "ON" : "OFF") : " run"));
    } catch (e) { toast("cheat failed: " + (e && e.message)) }
  }

  /* ------------------------------------------------- programmatic control
     The game script may register spec.control entries: named, argument-taking
     actions that drive the game (input, bots, spawns, phases). Same surface is
     on the console: TLDBG.do('drive', 0.4), TLDBG.key('Space'), TLDBG.tap(x,y),
     TLDBG.get('AI.aggression'), TLDBG.setPath('cpus[0].skill', 2),
     TLDBG.call('spawnEnemy', 3).                                        */
  function hookObj() { return window.TLHOOK || window.DBHOOKS || null }
  function resolve(path) {
    var parts = String(path).split("[")[0].split(".");
    var root = hookObj() || window;
    if (!(parts[0] in root) && parts[0] in window) root = window;
    var o = root, full = parts.slice();
    var idx = String(path).match(/\[(\d+)\]/g) || [];
    for (var i = 0; i < full.length; i++) { if (o == null) return null; o = o[full[i]] }
    for (var j = 0; j < idx.length; j++) { if (o == null) return null; o = o[Number(idx[j].slice(1, -1))] }
    return o;
  }
  function setPathValue(path, val) {
    var m = String(path).match(/^([^\[]+)\[(\d+)\]$/);
    var obj = resolve(m ? String(path).slice(0, m[1].length) : path);
    var leaf = m ? Number(m[2]) : String(path).split(".").pop();
    var parent = m ? obj : resolve(String(path).split(".").slice(0, -1).join("."));
    if (parent == null) { toast("unknown path: " + path); return false }
    try { parent[leaf] = val; toast(path + " = " + val); return true }
    catch (e) { toast("set failed: " + (e && e.message)); return false }
  }
  function controlList() { return (spec && spec.control) || [] }
  function parseArg(a) {
    if (typeof a === "string") {
      var s = a.trim();
      if (/^[\[{]/.test(s)) { try { return JSON.parse(s) } catch (e) { return a } }
    }
    return a;
  }
  function ctrlRun(id, arg) {
    var list = controlList();
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.id !== id && c.label !== id) continue;
      if (arg === undefined) arg = c.argDefault;
      try {
        var out = c.run(parseArg(arg));
        edits.controls = edits.controls || [];
        if (edits.controls.indexOf(c.id) < 0) edits.controls.push(c.id);
        saveEdits();
        var msg = (out === undefined || out === null) ? c.id + " ok" : c.id + ": " + JSON.stringify(safe(out, 1));
        toast(String(msg).slice(0, 120)); return out;
      } catch (e) { toast("control failed: " + (e && e.message)); return null }
    }
    toast("no control '" + id + "'"); return null;
  }
  function pressKey(code) {
    var opts = { code: code, key: code.length === 1 ? code : undefined, bubbles: true, cancelable: true };
    document.dispatchEvent(new KeyboardEvent("keydown", opts));
    document.dispatchEvent(new KeyboardEvent("keyup", opts));
    toast("key " + code);
  }
  function tapAt(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el) { toast("nothing at " + x + "," + y); return null }
    var o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, button: 0 };
    el.dispatchEvent(new PointerEvent("pointerdown", o));
    el.dispatchEvent(new PointerEvent("pointerup", o));
    el.dispatchEvent(new MouseEvent("click", o));
    toast("tap " + selectorOf(el));
    return el;
  }

  /* ------------------------------------------------------------------ panel */
  var editMode = null;   // which screen-mode bucket the Layout tab writes
  var cssText = "";
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function mkCss(text) {
    cssText = text;
  }
  mkCss(
    ".tldbg{position:fixed;right:0;top:0;height:100vh;width:340px;max-width:92vw;z-index:2147483000;" +
    "background:rgba(10,14,12,.94);border-left:1px solid #3a463f;color:#c9d2cb;" +
    "font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.03em;" +
    "display:flex;flex-direction:column;box-shadow:-12px 0 30px rgba(0,0,0,.45)}" +
    ".tldbg.closed{width:34px}" +
    ".tldbg *{box-sizing:border-box}" +
    ".tldbg-hd{display:flex;align-items:center;gap:6px;padding:7px 8px;border-bottom:1px solid #2b3530;" +
    "background:#141a17;color:#ffd76a;font-size:11px;letter-spacing:.12em;cursor:pointer;flex:0 0 auto}" +
    ".tldbg-hd b{font-weight:600}.tldbg-hd span{color:#7f8a83;margin-left:auto;font-size:10px}" +
    ".tldbg-tabs{display:flex;flex-wrap:wrap;gap:2px;padding:5px 6px;border-bottom:1px solid #2b3530;flex:0 0 auto}" +
    ".tldbg-tabs b{padding:3px 6px;border:1px solid #2b3530;border-radius:4px;cursor:pointer;color:#8a948e;font-weight:500}" +
    ".tldbg-tabs b.on{border-color:#ffd76a;color:#f4e9c8;background:rgba(255,215,106,.08)}" +
    ".tldbg-body{overflow:auto;padding:8px;flex:1 1 auto}" +
    ".tldbg.closed .tldbg-tabs,.tldbg.closed .tldbg-body{display:none}" +
    ".tldbg-row{display:flex;align-items:center;gap:5px;margin:0 0 5px}" +
    ".tldbg-k{flex:0 0 40%;color:#8a948e;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".tldbg-in{flex:1 1 auto;min-width:0;background:#0b100e;border:1px solid #2b3530;border-radius:4px;" +
    "color:#e6efe8;font:inherit;padding:3px 5px}" +
    ".tldbg-in:focus{border-color:#ffd76a;outline:none}" +
    ".tldbg-b{background:#182019;border:1px solid #2b3530;border-radius:4px;color:#c9d2cb;font:inherit;" +
    "padding:4px 7px;cursor:pointer;letter-spacing:.06em}" +
    ".tldbg-b:hover{border-color:#ffd76a;color:#f4e9c8}" +
    ".tldbg-b.on{border-color:#ffd76a;color:#ffd76a}" +
    ".tldbg-note{color:#7f8a83;font-size:10px;line-height:1.5;margin:4px 0 8px}" +
    ".tldbg-sec{color:#ffd76a;font-size:10px;letter-spacing:.14em;margin:8px 0 4px;border-bottom:1px solid #2b3530;padding-bottom:3px}" +
    ".tldbg-el{padding:4px 5px;border:1px solid #242d28;border-radius:4px;margin:0 0 3px;cursor:pointer}" +
    ".tldbg-el:hover{border-color:#ffd76a}" +
    ".tldbg-el i{color:#7f8a83;font-style:normal;font-size:10px}" +
    ".tldbg-pre{background:#0b100e;border:1px solid #242d28;border-radius:4px;padding:5px;color:#a9b4ac;" +
    "font-size:10px;white-space:pre-wrap;word-break:break-word;max-height:210px;overflow:auto}" +
    ".tldbg-ta{width:100%;height:78px;background:#0b100e;border:1px solid #2b3530;border-radius:4px;" +
    "color:#e6efe8;font:inherit;padding:5px;resize:vertical}" +
    ".tldbg-toast{position:fixed;right:352px;bottom:14px;z-index:2147483004;background:rgba(10,14,12,.92);" +
    "border:1px solid #ffd76a;color:#f4e9c8;padding:5px 10px;border-radius:5px;font:11px ui-monospace,monospace}" +
    ".tldbg-doc{margin:0 0 8px}.tldbg-doc b{color:#ffd76a;display:block;font-size:10px;letter-spacing:.1em}" +
    ".tldbg-doc p{margin:2px 0 0;color:#a9b4ac}" +
    ".tldbg-mark{position:fixed;pointer-events:none;z-index:2147483003;border:2px dashed #ffd76a;display:none;" +
    "box-shadow:0 0 12px rgba(255,215,106,.4)}" +
    ".tldbg-wys{position:fixed;z-index:2147483005;width:296px;max-width:88vw;max-height:72vh;overflow:auto;" +
    "background:rgba(10,14,12,.96);border:1px solid #ffd76a;border-radius:6px;color:#c9d2cb;" +
    "font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;padding:8px 9px;display:none;" +
    "box-shadow:0 10px 28px rgba(0,0,0,.55)}" +
    ".tldbg-wys.on{display:block}" +
    ".tldbg-wys h4{margin:0 0 5px;color:#ffd76a;font-size:10px;letter-spacing:.08em;word-break:break-all;font-weight:600}" +
    ".tldbg-wys .tldbg-note{margin:2px 0 6px}" +
    ".tldbg-btns{display:flex;flex-wrap:wrap;gap:4px;margin:7px 0 0}" +
    ".tldbg-ghost{position:fixed;z-index:2147483006;pointer-events:none;display:none;overflow:hidden;opacity:.7;" +
    "border:2px solid #7fd7ff;box-shadow:0 0 18px rgba(127,215,255,.45)}" +
    ".tldbg-ghost::after{content:attr(data-label);position:absolute;left:2px;top:100%;margin-top:3px;" +
    "background:rgba(10,14,12,.92);border:1px solid #7fd7ff;color:#cfe9ff;padding:2px 6px;border-radius:4px;" +
    "font:10px ui-monospace,monospace;white-space:nowrap;max-width:70vw;overflow:hidden;text-overflow:ellipsis}" +
    ".tldbg-snap{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2147483007}" +
    ".tldbg-guide{position:absolute;background:#7fd7ff;opacity:.8;box-shadow:0 0 6px rgba(127,215,255,.8)}" +
    ".tldbg-handle{position:fixed;z-index:2147483008;width:11px;height:11px;margin:-5px 0 0 -5px;display:none;" +
    "pointer-events:none;background:#0b100e;border:2px solid #7fd7ff;border-radius:2px;" +
    "box-shadow:0 0 8px rgba(127,215,255,.6)}" +
    ".tldbg-tedit{position:fixed;z-index:2147483009;background:rgba(10,14,12,.97);border:1px solid #7fd7ff;" +
    "border-radius:6px;padding:6px;box-shadow:0 10px 26px rgba(0,0,0,.55)}" +
    ".tldbg-tedit-in{width:100%;min-height:44px;background:#0b100e;border:1px solid #2b3530;border-radius:4px;" +
    "color:#e6efe8;font:12px/1.4 ui-monospace,monospace;padding:4px;resize:vertical}" +
    ".tldbg-dlist{margin:4px 0 6px}" +
    ".tldbg-drow{border:1px solid #242d28;border-radius:4px;padding:4px 5px;margin:0 0 3px;cursor:pointer}" +
    ".tldbg-drow:hover{border-color:#7fd7ff}" +
    ".tldbg-drow.on{border-color:#ffd76a;background:rgba(255,215,106,.08)}" +
    ".tldbg-dkind{color:#7fd7ff;font-size:9px;letter-spacing:.1em}" +
    ".tldbg-dlabel{color:#e6efe8;font-size:10px}" +
    ".tldbg-dcss{color:#7f8a83;font-size:9px;word-break:break-all}" +
    "@media (max-width:640px){.tldbg{width:290px}.tldbg-wys{width:250px}}"
  );
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "tldbg-toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove() }, 1800);
  }
  function buildPanel() {
    var st = document.createElement("style"); st.textContent = cssText; document.head.appendChild(st);
    panel = el("div", "tldbg");
    panel.addEventListener("keydown", function (e) { e.stopPropagation() }, true);
    panel.addEventListener("pointerdown", function (e) { e.stopPropagation() }, true);
    panel.addEventListener("wheel", function (e) { e.stopPropagation() }, true);
    var hd = el("div", "tldbg-hd");
    hd.appendChild(el("b", null, "TLDBG"));
    hd.appendChild(el("span", null, game));
    hd.title = "click to collapse / expand the harness panel";
    hd.onclick = function () { open = !open; panel.classList.toggle("closed", !open) };
    panel.appendChild(hd);
    var tabs = el("div", "tldbg-tabs");
    ["STATE", "ELEMENTS", "LAYOUT", "TEXTS", "BALANCE", "CHEATS", "CODE", "EXPORT", "DOCS"].forEach(function (name) {
      var b = el("b", tab === name ? "on" : null, name);
      b.title = { STATE: "live game variables", ELEMENTS: "names, classes, attributes, sizes", LAYOUT: "size / position / alignment per screen mode",
        TEXTS: "translation keys per language", BALANCE: "game numbers and coefficients", CHEATS: "developer cheats",
        CODE: "run your own CSS / JS on the live page", EXPORT: "download every edit as JSON for the LLM harness",
        DOCS: "what everything means" }[name];
      b.onclick = function () { tab = name; renderTab() };
      tabs.appendChild(b);
    });
    panel.appendChild(tabs);
    var body = el("div", "tldbg-body");
    panel.appendChild(body);
    document.body.appendChild(panel);
    renderTab();
    stateTimer = setInterval(function () { if (open && tab === "STATE") renderTab() }, 700);
    window.addEventListener("resize", function () { moveOverlay(); renderTab() });
    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) { open = !open; panel.classList.toggle("closed", !open); }
    });
  }
  function setBody(html) { panel.querySelector(".tldbg-body").innerHTML = html; }

  function renderTab() {
    var b = panel.querySelector(".tldbg-body");
    var bar = panel.querySelectorAll(".tldbg-tabs b");
    for (var i = 0; i < bar.length; i++) bar[i].className = bar[i].textContent === tab ? "on" : "";
    b.innerHTML = "";
    if (tab === "STATE") renderState(b);
    else if (tab === "ELEMENTS") renderElements(b);
    else if (tab === "LAYOUT") renderLayout(b);
    else if (tab === "TEXTS") renderTexts(b);
    else if (tab === "BALANCE") renderBalance(b);
    else if (tab === "CHEATS") renderCheats(b);
    else if (tab === "CODE") renderCode(b);
    else if (tab === "EXPORT") renderExport(b);
    else renderDocs(b);
  }

  function renderState(b) {
    b.appendChild(el("div", "tldbg-sec", "LIVE STATE"));
    b.appendChild(el("div", "tldbg-note", "read straight from the game's own variables, refreshed every 700 ms. The same object is reachable from the console as TLDBG.state()."));
    var pre = el("pre", "tldbg-pre");
    var st = liveState();
    pre.textContent = st === null ? "this game script registers no state snapshot" : JSON.stringify(safe(st, 0), null, 1).slice(0, 12000);
    b.appendChild(pre);
    if (spec && spec.hooks && spec.hooks.length) {
      b.appendChild(el("div", "tldbg-sec", "DEBUG TOOLS"));
      spec.hooks.forEach(function (h) {
        var bb = el("button", "tldbg-b", h.label);
        bb.title = h.doc || "";
        bb.onclick = function () { try { h.run(); toast(h.label) } catch (e) { toast("failed: " + e.message) } };
        b.appendChild(bb);
        b.appendChild(el("div", "tldbg-note", h.doc || ""));
      });
    }
  }

  function renderElements(b) {
    b.appendChild(el("div", "tldbg-sec", "ELEMENTS"));
    b.appendChild(el("div", "tldbg-note", "click a row to inspect and edit it, or pick it directly on the page. Every row shows the selector, tag, id, classes and translated key."));
    var pk = el("button", "tldbg-b", "PICK (WYSIWYG)");
    pk.onclick = startPick; b.appendChild(pk);
    var go = el("button", "tldbg-b", "REFRESH");
    go.onclick = renderTab; b.appendChild(go);
    b.appendChild(el("div", "tldbg-sec", "INSPECTED"));
    var one = picked ? info(picked) : null;
    var pre = el("pre", "tldbg-pre");
    pre.textContent = one ? JSON.stringify(one, null, 1) : "nothing picked yet";
    b.appendChild(pre);
    b.appendChild(el("div", "tldbg-sec", "LIST"));
    var list = interesting();
    for (var i = 0; i < list.length; i++) {
      var it = info(list[i]);
      var row = el("div", "tldbg-el");
      row.innerHTML = "<b>" + esc(it.selector) + "</b> <i>" + esc(it.tag + (it.id ? "" : "") + " " + it.rect.w + "x" + it.rect.h +
        (it.classes.length ? " ." + it.classes.join(" .") : "") + (it.dataT ? " [" + it.dataT + "]" : "")) + "</i>";
      (function (e) { row.onclick = function () { show(e); tab = "LAYOUT"; renderTab() } })(list[i]);
      b.appendChild(row);
    }
  }

  function renderLayout(b) {
    b.appendChild(el("div", "tldbg-sec", "TARGET"));
    var inp = el("input", "tldbg-in"); inp.value = sel; inp.title = "CSS selector to restyle";
    inp.onchange = function () { sel = inp.value; try { var e = document.querySelector(sel); if (e) show(e) } catch (e) {} };
    b.appendChild(inp);
    var pk = el("button", "tldbg-b", "PICK (WYSIWYG)");
    pk.onclick = function () { startPick() }; b.appendChild(pk);

    b.appendChild(el("div", "tldbg-sec", "SCREEN MODE"));
    b.appendChild(el("div", "tldbg-note", "current: " + screenMode() + ". Edits are written per screen mode and applied with media queries, so portrait / landscape and mobile / desktop can differ at the same time. Presets cover the usual alignment types."));
    var row = el("div", "tldbg-row");
    MODES.forEach(function (m) {
      var bt = el("button", "tldbg-b" + ((editMode || screenMode()) === m ? " on" : ""), m);
      bt.onclick = function () { editMode = m; renderTab() };
      row.appendChild(bt);
    });
    b.appendChild(row);
    var cur = editMode || screenMode();
    var bucket = (edits.layout[cur] || {})[sel] || {};
    var keys = Object.keys(bucket);
    b.appendChild(el("div", "tldbg-note", cur + " rules for " + sel + ": " + (keys.length ? keys.map(function (k) { return k + ":" + bucket[k] }).join("; ") : "none")));

    b.appendChild(el("div", "tldbg-sec", "ALIGN PRESETS"));
    Object.keys(ALIGN_PRESETS).forEach(function (name) {
      var bt = el("button", "tldbg-b", name);
      bt.title = ALIGN_PRESETS[name];
      bt.onclick = function () { applyPreset(sel, name); renderTab() };
      b.appendChild(bt);
    });

    b.appendChild(el("div", "tldbg-sec", "SIZE / POSITION / TYPOGRAPHY"));
    PROPS.forEach(function (pr) {
      var r2 = el("div", "tldbg-row");
      var k = el("div", "tldbg-k", pr[1]);
      k.title = "current: " + (picked ? info(picked).computed[pr[1]] || "-" : "-");
      var v = el("input", "tldbg-in");
      v.value = bucket[pr[0]] || "";
      v.placeholder = pr[0] === "width" || pr[0] === "height" ? "e.g. 220px or 60%" : "e.g. 12px / flex-end / scale(1.2)";
      v.onchange = function () { setProp(sel, pr[0], v.value.trim()); renderTab() };
      r2.appendChild(k); r2.appendChild(v);
      b.appendChild(r2);
    });
    var rr = el("button", "tldbg-b", "CLEAR THIS TARGET");
    rr.onclick = function () { if (edits.layout[cur]) delete edits.layout[cur][sel]; applyCss(); saveEdits(); renderTab() };
    b.appendChild(rr);
    var all = el("button", "tldbg-b", "CLEAR ALL LAYOUT EDITS");
    all.onclick = function () { edits.layout = {}; applyCss(); saveEdits(); renderTab() };
    b.appendChild(all);
  }

  function renderTexts(b) {
    b.appendChild(el("div", "tldbg-sec", "TRANSLATION TEXTS"));
    b.appendChild(el("div", "tldbg-note", "keys come from the page's own language table (kit i18n.js, or the page-local table for billiards / tilt / benchkit). Editing applies immediately to the live page; keep {placeholders} intact."));
    var ls = langs();
    if (!textLang || ls.indexOf(textLang) < 0) textLang = kit() ? kit().lang() : ls[0];
    var row = el("div", "tldbg-row");
    ls.forEach(function (c) {
      var bt = el("button", "tldbg-b" + (textLang === c ? " on" : ""), c);
      bt.onclick = function () { textLang = c; textCache = null; renderTab() };
      row.appendChild(bt);
    });
    b.appendChild(row);
    var flt = el("input", "tldbg-in"); flt.placeholder = "filter keys";
    flt.oninput = function () { paint(flt.value.trim().toLowerCase()) };
    b.appendChild(flt);
    var host = el("div"); b.appendChild(host);
    function paint(f) {
      host.innerHTML = "";
      var keys = textKeys(textLang).filter(function (k) { return !f || k.toLowerCase().indexOf(f) >= 0 }).slice(0, 400);
      if (!keys.length) host.appendChild(el("div", "tldbg-note", "no keys found — this page may keep its tables in a closure; the game script can expose them with texts.keys"));
      keys.forEach(function (k) {
        var r2 = el("div", "tldbg-row");
        var kk = el("div", "tldbg-k", k); kk.title = k;
        var v = el("input", "tldbg-in");
        v.value = (edits.texts[textLang] && edits.texts[textLang][k] != null) ? edits.texts[textLang][k] : textGet(textLang, k);
        v.onchange = function () { textSet(textLang, k, v.value); applyTextsAll(); };
        r2.appendChild(kk); r2.appendChild(v);
        host.appendChild(r2);
      });
    }
    paint("");
  }

  function renderBalance(b) {
    b.appendChild(el("div", "tldbg-sec", "BALANCE AND COEFFICIENTS"));
    b.appendChild(el("div", "tldbg-note", "each row shows where the number lives in the source (file : line : name). Changes apply to the live game at once and are recorded for export."));
    if (!spec || !spec.params || !spec.params.length) {
      b.appendChild(el("div", "tldbg-note", "this game script registers no parameters yet."));
      return;
    }
    spec.params.forEach(function (p) {
      var r2 = el("div", "tldbg-row");
      var k = el("div", "tldbg-k", p.label);
      k.title = (p.doc || "") + (p.code ? " — " + p.code.file + ":" + p.code.line + " " + p.code.name : "");
      var cur;
      try { cur = p.get() } catch (e) { cur = null }
      if (p.readonly || typeof p.set !== "function") {
        r2.appendChild(k);
        r2.appendChild(el("div", "tldbg-k", (cur == null ? "-" : cur) + "  READ ONLY"));
        if (p.unit) r2.appendChild(el("div", "tldbg-k", p.unit));
        b.appendChild(r2);
        b.appendChild(el("div", "tldbg-note", (p.doc || "") + (p.code
          ? "  [" + p.code.file + ":" + p.code.line + " " + p.code.name + " = " + cur
            + (p.unit ? " " + p.unit : "") + " — edit that line in the file]" : "")));
        return;
      }
      var v = el("input", "tldbg-in");
      v.type = "number"; v.value = cur;
      if (p.min != null) v.min = p.min; if (p.max != null) v.max = p.max;
      if (p.step != null) v.step = p.step;
      v.onchange = function () { setBalance(p.id, Number(v.value)) };
      r2.appendChild(k); r2.appendChild(v);
      if (p.unit) r2.appendChild(el("div", "tldbg-k", p.unit));
      b.appendChild(r2);
      var note = el("div", "tldbg-note", (p.doc || "") + (p.code ? "  [" + p.code.file + ":" + p.code.line + " " + p.code.name + " = " + cur + (p.unit ? " " + p.unit : "") + "]" : ""));
      b.appendChild(note);
    });
  }

  function renderCheats(b) {
    b.appendChild(el("div", "tldbg-sec", "CHEATS AND DEBUG TOOLS"));
    b.appendChild(el("div", "tldbg-note", "toggle cheats make hard parts reproducible; one-shot tools change the current run only. Nothing here is saved into the game files."));
    var list = (spec && spec.cheats) || [];
    if (!list.length) b.appendChild(el("div", "tldbg-note", "this game script registers no cheats yet."));
    list.forEach(function (c) {
      var bb = el("button", "tldbg-b" + (c._on ? " on" : ""), (c.toggle ? (c._on ? "ON  " : "OFF ") : "") + c.label);
      bb.title = c.doc || "";
      bb.onclick = function () { runCheat(c); renderTab() };
      b.appendChild(bb);
      b.appendChild(el("div", "tldbg-note", c.doc || ""));
    });
    renderControl(b);
  }

  function renderControl(b) {
    var ctrl = controlList();
    b.appendChild(el("div", "tldbg-sec", "PROGRAMMATIC CONTROL"));
    b.appendChild(el("div", "tldbg-note", "argument-taking actions the console can drive: TLDBG.do('id', arg), TLDBG.key('Space'), TLDBG.tap(x, y), TLDBG.get('path'), TLDBG.setPath('path', v), TLDBG.call('fn', args). Bridge names come from window.TLHOOK."));
    if (!ctrl.length) { b.appendChild(el("div", "tldbg-note", "this game script registers no control actions yet.")); return; }
    ctrl.forEach(function (c) {
      var row = el("div", "tldbg-row");
      var k = el("div", "tldbg-k", c.label || c.id); k.title = c.doc || "";
      var inp = el("input", "tldbg-in");
      inp.placeholder = c.args ? c.args : "arg (number / text / JSON)";
      if (c.argDefault !== undefined) inp.value = c.argDefault;
      var go = el("button", "tldbg-b", "RUN");
      go.onclick = function () {
        var raw = inp.value.trim();
        var arg = raw === "" ? undefined : (/^[-+0-9.]+$/.test(raw) ? Number(raw) : (/^[[{]/.test(raw) ? JSON.parse(raw) : raw));
        ctrlRun(c.id, arg);
      };
      var cp = el("button", "tldbg-b", "COPY JS");
      cp.onclick = function () {
        var line = "TLDBG.do('" + c.id + "'" + (inp.value.trim() ? ", " + JSON.stringify(inp.value.trim()) : "") + ")";
        try { navigator.clipboard.writeText(line); toast(line) } catch (e) { toast(line) }
      };
      row.appendChild(k); row.appendChild(inp); row.appendChild(go); row.appendChild(cp);
      b.appendChild(row);
      if (c.doc) b.appendChild(el("div", "tldbg-note", c.doc));
    });
  }

  function renderRecipes(b) {
    var list = (spec && spec.recipes) || [];
    if (!list.length) return;
    b.appendChild(el("div", "tldbg-sec", "SCRIPT RECIPES"));
    b.appendChild(el("div", "tldbg-note", "paste-ready console programs the game script wrote for this page: RUN executes it now, COPY takes it to the devtools prompt."));
    list.forEach(function (r) {
      var row = el("div", "tldbg-row");
      var go = el("button", "tldbg-b", "RUN");
      go.onclick = function () {
        try { var out = (new Function(r.js))(); toast(r.label + (out === undefined ? "" : ": " + JSON.stringify(safe(out, 1)))); }
        catch (e) { toast("recipe failed: " + (e && e.message)) }
      };
      var cp = el("button", "tldbg-b", "COPY");
      cp.onclick = function () { try { navigator.clipboard.writeText(r.js); toast("copied " + r.label) } catch (e) { toast(r.label) } };
      row.appendChild(go); row.appendChild(cp); row.appendChild(el("div", "tldbg-k", r.label));
      b.appendChild(row);
      if (r.doc) b.appendChild(el("div", "tldbg-note", r.doc));
      b.appendChild(el("pre", "tldbg-pre", r.js));
    });
  }

  function renderCode(b) {
    b.appendChild(el("div", "tldbg-sec", "YOUR CSS"));
    var ta1 = el("textarea", "tldbg-ta"); ta1.value = edits.css;
    ta1.placeholder = "#hud{font-size:14px}  — appended to the live page";
    ta1.onchange = function () { edits.css = ta1.value; applyCss(); saveEdits() };
    b.appendChild(ta1);
    b.appendChild(el("div", "tldbg-sec", "YOUR JS"));
    var ta2 = el("textarea", "tldbg-ta"); ta2.value = edits.js;
    ta2.placeholder = "score = 999999;  TLDBG.state()  — runs in the page's own scope";
    ta2.onchange = function () { edits.js = ta2.value; saveEdits() };
    b.appendChild(ta2);
    var run = el("button", "tldbg-b", "RUN JS NOW");
    run.title = "evaluated in the page's global scope, so the game's own names are reachable";
    run.onclick = function () {
      try { window.eval(ta2.value || edits.js); toast("ran"); renderTab() } catch (e) { toast("error: " + (e && e.message)) }
    };
    b.appendChild(run);
    b.appendChild(el("div", "tldbg-note", "the game script's own state names are reachable here (e.g. arena's enemies, tilt's ball), because classic scripts share the page's global scope."));
  }

  function renderExport(b) {
    b.appendChild(el("div", "tldbg-sec", "EXPORT FOR THE LLM HARNESS"));
    b.appendChild(el("div", "tldbg-note", "one JSON with: your edits (layout / texts / balance / css / js), where each number lives in the source, apply hints per file, the whole element map and a live state snapshot. dbg/README.md documents the schema."));
    var n = el("textarea", "tldbg-ta"); n.value = edits.notes; n.placeholder = "notes for the LLM: what you intended";
    n.onchange = function () { edits.notes = n.value; saveEdits() };
    b.appendChild(n);
    var d = el("button", "tldbg-b", "DOWNLOAD JSON"); d.onclick = download; b.appendChild(d);
    var c = el("button", "tldbg-b", "COPY JSON"); c.onclick = copy; b.appendChild(c);
    var dd = el("button", "tldbg-b", "DOWNLOAD DELTA");
    dd.title = "only what you changed, with before → after and your comments";
    dd.onclick = downloadDelta; b.appendChild(dd);
    var dc = el("button", "tldbg-b", "COPY DELTA"); dc.onclick = copyDelta; b.appendChild(dc);
    var dp = el("button", "tldbg-b", "PREVIEW DELTA");
    dp.onclick = function () {
      var pre = el("pre", "tldbg-pre");
      pre.textContent = JSON.stringify(deltaJson(), null, 1).slice(0, 20000);
      b.appendChild(pre);
    };
    b.appendChild(dp);
    renderRecipes(b);
    var p = el("button", "tldbg-b", "PREVIEW");
    p.onclick = function () {
      var pre = el("pre", "tldbg-pre");
      pre.textContent = JSON.stringify(exportJson(), null, 1).slice(0, 20000);
      b.appendChild(pre);
    };
    b.appendChild(p);
    var clr = el("button", "tldbg-b", "CLEAR STORED EDITS");
    clr.title = "removes tll:dbg:" + game + " from localStorage and undoes every applied change";
    clr.onclick = function () {
      for (var s in edits.elText) { var e1 = document.querySelector(s); if (e1) e1.textContent = base.elText[s] !== undefined ? base.elText[s] : e1.textContent }
      for (var s2 in edits.classes) { var e2 = document.querySelector(s2); if (e2 && typeof e2.className === "string") e2.className = base.classes[s2] !== undefined ? base.classes[s2] : "" }
      for (var s3 in edits.attrs) { var e3 = document.querySelector(s3); if (e3) { for (var k in edits.attrs[s3]) e3.removeAttribute(k) } }
      ldel(storageKey);
      edits = { layout: {}, texts: {}, balance: {}, css: "", js: "", notes: "", cheatsUsed: [], elText: {}, classes: {}, attrs: {}, comments: {} };
      base = { layout: {}, texts: {}, elText: {}, balance: {}, classes: {}, attrs: {} };
      applyTextsAll(); applyCss(); renderTab(); toast("cleared");
    };
    b.appendChild(clr);
  }

  function renderDocs(b) {
    b.appendChild(el("div", "tldbg-sec", "HOW THIS HARNESS WORKS"));
    b.appendChild(el("div", "tldbg-note",
      "Load the page with ?debug=<path>.js (this session: dbg/" + game + ".js). The page's loader fetches dbg/_harness.js then that script; " +
      "no parameter means no harness, no listeners, no extra code. Ctrl+Shift+D collapses the panel. " +
      "WYSIWYG: PICK (ELEMENTS or LAYOUT tab) engages hover mode — a popup beside whatever you hover edits text, classes, attributes, every layout property and transforms live; click pins it, Esc exits. " +
      "DELTA exports only your changes with before → after and comments. " +
      "Console: TLDBG.state(), TLDBG.wysiwyg(true), TLDBG.delta(), TLDBG.downloadDelta(), TLDBG.do('id', arg), TLDBG.key('Space'), TLDBG.tap(x, y), TLDBG.get('path'), TLDBG.setPath('path', v), TLDBG.call('fn', args), TLDBG.pick('#hud'), TLDBG.info(element)."));
    var docs = (spec && spec.docs) || [];
    if (!docs.length) b.appendChild(el("div", "tldbg-note", "the game script has not written game-specific docs yet."));
    docs.forEach(function (d) {
      var w = el("div", "tldbg-doc");
      w.appendChild(el("b", null, d.topic));
      w.appendChild(el("p", null, d.text));
      b.appendChild(w);
    });
  }

  /* ------------------------------------------------------------------ boot */
  var API = {
    version: VER, modes: MODES, props: PROPS.map(function (p) { return p[0] }),
    register: function (s) {
      spec = s || {};
      game = spec.game || (location.pathname.split("/").pop() || "page").replace(/\.html$/, "");
      storageKey = "tll:dbg:" + game;
      loadEdits();
      applyCss();
      applyStoredEdits();
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildPanel);
      else buildPanel();
      API.log("harness ready: " + game + " (" + (spec.params ? spec.params.length : 0) + " params, " +
        (spec.cheats ? spec.cheats.length : 0) + " cheats, " + (spec.hooks ? spec.hooks.length : 0) + " tools)");
    },
    state: function () { return liveState() },
    get edits() { return edits },
    screenMode: screenMode,
    info: function (x) { return info(typeof x === "string" ? document.querySelector(x) : x) },
    pick: function (s) { var e = typeof s === "string" ? document.querySelector(s) : s; if (e) show(e); return e },
    set: function (selector, prop, value) { setProp(selector, prop, value) },
    align: function (selector, preset) { applyPreset(selector, preset) },
    alignTo: function (selector, refSel, how) {
      var a = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!a) return { ok: false, reason: "no element for " + selector };
      var wantRef = refSel && refSel !== "viewport";
      var b = wantRef ? (typeof refSel === "string" ? document.querySelector(refSel) : refSel) : null;
      if (wantRef && !b) return { ok: false, reason: "no element for " + refSel };
      var ra = a.getBoundingClientRect();
      var rb = b ? b.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      var k = how || "left";
      var map = { left: rb.left, right: rb.left + rb.width, centreX: rb.left + rb.width / 2,
        top: rb.top, bottom: rb.top + rb.height, centreY: rb.top + rb.height / 2 };
      if (map[k] === undefined) return { ok: false, reason: "how must be left|right|centreX|top|bottom|centreY", tried: k };
      var x = ra.left, y = ra.top;
      if (k === "left") x = map[k];
      else if (k === "right") x = map[k] - ra.width;
      else if (k === "centreX") x = map[k] - ra.width / 2;
      else if (k === "top") y = map[k];
      else if (k === "bottom") y = map[k] - ra.height;
      else if (k === "centreY") y = map[k] - ra.height / 2;
      var css = positionCss(a, x, y) || translateCss(a, x, y);
      if (!css) return { ok: false, reason: "this element cannot take the move (no offset parent)" };
      var s = selectorOf(a);
      for (var p in css) setProp(s, p, css[p]);
      noteRule(s, "aligned " + k + (b ? " with " + selectorOf(b) : " to the viewport"));
      return { ok: true, selector: s, ref: b ? selectorOf(b) : "viewport", how: k, css: css };
    },
    resizeTo: function (selector, w, h) {
      var a = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!a) return { ok: false, reason: "no element for " + selector };
      var s = selectorOf(a), css = {};
      if (w) { css.width = typeof w === "number" ? Math.round(w) + "px" : w; setProp(s, "width", css.width) }
      if (h) { css.height = typeof h === "number" ? Math.round(h) + "px" : h; setProp(s, "height", css.height) }
      noteRule(s, "resized to " + css.width + " × " + css.height);
      return { ok: true, selector: s, css: css };
    },
    suggest: function (selector, dx, dy) {
      var a = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!a) return { ok: false, reason: "no element for " + selector };
      var r = a.getBoundingClientRect(), saved = drag;
      drag = { el: a, origin: { left: r.left, top: r.top, w: r.width, h: r.height } };
      var out = buildProposals(a, r.left + (dx || 0), r.top + (dy || 0), r.width, r.height, snapTargets(a));
      drag = saved;
      return { ok: true, selector: selectorOf(a),
        from: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        by: { dx: dx || 0, dy: dy || 0 },
        proposals: out.map(function (p, i) { return { rank: i + 1, label: p.label, form: p.form,
          to: { x: Math.round(p.x), y: Math.round(p.y) }, css: p.css } }) };
    },
    dragTo: function (selector, dx, dy, rank) {
      var sg = API.suggest(selector, dx, dy);
      if (!sg.ok || !sg.proposals.length) return sg.ok ? { ok: false, reason: "no proposal for that move" } : sg;
      var p = sg.proposals[Math.max(0, Math.min(sg.proposals.length - 1, (rank || 1) - 1))];
      var a = typeof selector === "string" ? document.querySelector(selector) : selector;
      var s = selectorOf(a);
      for (var k in p.css) setProp(s, k, p.css[k]);
      noteRule(s, "dragged into place: " + p.label);
      return { ok: true, selector: s, rank: (rank || 1), label: p.label, css: p.css };
    },
    elText: function (selector, value) { var e = typeof selector === "string" ? document.querySelector(selector) : selector; if (e) applyElText(e, value); return !!e },
    classes: function (selector, value) { var e = typeof selector === "string" ? document.querySelector(selector) : selector; if (e) applyClasses(e, value); return !!e },
    attr: function (selector, name, value) { var e = typeof selector === "string" ? document.querySelector(selector) : selector; if (e) applyAttr(e, name, value); return !!e },
    text: function (lang, key, value) { textSet(lang, key, value); applyTextsAll() },
    param: function (id, value) { if (value === undefined) { var p = paramById(id); return p ? p.get() : null } setBalance(id, value) },
    wysiwyg: function (on) { if (on === false) stopWys(); else startWys(); return wys.on },
    delta: deltaJson, downloadDelta: downloadDelta, copyDelta: copyDelta,
    hook: hookObj,
    get: function (path) { return resolve(path) },
    setPath: setPathValue,
    call: function (name) {
      var h = hookObj() || window;
      var fn = h[name];
      if (typeof fn !== "function") { toast("no function '" + name + "' on the bridge"); return null }
      var args = [].slice.call(arguments, 1);
      try { return fn.apply(h, args) } catch (e) { toast("call failed: " + (e && e.message)); return null }
    },
    do: function (id, arg) { return ctrlRun(id, arg) },
    control: function () { return controlList().map(function (c) { return { id: c.id, label: c.label, args: c.args || "", doc: c.doc || "" } }) },
    recipes: function () { return (spec && spec.recipes) || [] },
    key: pressKey,
    tap: tapAt,
    exportJson: exportJson, download: download, copy: copy, toast: toast,
    refresh: function () { textCache = null; applyCss(); if (panel) renderTab() },
    log: function (m) { try { console.log("%c[TLDBG] " + m, "color:#ffd76a") } catch (e) {} }
  };
  window.TLDBG = API;
})();
