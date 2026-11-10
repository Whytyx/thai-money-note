/* โน้ตเงิน — UI, storage, demo, export */
(function () {
  "use strict";

  var STORAGE_ENTRIES = "thai-money-note:v1:entries";
  var STORAGE_OVERRIDES = "thai-money-note:v1:overrides";
  var APP_VERSION = "1.2.0";

  var state = {
    demo: false,
    tab: "today",
    entries: [],
    overrides: {},
    preview: [],
    editingId: null,
    categoryFor: null,
    monthOffset: 0,
    viewDate: null
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c];
    });
  }

  function bangkokToday() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  function thaiDate(ymd, withWeekday) {
    var months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    var days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    var p = ymd.split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    var s = p[2] + " " + months[p[1] - 1] + " " + (p[0] + 543);
    if (withWeekday) s = "วัน" + days[dt.getUTCDay()] + " " + s;
    return s;
  }

  function uid() {
    return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function baht(n) { return MoneyNoteAdvice.baht(n); }

  function loadOverrides() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_OVERRIDES) || "{}") || {};
    } catch (err) {
      return {};
    }
  }

  function saveOverrides() {
    if (state.demo) return;
    localStorage.setItem(STORAGE_OVERRIDES, JSON.stringify(state.overrides));
  }

  function loadEntries() {
    try {
      var list = JSON.parse(localStorage.getItem(STORAGE_ENTRIES) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function saveEntries() {
    if (state.demo) return;
    localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(state.entries));
  }

  function thaiMonthName(yearMonth) {
    var months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    var p = yearMonth.split("-").map(Number);
    return months[p[1] - 1] + " " + (p[0] + 543);
  }

  function buildDemo(today) {
    var recipes = [
      { ago: 0, text: "ข้าวมันไก่ 50" },
      { ago: 0, text: "กาแฟ 2 แก้ว แก้วละ 45" },
      { ago: 0, text: "ซื้อน้ำ 3 ขวด 30" },
      { ago: 1, text: "ข้าวผัดกะเพรา 65" },
      { ago: 1, text: "ลาเต้ 55" },
      { ago: 1, text: "BTS 46" },
      { ago: 1, text: "ขายได้ 800" },
      { ago: 2, text: "ตั๋วหนัง 280" },
      { ago: 2, text: "ป๊อปคอร์น 89" },
      { ago: 2, text: "ชานมไข่มุก 65" },
      { ago: 3, text: "ชานมไข่มุก 65" },
      { ago: 3, text: "กาแฟ 45" },
      { ago: 3, text: "เสื้อยืด 390" },
      { ago: 4, text: "ค่าเน็ต 599" },
      { ago: 4, text: "ข้าวกล่อง 60" },
      { ago: 5, text: "ยาพาราเซตามอล 35" },
      { ago: 5, text: "ส้มตำ 80" },
      { ago: 5, text: "กาแฟ 50" },
      { ago: 6, text: "ค่าน้ำมัน 500" },
      { ago: 6, text: "ข้าวมันไก่ 50" },
      { ago: 6, text: "ชาเขียว 45" },
      /* earlier in the current month, so สรุปเดือน has more than 7 days */
      { monthOffset: 0, day: 1, text: "เงินเดือน 25000" },
      { monthOffset: 0, day: 1, text: "ค่าเช่า 6500" },
      { monthOffset: 0, day: 2, text: "ข้าวผัด 60" },
      { monthOffset: 0, day: 2, text: "กาแฟ 45" },
      { monthOffset: 0, day: 3, text: "เติมน้ำมัน 600" },
      /* previous calendar month */
      { monthOffset: 1, day: 1, text: "เงินเดือน 25000" },
      { monthOffset: 1, day: 1, text: "ค่าเช่า 6500" },
      { monthOffset: 1, day: 2, text: "ค่าไฟ 1280" },
      { monthOffset: 1, day: 5, text: "เสื้อ 890" },
      { monthOffset: 1, day: 8, text: "ตั๋วหนัง 280" },
      { monthOffset: 1, day: 8, text: "กาแฟ 50" },
      { monthOffset: 1, day: 12, text: "ค่าน้ำมัน 500" },
      { monthOffset: 1, day: 12, text: "ข้าวกล่อง 60" },
      { monthOffset: 1, day: 15, text: "ชานมไข่มุก 65" },
      { monthOffset: 1, day: 15, text: "กาแฟ 45" },
      { monthOffset: 1, day: 20, text: "บุฟเฟต์ 499" },
      { monthOffset: 1, day: 25, text: "BTS 46" },
      { monthOffset: 1, day: 25, text: "ส้มตำ 80" },
      { monthOffset: 1, day: 28, text: "ชานมไข่มุก 65" }
    ];
    var weekDates = MoneyNoteAdvice.last7Dates(today);
    var weekSet = {};
    weekDates.forEach(function (d) { weekSet[d] = true; });
    var out = [];
    recipes.forEach(function (row, i) {
      var parsed = MoneyNoteParser.parseItems(row.text)[0];
      if (!parsed) return;
      var date;
      if (row.ago != null) {
        date = weekDates[row.ago];
      } else {
        date = MoneyNoteAdvice.dateInMonth(today, row.monthOffset, row.day);
        /* don't double-count if that calendar day already sits in the last 7 */
        if (weekSet[date]) return;
      }
      if (!date) return;
      out.push({
        id: "demo-" + i,
        date: date,
        createdAt: date + "T12:00:00+07:00",
        raw: row.text,
        name: parsed.name,
        qty: parsed.qty,
        unit: parsed.unit,
        unitPrice: parsed.unitPrice,
        total: parsed.total,
        type: parsed.type,
        category: MoneyNoteCategories.assignCategory(parsed, {}),
        isDemo: true
      });
    });
    return out;
  }

  function persistPruned(today) {
    var stored = loadEntries();
    var cutoff = MoneyNoteAdvice.retentionCutoff(today);
    var pruned = MoneyNoteAdvice.pruneOlderThan(stored, cutoff);
    if (pruned.length !== stored.length) {
      try { localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(pruned)); }
      catch (err) {}
    }
    return pruned;
  }

  function parsedToEntry(parsed, date) {
    return {
      id: uid(),
      date: date || bangkokToday(),
      createdAt: new Date().toISOString(),
      raw: parsed.raw,
      name: parsed.name,
      qty: parsed.qty,
      unit: parsed.unit,
      unitPrice: parsed.unitPrice,
      total: parsed.total,
      type: parsed.type,
      category: MoneyNoteCategories.assignCategory(parsed, state.overrides)
    };
  }

  function todayEntries() {
    var day = state.viewDate || bangkokToday();
    return state.entries.filter(function (e) { return e.date === day; })
      .slice().reverse();
  }

  function dayTitle(ymd) {
    var today = bangkokToday();
    if (ymd === today) return "วันนี้";
    if (ymd === MoneyNoteAdvice.addDays(today, -1)) return "เมื่อวาน";
    if (ymd === MoneyNoteAdvice.addDays(today, -2)) return "เมื่อวานซืน";
    return thaiDate(ymd, false);
  }

  function setViewDate(ymd, opts) {
    opts = opts || {};
    var today = bangkokToday();
    state.viewDate = MoneyNoteAdvice.clampDate(ymd, today);
    syncDateUI();
    if (!opts.silent) {
      renderToday();
      renderPreview();
    }
  }

  function shiftDay(dir) {
    setViewDate(MoneyNoteAdvice.addDays(state.viewDate || bangkokToday(), dir));
  }

  function syncDateUI() {
    var today = bangkokToday();
    var day = state.viewDate || today;
    var cutoff = MoneyNoteAdvice.retentionCutoff(today);
    var dateInput = $("entry-date");
    if (dateInput) {
      dateInput.min = cutoff;
      dateInput.max = today;
      dateInput.value = day;
    }
    var editDate = $("edit-date");
    if (editDate) {
      editDate.min = cutoff;
      editDate.max = today;
    }
    var chip0 = $("chip-today");
    var chip1 = $("chip-yesterday");
    if (chip0) chip0.classList.toggle("on", day === today);
    if (chip1) chip1.classList.toggle("on", day === MoneyNoteAdvice.addDays(today, -1));
    if ($("day-title")) $("day-title").textContent = dayTitle(day);
    if ($("day-sub")) $("day-sub").textContent = thaiDate(day, true);
    if ($("day-prev")) $("day-prev").disabled = day <= cutoff;
    if ($("day-next")) $("day-next").disabled = day >= today;
    if ($("composer-title")) {
      $("composer-title").textContent = (day === today ? "ซื้ออะไร หรือได้เงินอะไร" : "ซื้ออะไร " + dayTitle(day));
    }
    updateDateHint();
  }

  function updateDateHint() {
    var el = $("date-save-hint");
    if (!el) return;
    var today = bangkokToday();
    var hinted = null;
    for (var i = 0; i < state.preview.length; i++) {
      if (state.preview[i].daysAgo != null) {
        hinted = MoneyNoteAdvice.clampDate(MoneyNoteAdvice.addDays(today, -state.preview[i].daysAgo), today);
        break;
      }
    }
    var target = hinted || state.viewDate || today;
    if (target === today && !hinted) {
      el.textContent = "";
      return;
    }
    el.textContent = "จะบันทึกเป็น" + dayTitle(target) + " · " + thaiDate(target, false);
  }

  function openDatePicker() {
    var input = $("entry-date");
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try { input.showPicker(); return; } catch (err) {}
    }
    input.focus();
    input.click();
  }

  function renderPreview() {
    var box = $("preview");
    var btn = $("add-btn");
    var items = state.preview;
    if (!items.length) {
      box.hidden = true;
      box.innerHTML = "";
      btn.disabled = true;
      updateDateHint();
      return;
    }
    box.hidden = false;
    btn.disabled = false;
    updateDateHint();
    box.innerHTML = items.map(function (it, i) {
      var cat = MoneyNoteCategories.getCategory(MoneyNoteCategories.assignCategory(it, state.overrides));
      var qtyLine = it.qty !== 1 || it.unit
        ? esc(String(it.qty)) + (it.unit ? " " + esc(it.unit) : " ชิ้น") +
          " · ละ " + baht(it.unitPrice) + " · รวม "
        : "";
      var kind = it.type === "income" ? "รายรับ" : "รายจ่าย";
      return '<div class="preview-item">' +
        '<div class="preview-main">' +
          '<strong>' + esc(it.name) + '</strong>' +
          '<span class="pill">' + esc(cat.name) + '</span>' +
          '<span class="pill kind-' + it.type + '">' + kind + '</span>' +
        '</div>' +
        '<div class="preview-amt ' + it.type + '">' + qtyLine + baht(it.total) + '</div>' +
      '</div>';
    }).join("");
  }

  function renderToday() {
    var list = todayEntries();
    var spent = 0, income = 0;
    list.forEach(function (e) {
      if (e.type === "income") income += e.total;
      else spent += e.total;
    });
    $("today-spent").textContent = baht(spent);
    $("today-income").textContent = baht(income);
    $("today-net").textContent = baht(income - spent);
    $("today-net").className = "num " + (income - spent >= 0 ? "income" : "net-neg");
    syncDateUI();

    var hold = $("today-list");
    var day = state.viewDate || bangkokToday();
    if (!list.length) {
      var empty = day === bangkokToday()
        ? "ยังไม่มีรายการวันนี้ พิมพ์ด้านบนแล้วกดเพิ่มได้เลย"
        : "ยังไม่มีรายการ" + dayTitle(day) + " พิมพ์ด้านบนแล้วกดเพิ่มได้เลย";
      hold.innerHTML = '<p class="empty" id="today-empty">' + empty + "</p>";
      return;
    }
    hold.innerHTML = list.map(function (e) {
      var cat = MoneyNoteCategories.getCategory(e.category);
      var meta = [];
      if (e.qty !== 1 || e.unit) {
        meta.push(e.qty + (e.unit ? " " + e.unit : " ชิ้น"));
        if (e.qty !== 1) meta.push("ละ " + baht(e.unitPrice));
      }
      return '<article class="entry" data-id="' + esc(e.id) + '">' +
        '<button type="button" class="entry-body" data-edit="' + esc(e.id) + '">' +
          '<div class="entry-top">' +
            '<strong>' + esc(e.name) + '</strong>' +
            '<span class="amt ' + e.type + '">' + (e.type === "income" ? "+" : "−") + baht(e.total) + '</span>' +
          '</div>' +
          '<div class="entry-meta">' +
            (meta.length ? '<span>' + esc(meta.join(" · ")) + '</span>' : "") +
          '</div>' +
        '</button>' +
        '<button type="button" class="cat-chip" data-cat-for="' + esc(e.id) + '" style="--cat:' + cat.color + '">' + esc(cat.name) + '</button>' +
        '<button type="button" class="icon-btn" data-del="' + esc(e.id) + '" aria-label="ลบรายการ">ลบ</button>' +
      '</article>';
    }).join("");
  }

  function renderWeek() {
    var summary = MoneyNoteAdvice.summarize(state.entries, bangkokToday());
    $("week-range").textContent = thaiDate(summary.dates[6], false) + " – " + thaiDate(summary.dates[0], false);
    $("week-spent").textContent = baht(summary.spent);
    $("week-income").textContent = baht(summary.income);
    $("week-net").textContent = baht(summary.net);
    $("week-net").className = "num " + (summary.net >= 0 ? "income" : "net-neg");

    var max = summary.catList.length ? summary.catList[0].total : 0;
    var bars = $("week-bars");
    if (!summary.catList.length) {
      bars.innerHTML = '<p class="empty">ยังไม่มีรายจ่ายใน 7 วันนี้</p>';
    } else {
      bars.innerHTML = summary.catList.map(function (c) {
        var pct = max ? Math.max(6, Math.round((c.total / max) * 100)) : 0;
        return '<div class="bar-row">' +
          '<span class="bar-label">' + esc(c.name) + '</span>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + pct + "%;background:" + c.color + '"></div></div>' +
          '<span class="bar-amt">' + baht(c.total) + "</span>" +
        "</div>";
      }).join("");
    }

    var top = $("week-top");
    if (!summary.topItems.length) {
      top.innerHTML = "";
    } else {
      var items = summary.topItems.slice(0, 5).map(function (it) {
        return "<li><span>" + esc(it.name) + (it.count > 1 ? " × " + it.count : "") +
          "</span><strong>" + baht(it.total) + "</strong></li>";
      }).join("");
      top.innerHTML = "<h3>รายการที่ใช้เยอะ</h3><ul class='top-list'>" + items + "</ul>";
    }

    var advice = MoneyNoteAdvice.adviceFor(summary, {
      when: "สัปดาห์นี้",
      range: "ใน 7 วันนี้",
      empty: "ในช่วง 7 วันที่ผ่านมา",
      foodThreshold: 300,
      frequentMin: 2
    });
    $("week-advice").innerHTML = "<h3>มองย้อนสัปดาห์นี้</h3>" +
      advice.map(function (line) { return "<p>" + esc(line) + "</p>"; }).join("");
  }

  function monthAdviceOpts(yearMonth, today) {
    var name = thaiMonthName(yearMonth);
    var current = MoneyNoteAdvice.shiftMonthKey(today, 0) === yearMonth;
    var when = current ? "เดือนนี้" : "เดือน" + name.split(" ")[0];
    var range = current ? "ในเดือนนี้" : "ในเดือน" + name.split(" ")[0];
    return {
      when: when,
      range: range,
      empty: range,
      foodThreshold: 800,
      frequentMin: 3
    };
  }

  function renderMonth() {
    var today = bangkokToday();
    var yearMonth = MoneyNoteAdvice.shiftMonthKey(today, state.monthOffset);
    var summary = MoneyNoteAdvice.summarizeMonth(state.entries, yearMonth);
    $("month-title").textContent = thaiMonthName(yearMonth);
    $("month-prev").disabled = state.monthOffset >= 1;
    $("month-next").disabled = state.monthOffset <= 0;
    $("month-spent").textContent = baht(summary.spent);
    $("month-income").textContent = baht(summary.income);
    $("month-net").textContent = baht(summary.net);
    $("month-net").className = "num " + (summary.net >= 0 ? "income" : "net-neg");

    var max = summary.catList.length ? summary.catList[0].total : 0;
    var bars = $("month-bars");
    if (!summary.catList.length) {
      bars.innerHTML = '<p class="empty">ยังไม่มีรายจ่ายในเดือนนี้</p>';
    } else {
      bars.innerHTML = summary.catList.map(function (c) {
        var pct = max ? Math.max(6, Math.round((c.total / max) * 100)) : 0;
        return '<div class="bar-row">' +
          '<span class="bar-label">' + esc(c.name) + '</span>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + pct + "%;background:" + c.color + '"></div></div>' +
          '<span class="bar-amt">' + baht(c.total) + "</span>" +
        "</div>";
      }).join("");
    }

    var top = $("month-top");
    if (!summary.topItems.length) {
      top.innerHTML = "";
    } else {
      var items = summary.topItems.slice(0, 5).map(function (it) {
        return "<li><span>" + esc(it.name) + (it.count > 1 ? " × " + it.count : "") +
          "</span><strong>" + baht(it.total) + "</strong></li>";
      }).join("");
      top.innerHTML = "<h3>หมวดและรายการที่ใช้เยอะ</h3><ul class='top-list'>" + items + "</ul>";
    }

    var advice = MoneyNoteAdvice.adviceFor(summary, monthAdviceOpts(yearMonth, today));
    $("month-advice").innerHTML = "<h3>มองย้อนทั้งเดือน</h3>" +
      advice.map(function (line) { return "<p>" + esc(line) + "</p>"; }).join("");
  }

  function renderBanner() {
    var el = $("demo-banner");
    if (state.demo) {
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function render() {
    renderBanner();
    renderPreview();
    renderToday();
    renderWeek();
    renderMonth();
  }

  function updatePreviewFromInput() {
    var text = $("composer").value;
    state.preview = MoneyNoteParser.parseItems(text);
    renderPreview();
  }

  function addFromComposer() {
    updatePreviewFromInput();
    if (!state.preview.length) return;
    var today = bangkokToday();
    var firstDate = null;
    state.preview.forEach(function (p) {
      var date = state.viewDate || today;
      if (p.daysAgo != null) {
        date = MoneyNoteAdvice.clampDate(MoneyNoteAdvice.addDays(today, -p.daysAgo), today);
      }
      if (!firstDate) firstDate = date;
      state.entries.push(parsedToEntry(p, date));
    });
    saveEntries();
    $("composer").value = "";
    state.preview = [];
    if (firstDate && firstDate !== state.viewDate) state.viewDate = firstDate;
    render();
    $("composer").focus();
  }

  function findEntry(id) {
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].id === id) return state.entries[i];
    }
    return null;
  }

  function deleteEntry(id) {
    if (!confirm("ลบรายการนี้ไหม?")) return;
    state.entries = state.entries.filter(function (e) { return e.id !== id; });
    saveEntries();
    closeModal();
    render();
  }

  function openEditor(id) {
    var e = findEntry(id);
    if (!e) return;
    state.editingId = id;
    $("edit-name").value = e.name;
    $("edit-qty").value = e.qty;
    $("edit-unit").value = e.unit || "";
    $("edit-price").value = e.unitPrice;
    $("edit-type").value = e.type;
    var today = bangkokToday();
    $("edit-date").min = MoneyNoteAdvice.retentionCutoff(today);
    $("edit-date").max = today;
    $("edit-date").value = MoneyNoteAdvice.clampDate(e.date, today);
    renderEditCats(e.category);
    updateEditTotal();
    $("edit-modal").hidden = false;
    $("edit-name").focus();
  }

  function renderEditCats(selected) {
    $("edit-cats").innerHTML = MoneyNoteCategories.CATEGORIES.map(function (c) {
      var on = c.id === selected ? " on" : "";
      return '<button type="button" class="pick-cat' + on + '" data-pick="' + c.id + '" style="--cat:' + c.color + '">' + esc(c.name) + "</button>";
    }).join("");
  }

  function selectedEditCat() {
    var on = $("edit-cats").querySelector(".pick-cat.on");
    return on ? on.getAttribute("data-pick") : "other";
  }

  function updateEditTotal() {
    var qty = MoneyNoteParser.parseNumber($("edit-qty").value) || 0;
    var price = MoneyNoteParser.parseNumber($("edit-price").value) || 0;
    $("edit-total").textContent = "รวม " + baht(qty * price);
  }

  function saveEditor() {
    var e = findEntry(state.editingId);
    if (!e) return;
    var name = $("edit-name").value.trim() || e.name;
    var qty = MoneyNoteParser.parseNumber($("edit-qty").value);
    var price = MoneyNoteParser.parseNumber($("edit-price").value);
    if (!isFinite(qty) || qty <= 0) qty = 1;
    if (!isFinite(price) || price < 0) price = 0;
    var cat = selectedEditCat();
    var key = MoneyNoteParser.normalizeName(name);
    state.overrides[key] = cat;
    saveOverrides();
    e.name = name;
    e.qty = qty;
    e.unit = $("edit-unit").value.trim();
    e.unitPrice = price;
    e.total = MoneyNoteParser.roundMoney(qty * price);
    e.type = $("edit-type").value;
    e.category = cat;
    var newDate = MoneyNoteAdvice.clampDate($("edit-date").value, bangkokToday());
    e.date = newDate;
    state.viewDate = newDate;
    saveEntries();
    closeModal();
    render();
  }

  function closeModal() {
    $("edit-modal").hidden = true;
    $("cat-modal").hidden = true;
    state.editingId = null;
    state.categoryFor = null;
  }

  function openCatPicker(id) {
    var e = findEntry(id);
    if (!e) return;
    state.categoryFor = id;
    $("cat-choices").innerHTML = MoneyNoteCategories.CATEGORIES.map(function (c) {
      var on = c.id === e.category ? " on" : "";
      return '<button type="button" class="pick-cat' + on + '" data-set-cat="' + c.id + '" style="--cat:' + c.color + '">' + esc(c.name) + "</button>";
    }).join("");
    $("cat-modal").hidden = false;
  }

  function setCategory(catId) {
    var e = findEntry(state.categoryFor);
    if (!e) return;
    e.category = catId;
    var key = MoneyNoteParser.normalizeName(e.name);
    state.overrides[key] = catId;
    saveOverrides();
    saveEntries();
    closeModal();
    render();
  }

  function exportCsv() {
    var rows = [["วันที่", "ประเภท", "รายการ", "หมวด", "จำนวน", "หน่วย", "ราคาต่อหน่วย", "รวม", "ข้อความเดิม"]];
    var sorted = state.entries.slice().sort(function (a, b) {
      return (a.date + a.createdAt).localeCompare(b.date + b.createdAt);
    });
    sorted.forEach(function (e) {
      var cat = MoneyNoteCategories.getCategory(e.category);
      rows.push([
        e.date,
        e.type === "income" ? "รายรับ" : "รายจ่าย",
        e.name,
        cat.name,
        e.qty,
        e.unit || "",
        e.unitPrice,
        e.total,
        e.raw || ""
      ]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (cell) {
        var s = String(cell == null ? "" : cell);
        if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }).join(",");
    }).join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "note-ngoen-" + bangkokToday() + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  function clearData() {
    if (state.demo) {
      alert("ตอนนี้อยู่ในโหมดตัวอย่าง ข้อมูลบนหน้าจอไม่ได้ถูกบันทึกอยู่แล้ว การล้างจะลบเฉพาะข้อมูลจริงที่เคยบันทึกในเครื่องนี้ ไม่กระทบตัวอย่าง");
    }
    if (!confirm("ลบรายการที่บันทึกไว้ทั้งหมดในเครื่องนี้? กู้คืนไม่ได้นะ")) return;
    if (!confirm("ยืนยันอีกครั้ง ลบข้อมูลจริงทั้งหมดเลยไหม?")) return;
    localStorage.removeItem(STORAGE_ENTRIES);
    localStorage.removeItem(STORAGE_OVERRIDES);
    if (!state.demo) {
      state.entries = [];
      state.overrides = {};
      render();
    }
  }

  function setTab(tab) {
    if (tab !== "today" && tab !== "week" && tab !== "month") tab = "today";
    state.tab = tab;
    document.body.setAttribute("data-tab", tab);
    ["today", "week", "month"].forEach(function (id) {
      var el = $("tab-" + id);
      if (el) {
        el.classList.toggle("on", tab === id);
        el.setAttribute("aria-selected", tab === id ? "true" : "false");
      }
    });
    var sideWeek = $("side-tab-week");
    var sideMonth = $("side-tab-month");
    var weekOn = tab === "week" || tab === "today";
    if (sideWeek) {
      sideWeek.classList.toggle("on", weekOn);
      sideWeek.setAttribute("aria-selected", weekOn ? "true" : "false");
    }
    if (sideMonth) {
      sideMonth.classList.toggle("on", tab === "month");
      sideMonth.setAttribute("aria-selected", tab === "month" ? "true" : "false");
    }
  }

  function shiftMonth(dir) {
    var next = state.monthOffset + dir;
    if (next < 0 || next > 1) return;
    state.monthOffset = next;
    renderMonth();
  }

  function onClick(e) {
    var t = e.target.closest("[data-edit],[data-del],[data-cat-for],[data-pick],[data-set-cat],[data-tab],[data-date-chip],button,a");
    if (!t) return;
    if (t.id === "add-btn") { addFromComposer(); return; }
    if (t.id === "export-btn") { exportCsv(); return; }
    if (t.id === "clear-btn") { clearData(); return; }
    if (t.id === "edit-save") { saveEditor(); return; }
    if (t.id === "edit-cancel" || t.id === "cat-cancel" || t.classList.contains("modal-backdrop")) { closeModal(); return; }
    if (t.id === "edit-delete" && state.editingId) { deleteEntry(state.editingId); return; }
    if (t.id === "exit-demo") {
      var url = new URL(location.href);
      url.searchParams.delete("demo");
      location.href = url.pathname + url.search + url.hash;
      return;
    }
    if (t.id === "month-prev") { shiftMonth(1); return; }
    if (t.id === "month-next") { shiftMonth(-1); return; }
    if (t.id === "day-prev") { shiftDay(-1); return; }
    if (t.id === "day-next") { shiftDay(1); return; }
    if (t.id === "day-label") { openDatePicker(); return; }
    if (t.getAttribute("data-date-chip") != null) {
      setViewDate(MoneyNoteAdvice.addDays(bangkokToday(), -Number(t.getAttribute("data-date-chip"))));
      return;
    }
    if (t.getAttribute("data-tab")) { setTab(t.getAttribute("data-tab")); return; }
    if (t.getAttribute("data-edit")) { openEditor(t.getAttribute("data-edit")); return; }
    if (t.getAttribute("data-del")) { deleteEntry(t.getAttribute("data-del")); return; }
    if (t.getAttribute("data-cat-for")) { openCatPicker(t.getAttribute("data-cat-for")); return; }
    if (t.getAttribute("data-pick")) {
      $("edit-cats").querySelectorAll(".pick-cat").forEach(function (b) { b.classList.remove("on"); });
      t.classList.add("on");
      return;
    }
    if (t.getAttribute("data-set-cat")) { setCategory(t.getAttribute("data-set-cat")); }
  }

  function init() {
    var params = new URLSearchParams(location.search);
    state.demo = params.has("demo");
    state.overrides = loadOverrides();
    var today = bangkokToday();
    var pruned = persistPruned(today);
    if (state.demo) {
      state.entries = buildDemo(today);
    } else {
      state.entries = pruned;
    }
    var startDate = today;
    if (params.get("date")) startDate = MoneyNoteAdvice.clampDate(params.get("date"), today);
    else if (params.get("day") === "yesterday") startDate = MoneyNoteAdvice.addDays(today, -1);
    state.viewDate = MoneyNoteAdvice.clampDate(startDate, today);
    if (params.get("tab") === "week") setTab("week");
    else if (params.get("tab") === "month") setTab("month");
    else setTab("today");

    $("composer").addEventListener("input", updatePreviewFromInput);
    $("composer").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addFromComposer();
      }
    });
    $("edit-qty").addEventListener("input", updateEditTotal);
    $("edit-price").addEventListener("input", updateEditTotal);
    $("entry-date").addEventListener("change", function () {
      setViewDate($("entry-date").value);
    });
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    if ($("app-version")) $("app-version").textContent = "เวอร์ชัน " + APP_VERSION;
    setupPwaUpdates();
    render();
  }

  function showUpdateToast() {
    var el = $("update-toast");
    if (!el) return;
    el.textContent = "อัปเดตแอปแล้ว · เวอร์ชัน " + APP_VERSION;
    el.hidden = false;
    setTimeout(function () { el.hidden = true; }, 4500);
  }

  /* Never reads or writes entry/override keys in localStorage. */
  function setupPwaUpdates() {
    try {
      if (sessionStorage.getItem("thai-money-note:just-updated")) {
        sessionStorage.removeItem("thai-money-note:just-updated");
        showUpdateToast();
      }
    } catch (err) {}
    if (!("serviceWorker" in navigator)) return;
    var hadController = !!navigator.serviceWorker.controller;
    var refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController) return;
      if (refreshing) return;
      refreshing = true;
      try { sessionStorage.setItem("thai-money-note:just-updated", "1"); } catch (err) {}
      location.reload();
    });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
      function check() { reg.update().catch(function () {}); }
      check();
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") check();
      });
    }).catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
