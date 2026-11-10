/* โน้ตเงิน — weekly totals + plain-Thai rule-based advice from the user's own data */
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

  function last7Dates(todayYmd) {
    var dates = [];
    var p = todayYmd.split("-").map(Number);
    var cursor = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    for (var i = 0; i < 7; i++) {
      var d = new Date(cursor.getTime() - i * 86400000);
      var m = String(d.getUTCMonth() + 1).padStart(2, "0");
      var day = String(d.getUTCDate()).padStart(2, "0");
      dates.push(d.getUTCFullYear() + "-" + m + "-" + day);
    }
    return dates;
  }

  function inDates(entry, dateSet) {
    return !!dateSet[entry.date];
  }

  function summarize(entries, todayYmd) {
    var dates = last7Dates(todayYmd);
    var dateSet = {};
    dates.forEach(function (d) { dateSet[d] = true; });
    var week = entries.filter(function (e) { return inDates(e, dateSet); });
    var expenses = week.filter(function (e) { return e.type === "expense"; });
    var incomes = week.filter(function (e) { return e.type === "income"; });

    var spent = 0, income = 0;
    expenses.forEach(function (e) { spent += e.total; });
    incomes.forEach(function (e) { income += e.total; });

    var cats = (root.MoneyNoteCategories || require("./categories")).CATEGORIES;
    var byCat = {};
    cats.forEach(function (c) { byCat[c.id] = { id: c.id, name: c.name, total: 0, count: 0, color: c.color, essential: c.essential, discretionary: c.discretionary, items: [] }; });
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
      dates: dates,
      week: week,
      expenses: expenses,
      incomes: incomes,
      spent: spent,
      income: income,
      net: income - spent,
      catList: catList,
      topItems: topItems
    };
  }

  function isEssentialCat(catId, catsApi) {
    var c = catsApi.getCategory(catId);
    return !!(c && c.essential);
  }

  function adviceFor(summary) {
    var lines = [];
    var expenses = summary.expenses;
    if (expenses.length === 0) {
      lines.push("ยังไม่มีรายจ่ายในช่วง 7 วันที่ผ่านมา ลองบันทึกรายการดูสักสองสามวัน จะได้เห็นภาพภาพรวมได้ชัดขึ้น");
      return lines;
    }
    if (expenses.length < 3 || summary.dates && uniqueDays(expenses) < 3) {
      lines.push("ข้อมูลยังน้อยไปอยู่ ตอนนี้มีรายจ่าย " + expenses.length + " รายการในสัปดาห์นี้ ลองบันทึกต่ออีกสักสองสามวัน จะแนะนำได้แม่นกว่านี้");
    }

    var biggest = summary.catList[0];
    if (biggest) {
      if (biggest.essential) {
        lines.push("หมวดที่ใช้เยอะสุดสัปดาห์นี้คือ" + biggest.name + " " + baht(biggest.total) + " ซึ่งเป็นค่าใช้จ่ายจำเป็น จึงไม่แนะนำให้ตัดส่วนนี้");
      } else {
        lines.push("หมวดที่ใช้เยอะสุดสัปดาห์นี้คือ" + biggest.name + " " + baht(biggest.total));
      }
    }

    var disc = summary.catList.filter(function (c) { return c.discretionary && c.total > 0; });
    if (disc.length) {
      var topDisc = disc[0];
      var save = Math.round((topDisc.total / 2) * 100) / 100;
      if (save >= 20) {
        lines.push("ถ้าลดค่า" + topDisc.name + "ลงครึ่งหนึ่ง จะประหยัดได้ประมาณ " + baht(save) + " ใน 7 วันนี้");
      }
      // mention other discretionary if meaningful
      for (var i = 1; i < disc.length && i < 3; i++) {
        if (disc[i].total >= 80) {
          var s2 = Math.round((disc[i].total / 2) * 100) / 100;
          lines.push("หมวด" + disc[i].name + "ใช้ไป " + baht(disc[i].total) + " ถ้าลดครึ่งหนึ่งจะประหยัดได้ " + baht(s2));
        }
      }
    }

    // Frequent small non-essential purchases
    var catsApi = root.MoneyNoteCategories || require("./categories");
    var frequent = summary.topItems.filter(function (it) {
      return it.count >= 2 && it.total / it.count <= 100 && !isEssentialCat(it.category, catsApi);
    }).sort(function (a, b) { return b.count - a.count || b.total - a.total; });
    if (frequent.length) {
      var f = frequent[0];
      lines.push("สัปดาห์นี้ซื้อ\"" + f.name + "\" บ่อย (" + f.count + " ครั้ง รวม " + baht(f.total) + ") ลองตัดบางครั้งออกได้ ถ้าไม่จำเป็น");
    }

    // Food is mixed essential/discretionary — only hint if it's clearly large
    var food = summary.catList.filter(function (c) { return c.id === "food"; })[0];
    if (food && food.total >= 300) {
      lines.push("ค่าอาหารสัปดาห์นี้ " + baht(food.total) + " ไม่ได้แนะนำให้ตัดมื้อหลัก แต่ถ้ามีสั่งเดลิเวอรี่หรือขนมบ่อย ลดบางมื้อจะช่วยได้");
    }

    if (lines.length === 0 || (lines.length === 1 && lines[0].indexOf("ข้อมูลยังน้อย") !== -1)) {
      if (summary.spent > 0 && disc.length === 0) {
        lines.push("รายจ่ายส่วนใหญ่เป็นหมวดจำเป็น ยังไม่มีสิ่งที่แนะนำให้ตัดในตอนนี้");
      }
    }
    return lines;
  }

  function uniqueDays(entries) {
    var s = {};
    entries.forEach(function (e) { s[e.date] = true; });
    return Object.keys(s).length;
  }

  return {
    baht: baht,
    last7Dates: last7Dates,
    summarize: summarize,
    adviceFor: adviceFor
  };
});
