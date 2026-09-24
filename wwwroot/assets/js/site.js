/* Finance Family site script. No dependencies. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduceMotion = function () {
    return root.getAttribute("data-motion") === "reduce" || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- display preferences (applied early in head; here only the panel) ---------- */
  var PREF_KEY = "ff-prefs";
  function readPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); } catch (e) { return {}; } }
  function writePrefs(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) {} }
  function applyPrefs(p) {
    ["theme", "contrast", "textsize", "motion"].forEach(function (k) {
      if (p[k] && p[k] !== "auto") root.setAttribute("data-" + k, p[k]); else root.removeAttribute("data-" + k);
    });
  }
  $$(".prefs").forEach(function (wrap) {
    var btn = $("button.prefs-toggle", wrap), panel = $(".prefs-panel", wrap);
    if (!btn || !panel) return;
    var prefs = readPrefs();
    $$("input[type=radio]", panel).forEach(function (r) {
      var cur = prefs[r.name] || "auto";
      r.checked = r.value === cur;
      r.addEventListener("change", function () { prefs[r.name] = r.value; writePrefs(prefs); applyPrefs(prefs); });
    });
    function open(o) { panel.setAttribute("data-open", o ? "true" : "false"); btn.setAttribute("aria-expanded", o ? "true" : "false"); if (o) { var f = $("input", panel); f && f.focus(); } }
    btn.addEventListener("click", function () { open(panel.getAttribute("data-open") !== "true"); });
    doc.addEventListener("click", function (e) { if (!wrap.contains(e.target)) open(false); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.getAttribute("data-open") === "true") { open(false); btn.focus(); } });
    var reset = $(".prefs-reset", panel);
    reset && reset.addEventListener("click", function () { prefs = {}; writePrefs(prefs); applyPrefs(prefs); $$("input[type=radio]", panel).forEach(function (r) { r.checked = r.value === "auto"; }); });
  });

  /* ---------- header ---------- */
  var header = $(".site-header");
  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { header.classList.toggle("is-scrolled", window.scrollY > 24); ticking = false; });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  var menu = $(".mobile-menu"), toggle = $(".nav-toggle"), closeBtn = $(".menu-close");
  function setMenu(open) {
    if (!menu) return;
    menu.setAttribute("data-open", open ? "true" : "false");
    doc.body.setAttribute("data-menu-open", open ? "true" : "false");
    toggle && toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { (closeBtn || $("a", menu)).focus(); } else if (toggle) { toggle.focus(); }
  }
  toggle && toggle.addEventListener("click", function () { setMenu(menu.getAttribute("data-open") !== "true"); });
  closeBtn && closeBtn.addEventListener("click", function () { setMenu(false); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu && menu.getAttribute("data-open") === "true") setMenu(false); });
  if (menu) {
    menu.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = $$("a, button", menu).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  }

  /* ---------- reveal on scroll ---------- */
  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }) : null;
  $$(".reveal, .reveal-stagger, .viz, .chart, .pg-anim").forEach(function (el) {
    if (!io || reduceMotion()) { el.classList.add("is-in"); return; }
    io.observe(el);
  });

  /* ---------- number counters ---------- */
  function formatNum(n, dec) {
    return n.toLocaleString("he-IL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count")), dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var prefix = el.getAttribute("data-prefix") || "", suffix = el.getAttribute("data-suffix") || "";
    if (isNaN(target)) return;
    if (reduceMotion()) { el.textContent = prefix + formatNum(target, dec) + suffix; return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + formatNum(target * e, dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var cio = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } });
  }, { threshold: 0.5 }) : null;
  $$("[data-count]").forEach(function (el) { if (cio) cio.observe(el); else countUp(el); });

  /* ---------- needs selector (tabs) ---------- */
  $$(".needs").forEach(function (wrap) {
    var tabs = $$("[role=tab]", wrap), panels = $$("[role=tabpanel]", wrap);
    function select(tab, focus) {
      tabs.forEach(function (t) { var on = t === tab; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p) {
        var on = p.id === tab.getAttribute("aria-controls");
        p.hidden = !on;
        if (on && !reduceMotion()) { p.classList.remove("is-switching"); void p.offsetWidth; p.classList.add("is-switching"); }
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var dir = (e.key === "ArrowDown" || e.key === "ArrowLeft") ? 1 : (e.key === "ArrowUp" || e.key === "ArrowRight") ? -1 : 0;
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); return; }
        if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); return; }
        if (!dir) return;
        e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- generic tabs (rate tables) ---------- */
  $$("[data-tabs]").forEach(function (wrap) {
    var tabs = $$("[role=tab]", wrap), panels = $$("[role=tabpanel]", wrap);
    function select(tab, focus) {
      tabs.forEach(function (t) { var on = t === tab; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p) { p.hidden = p.id !== tab.getAttribute("aria-controls"); });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var dir = (e.key === "ArrowLeft") ? 1 : (e.key === "ArrowRight") ? -1 : 0;
        if (!dir) return; e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- process timeline progress ---------- */
  $$(".timeline").forEach(function (tl) {
    var steps = $$(".step", tl);
    if (!("IntersectionObserver" in window) || reduceMotion()) { steps.forEach(function (s) { s.classList.add("is-active"); }); tl.style.setProperty("--progress", "1"); return; }
    var seen = 0;
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-active");
        var idx = steps.indexOf(en.target) + 1;
        if (idx > seen) { seen = idx; tl.style.setProperty("--progress", String(seen / steps.length)); }
        sio.unobserve(en.target);
      });
    }, { threshold: 0.6, rootMargin: "0px 0px -10% 0px" });
    steps.forEach(function (s) { sio.observe(s); });
  });

  /* ---------- article filter (knowledge page) ---------- */
  $$("[data-filter-bar]").forEach(function (bar) {
    var target = $(bar.getAttribute("data-filter-bar")); if (!target) return;
    var items = $$("[data-category]", target), btns = $$("[data-filter]", bar), count = $("[data-filter-count]");
    function apply(cat) {
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-filter") === cat ? "true" : "false"); });
      var n = 0;
      items.forEach(function (it) { var show = cat === "all" || it.getAttribute("data-category") === cat; it.hidden = !show; if (show) n++; });
      if (count) count.textContent = n;
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { apply(b.getAttribute("data-filter")); }); });
  });

  /* ---------- glossary search ---------- */
  $$("[data-glossary-search]").forEach(function (input) {
    var list = $(input.getAttribute("data-glossary-search")); if (!list) return;
    var terms = $$(".term", list), count = $("[data-glossary-count]");
    function norm(s) { return (s || "").toLowerCase().replace(/["'״׳]/g, ""); }
    function apply() {
      var q = norm(input.value.trim()), n = 0;
      terms.forEach(function (t) { var show = !q || norm(t.textContent).indexOf(q) > -1; t.hidden = !show; if (show) n++; });
      list.setAttribute("data-empty", n === 0 ? "true" : "false");
      if (count) count.textContent = n;
    }
    input.addEventListener("input", apply);
  });

  /* ---------- mortgage calculator ---------- */
  $$("[data-calc]").forEach(function (calc) {
    var amount = $("[name=amount]", calc), years = $("[name=years]", calc), rate = $("[name=rate]", calc);
    if (!amount || !years || !rate) return;
    var out = {
      amount: $("[data-out=amount]", calc), years: $("[data-out=years]", calc), rate: $("[data-out=rate]", calc),
      monthly: $("[data-out=monthly]", calc), total: $("[data-out=total]", calc), interest: $("[data-out=interest]", calc),
      barP: $("[data-out=bar-principal]", calc), barI: $("[data-out=bar-interest]", calc), text: $("[data-out=text]", calc)
    };
    function nis(n) { return "₪" + Math.round(n).toLocaleString("he-IL"); }
    function update() {
      var P = +amount.value, n = +years.value * 12, r = (+rate.value) / 100 / 12;
      var m = r > 0 ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
      var total = m * n, interest = total - P;
      out.amount && (out.amount.textContent = nis(P));
      out.years && (out.years.textContent = years.value + " שנים");
      out.rate && (out.rate.textContent = (+rate.value).toFixed(2) + "%");
      out.monthly && (out.monthly.textContent = nis(m));
      out.total && (out.total.textContent = nis(total));
      out.interest && (out.interest.textContent = nis(interest));
      if (out.barP) { out.barP.style.transform = "scaleX(" + (P / total).toFixed(3) + ")"; }
      out.text && (out.text.textContent = "החזר חודשי משוער של " + nis(m) + " על " + nis(P) + " ל-" + years.value + " שנים בריבית " + (+rate.value).toFixed(2) + "%. סך הריבית לאורך התקופה: " + nis(interest) + ".");
    }
    [amount, years, rate].forEach(function (i) { i.addEventListener("input", update); });
    update();
  });

  /* ---------- lead forms ---------- */
  $$("form.lead-form").forEach(function (form) {
    var status = $(".form-status", form), submitBtn = $("button[type=submit]", form);
    var phoneRe = /^0(5\d|[2-4]|7\d|8|9)[-\s]?\d{3}[-\s]?\d{4}$|^\+?972[-\s]?5\d[-\s]?\d{3}[-\s]?\d{4}$/;
    function setErr(field, msg) {
      var wrap = field.closest(".field"), err = wrap && $(".error", wrap);
      if (!wrap) return;
      wrap.setAttribute("data-invalid", msg ? "true" : "false");
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
    }
    function validate() {
      var ok = true, first = null;
      $$("[required], [data-validate]", form).forEach(function (f) {
        var v = f.value.trim(), msg = "";
        if (f.required && !v) msg = "שדה חובה";
        else if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "כתובת אימייל לא תקינה";
        else if (f.type === "tel" && v && !phoneRe.test(v)) msg = "מספר טלפון ישראלי לא תקין";
        else if (f.name === "name" && v && v.length < 2) msg = "נא להזין שם מלא";
        if (f.type === "checkbox" && f.required && !f.checked) msg = "נדרש אישור";
        setErr(f, msg);
        if (msg) { ok = false; if (!first) first = f; }
      });
      if (first) first.focus();
      return ok;
    }
    $$("input, select, textarea", form).forEach(function (f) { f.addEventListener("input", function () { if (f.closest(".field") && f.closest(".field").getAttribute("data-invalid") === "true") validate(); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (status) { status.removeAttribute("data-state"); status.textContent = ""; }
      if (!validate()) return;
      var hp = $("input[name=botcheck]", form);
      if (hp && hp.value) return;
      var key = form.getAttribute("data-access-key");
      var data = new FormData(form);
      data.delete("botcheck");
      if (form.querySelector("input[name=marketing]") && !form.querySelector("input[name=marketing]").checked) data.set("marketing", "לא");
      data.set("subject", "פנייה חדשה מהאתר: " + (data.get("name") || ""));
      data.set("from_name", "משפחה פיננסית - אתר");
      data.set("access_key", key || "");
      submitBtn && (submitBtn.disabled = true);
      if (!key || key.indexOf("REPLACE") === 0) {
        status && (status.setAttribute("data-state", "error"), status.textContent = "הטופס עדיין לא חובר לשירות השליחה. אפשר להתקשר אלינו או לכתוב בוואטסאפ.");
        submitBtn && (submitBtn.disabled = false);
        return;
      }
      fetch("https://api.web3forms.com/submit", { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.success) {
            form.reset();
            status && (status.setAttribute("data-state", "success"), status.textContent = "תודה! הפרטים התקבלו ונחזור אליכם בהקדם.");
          } else { throw new Error("fail"); }
        })
        .catch(function () {
          status && (status.setAttribute("data-state", "error"), status.textContent = "משהו השתבש בשליחה. אפשר לנסות שוב או להתקשר אלינו ישירות.");
        })
        .then(function () { submitBtn && (submitBtn.disabled = false); status && status.focus && status.focus(); });
    });
  });

  /* ---------- consent (only rendered when tracking is enabled) ---------- */
  var consent = $(".consent");
  if (consent) {
    var CKEY = "ff-consent";
    function getC() { try { return JSON.parse(localStorage.getItem(CKEY) || "null"); } catch (e) { return null; } }
    function activate(cats) {
      $$("script[type='text/plain'][data-consent]").forEach(function (s) {
        if (cats.indexOf(s.getAttribute("data-consent")) === -1) return;
        var n = doc.createElement("script");
        Array.prototype.forEach.call(s.attributes, function (a) { if (a.name !== "type" && a.name !== "data-consent") n.setAttribute(a.name, a.value); });
        n.text = s.text; s.parentNode.replaceChild(n, s);
      });
    }
    function save(cats) { try { localStorage.setItem(CKEY, JSON.stringify({ cats: cats, at: Date.now() })); } catch (e) {} consent.setAttribute("data-open", "false"); activate(cats); }
    var saved = getC();
    if (saved) activate(saved.cats || []); else consent.setAttribute("data-open", "true");
    var acceptAll = $("[data-consent-accept]", consent), reject = $("[data-consent-reject]", consent), settings = $("[data-consent-settings]", consent), saveSel = $("[data-consent-save]", consent);
    acceptAll && acceptAll.addEventListener("click", function () { save($$("input[name=consent]", consent).map(function (i) { return i.value; })); });
    reject && reject.addEventListener("click", function () { save([]); });
    settings && settings.addEventListener("click", function () { consent.setAttribute("data-settings", consent.getAttribute("data-settings") === "true" ? "false" : "true"); });
    saveSel && saveSel.addEventListener("click", function () { save($$("input[name=consent]:checked", consent).map(function (i) { return i.value; })); });
    $$("[data-consent-open]").forEach(function (b) { b.addEventListener("click", function () { consent.setAttribute("data-open", "true"); consent.setAttribute("data-settings", "true"); }); });
  }


  /* ---------- interactive index line charts ---------- */
  $$("[data-line-chart]").forEach(function (chart) {
    var svg = $("svg", chart), tip = $(".chart-tip", chart), cross = $(".crosshair", chart), dataEl = $(".chart-data", chart.parentNode) || $(".chart-data", chart);
    if (!svg || !tip || !dataEl) return;
    var data; try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var hidden = {}, current = -1;
    var btns = $$(".legend-btn[data-year]", chart), allBtn = $(".legend-btn[data-all]", chart);
    function applyYears() {
      $$("[data-year]", svg).forEach(function (el) { el.classList.toggle("is-off", !!hidden[el.getAttribute("data-year")]); });
      btns.forEach(function (bt) { bt.setAttribute("aria-pressed", hidden[bt.getAttribute("data-year")] ? "false" : "true"); });
      if (allBtn) allBtn.hidden = !Object.keys(hidden).some(function (k) { return hidden[k]; });
      if (current > -1) show(current);
    }
    btns.forEach(function (bt) {
      bt.addEventListener("click", function () {
        var y = bt.getAttribute("data-year");
        var visible = data.years.filter(function (k) { return !hidden[k]; });
        if (visible.length === 1 && visible[0] === y) return; // keep at least one year visible
        hidden[y] = !hidden[y]; applyYears();
      });
      bt.addEventListener("dblclick", function () {
        var y = bt.getAttribute("data-year");
        data.years.forEach(function (k) { hidden[k] = k !== y; }); applyYears();
      });
    });
    allBtn && allBtn.addEventListener("click", function () { hidden = {}; applyYears(); });
    function fmt(v) { return (v > 0 ? "+" : "") + v.toFixed(1).replace(/\.0$/, "") + "%"; }
    function show(i) {
      current = i;
      var rows = data.years.slice().reverse().filter(function (y) { return !hidden[y]; }).map(function (y) {
        var v = data.series[y][i];
        if (v === undefined) return "";
        return '<span class="tip-row"><i style="background:' + data.palette[y] + '"></i><span>' + y + '</span><b class="num">' + fmt(v) + '</b></span>';
      }).join("");
      tip.innerHTML = '<b class="tip-title">' + data.months[i] + '</b>' + rows;
      tip.hidden = false;
      cross.setAttribute("x1", data.x[i]); cross.setAttribute("x2", data.x[i]); cross.style.display = "";
      $$(".dot", svg).forEach(function (d) { d.classList.toggle("is-current", d.getAttribute("data-month") === String(i)); });
      // position tooltip in CSS pixels
      var r = svg.getBoundingClientRect(), scale = r.width / data.W;
      var px = data.x[i] * scale, w = tip.offsetWidth, h = tip.offsetHeight;
      var left = px + 14; if (left + w > r.width) left = px - w - 14; if (left < 0) left = 0;
      tip.style.left = left + "px"; tip.style.top = Math.max(0, (data.padT * scale)) + "px";
    }
    function hide() { current = -1; tip.hidden = true; cross.style.display = "none"; $$(".dot.is-current", svg).forEach(function (d) { d.classList.remove("is-current"); }); }
    function nearest(clientX) {
      var r = svg.getBoundingClientRect(), vx = (clientX - r.left) / (r.width / data.W), best = 0, bd = Infinity;
      data.x.forEach(function (xx, i) { var d = Math.abs(xx - vx); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    svg.addEventListener("mousemove", function (e) { show(nearest(e.clientX)); });
    svg.addEventListener("mouseleave", hide);
    svg.addEventListener("touchstart", function (e) { show(nearest(e.touches[0].clientX)); }, { passive: true });
    svg.addEventListener("touchmove", function (e) { show(nearest(e.touches[0].clientX)); }, { passive: true });
    svg.addEventListener("keydown", function (e) {
      var n = data.x.length;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); var d = e.key === "ArrowRight" ? 1 : -1; show(current < 0 ? (d > 0 ? 0 : n - 1) : (current + d + n) % n); }
      else if (e.key === "Home") { e.preventDefault(); show(0); } else if (e.key === "End") { e.preventDefault(); show(n - 1); } else if (e.key === "Escape") hide();
    });
    svg.addEventListener("blur", hide);
  });

  /* ---------- current nav item ---------- */
  var path = location.pathname.replace(/index\.html$/, "");
  $$(".nav-desktop a, .mobile-menu nav a").forEach(function (a) {
    var href = a.getAttribute("href").split("#")[0];
    if (href && href !== "/" && path.indexOf(href) === 0) a.setAttribute("aria-current", "page");
  });
})();
