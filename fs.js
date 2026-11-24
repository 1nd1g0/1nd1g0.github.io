/* fs.js — the one fullscreen control every page shares.

   Two jobs:

   1. A toggle button. `TLFS.mount("#opts", {cls:"btn"})` puts it inside a menu or
      title panel using that page's own button class; `TLFS.mount()` alone floats a
      small icon button in the bottom-right corner; `{icon:true}` swaps the word for
      a ⤢ glyph and moves it into `aria-label` for narrow hosts. The wording is the
      shared translation key `fullscreen` / `exitFullscreen` — from the i18n kit, from
      a page table published through `TLFS_LABEL(key)`, or English as the floor — and
      a change of `<html lang>` repaints it. Where the Fullscreen API is missing the
      button hides itself instead of lying.

   2. Re-fit on every usable-area change. Entering or leaving fullscreen, an
      orientation flip, and a mobile browser bar hiding or showing all change the
      area the game has to fill — and the bar case does not always fire a plain
      `resize`. This file listens to `fullscreenchange` (all vendor spellings) and
      to `visualViewport.resize`, then re-applies `<html data-fs>` and dispatches
      `resize` (plus `orientationchange`) once per frame, so the page's own layout
      code runs. `TLFS.refitOnly()` gives a page that already has its own
      fullscreen button just that wiring, without a second button.

   Nothing here reads game state, and a page that never calls mount/refitOnly gets
   no behaviour change beyond `<html data-fs>` and the re-fit dispatch.        */
(function () {
  if (window.TLFS) return;
  var de = document.documentElement;
  var REQ = de.requestFullscreen || de.webkitRequestFullscreen ||
    de.msRequestFullscreen || de.mozRequestFullScreen;
  var EX = document.exitFullscreen || document.webkitExitFullscreen ||
    document.msExitFullscreen || document.mozCancelFullScreen;
  var blocked = !REQ || !EX || de.fullscreenEnabled === false;
  var ICON = "\u2922"; /* narrow hosts (side stripes, icon bars) get the glyph plus a
                          translated aria-label instead of the word */
  var btns = [], cbs = [], queued = false, styleDone = false;

  function isFull() {
    return !!(de.fullscreenElement || de.webkitFullscreenElement ||
      de.msFullscreenElement || de.mozFullScreenElement);
  }
  function kit() {
    var k = window.TLI18N;
    return (k && typeof k.t === "function") ? k : null;
  }
  /* A missing key makes t() hand back the key name — that is not a label.
     Pages that keep their own translation table (billiards, tilt, oilstorm) publish
     TLFS_LABEL(key) instead of the kit; they win over the kit, English is the floor. */
  function label() {
    var want = isFull() ? "exitFullscreen" : "fullscreen";
    var L = window.TLFS_LABEL;
    if (typeof L === "function") {
      try { var v = L(want); if (v && v !== want) return String(v) } catch (e) {}
    }
    var k = kit(), t = null;
    if (k) { try { t = k.t(want) } catch (e) { t = null } }
    if (!t || t === want) t = isFull() ? "EXIT FULLSCREEN" : "FULLSCREEN";
    return t;
  }
  function cssOnce() {
    if (styleDone) return;
    styleDone = true;
    var st = document.createElement("style");
    st.textContent =
      ".tlfs-float{position:fixed;right:10px;bottom:10px;z-index:2147483000;" +
      "min-width:38px;padding:7px 10px;border:1px solid rgba(255,255,255,.35);" +
      "border-radius:8px;background:rgba(0,0,0,.55);color:#fff;" +
      "font:12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;" +
      "cursor:pointer;touch-action:manipulation}" +
      ".tlfs-float:hover{border-color:#ffd76a;color:#ffd76a}" +
      ".tlfs-float[hidden]{display:none}";
    document.head.appendChild(st);
  }
  function paint() {
    var txt = label();
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.textContent = b.__tlfsIcon ? ICON : txt;
      b.setAttribute("aria-label", txt);
      b.setAttribute("aria-pressed", isFull() ? "true" : "false");
    }
  }
  /* One pass per frame: fullscreenchange and visualViewport.resize often arrive
     together, and dispatching resize from inside a resize listener would loop. */
  function refit() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      de.setAttribute("data-fs", isFull() ? "on" : "off");
      paint();
      for (var i = 0; i < cbs.length; i++) { try { cbs[i](isFull()) } catch (e) {} }
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("orientationchange"));
    });
  }
  function toggle() {
    if (blocked) return false;
    var was = isFull();
    try {
      if (was) EX.call(document);
      else { var p = REQ.call(de); if (p && p.catch) p.catch(function () {}) }
    } catch (e) {}
    /* the change event may never come (sandboxed frames, denied requests, some
       headless shells that grant then silently drop): repaint the state we can
       read twice, late enough to catch a transition nobody announced. */
    setTimeout(refit, 220);
    setTimeout(refit, 700);
    return !was;
  }

  de.setAttribute("data-fs", "off");
  ["fullscreenchange", "webkitfullscreenchange", "MSFullscreenChange", "mozfullscreenchange"]
    .forEach(function (t) { document.addEventListener(t, refit, false) });
  ["fullscreenerror", "webkitfullscreenerror"].forEach(function (t) {
    document.addEventListener(t, function () { de.setAttribute("data-fs", "off"); paint() }, false)
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", refit, false);
    window.visualViewport.addEventListener("scroll", function () {
      de.setAttribute("data-fs", isFull() ? "on" : "off");
      paint(); /* an exit the browser never announced must still clear the label */
    }, false);
  }
  /* an Escape-triggered exit is not a click; the label must follow it anyway */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isFull()) setTimeout(refit, 60);
  }, false);
  /* A language switch changes <html lang>: repaint from whatever table the page
     uses (kit or its own). Buttons carry no data-t of their own — pages like tetro
     drive their toggle state off that attribute, and taking it would corrupt them. */
  new MutationObserver(paint).observe(de, {attributes: true, attributeFilter: ["lang"]});

  window.TLFS = {
    version: "2026.11.23.3",
    supported: !blocked,
    isFull: isFull,
    label: label,
    paint: paint,
    toggle: toggle,
    onChange: function (fn) { if (typeof fn === "function") cbs.push(fn); return fn },
    /* just the size/orientation wiring, for a page with its own fullscreen button */
    refitOnly: function () { paint(); return true },
    /* put the button in `sel` (or float it when the selector matches nothing).
       opts: {cls, id, prepend, ariaLabel, icon} — `icon` draws the ⤢ glyph and
       puts the translated word in aria-label, for narrow hosts. */
    mount: function (sel, opts) {
      cssOnce();
      var o = opts || {};
      var b = document.createElement("button");
      b.type = "button";
      b.className = o.cls || "tlfs-float";
      b.id = o.id || "tlfsBtn";
      b.__tlfsIcon = !!o.icon;
      if (o.float !== false && !o.cls) b.classList.add("tlfs-float");
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", label());
      if (o.ariaLabel) b.setAttribute("data-aria", o.ariaLabel);
      b.textContent = o.icon ? ICON : label();
      /* a menu that starts the game on any tap (defender binds pointerdown on the
         whole title screen) must not fire when the fullscreen button is pressed */
      b.addEventListener("pointerdown", function (e) { e.stopPropagation() }, false);
      b.addEventListener("touchstart", function (e) { e.stopPropagation() }, false);
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); toggle() });
      var host = sel ? document.querySelector(sel) : null;
      if (host) {
        if (o.prepend && host.firstChild) host.insertBefore(b, host.firstChild);
        else host.appendChild(b);
      } else {
        b.classList.add("tlfs-float");
        document.body.appendChild(b);
      }
      if (blocked) b.style.display = "none";
      btns.push(b);
      paint();
      return b;
    },
    /* wire a button the page already has in its markup (keeps its own look) */
    attach: function (el) {
      cssOnce();
      if (!el) return null;
      if (blocked) { el.style.display = "none"; return el }
      el.addEventListener("click", function (e) { e.preventDefault(); toggle() });
      btns.push(el);
      paint();
      return el;
    },
    /* a rebuilt panel drops its children: re-add every button the page mounted */
    reassert: function () {
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        if (!b.isConnected && b.__tlfsHost) {
          var h = document.querySelector(b.__tlfsHost);
          if (h) h.appendChild(b);
        }
      }
      paint();
      return btns.length
    }
  };
  /* remember where each button was mounted so a panel rebuild can put it back */
  var mount0 = window.TLFS.mount;
  window.TLFS.mount = function (sel, opts) {
    var b = mount0(sel, opts);
    if (b) b.__tlfsHost = sel || "body";
    return b;
  };
  var k = kit();
  if (k && typeof k.onChange === "function") { try { k.onChange(paint) } catch (e) {} }
})();
