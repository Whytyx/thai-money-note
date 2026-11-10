/* โน้ตเงิน — weekly/monthly totals + plain-Thai rule-based advice from the user's own data */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.MoneyNoteAdvice = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function baht(n) {
    var v = Math.round((n || 0) * 100) / 100;
    var sign = v < 0 ? "−" : "";
    v = Math.abs(v);
    var parts = v.toFixed(v % 1 ? 2 : 0).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "฿" + parts.join(".");
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function ymdFromUtc(d) {
    return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
  }

  /* monthOffset 0 = month of today, 1 = previous calendar month. day is clamped to that month. */
  function dateInMonth(todayYmd, monthOffset, day) {
    var p = String(todayYmd).split("-").map(Number);
    var y = p[0];
    var m = p[1] - (monthOffset || 0);
    while (m <= 0) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    var last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var d = Math.min(Math.max(1, day || 1), last);
    return y + "-" + pad2(m) + "-" + pad2(d);
  }

  function monthKey(ymd) {
    return String(ymd).slice(0, 7);
  }

  function shiftMonthKey(todayYmd, monthOffset) {
    return monthKey(dateInMonth(todayYmd, monthOffset, 1));
  }

  /* Keep current + previous calendar month; anything before this cutoff is dropped. */
  function retentionCutoff(todayYmd) {
    return dateInMonth(todayYmd, 1, 1);
  }

  function isYmd(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  function pruneOlderThan(entries, cutoffYmd) {
    return (entries || []).filter(function (e) {
      return e && isYmd(e.date) && e.date >= cutoffYmd;
    });
  }

  function addDays(ymd, delta) {
    if (!isYmd(ymd)) return ymd;
    var p = ymd.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + (delta || 0)));
    return ymdFromUtc(d);
  }

  function isDateAllowed(ymd, todayYmd) {
    if (!isYmd(ymd) || !isYmd(todayYmd)) return false;
    return ymd >= retentionCutoff(todayYmd) && ymd <= todayYmd;
  }

  function clampDate(ymd, todayYmd) {
    if (!isYmd(todayYmd)) return ymd;
    var cutoff = retentionCutoff(todayYmd);
    if (!isYmd(ymd) || ymd < cutoff) return cutoff;
    if (ymd > todayYmd) return todayYmd;
    return ymd;
  }

  function last7Dates(todayYmd) {
    var dates = [];
    var p = todayYmd.split("-").map(Number);
    var cursor = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    for (var i = 0; i < 7; i++) {
      dates.push(ymdFromUtc(new Date(cursor.getTime() - i * 86400000)));
    }
    return dates;
  }

  function uniqueDays(entries) {
    var s = {};
    (entries || []).forEach(function (e) { if (e && e.date) s[e.date] = true; });
    return Object.keys(s).length;
  }

  function aggregate(list) {
    var expenses = list.filter(function (e) { return e.type === "expense"; });
    var incomes = list.filter(function (e) { return e.type === "income"; });
    var spent = 0, income = 0;
    expenses.forEach(function (e) { spent += e.total; });
    incomes.forEach(function (e) { income += e.total; });

    var cats = (root.MoneyNoteCategories || require("./categories")).CATEGORIES;
    var byCat = {};
    cats.forEach(function (c) {
      byCat[c.id] = { id: c.id, name: c.name, total: 0, count: 0, color: c.color, essential: c.essential, discretionary: c.discretionary, items: [] };
    });
    expenses.forEach(function (e) {
      var id = e.category || "other";
      if (!byCat[id]) byCat[id] = { id: id, name: id, total: 0, count: 0, color: "#8A8178", essential: false, discretionary: false, items: [] };
      byCat[id].total += e.total;
      byCat[id].count += 1;
      byCat[id].items.push(e);
    });

    var catList = Object.keys(byCat).map(function (k) { return byCat[k]; })
      .filter(function (c) { return c.total > 0; })
      .sort(function (a, b) { return b.total - a.total; });

    var itemMap = {};
    expenses.forEach(function (e) {
      var key = (e.name || "").toLowerCase();
      if (!itemMap[key]) itemMap[key] = { name: e.name, total: 0, count: 0, category: e.category };
      itemMap[key].total += e.total;
      itemMap[key].count += 1;
    });
    var topItems = Object.keys(itemMap).map(function (k) { return itemMap[k]; })
      .sort(function (a, b) { return b.total - a.total || b.count - a.count; });

    return {
      expenses: expenses,
      incomes: incomes,
      spent: spent,
      income: income,
      net: income - spent,
      catList: catList,
      topItems: topItems
    };
  }

  function summarize(entries, todayYmd) {
    var dates = last7Dates(todayYmd);
    var dateSet = {};
    dates.forEach(function (d) { dateSet[d] = true; });
    var week = (entries || []).filter(function (e) { return e && dateSet[e.date]; });
    var out = aggregate(week);
    out.dates = dates;
    out.week = week;
    return out;
  }

  function summarizeMonth(entries, yearMonth) {
    var month = (entries || []).filter(function (e) {
      return e && typeof e.date === "string" && e.date.slice(0, 7) === yearMonth;
    });
    var out = aggregate(month);
    out.yearMonth = yearMonth;
    out.dates = month.map(function (e) { return e.date; })
      .filter(function (d, i, arr) { return arr.indexOf(d) === i; })
      .sort();
    return out;
  }

  function isEssentialCat(catId, catsApi) {
    var c = catsApi.getCategory(catId);
    return !!(c && c.essential);
  }

  /* opts.when e.g. "สัปดาห์นี้" / "เดือนพฤศจิกายน"
     opts.range e.g. "ใน 7 วันนี้" / "ในเดือนพฤศจิกายน"
     opts.empty e.g. "ในช่วง 7 วันที่ผ่านมา" / "ในเดือนพฤศจิกายน"
     opts.foodThreshold, opts.frequentMin */
  function adviceFor(summary, opts) {
    opts = opts || {};
    var when = opts.when || "สัปดาห์นี้";
    var range = opts.range || "ใน 7 วันนี้";
    var empty = opts.empty || "ในช่วง 7 วันที่ผ่านมา";
    var foodThreshold = opts.foodThreshold != null ? opts.foodThreshold : 300;
    var frequentMin = opts.frequentMin != null ? opts.frequentMin : 2;
    var lines = [];
    var expenses = summary.expenses || [];
    if (expenses.length === 0) {
      lines.push("ยังไม่มีรายจ่าย" + empty + " ลองบันทึกรายการดูสักสองสามวัน จะได้เห็นภาพรวมได้ชัดขึ้น");
      return lines;
    }
    if (expenses.length < 3 || uniqueDays(expenses) < 3) {
      lines.push("ข้อมูลยังน้อยไปอยู่ ตอนนี้มีรายจ่าย " + expenses.length + " รายการ" + range + " ลองบันทึกต่ออีกสักสองสามวัน จะแนะนำได้แม่นกว่านี้");
    }

    var biggest = summary.catList[0];
    if (biggest) {
      if (biggest.essential) {
        lines.push("หมวดที่ใช้เยอะสุด" + when + "คือ" + biggest.name + " " + baht(biggest.total) + " ซึ่งเป็นค่าใช้จ่ายจำเป็น จึงไม่แนะนำให้ตัดส่วนนี้");
      } else {
        lines.push("หมวดที่ใช้เยอะสุด" + when + "คือ" + biggest.name + " " + baht(biggest.total));
      }
    }

    var disc = (summary.catList || []).filter(function (c) { return c.discretionary && c.total > 0; });
    if (disc.length) {
      var topDisc = disc[0];
      var save = Math.round((topDisc.total / 2) * 100) / 100;
      if (save >= 20) {
        lines.push("ถ้าลดค่า" + topDisc.name + "ลงครึ่งหนึ่ง จะประหยัดได้ประมาณ " + baht(save) + " " + range);
      }
      for (var i = 1; i < disc.length && i < 3; i++) {
        if (disc[i].total >= 80) {
          var s2 = Math.round((disc[i].total / 2) * 100) / 100;
          lines.push("หมวด" + disc[i].name + "ใช้ไป " + baht(disc[i].total) + " ถ้าลดครึ่งหนึ่งจะประหยัดได้ " + baht(s2));
        }
      }
    }

    var catsApi = root.MoneyNoteCategories || require("./categories");
    var frequent = (summary.topItems || []).filter(function (it) {
      return it.count >= frequentMin && it.total / it.count <= 100 && !isEssentialCat(it.category, catsApi);
    }).sort(function (a, b) { return b.count - a.count || b.total - a.total; });
    if (frequent.length) {
      var f = frequent[0];
      lines.push(when + "ซื้อ\"" + f.name + "\" บ่อย (" + f.count + " ครั้ง รวม " + baht(f.total) + ") ลองตัดบางครั้งออกได้ ถ้าไม่จำเป็น");
    }

    var food = (summary.catList || []).filter(function (c) { return c.id === "food"; })[0];
    if (food && food.total >= foodThreshold) {
      lines.push("ค่าอาหาร" + when + " " + baht(food.total) + " ไม่ได้แนะนำให้ตัดมื้อหลัก แต่ถ้ามีสั่งเดลิเวอรี่หรือขนมบ่อย ลดบางมื้อจะช่วยได้");
    }

    if (lines.length === 0 || (lines.length === 1 && lines[0].indexOf("ข้อมูลยังน้อย") !== -1)) {
      if (summary.spent > 0 && disc.length === 0) {
        lines.push("รายจ่ายส่วนใหญ่เป็นหมวดจำเป็น ยังไม่มีสิ่งที่แนะนำให้ตัดในตอนนี้");
      }
    }
    return lines;
  }

  return {
    baht: baht,
    dateInMonth: dateInMonth,
    monthKey: monthKey,
    shiftMonthKey: shiftMonthKey,
    retentionCutoff: retentionCutoff,
    pruneOlderThan: pruneOlderThan,
    addDays: addDays,
    isDateAllowed: isDateAllowed,
    clampDate: clampDate,
    last7Dates: last7Dates,
    summarize: summarize,
    summarizeMonth: summarizeMonth,
    adviceFor: adviceFor,
    uniqueDays: uniqueDays
  };
});
