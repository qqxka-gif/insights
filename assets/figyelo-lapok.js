/* =====================================================================
   Figyelő – közös lapmotor (assets/figyelo-lapok.js)
   Gazda: Glossy szál. A rovatoldalak és a nyitóoldal ezt töltik be, a saját szkriptjük ELŐTT.

   Mit ad:
   - Figyelo.oldal(opciók)  fejléc (logó, rovatmenü, kiadásváltó), neon háttér, és rovatoldalon
                            a lapok helye (main: #err, #progress, #scroller, #rail)
   - Figyelo.lapok(opciók)  lapmotor: lapok felépítése, 3D-görgetés, lapjelző, #lap-N cím,
                            fülek/szűrők kezelése (data-goto, data-set, data-toggle, data-filt)
   - Figyelo.hiba(szöveg)   hibasáv a fejléc alatt
   - segédek: Figyelo.esc, Figyelo.safe, Figyelo.store, Figyelo.reduced, Figyelo.datum

   Egy rovatoldal így használja (részletek: glossy/README.md):
     Figyelo.oldal({ rovat: "fb", alap: "../" });
     const L = Figyelo.lapok({
       nev: "Facebook-figyelő",
       lapok: [{ type: "overview", short: "Áttekintés" }, { type: "pages", short: "…", title: "…", kicker: "…", dek: "…" }],
       rajzolo: { overview() { return "<h1 …>"; }, pages() { … } },   // típus → HTML
       allapot: st,              // a data-set / data-toggle / data-filt ide ír
       szamok: ["tr"],           // ezek a kulcsok számként kerülnek az allapot-ba
       utana: (i, lap) => {}     // opcionális: egy lap kirajzolása után fut
     });
     L.felepit();                 // üres lapok „Betöltés…” felirattal
     … adatlekérés …
     L.mindet(); L.indit();       // kirajzolja a lapokat, és a címben lévő #lap-N-re ugrik

   Attribútumok a lapok HTML-jében:
     data-goto="3"                     a 4. lapra görget
     data-set="kulcs" data-val="érték" allapot[kulcs] = érték, majd a lap újrarajzolása
     data-toggle="kulcs"               allapot[kulcs] = !allapot[kulcs], majd újrarajzolás
     <select data-filt="kulcs">        allapot[kulcs] = select.value, majd újrarajzolás
   ===================================================================== */
(function () {
  "use strict";
  const doc = document, $ = id => doc.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safe = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : "#"; } catch (e) { return "#"; } };
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  let datum = "";
  try { datum = new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric" }).format(new Date()); } catch (e) {}

  /* A rovatok listája a menühöz. Új rovat: egy új sor ide. */
  const ROVATOK = [
    { id: "hir", nev: "Hírfigyelő", ut: "hirek/", szin: "var(--hir)", jel: "Országkép" },
    { id: "fb", nev: "Facebook-figyelő", ut: "fb/", szin: "var(--fb)", jel: "Helyi" },
    { id: "koz", nev: "Kisközösségek", ut: null, szin: "var(--koz)", jel: "Hamarosan" }
  ];
  const IKON_HOLD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const IKON_NAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  /* ---------- hibasáv ---------- */
  function hiba(msg) { const b = $("err"); if (b) { b.hidden = false; b.textContent = msg; } }
  window.addEventListener("error", e => { if ($("err")) hiba("Hiba az oldalon: " + (e.message || "ismeretlen") + ". Frissítsd az oldalt (Ctrl+F5), és küldd el ezt az üzenetet."); });

  /* ---------- oldal: fejléc, háttér, lapok helye ---------- */
  function oldal(o) {
    o = o || {};
    const alap = o.alap == null ? "../" : o.alap, akt = ROVATOK.find(r => r.id === o.rovat);
    if (akt) doc.body.classList.add("rovat-" + akt.id);
    const menu = akt ? '<span class="sep"></span><div class="menu" id="menu"><button class="menu-btn" id="menu-btn" type="button" aria-haspopup="true" aria-expanded="false"><span>' + esc(akt.nev) + '</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><ul class="menu-list" id="menu-list" hidden>' +
      ROVATOK.map(r => {
        const belso = '<span class="lbl"><span class="dot" style="background:' + r.szin + '"></span>' + esc(r.nev) + '</span><span class="mono muted" style="font-size:10px">' + esc(r.jel) + "</span>";
        return "<li>" + (r.ut ? '<a href="' + alap + r.ut + '"' + (r === akt ? ' aria-current="page"' : "") + ">" + belso + "</a>" : '<span class="dis">' + belso + "</span>") + "</li>";
      }).join("") + '<li><a href="' + alap + '"><span class="lbl">← Kiadványválasztó</span></a></li></ul></div>' : "";
    const fej = doc.createElement("header");
    fej.className = "top";
    fej.innerHTML = '<div class="top-in"><div class="brand"><a class="logo" href="' + alap + '" aria-label="Figyelő – vissza a kiadványválasztóhoz">Figyelő</a><span class="edition mono" id="edition">Éjszakai kiadás</span>' + menu + "</div>" +
      '<div class="toggle" role="group" aria-label="Kiadás"><button type="button" id="t-night" aria-pressed="true">' + IKON_HOLD + '<span class="t-lbl">Éjszakai</span></button><button type="button" id="t-day" aria-pressed="false">' + IKON_NAP + '<span class="t-lbl">Nappali</span></button></div></div>';
    const hatter = doc.createElement("canvas"); hatter.className = "waves"; hatter.id = "waves"; hatter.setAttribute("aria-hidden", "true");
    const halo = doc.createElement("div"); halo.className = "halo"; halo.setAttribute("aria-hidden", "true");
    const elso = doc.body.firstChild;
    doc.body.insertBefore(fej, elso); doc.body.insertBefore(hatter, elso); doc.body.insertBefore(halo, elso);
    if (o.lapok !== false && !$("scroller")) {
      const m = doc.createElement("main");
      m.setAttribute("aria-label", akt ? akt.nev : "Figyelő");
      m.innerHTML = '<div class="err" id="err" role="alert" hidden></div><div class="progress" id="progress" aria-hidden="true"></div><div class="scroller" id="scroller" tabindex="-1"></div><nav class="rail" id="rail" aria-label="A rovat lapjai"></nav>';
      doc.body.insertBefore(m, elso);
    }
    /* kiadás */
    const kiadas = (nappali, ment) => {
      doc.documentElement.classList.toggle("nappali", nappali);
      $("t-night").setAttribute("aria-pressed", nappali ? "false" : "true");
      $("t-day").setAttribute("aria-pressed", nappali ? "true" : "false");
      $("edition").textContent = (nappali ? "Nappali kiadás" : "Éjszakai kiadás") + (datum ? " · " + datum : "");
      if (ment) store.set("figyelo-kiadas", nappali ? "nappali" : "ejszakai");
    };
    $("t-night").addEventListener("click", () => kiadas(false, true));
    $("t-day").addEventListener("click", () => kiadas(true, true));
    kiadas(store.get("figyelo-kiadas") === "nappali", false);
    /* menü */
    if (akt) {
      const zar = () => { $("menu-list").hidden = true; $("menu-btn").setAttribute("aria-expanded", "false"); };
      $("menu-btn").addEventListener("click", e => { e.stopPropagation(); const nyit = $("menu-list").hidden; $("menu-list").hidden = !nyit; $("menu-btn").setAttribute("aria-expanded", nyit ? "true" : "false"); });
      doc.addEventListener("click", e => { if (!$("menu").contains(e.target)) zar(); });
      doc.addEventListener("keydown", e => { if (e.key === "Escape") zar(); });
    }
    hullamok(akt && akt.id === "fb" ? "#F2B35B" : null);
  }

  /* ---------- lapmotor ---------- */
  function lapok(o) {
    const LAPOK = o.lapok, R = o.rajzolo, st = o.allapot || {}, NUM = new Set(o.szamok || []);
    let slots = [], laps = [], active = -1, ticking = false;
    const headH = () => { const t = doc.querySelector(".top"); return t ? t.offsetHeight : 0; };

    function felepit() {
      const n = LAPOK.length;
      $("scroller").innerHTML = LAPOK.map((lap, i) => '<section class="slot" id="lap-' + (i + 1) + '" aria-label="' + (i + 1) + ". lap: " + esc(lap.short) + '"><article class="lap"><div class="lap-top mono"><span>' + (i + 1) + ". lap · " + esc(lap.short) + "</span><span>" + esc(o.nev) + " · " + (i + 1) + " / " + n + "</span></div>" +
        (lap.title ? '<h2 class="lap-title">' + esc(lap.title) + "</h2>" : "") + (lap.kicker ? '<span class="kick mono">' + esc(lap.kicker) + "</span>" : "") + (lap.dek ? '<p class="dek">' + esc(lap.dek) + "</p>" : "") +
        '<div class="lap-body" id="lb-' + i + '"><p class="loading">Betöltés…</p></div></article></section>').join("");
      $("rail").innerHTML = LAPOK.map((lap, i) => '<button type="button" data-goto="' + i + '"><span>' + (i + 1) + " · " + esc(lap.short) + '</span><span class="d"></span></button>').join("");
      $("progress").innerHTML = LAPOK.map(() => "<span></span>").join("");
      slots = Array.prototype.slice.call(doc.querySelectorAll("#scroller .slot"));
      laps = slots.map(s => s.querySelector(".lap"));
      doc.documentElement.classList.add("snap");
      frissit();
    }
    function rajzol(i) {
      const lap = LAPOK[i], box = $("lb-" + i);
      if (!box) return;
      try { box.innerHTML = R[lap.type](); }
      catch (e) { box.innerHTML = '<p class="empty">Ezt a lapot nem sikerült megjeleníteni (' + esc(e.message) + ").</p>"; }
      if (o.utana) o.utana(i, lap);
    }
    function mindet() { LAPOK.forEach((_, i) => rajzol(i)); frissit(); }
    function ujra(el, fokusz) {
      const body = el && el.closest(".lap-body"); if (!body) return;
      const i = parseInt(body.id.slice(3), 10), y = window.scrollY;
      rajzol(i); window.scrollTo(0, y);
      if (fokusz && $(fokusz)) $(fokusz).focus();
      frissit();
    }
    function ugrik(i, sima) { const s = slots[i]; if (!s) return; const y = s.getBoundingClientRect().top + window.scrollY - headH(); window.scrollTo({ top: Math.max(0, y), behavior: sima && !reduced ? "smooth" : "auto" }); }
    function frissit() {
      ticking = false;
      const hh = headH(), h = Math.max(1, window.innerHeight - hh); let idx = 0;
      for (let i = 0; i < slots.length; i++) {
        const rc = slots[i].getBoundingClientRect(), topE = rc.top - hh, bot = rc.bottom - hh;
        let a = topE > 0 ? topE / h : (bot < h ? (bot - h) / h : 0);
        if (topE <= h * 0.45) idx = i;
        const lap = laps[i];
        if (reduced) { lap.style.transform = ""; lap.style.opacity = ""; continue; }
        a = Math.max(-1.3, Math.min(1.3, a));
        const abs = Math.abs(a), k = Math.min(1, abs);
        let rot, ty, origin;
        if (a >= 0) { rot = -42 * k; ty = -a * h * 0.24; origin = "50% 0%"; } else { rot = 52 * k; ty = abs * h * 0.22; origin = "50% 100%"; }
        lap.style.transformOrigin = origin;
        lap.style.transform = "perspective(1600px) translateY(" + ty.toFixed(1) + "px) rotateX(" + rot.toFixed(2) + "deg) scale(" + (1 - 0.1 * k).toFixed(3) + ")";
        lap.style.opacity = (1 - 0.6 * k).toFixed(3);
        slots[i].style.zIndex = String(100 - Math.round(abs * 10));
      }
      if (idx !== active && slots.length) aktiv(idx);
    }
    function aktiv(idx) {
      active = idx;
      doc.querySelectorAll("#rail button").forEach((b, i) => b.setAttribute("aria-current", i === idx ? "true" : "false"));
      doc.querySelectorAll("#progress span").forEach((s, i) => s.classList.toggle("on", i <= idx));
      try { history.replaceState(null, "", idx > 0 ? "#lap-" + (idx + 1) : location.pathname + location.search); } catch (e) {}
    }
    const kezdo = (/^#lap-(\d+)$/.exec(location.hash || "") || [])[1];
    function indit() {
      if (kezdo) ugrik(Math.max(0, Math.min(LAPOK.length - 1, parseInt(kezdo, 10) - 1)), false);
      frissit();
    }
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frissit); } }, { passive: true });
    window.addEventListener("resize", () => { ugrik(active < 0 ? 0 : active, false); frissit(); });
    doc.addEventListener("click", e => {
      const g = e.target.closest("[data-goto]");
      if (g) { ugrik(parseInt(g.getAttribute("data-goto"), 10), true); return; }
      const s = e.target.closest("[data-set]");
      if (s && s.closest(".lap-body")) { const k = s.getAttribute("data-set"), v = s.getAttribute("data-val"); st[k] = NUM.has(k) ? +v : v; ujra(s); return; }
      const t = e.target.closest("[data-toggle]");
      if (t && t.closest(".lap-body")) { const k = t.getAttribute("data-toggle"); st[k] = !st[k]; ujra(t); }
    });
    doc.addEventListener("change", e => {
      const f = e.target.closest("[data-filt]");
      if (f && f.closest(".lap-body")) { st[f.getAttribute("data-filt")] = f.value; ujra(f, f.id); }
    });
    return { felepit, rajzol, mindet, ujra, ugrik, frissit, indit };
  }

  /* ---------- neon hullámok ---------- */
  function hullamok(kiemelo) {
    const cv = $("waves");
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, phase = 0, target = 0, running = false;
    const NIGHT = ["#6FB3FF", "#4FD8FF", kiemelo || "#8C7BFF", "#3D7BFF", "#9FE7FF"];
    const DAY = ["#1F5C99", "#2C7FB8", "#5E45A8", "#3A6EA5", "#4AA3C9"];
    const WAVES = [
      { base: 0.30, amp: 0.060, f1: 1.6, f2: 3.1, s1: 1.00, s2: 0.55, off: 0.0 },
      { base: 0.42, amp: 0.075, f1: 1.2, f2: 2.6, s1: -0.80, s2: 0.70, off: 1.3 },
      { base: 0.55, amp: 0.090, f1: 1.0, f2: 2.2, s1: 0.65, s2: -0.45, off: 2.6 },
      { base: 0.67, amp: 0.070, f1: 1.4, f2: 2.9, s1: -0.55, s2: 0.90, off: 3.9 },
      { base: 0.78, amp: 0.050, f1: 1.8, f2: 3.6, s1: 0.85, s2: -0.65, off: 5.2 }
    ];
    function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); draw(); }
    function draw() {
      const day = doc.documentElement.classList.contains("nappali"), cols = day ? DAY : NIGHT;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = day ? "source-over" : "lighter";
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      const step = W < 600 ? 10 : 8;
      const passes = day ? [[10, 0.04], [3, 0.10], [1.3, 0.35]] : [[18, 0.05], [7, 0.12], [1.6, 0.85]];
      WAVES.forEach((w, i) => {
        ctx.beginPath();
        for (let x = -step; x <= W + step; x += step) {
          const u = x / W * Math.PI * 2;
          const y = H * w.base + H * w.amp * Math.sin(u * w.f1 + phase * w.s1 + w.off) + H * w.amp * 0.45 * Math.sin(u * w.f2 - phase * w.s2 + w.off * 1.7);
          if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = cols[i];
        passes.forEach(p => { ctx.globalAlpha = p[1]; ctx.lineWidth = p[0]; ctx.stroke(); });
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    function loop() { const d = target - phase; if (Math.abs(d) < 0.0005) { phase = target; draw(); running = false; return; } phase += d * 0.07; draw(); requestAnimationFrame(loop); }
    window.addEventListener("scroll", () => { target = (window.scrollY + window.scrollX) * 0.0022; if (reduced) { phase = target; draw(); return; } if (!running) { running = true; requestAnimationFrame(loop); } }, { passive: true });
    window.addEventListener("resize", resize);
    new MutationObserver(draw).observe(doc.documentElement, { attributes: true, attributeFilter: ["class"] });
    resize();
  }

  window.Figyelo = { oldal, lapok, hiba, esc, safe, store, reduced, datum, ROVATOK };
})();
