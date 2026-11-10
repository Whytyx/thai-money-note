/* โน้ตเงิน — natural-language Thai money parser (no network, no AI) */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.MoneyNoteParser = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var UNITS = [
    "กระป๋อง", "กระปุก", "กิโลกรัม", "กิโล", "แพ็คเกจ", "แพ็กเกจ",
    "แพ็ค", "แพ็ก", "แพค", "กล่อง", "หลอด", "ตลับ", "ชิ้น", "จาน",
    "ถ้วย", "แก้ว", "ขวด", "ถุง", "ห่อ", "ซอง", "แผ่น", "แผง",
    "ก้อน", "หวี", "เส้น", "เม็ด", "ฟอง", "ดอก", "ใบ", "ลูก",
    "แท่ง", "มื้อ", "คู่", "ชุด", "ตัว", "เครื่อง", "เล่ม",
    "ที่นั่ง", "รอบ", "คน", "อัน", "ที่", "ไม้", "โล", "กก",
    "ลิตร", "pack", "pcs", "box", "cup", "bottle"
  ];
  var UNIT_RE = UNITS.slice().sort(function (a, b) { return b.length - a.length; })
    .map(escapeRegExp).join("|");

  var INCOME_KEYWORDS = [
    "เงินเดือน", "รายรับ", "รายได้", "ได้เงิน", "รับเงิน", "โบนัส",
    "ขายได้", "ขายของ", "ค่าจ้าง", "ค่าแรง", "โอนเข้า", "เงินเข้า",
    "เงินได้", "โบนัส", "เงินโบนัส", "bonus", "salary", "income",
    "ค่าสอน", "ค่าจ้างพิเศษ", "เงินคืน", "ได้ค่า"
  ];

  var LEADING_VERBS = /^(ซื้อ|จ่าย|เติม|สั่ง|เอา|กิน|ทาน)\s*/;
  var CURRENCY_TAIL = /\s*(?:บาท|฿|บ\.)\s*$/;
  var NUM = "(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)";

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function parseNumber(str) {
    if (str == null || str === "") return NaN;
    return parseFloat(String(str).replace(/,/g, ""));
  }

  function roundMoney(n) {
    return Math.round(n * 100) / 100;
  }

  function isIncomeText(text) {
    var t = String(text || "").trim();
    if (/^\s*\+/.test(t)) return true;
    var lower = t.toLowerCase();
    for (var i = 0; i < INCOME_KEYWORDS.length; i++) {
      if (lower.indexOf(INCOME_KEYWORDS[i].toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function splitItems(text) {
    var raw = String(text || "").replace(/\r\n/g, "\n");
    var lines = raw.split(/\n+/);
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var protectedLine = line.replace(/(\d),(\d{3})/g, "$1§$2");
      var parts = protectedLine.split(/\s*,\s*|\s*،\s*/);
      for (var j = 0; j < parts.length; j++) {
        var p = parts[j].replace(/§/g, ",").trim();
        if (p) items.push(p);
      }
    }
    return items;
  }

  function cleanName(name) {
    var n = String(name || "").trim();
    n = n.replace(/^\+\s*/, "");
    n = n.replace(LEADING_VERBS, "");
    n = n.replace(/\s*(?:บาท|฿|บ\.)\s*$/, "");
    n = n.replace(/[\s\-–—:]+$/g, "");
    n = n.replace(/\s+/g, " ").trim();
    return n;
  }

  function normalizeName(name) {
    return cleanName(name).toLowerCase().replace(/\s+/g, " ");
  }

  function finishItem(raw, name, qty, unit, unitPrice, total, typeHint) {
    qty = parseNumber(qty);
    if (!isFinite(qty) || qty <= 0) qty = 1;
    if (total != null && total !== "") {
      total = parseNumber(total);
    } else {
      total = NaN;
    }
    if (unitPrice != null && unitPrice !== "") {
      unitPrice = parseNumber(unitPrice);
    } else {
      unitPrice = NaN;
    }
    if (isFinite(unitPrice) && !isFinite(total)) {
      total = roundMoney(qty * unitPrice);
    } else if (isFinite(total) && !isFinite(unitPrice)) {
      unitPrice = roundMoney(total / qty);
    }
    if (!isFinite(total) || !isFinite(unitPrice)) return null;
    var cleaned = cleanName(name);
    if (!cleaned) cleaned = "รายการ";
    return {
      raw: raw,
      name: cleaned,
      qty: qty,
      unit: unit || "",
      unitPrice: unitPrice,
      total: roundMoney(total),
      type: typeHint || (isIncomeText(raw) || isIncomeText(cleaned) ? "income" : "expense")
    };
  }

  function parseOne(raw) {
    var text = String(raw || "").trim();
    if (!text) return null;
    text = text.replace(CURRENCY_TAIL, "").trim();
    var typeHint = isIncomeText(text) ? "income" : "expense";

    var reUnitPrice = new RegExp(
      "^(.+?)\\s+" + NUM + "\\s+(?:(" + UNIT_RE + ")\\s+)?(?:(" + UNIT_RE + ")|หน่วย)?ละ\\s*" + NUM + "\\s*$"
    );
    var m = text.match(reUnitPrice);
    if (m) {
      var unitA = m[3] || m[4] || "";
      return finishItem(raw, m[1], m[2], unitA, m[5], null, typeHint);
    }

    // "กาแฟ 2x45" / "กาแฟ 2 × 45" / "กาแฟ 2*45"
    var reTimes = new RegExp("^(.+?)\\s+" + NUM + "\\s*[x×*]\\s*" + NUM + "\\s*$", "i");
    m = text.match(reTimes);
    if (m) {
      return finishItem(raw, m[1], m[2], "", m[3], null, typeHint);
    }

    // "เบอร์เกอร์ 2 ชิ้น รวม 199" / "เบอร์เกอร์ รวม 199"
    var reTotalWord = new RegExp(
      "^(.+?)(?:\\s+" + NUM + "\\s*(" + UNIT_RE + ")?)?\\s*(?:รวม|ทั้งหมด|เป็นเงิน|จ่าย)\\s*" + NUM + "\\s*$"
    );
    m = text.match(reTotalWord);
    if (m) {
      var qty = m[2] || "1";
      var unit = m[3] || "";
      return finishItem(raw, m[1], qty, unit, null, m[4], typeHint);
    }

    // "ซื้อน้ำ 3 ขวด 30" — last number is the amount paid (total)
    var reQtyUnitTotal = new RegExp(
      "^(.+?)\\s+" + NUM + "\\s+(" + UNIT_RE + ")\\s+" + NUM + "\\s*$"
    );
    m = text.match(reQtyUnitTotal);
    if (m) {
      return finishItem(raw, m[1], m[2], m[3], null, m[4], typeHint);
    }

    // "กาแฟ 2 แก้ว" without a price — not enough
    var reQtyOnly = new RegExp("^(.+?)\\s+" + NUM + "\\s+(" + UNIT_RE + ")\\s*$");
    if (reQtyOnly.test(text)) return null;

    // "ข้าวมันไก่ 50" / "เงินเดือน 25,000"
    var reNamePrice = new RegExp("^(.+?)\\s+" + NUM + "\\s*$");
    m = text.match(reNamePrice);
    if (m) {
      return finishItem(raw, m[1], 1, "", m[2], m[2], typeHint);
    }

    // "+3000" or "+ 3000"
    var rePlusOnly = new RegExp("^\\+\\s*" + NUM + "\\s*$");
    m = text.match(rePlusOnly);
    if (m) {
      return finishItem(raw, "รายรับ", 1, "", m[1], m[1], "income");
    }

    return null;
  }

  function parseItems(text) {
    var parts = splitItems(text);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var item = parseOne(parts[i]);
      if (item) out.push(item);
    }
    return out;
  }

  return {
    UNITS: UNITS,
    INCOME_KEYWORDS: INCOME_KEYWORDS,
    parseNumber: parseNumber,
    parseItems: parseItems,
    parseOne: parseOne,
    splitItems: splitItems,
    isIncomeText: isIncomeText,
    cleanName: cleanName,
    normalizeName: normalizeName,
    roundMoney: roundMoney
  };
});
