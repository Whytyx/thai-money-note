#!/usr/bin/env node
var parser = require("../js/parser");
var cats = require("../js/categories");

function approx(a, b) {
  return Math.abs(a - b) < 0.009;
}

var cases = [
  {
    title: "ข้าวมันไก่ 50",
    input: "ข้าวมันไก่ 50",
    expect: { count: 1, name: "ข้าวมันไก่", qty: 1, unitPrice: 50, total: 50, type: "expense", category: "food" }
  },
  {
    title: "กาแฟ 2 แก้ว แก้วละ 45",
    input: "กาแฟ 2 แก้ว แก้วละ 45",
    expect: { count: 1, name: "กาแฟ", qty: 2, unit: "แก้ว", unitPrice: 45, total: 90, type: "expense", category: "drink" }
  },
  {
    title: "ซื้อน้ำ 3 ขวด 30 (total, not unit price)",
    input: "ซื้อน้ำ 3 ขวด 30",
    expect: { count: 1, name: "น้ำ", qty: 3, unit: "ขวด", unitPrice: 10, total: 30, type: "expense", category: "drink" }
  },
  {
    title: "เงินเดือน 25000",
    input: "เงินเดือน 25000",
    expect: { count: 1, name: "เงินเดือน", qty: 1, total: 25000, type: "income" }
  },
  {
    title: "ค่าน้ำมัน 500",
    input: "ค่าน้ำมัน 500",
    expect: { count: 1, name: "ค่าน้ำมัน", total: 500, type: "expense", category: "transport" }
  },
  {
    title: "หลายรายการคั่นด้วยจุลภาค",
    input: "กาแฟ 2 แก้ว แก้วละ 45, ขนมปัง 25",
    expect: { count: 2, names: ["กาแฟ", "ขนมปัง"], totals: [90, 25] }
  },
  {
    title: "โบนัส 5000 เป็นรายรับ",
    input: "โบนัส 5000",
    expect: { count: 1, total: 5000, type: "income" }
  },
  {
    title: "ได้เงิน 1200 เป็นรายรับ",
    input: "ได้เงิน 1200",
    expect: { count: 1, total: 1200, type: "income" }
  },
  {
    title: "ขายได้ 800 เป็นรายรับ",
    input: "ขายได้ 800",
    expect: { count: 1, total: 800, type: "income" }
  },
  {
    title: "รายรับ 3000",
    input: "รายรับ 3000",
    expect: { count: 1, total: 3000, type: "income" }
  },
  {
    title: "ค่าเน็ต 599 เป็นบิล",
    input: "ค่าเน็ต 599",
    expect: { count: 1, total: 599, type: "expense", category: "bills" }
  },
  {
    title: "ซื้อยา 120 เป็นสุขภาพ",
    input: "ซื้อยา 120",
    expect: { count: 1, name: "ยา", total: 120, type: "expense", category: "health" }
  },
  {
    title: "ตั๋วหนัง 160 เป็นบันเทิง",
    input: "ตั๋วหนัง 160",
    expect: { count: 1, total: 160, type: "expense", category: "fun" }
  },
  {
    title: "เสื้อ 790 เป็นช้อปปิ้ง",
    input: "เสื้อ 790",
    expect: { count: 1, name: "เสื้อ", total: 790, type: "expense", category: "shopping" }
  },
  {
    title: "เบอร์เกอร์ 2 ชิ้น รวม 199",
    input: "เบอร์เกอร์ 2 ชิ้น รวม 199",
    expect: { count: 1, name: "เบอร์เกอร์", qty: 2, unit: "ชิ้น", total: 199, unitPrice: 99.5, type: "expense", category: "food" }
  },
  {
    title: "เงินเดือน 25,000 (มีจุลภาคในตัวเลข)",
    input: "เงินเดือน 25,000",
    expect: { count: 1, total: 25000, type: "income" }
  },
  {
    title: "ชาเขียว 65 บาท",
    input: "ชาเขียว 65 บาท",
    expect: { count: 1, name: "ชาเขียว", total: 65, type: "expense", category: "drink" }
  },
  {
    title: "น้ำ 3 ขวดละ 10",
    input: "น้ำ 3 ขวดละ 10",
    expect: { count: 1, name: "น้ำ", qty: 3, unit: "ขวด", unitPrice: 10, total: 30, type: "expense", category: "drink" }
  },
  {
    title: "+1500 เป็นรายรับ",
    input: "+1500",
    expect: { count: 1, total: 1500, type: "income" }
  },
  {
    title: "หลายบรรทัด",
    input: "ข้าวผัด 60\nBTS 46",
    expect: { count: 2, names: ["ข้าวผัด", "BTS"], totals: [60, 46], categories: ["food", "transport"] }
  }
];

var failed = 0;
var passed = 0;
var details = [];

cases.forEach(function (tc) {
  var got = parser.parseItems(tc.input);
  var e = tc.expect;
  var errors = [];
  if (e.count != null && got.length !== e.count) {
    errors.push("count: got " + got.length + ", want " + e.count);
  }
  var first = got[0] || {};
  if (e.name != null && first.name !== e.name) errors.push("name: got " + first.name + ", want " + e.name);
  if (e.qty != null && !approx(first.qty, e.qty)) errors.push("qty: got " + first.qty + ", want " + e.qty);
  if (e.unit != null && first.unit !== e.unit) errors.push("unit: got " + first.unit + ", want " + e.unit);
  if (e.unitPrice != null && !approx(first.unitPrice, e.unitPrice)) errors.push("unitPrice: got " + first.unitPrice + ", want " + e.unitPrice);
  if (e.total != null && !approx(first.total, e.total)) errors.push("total: got " + first.total + ", want " + e.total);
  if (e.type != null && first.type !== e.type) errors.push("type: got " + first.type + ", want " + e.type);
  if (e.category != null) {
    var cat = cats.assignCategory(first, {});
    if (cat !== e.category) errors.push("category: got " + cat + ", want " + e.category);
  }
  if (e.names) {
    var names = got.map(function (x) { return x.name; });
    if (names.join("|") !== e.names.join("|")) errors.push("names: got " + names.join(", ") + ", want " + e.names.join(", "));
  }
  if (e.totals) {
    e.totals.forEach(function (t, i) {
      if (!got[i] || !approx(got[i].total, t)) errors.push("totals[" + i + "]: got " + (got[i] && got[i].total) + ", want " + t);
    });
  }
  if (e.categories) {
    e.categories.forEach(function (c, i) {
      var gotC = got[i] && cats.assignCategory(got[i], {});
      if (gotC !== c) errors.push("categories[" + i + "]: got " + gotC + ", want " + c);
    });
  }
  if (errors.length) {
    failed++;
    details.push("FAIL  " + tc.title + "\n      " + errors.join("\n      "));
  } else {
    passed++;
    details.push("PASS  " + tc.title);
  }
});

console.log(details.join("\n"));
console.log("\n" + passed + " passed, " + failed + " failed, " + cases.length + " total");
process.exit(failed ? 1 : 0);
