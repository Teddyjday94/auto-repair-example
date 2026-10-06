/* Bay Nine Auto Works — interactions */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";

  /* Online scheduling provider.
     Leave `url` empty to use the built-in booking ticket (demo mode).
     Paste the shop's booking link (e.g. from Tekmetric > Settings > Online Booking > Get Code)
     to embed their live scheduler on book.html instead. */
  const SCHEDULER = { name: "Tekmetric", url: "" };

  /* ---------------- SHARED HELPERS ---------------- */
  const flagInvalid = el => { el.classList.remove("invalid"); void el.offsetWidth; el.classList.add("invalid"); };

  // "Book this service" from any page: preselect the service on the booking page
  function bookWith(chip) {
    const form = $("[data-form]");
    if (!form) { location.href = "book.html?svc=" + encodeURIComponent(chip) + "#book"; return; }
    const box = $$('input[name="svc"]', form).find(i => i.value === chip);
    if (box) { box.checked = true; box.dispatchEvent(new Event("change", { bubbles: true })); }
    $("#book").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------------- NAV + DRAWER ---------------- */
  const nav = $(".nav");
  const burger = $(".nav__burger");
  const drawer = $(".drawer");
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open));
    drawer.hidden = open;
    document.body.style.overflow = open ? "" : "hidden";
  });
  $$("a", drawer).forEach(a => a.addEventListener("click", () => {
    burger.setAttribute("aria-expanded", "false");
    drawer.hidden = true;
    document.body.style.overflow = "";
  }));

  /* ---------------- SCROLL: nav state, fuel gauge, rpm ---------------- */
  const fuelFill = $(".fuel__fill");
  let lastY = scrollY, velocity = 0;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    fuelFill.style.transform = `scaleY(${1 - Math.min(1, y / max)})`;
    velocity = Math.min(1, velocity + Math.abs(y - lastY) / 600);
    lastY = y;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- TACHOMETER ---------------- */
  if ($(".gauge")) {
    const gauge = $(".gauge");
    const C = 200;
    const ang = v => -135 + (v / 8) * 270;             // 0..8k rpm -> degrees from 12 o'clock
    const pt = (a, r) => [C + r * Math.sin(a * Math.PI / 180), C - r * Math.cos(a * Math.PI / 180)];
    const ticks = $(".gauge__ticks", gauge), nums = $(".gauge__nums", gauge);
    for (let v = 0; v <= 8.0001; v += 0.25) {
      const major = Math.abs(v - Math.round(v)) < 0.001;
      const half = !major && Math.abs(v * 2 - Math.round(v * 2)) < 0.001;
      const [x1, y1] = pt(ang(v), 168);
      const [x2, y2] = pt(ang(v), major ? 142 : half ? 152 : 158);
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      l.setAttribute("stroke-width", major ? 4 : 2);
      l.setAttribute("class", (v >= 6.5 ? "red " : "") + (major ? "" : "minor"));
      ticks.appendChild(l);
      if (major) {
        const [tx, ty] = pt(ang(v), 118);
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", tx); t.setAttribute("y", ty + 9);
        t.setAttribute("text-anchor", "middle");
        if (v >= 7) t.setAttribute("class", "red");
        t.textContent = Math.round(v);
        nums.appendChild(t);
      }
    }
    const [rx1, ry1] = pt(ang(6.5), 160), [rx2, ry2] = pt(ang(8), 160);
    $(".gauge__red", gauge).setAttribute("d", `M${rx1},${ry1} A160,160 0 0 1 ${rx2},${ry2}`);

    $("[data-ro]").textContent = 48000 + Math.floor(Math.random() * 1999);
    const needle = $(".gauge__needle", gauge);
    let rpm = 0, phase = "sweep", t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    const tick = now => {
      const t = (now - t0) / 1000;
      if (phase === "sweep") {
        if (t < 0.9) rpm = 7.7 * ease(t / 0.9);
        else if (t < 2.0) rpm = 7.7 - (7.7 - 0.9) * ease((t - 0.9) / 1.1);
        else phase = "idle";
      } else {
        // idle with a little life, revving with scroll velocity
        const idle = 0.9 + Math.sin(now / 260) * 0.03 + Math.sin(now / 97) * 0.015;
        const target = idle + velocity * 6.2;
        rpm += (target - rpm) * 0.12;
        velocity *= 0.94;
      }
      needle.style.transform = `rotate(${ang(rpm)}deg)`;
      requestAnimationFrame(tick);
    };
    if (reduceMotion) needle.style.transform = `rotate(${ang(0.9)}deg)`;
    else requestAnimationFrame(tick);

    // odometer roll-up
    const odo = $("[data-odo]");
    const ODO_TARGET = 18402;
    const rollOdo = () => {
      const start = performance.now(), dur = 2200;
      const step = now => {
        const p = Math.min(1, (now - start) / dur);
        odo.textContent = String(Math.round(ODO_TARGET * ease(p))).padStart(6, "0");
        if (p < 1) requestAnimationFrame(step);
      };
      reduceMotion ? (odo.textContent = String(ODO_TARGET).padStart(6, "0")) : requestAnimationFrame(step);
    };
    setTimeout(rollOdo, 500);
  }

  /* ---------------- HOURS / OPEN NOW ---------------- */
  const HOURS = { 0: null, 1: [7, 18], 2: [7, 18], 3: [7, 18], 4: [7, 18], 5: [7, 18], 6: [8, 14] };
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fmtH = h => `${((Math.floor(h) + 11) % 12) + 1}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}${h < 12 ? "a" : "p"}`;
  const updateOpen = () => {
    const now = new Date(), d = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    const today = HOURS[d];
    const open = today && h >= today[0] && h < today[1];
    let text;
    if (open) text = `Open now · until ${fmtH(today[1])}`;
    else {
      let nd = d, add = 0;
      if (today && h < today[0]) { text = `Closed · opens ${fmtH(today[0])} today`; }
      else {
        do { nd = (nd + 1) % 7; add++; } while (!HOURS[nd]);
        text = `Closed · opens ${add === 1 ? "tomorrow" : DAYS[nd]} ${fmtH(HOURS[nd][0])}`;
      }
    }
    $$("[data-open-dot]").forEach(el => { el.classList.toggle("is-open", !!open); el.classList.toggle("is-closed", !open); });
    const ot = $("[data-open-text]");
    if (ot) ot.textContent = text;
    $$("[data-hours] tr").forEach(tr => tr.classList.toggle("is-today", +tr.dataset.day === d));
  };
  updateOpen();
  setInterval(updateOpen, 60000);

  /* ---------------- SHOP FLOOR BAYS ---------------- */
  if ($("[data-bays]")) {
    const BAYS = [
      { n: "02", car: "2014 Toyota Tacoma", job: "Front brakes + rotors", tech: "Luis R.", state: "Wrenching", c: "var(--orange)", pct: 68, eta: "2:30p" },
      { n: "04", car: "2019 Subaru Outback", job: "Check-engine · P0420", tech: "Dana K.", state: "Diagnosing", c: "var(--amber)", pct: 30, eta: "Quote by 11a" },
      { n: "07", car: "2021 Ford F-150", job: "60k service + alignment", tech: "Marcus T.", state: "Road test", c: "var(--green)", pct: 94, eta: "Ready soon" },
      { n: "09", car: "2017 Toyota Prius", job: "Inverter coolant pump", tech: "Priya S.", state: "Parts arriving", c: "#8ab4ff", pct: 45, eta: "Tomorrow AM" },
    ];
    const baysEl = $("[data-bays]");
    baysEl.innerHTML = BAYS.map(b => `
      <article class="bay">
        <div class="bay__top"><span>Bay</span><span class="bay__state" style="--state:${b.c}">${b.state}</span></div>
        <div class="bay__num">${b.n}</div>
        <p class="bay__car">${b.car}</p>
        <p class="bay__job">${b.job} · ${b.tech}</p>
        <div class="bay__bar"><i data-pct="${b.pct}"></i></div>
        <div class="bay__pct"><span>${b.pct}%</span><span>ETA ${b.eta}</span></div>
      </article>`).join("");
  }

  /* ---------------- CAR EXPLORER ---------------- */
  if ($("[data-hotspots]")) {
    const SYSTEMS = [
      { id: "engine", x: 660, y: 132, code: "SYS-01", title: "Engine & Diagnostics", chip: "Check-engine light", price: "$95", time: "1–2 hrs",
        desc: "Rough idle, stalling, or that orange light? We pull live data from every module and pinpoint the cause instead of throwing parts at it.",
        list: ["Check-engine diagnosis", "Timing belts & chains", "Spark plugs & ignition", "Head gaskets & leaks"] },
      { id: "elec", x: 728, y: 192, code: "SYS-02", title: "Battery & Electrical", chip: "Battery & electrical", price: "$45", time: "30–60 min",
        desc: "Slow cranks, flickering lights, dead in the morning. We load-test the battery, alternator and starter, and track down parasitic drains.",
        list: ["Battery test & replacement", "Alternator & starter", "Parasitic draw diagnosis", "Lighting & wiring repair"] },
      { id: "brakes", x: 610, y: 215, code: "SYS-03", title: "Brakes", chip: "Brakes", price: "$189", time: "1–2 hrs",
        desc: "Squealing, grinding, or a pedal that feels soft. You'll get photos of your actual pads with measurements before we quote anything.",
        list: ["Pads & rotors", "Calipers & brake lines", "Brake fluid exchange", "ABS diagnosis"] },
      { id: "ac", x: 462, y: 115, code: "SYS-04", title: "A/C & Heating", chip: "A/C & heat", price: "$159", time: "1–3 hrs",
        desc: "Warm air in July or cold air in January. We leak-test with UV dye and nitrogen before recharging, so the fix actually lasts.",
        list: ["A/C recharge (R134a & R1234yf)", "Compressor & condenser", "Heater core & blend doors", "Cabin air filters"] },
      { id: "trans", x: 452, y: 202, code: "SYS-05", title: "Transmission & Drivetrain", chip: "Transmission", price: "$149", time: "2–4 hrs",
        desc: "Slipping, harsh shifts, or a clunk from underneath. Most transmission problems are fixable without a rebuild. We'll tell you if yours is.",
        list: ["Fluid service", "Shift solenoids & TCM", "CV axles & driveshafts", "Differential service"] },
      { id: "tires", x: 190, y: 215, code: "SYS-06", title: "Tires & Suspension", chip: "Tires & alignment", price: "$119", time: "1 hr",
        desc: "Pulling to one side, uneven wear, or a bouncy ride. Laser alignment and road-force balancing, plus honest tread readings.",
        list: ["4-wheel alignment", "Struts & shocks", "Tire mounting & balancing", "TPMS sensors"] },
      { id: "exhaust", x: 70, y: 206, code: "SYS-07", title: "Exhaust & Emissions", chip: "Exhaust", price: "$89", time: "1–2 hrs",
        desc: "Loud rumble, rattles, or a failed emissions test. We weld and repair in-house rather than replacing whole systems.",
        list: ["Catalytic converters", "Mufflers & pipes", "O2 sensors", "State emissions testing"] },
    ];
    const hsWrap = $("[data-hotspots]");
    const panel = $(".explorer__panel");
    let activeSys = SYSTEMS[0];
    SYSTEMS.forEach((s, i) => {
      const b = document.createElement("button");
      b.className = "hs";
      b.style.left = (s.x / 800 * 100) + "%";
      b.style.top = (s.y / 300 * 100) + "%";
      b.innerHTML = `${String(i + 1).padStart(2, "0")}<span class="hs__label mono">${s.title}</span>`;
      b.setAttribute("aria-label", s.title);
      b.addEventListener("click", () => selectSys(s, b));
      hsWrap.appendChild(b);
      s.btn = b;
    });
    function selectSys(s, btn = s.btn, animate = true) {
      activeSys = s;
      $$(".hs").forEach(h => h.classList.toggle("is-active", h === btn));
      $("[data-p-code]").textContent = s.code;
      $("[data-p-title]").textContent = s.title;
      $("[data-p-desc]").textContent = s.desc;
      $("[data-p-list]").innerHTML = s.list.map(l => `<li>${l}</li>`).join("");
      $("[data-p-price]").textContent = s.price;
      $("[data-p-time]").textContent = s.time;
      if (animate) { panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap"); }
    }
    selectSys(SYSTEMS[0], SYSTEMS[0].btn, false);
    $("[data-p-book]").addEventListener("click", () => bookWith(activeSys.chip));

    // blueprint draw-in
    $$(".draw path, .draw line, .draw circle, .draw rect").forEach(el => {
      try { el.style.setProperty("--len", Math.ceil(el.getTotalLength()) + 1); } catch (_) {}
    });
  }

  /* ---------------- WARNING LIGHT DECODER ---------------- */
  if ($("[data-lights]")) {
    const RED = "#ff3b30", AMB = "#f5b400";
    const LIGHTS = [
      { name: "Check engine", c: AMB, sev: 3, chip: "Check-engine light",
        verdict: "Book this week · Flashing = stop driving",
        body: "Your engine computer logged a fault. It can be as small as a loose gas cap or as big as a misfire. If it's flashing, unburnt fuel is cooking your catalytic converter, so pull over and call us.",
        svg: `<path d="M9 19h6v-4h14v4h4l4 4h4v-4h3v15h-3v-4h-4l-4 6H17l-4-4H9z"/><path d="M4 22v10M4 27h5M20 10h10M25 10v5"/>` },
      { name: "Oil pressure", c: RED, sev: 5, chip: "Something's off",
        verdict: "Stop now · Turn the engine off",
        body: "The engine isn't getting enough oil pressure. Driving even a few miles can destroy bearings. Check the dipstick, don't restart if it's low, and we'll arrange a tow.",
        svg: `<path d="M5 21l9 3v-5h15l5 5 10-6-10 15H14v-7l-9-3z"/><path d="M19 19v-4h6v4"/><path class="fill" d="M43 31c1.6 2.6 2 4.4 0 5.6-2-1.2-1.6-3 0-5.6z"/>` },
      { name: "Charging", c: RED, sev: 4, chip: "Battery & electrical",
        verdict: "Drive straight here · Limited range",
        body: "The battery isn't being charged, usually a failing alternator or broken belt. You're running on battery alone. Turn off A/C and the radio and head to us or home.",
        svg: `<rect x="6" y="15" width="36" height="23" rx="2"/><path d="M12 15v-4h6v4M30 15v-4h6v4M12 26h8M28 26h8M32 22v8"/>` },
      { name: "Coolant temp", c: RED, sev: 5, chip: "Something's off",
        verdict: "Stop now · Engine overheating",
        body: "Your engine is running hot. Pull over safely, turn it off, and don't open the radiator cap while it's hot. Overheating is how head gaskets fail.",
        svg: `<path d="M24 6v21"/><circle cx="24" cy="32" r="5"/><path d="M24 11h7M24 17h7M24 23h7"/><path d="M5 42c4-3 6-3 10 0s6 3 10 0 6-3 10 0 6 3 8 0"/>` },
      { name: "Brake system", c: RED, sev: 4, chip: "Brakes",
        verdict: "Check parking brake · Then come in",
        body: "First make sure the parking brake is fully off. If it is, your brake fluid may be low, which usually means worn pads or a leak. Don't put this one off.",
        svg: `<circle cx="24" cy="24" r="11"/><path d="M10 12a17 17 0 0 0 0 24M38 12a17 17 0 0 1 0 24M24 18v8"/><circle class="fill" cx="24" cy="30.5" r="1.8"/>` },
      { name: "Tire pressure", c: AMB, sev: 2, chip: "Tires & alignment",
        verdict: "Check pressures today",
        body: "One or more tires is 25% or more under-inflated. Cold mornings trigger it a lot. Fill to the pressure on your door jamb. If it comes back, you probably have a slow leak.",
        svg: `<path d="M13 12c-6 9-6 17-2 24h26c4-7 4-15-2-24"/><path d="M11 36v4M17 36v4M24 36v4M31 36v4M37 36v4M24 18v9"/><circle class="fill" cx="24" cy="31" r="1.8"/>` },
      { name: "ABS", c: AMB, sev: 2, chip: "Brakes",
        verdict: "Safe to drive · Book soon",
        body: "Normal braking still works, but anti-lock won't kick in during a hard stop. Usually it's a wheel-speed sensor. Leave extra following distance until it's fixed.",
        svg: `<circle cx="24" cy="24" r="13"/><path d="M8 11a19 19 0 0 0 0 26M40 11a19 19 0 0 1 0 26"/><text class="fill" x="24" y="28" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="10.5">ABS</text>` },
      { name: "Traction", c: AMB, sev: 1, chip: "Something's off",
        verdict: "Flashing = normal · Solid = book in",
        body: "A flashing light means traction control is doing its job on a slippery road. Ease off the gas. If it stays solid on dry pavement, a sensor needs a look.",
        svg: `<path d="M11 26l4-8h18l4 8v6H11z"/><circle cx="16" cy="32" r="2.5"/><circle cx="32" cy="32" r="2.5"/><path d="M14 38c2 2-2 4 0 6M24 38c2 2-2 4 0 6M34 38c2 2-2 4 0 6"/>` },
    ];
    const lightsEl = $("[data-lights]");
    const screen = $(".readout__screen");
    let activeLight = null;
    LIGHTS.forEach((L, i) => {
      const b = document.createElement("button");
      b.className = "light";
      b.style.setProperty("--c", L.c);
      b.style.setProperty("--i", i);
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-label", L.name);
      b.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${L.svg}</svg><span class="light__name">${L.name}</span>`;
      b.addEventListener("click", () => {
        activeLight = L;
        $$(".light").forEach(x => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-selected", String(x === b)); });
        $("[data-l-title]").textContent = L.name;
        $$("[data-l-sev] span").forEach((s, k) => { s.style.setProperty("--i", k); s.style.background = k < L.sev ? L.c : ""; });
        const v = $("[data-l-verdict]");
        v.textContent = L.verdict;
        v.style.setProperty("--sev", L.c);
        $("[data-l-body]").textContent = L.body;
        $("[data-l-cta]").hidden = false;
        screen.classList.remove("typing"); void screen.offsetWidth; screen.classList.add("typing");
      });
      lightsEl.appendChild(b);
    });
    $("[data-l-cta]").addEventListener("click", e => { e.preventDefault(); if (activeLight) bookWith(activeLight.chip); });
  }

  /* ---------------- BOOKING ---------------- */
  if ($("[data-form]")) {
    const form = $("[data-form]");
    const panes = $$(".step-pane", form);
    const progress = $$(".ticket__progress span", form);
    const btnNext = $("[data-next]"), btnBack = $("[data-back]"), btnSubmit = $("[data-submit]");
    const errEl = $("[data-error]");
    let step = 0;

    const RO_NUM = 48000 + Math.floor(Math.random() * 1999);
    $("[data-ro-num]").textContent = "#" + RO_NUM;
    // barcode
    (() => {
      let seed = RO_NUM;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      $("[data-barcode]").innerHTML = Array.from({ length: 46 }, () =>
        `<i style="flex:${(1 + Math.floor(rnd() * 4))};opacity:${rnd() > .25 ? 1 : 0}"></i>`).join("");
    })();

    // years
    const ySel = $("[data-years]");
    for (let y = new Date().getFullYear() + 1; y >= 1985; y--) ySel.add(new Option(y, y));

    // mileage
    const miles = $("[data-miles]");
    const setMiles = () => {
      const v = +miles.value;
      const txt = v >= 250000 ? "250,000+ mi" : v.toLocaleString() + " mi";
      $("[data-miles-out]").textContent = txt;
      miles.style.setProperty("--v", (v / 250000 * 100) + "%");
      setRO("miles", txt.replace(" mi", ""));
    };
    miles.addEventListener("input", setMiles);

    // live repair order
    const setRO = (key, val) => {
      const el = $(`[data-ro-${key}]`);
      if (!el) return;
      const next = val || "—";
      if (el.textContent !== next) { el.textContent = next; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
    };
    const syncRO = () => {
      const f = form.elements;
      setRO("vehicle", [f.year.value, f.make.value.trim(), f.model.value.trim()].filter(Boolean).join(" "));
      const svcs = $$('input[name="svc"]:checked', form).map(i => i.value);
      setRO("svc", svcs.join(", "));
      setRO("stay", (form.querySelector('input[name="stay"]:checked') || {}).value);
      setRO("name", f.name.value.trim());
      setRO("date", sel.date ? `${sel.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${sel.time ? " · " + sel.time : ""}` : "");
    };
    form.addEventListener("input", syncRO);
    form.addEventListener("change", syncRO);

    // calendar
    const sel = { date: null, time: null };
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const maxDate = new Date(today0); maxDate.setDate(maxDate.getDate() + 60);
    let view = new Date(today0.getFullYear(), today0.getMonth(), 1);
    const grid = $("[data-cal-grid]");
    const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
    const renderCal = () => {
      $("[data-cal-label]").textContent = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      $("[data-cal-prev]").disabled = view <= new Date(today0.getFullYear(), today0.getMonth(), 1);
      $("[data-cal-next]").disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > maxDate;
      const first = view.getDay();
      const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      let html = "";
      for (let i = 0; i < first; i++) html += "<span></span>";
      for (let d = 1; d <= days; d++) {
        const dt = new Date(view.getFullYear(), view.getMonth(), d);
        const disabled = dt < today0 || dt > maxDate || !HOURS[dt.getDay()];
        const cls = [sameDay(dt, today0) && "is-today", sameDay(dt, sel.date) && "is-sel"].filter(Boolean).join(" ");
        html += `<button type="button" class="${cls}" data-d="${d}" ${disabled ? "disabled" : ""} aria-label="${dt.toDateString()}">${d}</button>`;
      }
      grid.innerHTML = html;
    };
    grid.addEventListener("click", e => {
      const b = e.target.closest("button[data-d]");
      if (!b || b.disabled) return;
      sel.date = new Date(view.getFullYear(), view.getMonth(), +b.dataset.d);
      sel.time = null;
      renderCal(); renderSlots(); syncRO();
    });
    $("[data-cal-prev]").addEventListener("click", () => { view.setMonth(view.getMonth() - 1); renderCal(); });
    $("[data-cal-next]").addEventListener("click", () => { view.setMonth(view.getMonth() + 1); renderCal(); });

    const SLOT_WEEK = [7, 7.5, 8, 8.5, 9, 10, 11, 12.5, 13.5, 14.5, 15.5, 16.5];
    const SLOT_SAT = [8, 8.5, 9, 10, 11, 12];
    const slotsEl = $("[data-slots]");
    const renderSlots = () => {
      if (!sel.date) { slotsEl.innerHTML = `<div class="slots__empty">← Pick a day first</div>`; return; }
      $("[data-slot-label]").textContent = sel.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      const list = sel.date.getDay() === 6 ? SLOT_SAT : SLOT_WEEK;
      const now = new Date(), nowH = now.getHours() + now.getMinutes() / 60;
      const isToday = sameDay(sel.date, today0);
      slotsEl.innerHTML = list.map((h, i) => {
        // deterministic "booked" slots so the schedule looks real
        const hash = (sel.date.getDate() * 31 + sel.date.getMonth() * 7 + i * 13) % 10;
        const taken = hash < 3 || (isToday && h <= nowH + 1);
        const label = fmtH(h).replace(/([ap])$/, " $1m");
        return `<button type="button" style="--i:${i}" data-t="${label}" ${taken ? "disabled" : ""} class="${sel.time === label ? "is-sel" : ""}">${label}</button>`;
      }).join("");
    };
    slotsEl.addEventListener("click", e => {
      const b = e.target.closest("button[data-t]");
      if (!b || b.disabled) return;
      sel.time = b.dataset.t;
      $$("button", slotsEl).forEach(x => x.classList.toggle("is-sel", x === b));
      syncRO();
    });
    renderCal(); renderSlots();
    const pre = new URLSearchParams(location.search).get("svc");
    if (pre) {
      const box = $$('input[name="svc"]', form).find(i => i.value === pre);
      if (box) { box.checked = true; syncRO(); }
    }

    // steps
    form.addEventListener("input", e => e.target.classList && e.target.classList.remove("invalid"));
    const validate = i => {
      const f = form.elements;
      errEl.textContent = "";
      if (i === 0) {
        const bad = ["year", "make", "model"].filter(n => !f[n].value.trim());
        bad.forEach(n => flagInvalid(f[n]));
        if (bad.length) { errEl.textContent = "Year, make and model help us have the right parts ready."; return false; }
      }
      if (i === 1 && !$$('input[name="svc"]:checked', form).length) {
        errEl.textContent = "Pick at least one. \"Not sure\" counts too.";
        return false;
      }
      if (i === 2 && (!sel.date || !sel.time)) {
        errEl.textContent = !sel.date ? "Choose a drop-off day." : "Choose a drop-off time.";
        return false;
      }
      if (i === 3) {
        let ok = true;
        if (!f.name.value.trim()) { flagInvalid(f.name); ok = false; }
        if (f.phone.value.replace(/\D/g, "").length < 10) { flagInvalid(f.phone); ok = false; }
        if (f.email.value && !/^\S+@\S+\.\S+$/.test(f.email.value)) { flagInvalid(f.email); ok = false; }
        if (!ok) { errEl.textContent = "We need a name and a 10-digit mobile number to confirm."; return false; }
      }
      return true;
    };
    const go = i => {
      step = i;
      panes.forEach((p, k) => p.classList.toggle("is-active", k === i));
      progress.forEach((p, k) => { p.classList.toggle("is-active", k === i); p.classList.toggle("is-done", k < i); });
      btnBack.hidden = i === 0;
      btnNext.hidden = i === panes.length - 1;
      btnSubmit.hidden = i !== panes.length - 1;
      errEl.textContent = "";
    };
    btnNext.addEventListener("click", () => { if (validate(step)) go(step + 1); });
    btnBack.addEventListener("click", () => go(step - 1));
    form.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && step < panes.length - 1) { e.preventDefault(); btnNext.click(); }
    });
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!validate(3)) return;
      const f = form.elements;
      const first = f.name.value.trim().split(" ")[0];
      $("[data-done-msg]").textContent =
        `Thanks, ${first}. Your ${f.year.value} ${f.make.value.trim()} ${f.model.value.trim()} is booked for ` +
        `${sel.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at ${sel.time}. ` +
        `Confirmation is on its way to ${f.phone.value}. Repair order #${RO_NUM}.`;
      $("[data-done]").hidden = false;
      progress.forEach(p => { p.classList.remove("is-active"); p.classList.add("is-done"); });
    });
    $("[data-reset]").addEventListener("click", () => {
      form.reset(); sel.date = sel.time = null;
      $("[data-done]").hidden = true;
      renderCal(); renderSlots(); setMiles(); syncRO(); go(0);
    });
  }

  /* ---------------- REVIEWS DRAG ---------------- */
  if ($("[data-reel]")) {
    const reel = $("[data-reel]");
    let down = false, sx = 0, sl = 0, moved = false;
    reel.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = reel.scrollLeft; });
    addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; reel.classList.add("dragging"); }
      reel.scrollLeft = sl - dx;
    });
    addEventListener("pointerup", () => { down = false; reel.classList.remove("dragging"); });
  }

  /* ---------------- QUICK QUESTION ---------------- */
  if ($("[data-quick]")) {
    $("[data-quick]").addEventListener("submit", e => {
      e.preventDefault();
      const q = e.target;
      const bad = [q.q_contact, q.q_msg].filter(i => !i.value.trim());
      bad.forEach(flagInvalid);
      if (bad.length) return;
      $("[data-quick-ok]").hidden = false;
      q.reset();
    });
  }

  /* ---------------- LIVE SCHEDULER EMBED ---------------- */
  $$("[data-scheduler-name]").forEach(el => (el.textContent = SCHEDULER.name));
  const embed = $("[data-embed]");
  if (embed && SCHEDULER.url) {
    $(".booking").hidden = true;
    $("iframe", embed).src = SCHEDULER.url;
    embed.hidden = false;
  }

  /* ---------------- REVEAL ON SCROLL ---------------- */
  const revealTargets = [
    ...$$(".section__head"), ...$$(".bay"), $(".explorer__stage"), $(".explorer__panel"),
    $(".dash__cluster"), $(".dash__readout"), $(".board"), ...$$(".step"), $(".ticket"), $(".ro"),
    ...$$(".card"), ...$$(".faq details"), $(".map"), $(".visit__info"),
    ...$$(".lane"), ...$$(".flow__list li"), $(".cta-band__title"),
  ].filter(Boolean);
  revealTargets.forEach(el => {
    el.classList.add("rv");
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains("rv"));
    el.style.setProperty("--d", (Math.min(sibs.indexOf(el), 6) * 0.08) + "s");
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add("in");
      if (el.classList.contains("bay")) {
        const bar = $(".bay__bar i", el);
        setTimeout(() => (bar.style.width = bar.dataset.pct + "%"), 300);
      }
      if (el.classList.contains("explorer__stage")) {
        const ex = $(".explorer");
        $$(".draw", el).forEach(g => g.classList.add("drawn"));
        ex.classList.add("is-rolling");
        setTimeout(() => ex.classList.remove("is-rolling"), 2400);
      }
      if (el.classList.contains("dash__cluster")) {
        const d = $(".dash"); d.classList.add("booting");
        setTimeout(() => d.classList.remove("booting"), 1600);
      }
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
  revealTargets.forEach(el => io.observe(el));

  const stepsEl = $(".steps");
  if (stepsEl) new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    stepsEl.style.setProperty("--prog", "100%");
    $$(".step__n", stepsEl).forEach((n, i) => n.style.setProperty("--d", (0.2 + i * 0.28) + "s"));
    stepsEl.classList.add("lit");
    obs.disconnect();
  }, { threshold: 0.4 }).observe(stepsEl);

  $("[data-year]").textContent = new Date().getFullYear();
})();
