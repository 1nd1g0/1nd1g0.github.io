/* Developer harness script for index.html (the game catalogue).
   Loaded by the page loader when the URL has ?debug=dbg/index.js, after dbg/_harness.js.
   index.html wraps its i18n block in an IIFE and exposes window.TLHOOK (names only) at the
   end of it: LANG (get/set), TR, LANGS, apply(), t(), stat(), tags(), links(), picker(),
   btnUi(), flagOf(), wordOf(), store(). The card grid itself lives in markup plus a small
   search-filter IIFE, so this script drives the filter through the real #search input and
   its "input" event - exactly what a typing user does. */
(function () {
  if (!window.TLDBG || typeof TLDBG.register !== "function") return;

  function H() { return window.TLHOOK || {} }
  function num(v) { return (typeof v === "number" && isFinite(v)) ? v : 0 }
  function $(sel) { return document.querySelector(sel) }
  function cards() { var g = $("#grid"); return g ? [].slice.call(g.querySelectorAll(".card")) : [] }
  function visible() { return cards().filter(function (c) { return c.style.display !== "none" }) }
  function query() { var i = $("#search"); return i ? i.value : "" }
  function type(q) { var i = $("#search"); if (!i) return; i.value = q; i.dispatchEvent(new Event("input", { bubbles: true })) }

  /* the page's own stylesheet rules, by selector text */
  function rule(sel) {
    var sheets = document.styleSheets, i, rules, j, r;
    for (i = 0; i < sheets.length; i++) {
      try { rules = sheets[i].cssRules || [] } catch (e) { continue }
      for (j = 0; j < rules.length; j++) {
        r = rules[j];
        if (r.selectorText && (r.selectorText === sel || ("," + r.selectorText + ",").indexOf("," + sel + ",") >= 0)) return r.style;
      }
    }
    return null;
  }
  function comp(sel, prop, fallback) {
    var e = $(sel); if (!e) return fallback;
    var n = parseFloat(getComputedStyle(e)[prop]);
    return isFinite(n) ? n : fallback;
  }
  function put(sel, prop, v) { var st = rule(sel); if (st) st.setProperty(prop, v + "px") }

  /* grid-template-columns carries the min card width inside minmax() */
  function gridMin() {
    var st = rule(".grid"), raw = st ? st.getPropertyValue("grid-template-columns") : "";
    var m = raw && raw.match(/minmax\(\s*([\d.]+)px/);
    if (m) return parseFloat(m[1]);
    var el = $("#grid"), inline = el ? el.style.getPropertyValue("grid-template-columns") : "";
    m = inline && inline.match(/minmax\(\s*([\d.]+)px/);
    if (m) return parseFloat(m[1]);
    var track = el ? (getComputedStyle(el).gridTemplateColumns || "") : "";
    var n = parseFloat(track);
    return isFinite(n) && n > 0 ? n : 280;
  }
  function setGridMin(v) { var st = rule(".grid"); if (st) st.setProperty("grid-template-columns", "repeat(auto-fill,minmax(" + v + "px,1fr))") }
  function columns() {
    var el = $("#grid");
    var track = el ? (getComputedStyle(el).gridTemplateColumns || "") : "";
    if (track && track !== "none") return track.split(" ").length;
    var st = rule(".grid"), txt = st ? st.getPropertyValue("grid-template-columns") : "";
    return /auto-fill|auto-fit/.test(txt) ? Math.max(1, Math.round(((el ? el.clientWidth : 800) + 16) / (gridMin() + 16))) : 1;
  }
  function shotH() { var im = $(".shot"); return im ? (parseFloat(im.getAttribute("height")) || 423) : 423 }
  function setShotH(v) {
    var ims = document.querySelectorAll(".shot"), i;
    for (i = 0; i < ims.length; i++) { ims[i].setAttribute("height", String(Math.round(v))); ims[i].style.height = Math.round(v) + "px" }
  }
  function langCodes() { var ls = H().LANGS || []; var out = [], i; for (i = 0; i < ls.length; i++) out.push(ls[i][0]); return out.length ? out : ["en"] }
  function cycleLang() {
    var h = H(), ls = langCodes(); if (!ls.length) return;
    var cur = h.lang || "en";
    var next = ls[(ls.indexOf(cur) + 1) % ls.length];
    h.lang = next; h.store("tll:lang", next); if (h.apply) h.apply();
    TLDBG.toast("language -> " + next);
  }
  var keysOn = false;
  function tagKeys(on) {
    var els = document.querySelectorAll(".tag"), i, e;
    keysOn = on;
    for (i = 0; i < els.length; i++) {
      e = els[i];
      if (on) { if (!e.hasAttribute("data-tag")) e.setAttribute("data-tag", e.textContent.trim()); e.textContent = e.getAttribute("data-tag") }
      else if (H().tagsFn) H().tagsFn();
    }
  }
  var badgeOn = false;
  function badges(on) {
    badgeOn = on;
    var cs = cards(), i, c, b;
    for (i = 0; i < cs.length; i++) {
      c = cs[i]; b = c.querySelector(".tll-badge");
      if (on) {
        if (!b) {
          b = document.createElement("span");
          b.className = "tll-badge";
          b.style.cssText = "font:10px ui-monospace,monospace;color:#ffd76a;word-break:break-all";
          c.appendChild(b);
        }
        b.textContent = (c.getAttribute("href") || "") + " | " + ((c.querySelector(".card-size") || {}).textContent || "");
      } else if (b) b.remove();
    }
  }
  var outlineOn = false, outlineObs = null;
  function paintOutlines() {
    var cs = cards(), i, c;
    for (i = 0; i < cs.length; i++) {
      c = cs[i];
      c.style.outline = (outlineOn && c.style.display === "none") ? "2px dashed #ff5c5c" : "";
    }
  }
  function outlineHidden(on) {
    outlineOn = on;
    paintOutlines();
    if (on) {
      var g = $("#grid");
      if (g && !outlineObs) {
        outlineObs = new MutationObserver(function () { paintOutlines() });
        outlineObs.observe(g, { subtree: true, attributes: true, attributeFilter: ["style"] });
      }
    } else if (outlineObs) {
      outlineObs.disconnect();
      outlineObs = null;
    }
  }
  var shotsOn = false;
  function hideShots(on) {
    shotsOn = on;
    var ims = document.querySelectorAll(".shot"), i;
    for (i = 0; i < ims.length; i++) ims[i].style.visibility = on ? "hidden" : "";
  }
  function brokenShots() {
    var ims = document.querySelectorAll(".shot"), out = [], i, im;
    for (i = 0; i < ims.length; i++) { im = ims[i]; if (im.complete && num(im.naturalWidth) === 0) out.push(im.getAttribute("src") || "?") }
    return out;
  }
  function markBroken() {
    var bad = brokenShots(), i, ims = document.querySelectorAll(".shot");
    for (i = 0; i < ims.length; i++) {
      var im = ims[i];
      im.style.outline = (im.complete && num(im.naturalWidth) === 0) ? "3px solid #ff5c5c" : "";
    }
    TLDBG.toast(bad.length ? "broken shots: " + bad.slice(0, 4).join(", ") : "no broken shots");
  }

  TLDBG.register({
    game: "index",
    file: "index.html",
    state: function () {
      var h = H(), cs = cards(), vis = visible(), em = $("#empty");
      return {
        cards: cs.length,
        shown: vis.length,
        query: query() || "-",
        language: h.lang || "?",
        savedLang: h.savedLang || "(unset)",
        statLine: ($("#statWrap") || {}).textContent || "-",
        tags: document.querySelectorAll(".tag").length,
        tagKeysShown: keysOn,
        badgesOn: badgeOn,
        brokenShots: brokenShots().length,
        columns: columns(),
        minCardWidth: Math.round(gridMin()),
        emptyNotice: em && em.classList.contains("show") ? "visible" : "hidden",
        version: window.GAME_VERSION || "-",
        langLinkQuery: (document.querySelector("a[href]") || {}).getAttribute && /language=/.test(document.querySelector("a[href]").getAttribute("href") || "") ? "on" : "off"
      };
    },
    params: [
      { id: "minCard", label: "Min card width", unit: "px", min: 160, max: 560, step: 10,
        get: function () { return gridMin() }, set: setGridMin,
        code: { file: "index.html", line: 61, name: ".grid grid-template-columns minmax()" },
        doc: "How narrow a card may get before the auto-fill grid adds another column" },
      { id: "columns", label: "Columns now", unit: "cols", min: 1, max: 12, step: 1, readonly: true,
        get: function () { return columns() },
        code: { file: "index.html", line: 61, name: ".grid grid-template-columns" },
        doc: "READ ONLY - the grid is auto-fill, so column count follows width and min card width; edit the row above instead" },
      { id: "gap", label: "Grid gap", unit: "px", min: 0, max: 48, step: 1,
        get: function () { return comp("#grid", "rowGap", 16) }, set: function (v) { put(".grid", "gap", v) },
        code: { file: "index.html", line: 62, name: ".grid gap" },
        doc: "Space between cards, both directions" },
      { id: "cardPad", label: "Card padding", unit: "px", min: 2, max: 48, step: 1,
        get: function () { return comp(".card", "paddingTop", 22) }, set: function (v) { put(".card", "padding", v) },
        code: { file: "index.html", line: 66, name: ".card padding" },
        doc: "Inner margin of every card; drives how much text and screenshot fit" },
      { id: "cardRadius", label: "Card corner radius", unit: "px", min: 0, max: 40, step: 1,
        get: function () { return comp(".card", "borderTopLeftRadius", 14) }, set: function (v) { put(".card", "border-radius", v) },
        code: { file: "index.html", line: 65, name: ".card border-radius" },
        doc: "Corner rounding of the cards" },
      { id: "iconSize", label: "Card icon size", unit: "px", min: 10, max: 80, step: 1,
        get: function () { return comp(".card-icon", "fontSize", 38) }, set: function (v) { put(".card-icon", "font-size", v) },
        code: { file: "index.html", line: 76, name: ".card-icon font-size" },
        doc: "The emoji glyph at the top of a card" },
      { id: "nameSize", label: "Card title size", unit: "px", min: 10, max: 48, step: 1,
        get: function () { return comp(".card-name", "fontSize", 18) }, set: function (v) { put(".card-name", "font-size", v) },
        code: { file: "index.html", line: 77, name: ".card-name font-size" },
        doc: "Game name line in a card" },
      { id: "tagSize", label: "Tag chip size", unit: "px", min: 7, max: 26, step: 1,
        get: function () { return comp(".tag", "fontSize", 11) }, set: function (v) { put(".tag", "font-size", v) },
        code: { file: "index.html", line: 81, name: ".tag font-size" },
        doc: "Genre chips at the bottom of a card" },
      { id: "sizeSize", label: "File-size text", unit: "px", min: 7, max: 24, step: 1,
        get: function () { return comp(".card-size", "fontSize", 11) }, set: function (v) { put(".card-size", "font-size", v) },
        code: { file: "index.html", line: 102, name: ".card-size font-size" },
        doc: "The KB figure shown per card" },
      { id: "shotH", label: "Screenshot height", unit: "px", min: 100, max: 700, step: 10,
        get: function () { return shotH() }, set: setShotH,
        code: { file: "index.html", line: 200, name: ".shot width/height attributes" },
        doc: "Rewrites the width/height attributes and CSS height of every card screenshot (750 px wide)" },
      { id: "titleSize", label: "Page title size", unit: "px", min: 14, max: 80, step: 1,
        get: function () { return comp("header h1", "fontSize", 34) }, set: function (v) { put("header h1", "font-size", v) },
        code: { file: "index.html", line: 27, name: "header h1 font-size" },
        doc: "The '1nd1g0 Games' heading" },
      { id: "searchWidth", label: "Search field width", unit: "px", min: 120, max: 1000, step: 10,
        get: function () { return comp(".search-wrap", "maxWidth", 520) }, set: function (v) { put(".search-wrap", "max-width", v) },
        code: { file: "index.html", line: 42, name: ".search-wrap max-width" },
        doc: "Width limit of the search box row" },
      { id: "panelWidth", label: "Language dialog width", unit: "px", min: 200, max: 900, step: 10,
        get: function () { return comp(".ovpanel", "maxWidth", 640) }, set: function (v) { put(".ovpanel", "max-width", v) },
        code: { file: "index.html", line: 137, name: ".ovpanel max-width" },
        doc: "Width of the language chooser dialog panel" },
      { id: "langBtnWidth", label: "Flag button width", unit: "px", min: 80, max: 320, step: 5,
        get: function () { return comp(".lgb", "width", 150) }, set: function (v) { put(".lgb", "width", v) },
        code: { file: "index.html", line: 142, name: ".lgb width" },
        doc: "Each flag button inside the language dialog (130 px on the narrow breakpoint)" }
    ],
    cheats: [
      { id: "clearSearch", label: "Show every card", doc: "empties #search and fires the real 'input' event, so the page's own filter runs",
        run: function () { type(""); TLDBG.toast("filter cleared") } },
      { id: "noResults", label: "Force 'no games found'", doc: "types a query nothing matches, to check the empty state and its translation",
        run: function () { type("zzz-no-such-game"); TLDBG.toast("empty state forced") } },
      { id: "showHidden", label: "Outline filtered-out cards", doc: "red dashed outline on every card the current filter hides, kept up to date by a MutationObserver on #grid while on; off removes the outlines and the observer",
        toggle: true, on: function (v) { outlineHidden(v) } },
      { id: "badges", label: "Show file and size on each card", doc: "adds a monospace line with the href and the KB figure inside every card",
        toggle: true, on: function (v) { badges(v) } },
      { id: "tagKeys", label: "Show tag keys instead of words", doc: "replaces each chip with its canonical data-tag key - the string the translation table must contain; off re-runs the page's own tags()",
        toggle: true, on: function (v) { tagKeys(v) } },
      { id: "hideShots", label: "Hide screenshots", doc: "visibility:hidden on every .shot: fastest way to see the pure text layout",
        toggle: true, on: function (v) { hideShots(v) } },
      { id: "brokenShots", label: "Mark broken screenshots", doc: "red outline on images that failed to load (naturalWidth 0)",
        run: markBroken },
      { id: "forceEmpty", label: "Force the empty notice visible", doc: "adds the .show class to #empty without touching the filter",
        run: function () { var e = $("#empty"); if (e) e.classList.add("show") } },
      { id: "cycleLang", label: "Cycle language", doc: "writes TLHOOK.lang, stores tll:lang and re-runs the page's own apply()",
        run: cycleLang },
      { id: "rerender", label: "Re-render catalogue text", doc: "calls the page's own apply() again (tags, stat line, link ?language= suffix, dialog)",
        run: function () { if (H().apply) { H().apply(); TLDBG.toast("apply() re-run") } else TLDBG.toast("TLHOOK.apply missing") } },
      { id: "randomGame", label: "Open a random game", doc: "opens one card's href in a new tab, keeping the current language suffix",
        run: function () {
          var cs = visible(); if (!cs.length) { TLDBG.toast("no visible cards"); return }
          var c = cs[Math.floor(Math.random() * cs.length)];
          window.open(c.getAttribute("href"), "_blank");
          TLDBG.toast("opened " + (c.getAttribute("href") || "?"));
        } },
      { id: "reloadDebug", label: "Reload with this debug URL", doc: "location.reload(): picks up edited dbg/index.js and page sources",
        run: function () { location.reload() } }
    ],
    hooks: [
      { label: "console.table(cards)", doc: "every card: name, href, tags, size, hidden flag",
        run: function () {
          console.table(cards().map(function (c) {
            return {
              name: ((c.querySelector(".card-name") || {}).textContent || "").trim(),
              href: c.getAttribute("href") || "",
              tags: [].slice.call(c.querySelectorAll(".tag")).map(function (t) { return t.getAttribute("data-tag") || t.textContent.trim() }).join(" "),
              size: ((c.querySelector(".card-size") || {}).textContent || "").trim(),
              icon: ((c.querySelector(".card-icon") || {}).textContent || "").trim(),
              hidden: c.style.display === "none"
            };
          }));
        } },
      { label: "log TR[LANG]", doc: "the live translation table for the current language, tags map included",
        run: function () { var h = H(); var TR = h.TR || {}; console.log((TR[h.lang || "en"] || {}), "missing vs en:", Object.keys(TR.en || {}).filter(function (k) { return TR[h.lang || "en"] && TR[h.lang || "en"][k] === undefined })) } },
      { label: "log LANGS / apply coverage", doc: "language codes with names, and which data-t / data-ph attributes the page translates",
        run: function () {
          var h = H();
          console.log((h.LANGS || []).map(function (l) { return { code: l[0], name: l[1], word: l[2] } }));
          console.log("[data-t] keys:", [].slice.call(document.querySelectorAll("[data-t]")).map(function (e) { return e.getAttribute("data-t") }));
          console.log("[data-ph] keys:", [].slice.call(document.querySelectorAll("[data-ph]")).map(function (e) { return e.getAttribute("data-ph") }));
        } },
      { label: "log localStorage keys", doc: "everything this page stores (tll:lang and any per-page stats)",
        run: function () {
          var out = {}, k;
          for (k = 0; k < localStorage.length; k++) { var key = localStorage.key(k); if (key.indexOf("tll:") === 0 || key.indexOf("tll:") >= 0) out[key] = localStorage.getItem(key) }
          console.log(out);
        } },
      { label: "log applied CSS values", doc: "the catalogue CSS numbers as they currently stand, with the source line of each",
        run: function () {
          console.table([
            { prop: "min card width", value: Math.round(gridMin()) + "px", line: "index.html:61" },
            { prop: "grid gap", value: Math.round(comp("#grid", "rowGap", 16)) + "px", line: "index.html:62" },
            { prop: "card padding", value: Math.round(comp(".card", "paddingTop", 22)) + "px", line: "index.html:66" },
            { prop: "card radius", value: Math.round(comp(".card", "borderTopLeftRadius", 14)) + "px", line: "index.html:65" },
            { prop: "icon size", value: Math.round(comp(".card-icon", "fontSize", 38)) + "px", line: "index.html:76" },
            { prop: "name size", value: Math.round(comp(".card-name", "fontSize", 18)) + "px", line: "index.html:77" },
            { prop: "tag size", value: Math.round(comp(".tag", "fontSize", 11)) + "px", line: "index.html:81" },
            { prop: "shot height", value: Math.round(shotH()) + "px", line: "index.html:200" }
          ]);
        } }
    ],
    layout: [
      { sel: "header", label: "header block" },
      { sel: "header h1", label: "page title" },
      { sel: "header p", label: "subtitle line" },
      { sel: "#langBtn", label: "language button (flag + word)" },
      { sel: ".stats", label: "stats pill" },
      { sel: "#statWrap", label: "stats text (games available)" },
      { sel: "#count", label: "visible card count" },
      { sel: ".search-wrap", label: "search row" },
      { sel: "#search", label: "search field" },
      { sel: ".s-icon", label: "search icon" },
      { sel: "#grid", label: "card grid container" },
      { sel: ".card", label: "one game card" },
      { sel: ".shot", label: "card screenshot" },
      { sel: ".card-icon", label: "card emoji icon" },
      { sel: ".card-name", label: "card game name" },
      { sel: ".card-tags", label: "card tag row" },
      { sel: ".tag", label: "one tag chip" },
      { sel: ".card-size", label: "card file-size text" },
      { sel: "#empty", label: "'no games found' notice" },
      { sel: ".wrap", label: "page content wrapper" },
      { sel: "footer", label: "archive footer" },
      { sel: "#langOv", label: "language dialog backdrop" },
      { sel: ".ovpanel", label: "language dialog panel" },
      { sel: "#langQ", label: "dialog title" },
      { sel: "#langSub", label: "dialog subtitle" },
      { sel: "#langB", label: "flag button list" },
      { sel: ".lgb", label: "one flag button" },
      { sel: ".ovrow", label: "dialog button row" },
      { sel: "#langX", label: "CLOSE button" }
    ],
    texts: {
      langs: function () { return langCodes() },
      keys: function (l) {
        var TR = (H().TR || {}), t = TR[l] || TR.en || {};
        var out = Object.keys(t), seen = {}, i, k, e;
        for (i = 0; i < document.querySelectorAll(".tag").length; i++) {
          e = document.querySelectorAll(".tag")[i];
          k = e.getAttribute("data-tag") || e.textContent.trim();
          if (k && !seen[k]) { seen[k] = 1; out.push("tags." + k) }
        }
        var tags = t.tags || {};
        for (k in tags) if (Object.prototype.hasOwnProperty.call(tags, k) && !seen[k]) { seen[k] = 1; out.push("tags." + k) }
        return out;
      },
      get: function (l, key) {
        var TR = (H().TR || {}), t = TR[l] || TR.en || {};
        if (key.indexOf("tags.") === 0) {
          var tk = key.slice(5), tt = (TR[l] && TR[l].tags) || (TR.en && TR.en.tags) || {};
          return tt[tk] != null ? tt[tk] : tk;
        }
        return t[key] != null ? t[key] : ((TR.en && TR.en[key] != null) ? TR.en[key] : "");
      },
      set: function (l, key, v) {
        var TR = H().TR; if (!TR) return;
        TR[l] = TR[l] || {};
        if (key.indexOf("tags.") === 0) { TR[l].tags = TR[l].tags || {}; TR[l].tags[key.slice(5)] = v; return }
        TR[l][key] = v;
      },
      apply: function () { if (H().apply) H().apply() }
    },
    control: [
      { id: "lang", label: "Switch the catalogue language", args: "language code (en, es, pt, ru, zh, …)", argDefault: "es",
        doc: "Sets TLHOOK.LANG and calls apply() — the same path the language picker uses, so card titles, descriptions and the stat line all re-translate.",
        run: function (code) {
          var T = H(), code2 = String(code || "en");
          T.LANG = code2; if (typeof T.apply === "function") T.apply();
          return { language: T.lang || T.LANG, saved: T.savedLang || "(unset)", statLine: ($("#statWrap") || {}).textContent || "-", cards: cards().length };
        } },
      { id: "filter", label: "Type into the search box", args: "query text", argDefault: "golf",
        doc: "Writes #search and fires the page's own `input` event — exactly what a typing user does, so the real filter runs.",
        run: function (q) { type(String(q === undefined || q === null || Array.isArray(q) ? "" : q)); return { query: query() || "-", shown: visible().length, total: cards().length, emptyNotice: ($("#empty") || {}).className || "-" }; } },
      { id: "tags", label: "Toggle tag chips or version badges", args: '"tags" | "badges" | "clear"', argDefault: "tags",
        doc: "tagKeys() shows each chip's data-tag attribute (the key a translation table needs); badges() annotates every card with its href and file size — the audit view for the catalogue.",
        run: function (w) {
          var s = String(w || "tags");
          if (s === "clear") { tagKeys(false); badges(false); }
          else if (s === "badges") badges(!badgeOn);
          else if (s === "tags") tagKeys(!keysOn);
          else return 'want "tags" | "badges" | "clear"';
          return { tags: document.querySelectorAll(".tag").length, tagsShown: keysOn, badgesOn: badgeOn, shown: visible().length };
        } },
      { id: "open", label: "Open a game from the grid", args: 'card index or title substring', argDefault: 0,
        doc: "Follows the card's own link in a new tab — verifies every card's href resolves and the game boots, without clicking by hand.",
        run: function (arg) {
          var cs = visible(); if (!cs.length) return "no visible cards";
          var card = null;
          if (typeof arg === "number" || (typeof arg === "string" && /^\\d+$/.test(arg))) card = cs[Math.max(0, Math.min(cs.length - 1, parseInt(arg, 10)))];
          else { var q = String(arg || "").toLowerCase(); card = cs.filter(function (c) { return (c.textContent || "").toLowerCase().indexOf(q) >= 0 })[0]; }
          if (!card) return "no card matches " + arg;
          var a = card.querySelector("a[href]") || card;
          var href = a.getAttribute("href") || "";
          window.open(href, "_blank");
          return { opened: href, title: (card.textContent || "").slice(0, 60) };
        } },
      { id: "shots", label: "Audit the card screenshots", args: "unused",
        doc: "Lists cards whose screenshot <img> fails to load (broken or missing files) — the catalogue integrity check.",
        run: function () {
          var bad = brokenShots();
          console.table(bad.map(function (b) { return { card: b.card || b.title || "?", src: b.src || b.href || String(b) } }));
          return { broken: bad.length, of: cards().length };
        } },
      { id: "grid", label: "Set the card grid width", args: "min card width in px (0 = auto)", argDefault: 260,
        doc: "Writes the grid's min-width — the knob behind how many columns the catalogue shows at a given viewport.",
        run: function (n) {
          var g = $("#grid"); if (!g) return "no grid on this page";
          var v = Number(n);
          g.style.gridTemplateColumns = (!(v > 0)) ? "" : "repeat(auto-fill, minmax(" + v + "px, 1fr))";
          return { columns: columns(), minCardWidth: Math.round(gridMin()), cards: cards().length };
        } },
      { id: "probe", label: "Read the catalogue state", args: "unused",
        doc: "Card count, visible count, active query, language and stored language, stat line, tag chips and whether they show, badge mode, broken screenshots, grid columns and minimum card width, game version.",
        run: function () {
          var hook = H();
          return { cards: cards().length, shown: visible().length, query: query() || "-",
            language: hook.lang || hook.LANG || "?", savedLang: hook.savedLang || "(unset)",
            statLine: ($("#statWrap") || {}).textContent || "-",
            tags: document.querySelectorAll(".tag").length, tagKeysShown: keysOn, badgesOn: badgeOn,
            brokenShots: brokenShots().length, columns: columns(), minCardWidth: Math.round(gridMin()),
            emptyNotice: ($("#empty") && $("#empty").classList.contains("show")) ? "visible" : "hidden",
            version: window.GAME_VERSION || "-" };
        } },
      { id: "watch", label: "Log the grid every N seconds", args: "seconds (0 stops)", argDefault: 2,
        doc: "Visible count, query and language each interval — useful while typing filters or switching languages to see the re-render land; window.__tllCatalogue holds the timer.",
        run: function (s) {
          if (window.__tllCatalogue) { clearInterval(window.__tllCatalogue); window.__tllCatalogue = null; }
          var sec = Number(s); if (!(sec > 0)) return "watch stopped";
          window.__tllCatalogue = setInterval(function () {
            var hook = H();
            console.log("shown", visible().length + "/" + cards().length, "query", query() || "-", "lang", hook.lang || hook.LANG, "columns", columns());
          }, sec * 1000);
          return "watching every " + sec + "s";
        } }
    ],

    recipes: [
      { label: "Every language: card counts and translated titles",
        doc: "Switches through the page's LANGS list, printing the stat line and the first card title in each language — catches missing translations and layout blowups.",
        js: 'var T = window.TLHOOK, out = [];\n(T.LANGS || ["en", "es", "pt", "ru", "zh"]).forEach(function (L) {\n  T.LANG = L; T.apply();\n  var first = document.querySelector("#grid .card");\n  out.push({ lang: L, cards: document.querySelectorAll("#grid .card").length, stat: (document.getElementById("statWrap") || {}).textContent || "-", firstTitle: first ? (first.textContent || "").slice(0, 40) : "-" });\n});\nconsole.table(out);' },
      { label: "Broken screenshot sweep",
        doc: "Checks every card image's naturalWidth and lists the ones that failed to load, with the href of their card.",
        js: 'var bad = [];\ndocument.querySelectorAll("#grid .card img").forEach(function (im) {\n  if (im.complete && im.naturalWidth === 0) bad.push({ src: im.getAttribute("src"), card: (im.closest(".card").querySelector("a[href]") || {}).href || "?" });\n});\nconsole.table(bad);' }
    ],

    docs: [
      { topic: "What this panel is", text: "The catalogue is not a game, so STATE reports the grid instead: cards listed, cards currently shown, the live search query, language, saved language, the stat line, tag count, broken screenshots, column count and the deploy version from <meta name=version>." },
      { topic: "How it reaches the page", text: "index.html wraps its i18n block in an IIFE and exposes ONE window.TLHOOK at the end of it - LANG (get/set), TR, LANGS, apply(), t(), stat(), tags(), links(), picker(), btnUi(), flagOf(), wordOf(), store(). Nothing else is touched in the page. The card grid and its filter live in markup plus a second IIFE; the cheats drive the real #search input and dispatch its 'input' event, so filtering runs exactly as when a person types." },
      { topic: "Balance rows here", text: "The catalogue's knobs are CSS numbers: min card width (inside .grid's minmax()), grid gap, card padding/radius, icon, name, tag and file-size text sizes, screenshot height, title size, search width, dialog width, flag button width. Each row writes into the page's own stylesheet rule and shows the source line. 'Columns now' is READ ONLY because auto-fill derives the count from width and min card width." },
      { topic: "Cheats", text: "Show every card / force 'no games found' go through the real filter. Outline-filtered-cards reveals what the query hides. Show-tag-keys swaps each chip for its canonical data-tag string - the key your translation table must contain. Hide-screenshots and mark-broken-shots check layout and image paths. Cycle-language and re-render call the page's own apply(), which also rewrites every game link with the ?language= suffix." },
      { topic: "Layout and texts", text: "LAYOUT resizes and repositions header, stats pill, search row, grid, cards (screenshot, icon, name, tags, size), the empty notice, footer and the whole language dialog per screen mode. TEXTS edits TR per language - plain keys plus 'tags.<name>' entries for the genre chips - and applies live through the page's own apply(); remember to keep the {n} placeholder in statLine." },
      { topic: "Export for the LLM pass", text: "EXPORT writes one JSON: your layout/text/balance/CSS/JS edits, the element map, the live state and applyHints with file:line for every change, so the catalogue's CSS numbers and TR entries can be patched back into index.html directly." }
    ]
  });
})();
