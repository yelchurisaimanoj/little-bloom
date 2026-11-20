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
        '<a class="month-tile" href="./month.html?m=' + m.n + '"><span class="mnum">' + m.n + '</span><span class="mname">' + t("month_word_" + m) + '</span><div class="mwk">' + t("week") + " " + m.wk + "</div></a>").join("");
      const day = Math.floor(Date.now() / 86400000);
      $("#bonding").textContent = pick(LB_BONDING[day % LB_BONDING.length]);
      $("#toolList").innerHTML = [
        ["week.html", "🌱", "tool_weeks", "tool_weeks_sub"],
        ["month.html?m=1", "🗓️", "tool_months", "tool_months_sub"],
        ["diet.html", "🥗", "tool_diet", "tool_diet_sub"],
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
      const MODES = { calm: [4, 2, 6], sleep: [4, 3, 7], labor: [3, 0, 3] };
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

    about() {},
    menu() {
      $("#menuList").innerHTML = [
        ["week.html", "🌱", "tool_weeks", "tool_weeks_sub"],
        ["month.html?m=1", "🗓️", "tool_months", "tool_months_sub"],
        ["diet.html", "🥗", "tool_diet", "tool_diet_sub"],
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
