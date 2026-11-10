/* โน้ตเงิน — UI, storage, demo, export */
(function () {
  "use strict";

  var STORAGE_ENTRIES = "thai-money-note:v1:entries";
  var STORAGE_OVERRIDES = "thai-money-note:v1:overrides";

  var state = {
    demo: false,
    tab: "today",
    entries: [],
    overrides: {},
    preview: [],
    editingId: null,
    categoryFor: null
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

  function buildDemo(today) {
    var recipes = [
      [0, "ข้าวมันไก่ 50"],
      [0, "กาแฟ 2 แก้ว แก้วละ 45"],
      [0, "ซื้อน้ำ 3 ขวด 30"],
      [1, "ข้าวผัดกะเพรา 65"],
      [1, "ลาเต้ 55"],
      [1, "BTS 46"],
      [1, "ขายได้ 800"],
      [2, "ตั๋วหนัง 280"],
      [2, "ป๊อปคอร์น 89"],
      [2, "ชานมไข่มุก 65"],
      [3, "ชานมไข่มุก 65"],
      [3, "กาแฟ 45"],
      [3, "เสื้อยืด 390"],
      [4, "ค่าเน็ต 599"],
      [4, "ข้าวกล่อง 60"],
      [5, "ยาพาราเซตามอล 35"],
      [5, "ส้มตำ 80"],
      [5, "กาแฟ 50"],
      [6, "ค่าน้ำมัน 500"],
      [6, "ข้าวมันไก่ 50"],
      [6, "ชาเขียว 45"]
    ];
    var dates = MoneyNoteAdvice.last7Dates(today);
    var out = [];
    recipes.forEach(function (row, i) {
      var parsed = MoneyNoteParser.parseItems(row[1])[0];
      if (!parsed) return;
      out.push({
        id: "demo-" + i,
        date: dates[row[0]],
        createdAt: dates[row[0]] + "T12:00:00+07:00",
        raw: row[1],
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
    var today = bangkokToday();
    return state.entries.filter(function (e) { return e.date === today; })
      .slice().reverse();
  }

  function renderPreview() {
    var box = $("preview");
    var btn = $("add-btn");
    var items = state.preview;
    if (!items.length) {
      box.hidden = true;
      box.innerHTML = "";
      btn.disabled = true;
      return;
    }
    box.hidden = false;
    btn.disabled = false;
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
    $("today-date").textContent = "วันนี้ · " + thaiDate(bangkokToday(), true);

    var hold = $("today-list");
    if (!list.length) {
      hold.innerHTML = '<p class="empty" id="today-empty">ยังไม่มีรายการวันนี้ พิมพ์ด้านบนแล้วกดเพิ่มได้เลย</p>';
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

    var advice = MoneyNoteAdvice.adviceFor(summary);
    $("week-advice").innerHTML = "<h3>มองย้อนสัปดาห์นี้</h3>" +
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
    state.preview.forEach(function (p) {
      state.entries.push(parsedToEntry(p, today));
    });
    saveEntries();
    $("composer").value = "";
    state.preview = [];
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
    state.tab = tab;
    document.body.setAttribute("data-tab", tab);
    $("tab-today").classList.toggle("on", tab === "today");
    $("tab-week").classList.toggle("on", tab === "week");
    $("tab-today").setAttribute("aria-selected", tab === "today" ? "true" : "false");
    $("tab-week").setAttribute("aria-selected", tab === "week" ? "true" : "false");
  }

  function onClick(e) {
    var t = e.target.closest("[data-edit],[data-del],[data-cat-for],[data-pick],[data-set-cat],[data-tab],button,a");
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
    if (state.demo) {
      state.entries = buildDemo(bangkokToday());
    } else {
      state.entries = loadEntries();
    }
    if (params.get("tab") === "week") setTab("week");
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
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    render();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
