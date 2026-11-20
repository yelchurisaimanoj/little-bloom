/* Little Bloom — shared shell + page logic. All data stays on this device. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- due date / week math ---------- */
  const getDue = () => localStorage.getItem("lb_due");
  const setDue = d => localStorage.setItem("lb_due", d);
  function currentWeek() {
    const due = getDue();
    if (!due) return null;
    const ms = new Date(due + "T00:00:00") - Date.now();
    const daysLeft = Math.round(ms / 86400000);
    const week = Math.max(0, Math.ceil((280 - daysLeft) / 7));
    return { week, daysLeft };
  }
  const trimOf = w => (w <= 13 ? 1 : w <= 27 ? 2 : 3);

  /* ---------- shell: topbar, bottom nav, disclaimer, footer ---------- */
  function shell(active) {
    const top = document.createElement("header");
    top.className = "topbar";
    top.innerHTML =
      '<a class="brand" href="./index.html"><img src="./icons/icon-192.png" alt=""><span data-i18n="appName"></span></a>' +
      '<span class="spacer"></span>' +
      '<div class="langseg" role="group" aria-label="Language">' +
      LANGS.map(l => '<button data-lang="' + l + '">' + { en: "EN", hi: "हिं", te: "తె" }[l] + "</button>").join("") +
      "</div>";
    document.body.prepend(top);
    $$(".langseg button", top).forEach(b => {
      b.classList.toggle("on", b.dataset.lang === getLang());
      b.onclick = () => setLang(b.dataset.lang);
    });

    const nav = document.createElement("nav");
    nav.className = "bottomnav";
    const items = [
      ["home", "index.html", "🏠", "nav_home"],
      ["journey", "week.html", "🌱", "nav_journey"],
      ["breathe", "breathe.html", "🌬️", "nav_breathe"],
      ["kicks", "kicks.html", "👣", "nav_kicks"],
      ["menu", "menu.html", "✨", "nav_menu"]
    ];
    nav.innerHTML = items.map(i => '<a href="./' + i[1] + '"' + (i[0] === active ? ' class="on"' : "") + '><span class="ni">' + i[2] + '</span><span data-i18n="' + i[3] + '"></span></a>').join("");
    document.body.appendChild(nav);

    const end = document.createElement("div");
    end.className = "page";
    end.innerHTML =
      '<div class="disclaimer">ℹ️ <span data-i18n="disclaimer"></span></div>' +
      '<div class="footer" data-i18n="footer"></div>';
    document.body.appendChild(end);
  }

  function rerender() {
    applyStaticI18n(document);
    const fn = PAGES[document.body.dataset.page];
    if (fn) fn();
  }

  /* ---------- pages ---------- */
  const PAGES = {
    home() {
      const cw = currentWeek();
      const hero = $("#hero"), jc = $("#journeyCard");
      if (cw) {
        const w = Math.min(42, cw.week);
        const p = Math.max(0, Math.min(100, Math.round((w / 40) * 100)));
        jc.style.display = "";
        $("#dueForm").style.display = "none";
        const R = 52, C = 2 * Math.PI * R;
        $("#ringFill").style.strokeDasharray = C;
        $("#ringFill").style.strokeDashoffset = C * (1 - p / 100);
        $("#jWeek").textContent = w >= 1 && w <= 40 ? tf("week_of", { w }) : (cw.daysLeft < 0 ? t("past_due") : t("too_early"));
        $("#jDays").textContent = cw.daysLeft >= 0 ? tf("days_to_go", { d: cw.daysLeft }) : "";
        $("#jPct").textContent = tf("pct_done", { p });
        const link = $("#jLink");
        if (w >= 1 && w <= 40) { link.href = "./week.html?w=" + w; link.style.display = ""; } else link.style.display = "none";
        hero.className = "hero t" + trimOf(w);
      } else {
        jc.style.display = "none";
        $("#dueForm").style.display = "";
      }
      $("#monthGrid").innerHTML = LB_MONTHS.map(m =>
        '<a class="month-tile" href="./month.html?m=' + m.n + '"><span class="mnum">' + m.n + '</span><span class="mname">' + t("month_word_" + m.n) + '</span><div class="mwk">' + t("week") + " " + m.wk + "</div></a>").join("");
      const day = Math.floor(Date.now() / 86400000);
      $("#bonding").textContent = pick(LB_BONDING[day % LB_BONDING.length]);
      $("#toolList").innerHTML = [
        ["week.html", "🌱", "tool_weeks", "tool_weeks_sub"],
        ["month.html?m=1", "🗓️", "tool_months", "tool_months_sub"],
        ["diet.html", "🥗", "tool_diet", "tool_diet_sub"],
        ["play.html", "🎨", "tool_play", "tool_play_sub"],
        ["checklist.html", "✅", "tool_checklist", "tool_checklist_sub"],
        ["bag.html", "🧳", "tool_bag", "tool_bag_sub"],
        ["signs.html", "🚨", "tool_signs", "tool_signs_sub"],
        ["partner.html", "🤝", "tool_partner", "tool_partner_sub"],
        ["about.html", "ℹ️", "tool_about", "tool_about_sub"]
      ].map(x => '<a class="tool-tile" href="./' + x[0] + '"><span class="ic">' + x[1] + '</span><span><span class="tt">' + t(x[2]) + '</span><br><span class="ts">' + t(x[3]) + "</span></span></a>").join("");
      $("#saveDue").onclick = () => {
        const v = $("#dueIn").value;
        if (v) { setDue(v); rerender(); }
      };
      $("#changeDue").onclick = () => { $("#dueForm").style.display = ""; jc.style.display = "none"; $("#dueIn").value = getDue() || ""; };
      $("#resetDue").onclick = () => { localStorage.removeItem("lb_due"); rerender(); };
    },

    week() {
      let w = parseInt(new URLSearchParams(location.search).get("w")) || (currentWeek() ? Math.max(1, Math.min(40, currentWeek().week)) : 1);
      w = Math.max(1, Math.min(40, w));
      const d = LB_WEEKS[w - 1];
      $("#wkTitle").textContent = t("week") + " " + w;
      $("#wEmoji").textContent = d.size.e;
      $("#wSize").textContent = pick(d.size);
      $("#wBrain").textContent = pick(d.brain);
      $("#wCan").textContent = pick(d.can);
      $("#wAct").textContent = pick(d.act);
      $("#wMom").textContent = pick(d.mom);
      $("#wChips").innerHTML = LB_WEEKS.map(x =>
        "<button" + (x.n === w ? ' class="on"' : "") + ' onclick="location.href=\'./week.html?w=' + x.n + '\'">' + x.n + "</button>").join("");
      $("#wPrev").onclick = () => { if (w > 1) location.href = "./week.html?w=" + (w - 1); };
      $("#wNext").onclick = () => { if (w < 40) location.href = "./week.html?w=" + (w + 1); };
      $("#wPrev").style.visibility = w > 1 ? "" : "hidden";
      $("#wNext").style.visibility = w < 40 ? "" : "hidden";
      document.title = t("week") + " " + w + " · " + t("appName");
    },

    month() {
      let m = parseInt(new URLSearchParams(location.search).get("m")) || 1;
      m = Math.max(1, Math.min(9, m));
      const d = LB_MONTHS[m - 1];
      $("#mHero").className = "hero t" + (m <= 3 ? 1 : m <= 6 ? 2 : 3);
      $("#mTitle").textContent = t("month_word_" + m);
      $("#mWeeks").textContent = t("week") + " " + d.wk;
      $("#mPrev").onclick = () => { if (m > 1) location.href = "./month.html?m=" + (m - 1); };
      $("#mNext").onclick = () => { if (m < 9) location.href = "./month.html?m=" + (m + 1); };
      $("#mPrev").style.visibility = m > 1 ? "" : "hidden";
      $("#mNext").style.visibility = m < 9 ? "" : "hidden";
      const li = arr => arr.map(x => '<li><span class="dot">•</span><span>' + esc(pick(x)) + "</span></li>").join("");
      $("#mBaby").innerHTML = li(d.baby);
      $("#mBrain").innerHTML = li(d.brain);
      $("#mMom").innerHTML = li(d.mom);
      $("#mActs").innerHTML = d.acts.map(a =>
        '<div class="card tap-reveal" onclick="this.classList.toggle(\'open\')"><h3>🌼 ' + esc(pick(a.name)) + '</h3>' +
        '<div class="more-hint">' + t("tap_to_open") + " ▾</div>" +
        '<div class="hidden-part"><ul class="line-list">' + li(a.steps) + "</ul></div></div>").join("");
      document.title = t("month_word_" + m) + " · " + t("appName");
    },

    breathe() {
      const MODES = { calm: [4, 0, 6], sleep: [4, 0, 6], labor: [3, 0, 3] };
      let mode = "calm", timer = null, phase = 0, cycles = 0, running = false;
      const circ = $("#bCircle"), lbl = $("#bPhase"), cnt = $("#bCount"), btn = $("#bStart");
      const phases = () => [["in", "inhale", MODES[mode][0]], ["hold", "hold", MODES[mode][1]], ["out", "exhale", MODES[mode][2]]].filter(p => p[2] > 0);
      function step() {
        const ps = phases();
        const [cls, key, secs] = ps[phase % ps.length];
        circ.className = "breath-circle " + cls;
        lbl.textContent = t(key);
        let s = secs;
        cnt.textContent = s;
        clearInterval(timer);
        timer = setInterval(() => {
          s--;
          if (s <= 0) { phase++; if (phase % ps.length === 0) { cycles++; $("#bCycles").textContent = cycles; } step(); }
          else cnt.textContent = s;
        }, 1000);
      }
      btn.onclick = () => {
        running = !running;
        btn.textContent = running ? t("stop") : t("start");
        if (running) { phase = 0; step(); }
        else { clearInterval(timer); circ.className = "breath-circle"; lbl.textContent = "🌸"; cnt.textContent = ""; }
      };
      $$(".breath-modes button").forEach(b => {
        b.classList.toggle("on", b.dataset.mode === mode);
        b.onclick = () => { mode = b.dataset.mode; $$(".breath-modes button").forEach(x => x.classList.toggle("on", x === b)); if (running) { phase = 0; step(); } };
      });
    },

    kicks() {
      const KEY = "lb_kicks";
      const hist = () => JSON.parse(localStorage.getItem(KEY) || "[]");
      let n = 0, t0 = null, tick = null;
      const pad = $("#kickPad"), num = $("#kCount"), tim = $("#kTime");
      const fmt = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
      function renderHist() {
        const h = hist();
        $("#kHist").innerHTML = h.length ? h.slice(-7).reverse().map(x =>
          '<div class="check-item"><span class="box">👣</span><span class="ct">' + esc(x.date) + " — 10 " + t("kicks_count").toLowerCase() + " · " + esc(x.dur) + "</span></div>").join("")
          : '<div class="card"><p>' + t("kicks_empty") + "</p></div>";
      }
      pad.onclick = () => {
        if (n === 0) { t0 = Date.now(); tick = setInterval(() => tim.textContent = fmt(Date.now() - t0), 500); }
        n++;
        num.textContent = n;
        pad.classList.remove("beat"); void pad.offsetWidth; pad.classList.add("beat");
        $("#kDone").style.display = "none";
        if (n === 10) {
          clearInterval(tick);
          const dur = fmt(Date.now() - t0);
          $("#kDone").style.display = "";
          $("#kDoneIn").textContent = tf("kicks_done_in", { t: dur });
          $("#kSave").onclick = () => {
            const h = hist();
            h.push({ date: new Date().toLocaleDateString(), dur });
            localStorage.setItem(KEY, JSON.stringify(h));
            $("#kSave").textContent = t("saved"); renderHist();
          };
        }
      };
      $("#kNew").onclick = () => { n = 0; t0 = null; clearInterval(tick); num.textContent = "0"; tim.textContent = "0:00"; $("#kDone").style.display = "none"; $("#kSave").textContent = t("kicks_save"); };
      $("#kClear").onclick = () => { localStorage.removeItem(KEY); renderHist(); };
      renderHist();
    },

    diet() {
      const render = tri => {
        const d = LB_DIET["t" + tri];
        $("#dEat").innerHTML = d.eat.map(x => '<li><span class="dot">🥗</span><span>' + esc(pick(x)) + "</span></li>").join("");
        $("#dAvoid").innerHTML = d.avoid.map(x => '<li><span class="dot">🚫</span><span>' + esc(pick(x)) + "</span></li>").join("");
        $$(".tri-tabs button").forEach(b => b.classList.toggle("on", +b.dataset.tri === tri));
      };
      let tri = currentWeek() ? trimOf(currentWeek().week) : 1;
      $$(".tri-tabs button").forEach(b => b.onclick = () => render(+b.dataset.tri));
      render(tri);
    },

    checklist() {
      $("#vList").innerHTML = LB_VISITS.map(v =>
        '<div class="tl-item"><div class="when">' + esc(pick(v.when)) + '</div><div class="what">' + esc(pick(v.what)) + "</div></div>").join("");
      ["t1", "t2", "t3"].forEach((tk, i) => {
        $("#tasks" + (i + 1)).innerHTML = LB_TASKS[tk].map((x, j) => checkRow("task_" + tk + "_" + j, pick(x))).join("");
      });
      bindChecks();
    },

    bag() {
      [["bagMom", LB_BAG.mom, "m"], ["bagBaby", LB_BAG.baby, "b"], ["bagDocs", LB_BAG.docs, "d"]].forEach(([id, arr, p]) => {
        $("#" + id).innerHTML = arr.map((x, j) => checkRow("bag_" + p + "_" + j, pick(x))).join("");
      });
      bindChecks();
    },

    signs() {
      $("#sList").innerHTML = LB_SIGNS.map(s =>
        '<div class="sign-card"><span class="sic">' + s.e + '</span><span class="st">' + esc(pick(s)) + "</span></div>").join("");
    },

    partner() {
      $("#pList").innerHTML = LB_PARTNER.map(p =>
        '<div class="card"><div class="fact-card"><span class="fic act">' + p.e + '</span><div><div class="fb">' + esc(pick(p)) + "</div></div></div></div>").join("");
    },


    play() {
      /* --- magic patterns: trace with a finger --- */
      const cv = $("#traceCanvas"), ctx = cv.getContext("2d");
      const heartPts = () => { const a = []; for (let i = 0; i < 140; i++) { const t = i / 140 * 2 * Math.PI;
        const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        a.push([x / 17 * 0.38 + 0.5, -y / 17 * 0.38 + 0.5]); } return a; };
      const starPts = () => { const v = []; for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.17 : 0.4, ang = -Math.PI / 2 + k * Math.PI / 5;
        v.push([0.5 + r * Math.cos(ang), 0.5 + r * Math.sin(ang)]); } const a = [], per = 14;
        for (let k = 0; k < 10; k++) { const p1 = v[k], q = v[(k + 1) % 10];
          for (let j = 0; j < per; j++) a.push([p1[0] + (q[0] - p1[0]) * j / per, p1[1] + (q[1] - p1[1]) * j / per]); } return a; };
      const spiralPts = () => { const a = []; for (let i = 0; i < 140; i++) { const t = i / 140 * 3.2 * 2 * Math.PI, r = 0.05 + 0.35 * i / 140;
        a.push([0.5 + r * Math.cos(t), 0.5 + r * Math.sin(t)]); } return a; };
      const PATTERNS = [heartPts, starPts, spiralPts];
      let pi = 0, guide = [], covered = [], last = null, finished = false;
      function drawGuide() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        guide = PATTERNS[pi](); covered = guide.map(() => false); finished = false;
        $("#traceDone").style.display = "none";
        ctx.fillStyle = "#e9c4cd";
        guide.forEach(g => { ctx.beginPath(); ctx.arc(g[0] * cv.width, g[1] * cv.height, 5, 0, 7); ctx.fill(); });
      }
      function posOf(e) { const r = cv.getBoundingClientRect();
        return [(e.clientX - r.left) / r.width * cv.width, (e.clientY - r.top) / r.height * cv.height]; }
      function mark(x, y) {
        let done = 0;
        guide.forEach((g, i) => { if (!covered[i] && Math.hypot(g[0] * cv.width - x, g[1] * cv.height - y) < 46) covered[i] = true; if (covered[i]) done++; });
        if (!finished && done / guide.length >= 0.6) { finished = true; $("#traceDone").style.display = ""; }
      }
      function strokeTo(x, y) {
        ctx.strokeStyle = "#e8637c"; ctx.lineWidth = 30; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(x, y); ctx.stroke();
        const steps = Math.max(1, Math.floor(Math.hypot(x - last[0], y - last[1]) / 12));
        for (let i = 0; i <= steps; i++) mark(last[0] + (x - last[0]) * i / steps, last[1] + (y - last[1]) * i / steps);
        last = [x, y];
      }
      cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); last = posOf(e); mark(last[0], last[1]); });
      cv.addEventListener("pointermove", e => { if (last) { e.preventDefault(); const xy = posOf(e); strokeTo(xy[0], xy[1]); } });
      cv.addEventListener("pointerup", () => { last = null; });
      cv.addEventListener("pointercancel", () => { last = null; });
      $("#traceNew").onclick = () => { pi = (pi + 1) % PATTERNS.length; last = null; drawGuide(); };
      $("#traceClear").onclick = () => { last = null; drawGuide(); };
      drawGuide();

      /* --- lullaby pad --- */
      const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
      const colors = ["#f7b1c1", "#f9c8a0", "#fbe3a1", "#b7e3c0", "#a9d4f5", "#d7bdf2"];
      let audio = null;
      $("#toneGrid").innerHTML = notes.map((n, i) =>
        '<button class="tone-pad" style="background:' + colors[i] + '" data-n="' + i + '">♪</button>').join("");
      $$("#toneGrid .tone-pad").forEach(b => { b.onclick = () => {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = "sine"; o.frequency.value = notes[+b.dataset.n];
        g.gain.setValueAtTime(0.001, audio.currentTime);
        g.gain.exponentialRampToValueAtTime(0.28, audio.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 1.1);
        o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 1.15);
        b.classList.add("hit"); setTimeout(() => b.classList.remove("hit"), 250);
      }; });

      /* --- catch the hearts --- */
      let spawned = 0, popped = 0, timer = null;
      const POP_EMOJI = ["💗","🌸","⭐"];
      function popReset() { clearInterval(timer); spawned = 0; popped = 0;
        $("#popCount").textContent = "0"; $("#popDone").style.display = "none"; $("#popBox").innerHTML = ""; }
      function spawnHeart() {
        if (spawned >= 20) { clearInterval(timer); return; }
        const b = document.createElement("button");
        b.className = "pop-heart"; b.textContent = POP_EMOJI[spawned % 3];
        b.style.left = (6 + Math.random() * 78) + "%"; b.style.top = (12 + Math.random() * 60) + "%";
        b.onclick = () => { if (b.classList.contains("gone")) return; b.classList.add("gone");
          popped++; $("#popCount").textContent = popped; setTimeout(() => b.remove(), 220);
          if (popped >= 20) { $("#popDone").style.display = ""; $("#popDoneIn").textContent = tf("pop_done", { n: popped }); } };
        $("#popBox").appendChild(b); spawned++;
        setTimeout(() => { if (b.parentNode && !b.classList.contains("gone")) b.remove(); }, 2600);
      }
      $("#popStart").onclick = () => { popReset(); spawnHeart(); timer = setInterval(spawnHeart, 550); };

      /* --- pen & paper ideas --- */
      const SVGS = {
        dots: '<svg width="150" height="150" viewBox="0 0 150 150">' + Array.from({length:25},(_,i)=>'<circle cx="'+(25+(i%5)*25)+'" cy="'+(25+Math.floor(i/5)*25)+'" r="5" fill="#e8637c"/>').join("") + "</svg>",
        spiral: '<svg width="150" height="150" viewBox="0 0 150 150"><path d="M75 75 m0 -5 a5 5 0 0 1 5 5 a10 10 0 0 1 -10 10 a15 15 0 0 1 -15 -15 a20 20 0 0 1 20 -20 a25 25 0 0 1 25 25 a30 30 0 0 1 -30 30 a35 35 0 0 1 -35 -35 a40 40 0 0 1 40 -40" fill="none" stroke="#e8637c" stroke-width="4" stroke-linecap="round"/></svg>',
        waves: '<svg width="150" height="150" viewBox="0 0 150 150">' + [30,55,80,105].map(y=>'<path d="M15 '+y+' q18 -18 35 0 t35 0 t35 0" fill="none" stroke="#e8637c" stroke-width="4" stroke-linecap="round"/>').join("") + "</svg>",
        mandala: '<svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="12" fill="none" stroke="#e8637c" stroke-width="4"/><circle cx="75" cy="75" r="28" fill="none" stroke="#e8637c" stroke-width="4"/>' + Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return '<ellipse cx="'+(75+44*Math.cos(a))+'" cy="'+(75+44*Math.sin(a))+'" rx="10" ry="16" fill="#f7b1c1" transform="rotate('+(i*45)+' '+(75+44*Math.cos(a))+' '+(75+44*Math.sin(a))+')"/>';}).join("") + "</svg>",
        name: '<svg width="150" height="150" viewBox="0 0 150 150"><text x="75" y="88" text-anchor="middle" font-size="44" fill="#e8637c" font-weight="800">A</text><circle cx="40" cy="40" r="6" fill="#f7b1c1"/><circle cx="112" cy="42" r="6" fill="#f7b1c1"/><circle cx="75" cy="118" r="6" fill="#f7b1c1"/></svg>'
      };
      let paperIdx = 0;
      function showPaper() { const d = LB_PAPER[paperIdx]; $("#paperSvg").innerHTML = SVGS[d.svg]; $("#paperText").textContent = pick(d); }
      $("#paperNext").onclick = () => { paperIdx = (paperIdx + 1) % LB_PAPER.length; showPaper(); };
      showPaper();
    },
    about() {},
    menu() {
      $("#menuList").innerHTML = [
        ["week.html", "🌱", "tool_weeks", "tool_weeks_sub"],
        ["month.html?m=1", "🗓️", "tool_months", "tool_months_sub"],
        ["diet.html", "🥗", "tool_diet", "tool_diet_sub"],
        ["play.html", "🎨", "tool_play", "tool_play_sub"],
        ["checklist.html", "✅", "tool_checklist", "tool_checklist_sub"],
        ["bag.html", "🧳", "tool_bag", "tool_bag_sub"],
        ["signs.html", "🚨", "tool_signs", "tool_signs_sub"],
        ["partner.html", "🤝", "tool_partner", "tool_partner_sub"],
        ["about.html", "ℹ️", "tool_about", "tool_about_sub"]
      ].map(x => '<a href="./' + x[0] + '"><span class="mi">' + x[1] + '</span><span><span class="mt">' + t(x[2]) + '</span><br><span class="ms">' + t(x[3]) + '</span></span><span class="arr">›</span></a>').join("");
    }
  };

  function checkRow(id, text) {
    const on = localStorage.getItem("lb_" + id) === "1";
    return '<div class="check-item' + (on ? " done" : "") + '" data-ck="' + id + '"><span class="box">✓</span><span class="ct">' + esc(text) + "</span></div>";
  }
  function bindChecks() {
    $$(".check-item[data-ck]").forEach(el => {
      el.onclick = () => {
        const id = el.dataset.ck, on = el.classList.toggle("done");
        localStorage.setItem("lb_" + id, on ? "1" : "0");
      };
    });
  }

  /* ---------- boot ---------- */
  const active = document.body.dataset.nav || "home";
  shell(active);
  rerender();
  document.addEventListener("lb:lang", rerender);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
