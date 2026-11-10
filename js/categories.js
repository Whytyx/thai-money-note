/* โน้ตเงิน — keyword category dictionary + remembered overrides */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.MoneyNoteCategories = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var CATEGORIES = [
    { id: "food", name: "อาหาร", essential: false, discretionary: false, color: "#C9842A" },
    { id: "drink", name: "เครื่องดื่ม", essential: false, discretionary: true, color: "#3B7EA1" },
    { id: "transport", name: "เดินทาง", essential: true, discretionary: false, color: "#4A6FA5" },
    { id: "shopping", name: "ช้อปปิ้ง", essential: false, discretionary: true, color: "#8B5E83" },
    { id: "household", name: "ของใช้", essential: false, discretionary: false, color: "#6B7C5E" },
    { id: "bills", name: "บิล", essential: true, discretionary: false, color: "#5C6B73" },
    { id: "health", name: "สุขภาพ", essential: true, discretionary: false, color: "#3D8B72" },
    { id: "fun", name: "บันเทิง", essential: false, discretionary: true, color: "#B56A4A" },
    { id: "other", name: "อื่นๆ", essential: false, discretionary: false, color: "#8A8178" }
  ];

  // Longer keywords are matched first so "ค่าน้ำ" is a bill, not a drink.
  var KEYWORDS = {
    bills: [
      "ค่าน้ำ", "ค่าไฟ", "ค่าเน็ต", "ค่าอินเทอร์เน็ต", "ค่าอินเตอร์เน็ต",
      "ค่าโทร", "ค่าบ้าน", "ค่าเช่า", "ค่าคอนโด", "ค่าส่วนกลาง",
      "อินเทอร์เน็ต", "internet", "wifi", "ไวไฟ",
      "การไฟฟ้า", "ประปา", "ค่าธรรมเนียม", "ค่างวด", "สินเชื่อ",
      "ค่าประกัน", "บิล", "ais", "dtac", "true online", "ทรูออนไลน์",
      "ค่ามือถือ", "ค่าโทรศัพท์"
    ],
    health: [
      "โรงพยาบาล", "รพ.", "คลินิก", "ตรวจสุขภาพ", "ประกันสุขภาพ",
      "วิตามิน", "ออกกำลัง", "ฟิตเนส", "ยิม", "gym", "fitness",
      "ทำฟัน", "ฟัน", "หมอ", "ยาพารา", "พาราเซตามอล", "ซื้อยา",
      "ค่ายา", "ยา", "หน้ากากอนามัย", "ค่าแพทย์"
    ],
    transport: [
      "ค่าน้ำมัน", "เติมน้ำมัน", "น้ำมันรถ", "เบนซิน", "ดีเซล", "แก๊สโซฮอล์",
      "bts", "mrt", "arl", "รถไฟฟ้า", "สกายเทรน", "แอร์พอร์ตลิงก์",
      "แท็กซี่", "taxi", "grab", "bolt", "วินมอไซค์", "วินมอเตอร์ไซค์",
      "มอเตอร์ไซค์รับจ้าง", "จอดรถ", "ค่าจอด", "ทางด่วน", "ค่าทางด่วน",
      "ค่ารถ", "รถเมล์", "รถตู้", "เครื่องบิน", "ตั๋วเครื่องบิน",
      "น้ำมัน", "รถไฟ", "เรือ", "ทางพิเศษ"
    ],
    drink: [
      "ชานมไข่มุก", "ชาไข่มุก", "บoba", "bubble tea",
      "กาแฟ", "coffee", "latte", "ลาเต้", "คาปูชิโน่", "คาปู", "อเมริกาโน่",
      "เอสเปรสโซ่", "มอคค่า", "matcha", "มัทฉะ", "ชาเขียว", "ชานม",
      "โกโก้", "น้ำปั่น", "สมูทตี้", "น้ำผลไม้", "น้ำส้ม", "น้ำอัดลม",
      "โค้ก", "เป๊ปซี่", "โซดา", "เครื่องดื่ม", "น้ำเปล่า", "ขวดน้ำ",
      "น้ำดื่ม", "ชา", "นม", "ซื้อน้ำ", "เบียร์", "เหล้า", "ไวน์"
    ],
    food: [
      "ข้าวมันไก่", "ข้าวขาหมู", "ข้าวหมูแดง", "ข้าวผัด", "ข้าวกล่อง",
      "กะเพรา", "กระเพรา", "ก๋วยเตี๋ยว", "ผัดไทย", "ส้มตำ", "ต้มยำ",
      "ราดหน้า", "ขนมจีน", "โจ๊ก", "ข้าวต้ม", "หมูกระทะ", "ชาบู",
      "บุฟเฟต์", "อาหารตามสั่ง", "สั่งอาหาร", "เดลิเวอรี่", "เดลิเวอรี",
      "delivery", "grab food", "lineman", "grabfood",
      "พิซซ่า", "pizza", "เบอร์เกอร์", "burger", "ซูชิ", "ติ่มซำ",
      "ปอเปี๊ยะ", "เบนโตะ", "สเต็ก", "มาม่า", "บะหมี่", "ขนมปัง",
      "อาหารเช้า", "อาหารเที่ยง", "อาหารเย็น", "อาหาร", "ข้าว",
      "ยำ", "ลาบ", "ไก่ทอด", "ขาหมู", "หมูกรอบ", "ผัดกะเพรา",
      "ป๊อปคอร์น", "popcorn", "ขนม", "ของว่าง", "กิน"
    ],
    shopping: [
      "ช้อปปิ้ง", "ชอปปิ้ง", "shopping", "เสื้อผ้า", "เสื้อยืด", "เสื้อ",
      "กางเกง", "รองเท้า", "กระเป๋า", "หมวก", "แว่นตา", "แว่น",
      "lazada", "shopee", "ห้าง", "ชุด", "เครื่องสำอาง", "ครีม"
    ],
    household: [
      "ของใช้ในบ้าน", "ของใช้", "ยาสีฟัน", "แชมพู", "ผ้าอ้อม", "ทิชชู่",
      "ทิชชู", "ถุงขยะ", "น้ำยา", "น้ำยาล้างจาน", "สบู่", "หลอดไฟ",
      "ถ่าน", "ซูเปอร์มาเก็ต", "ซุปเปอร์", "เซเว่น", "7-11", "7eleven",
      "บิ๊กซี", "big c", "lotus", "โลตัส", "แม็คโคร", "makro",
      "ครัวเรือน", "น้ำยาปรับผ้านุ่ม"
    ],
    fun: [
      "เน็ตฟลิกซ์", "netflix", "youtube premium", "spotify", "คอนเสิร์ต",
      "ภาพยนตร์", "ตั๋วหนัง", "หนัง", "คาราโอเกะ", "karaoke",
      "ร้านเหล้า", "บาร์", "steam", "เกม", "game", "เที่ยว", "ท่องเที่ยว",
      "สวนสนุก", "ธีมปาร์ค"
    ]
  };

  var SORTED_RULES = [];
  Object.keys(KEYWORDS).forEach(function (id) {
    KEYWORDS[id].forEach(function (kw) {
      SORTED_RULES.push({ id: id, kw: kw.toLowerCase(), len: kw.length });
    });
  });
  SORTED_RULES.sort(function (a, b) { return b.len - a.len; });

  function getCategory(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function guessCategory(name, raw) {
    var hay = ((name || "") + " " + (raw || "")).toLowerCase();
    for (var i = 0; i < SORTED_RULES.length; i++) {
      if (hay.indexOf(SORTED_RULES[i].kw) !== -1) {
        return SORTED_RULES[i].id;
      }
    }
    // bare "น้ำ" as a drink, after bills like "ค่าน้ำ" already had a chance
    if (/(^|[\s])น้ำ([\s]|$)/.test(hay) || hay === "น้ำ") return "drink";
    return "other";
  }

  function assignCategory(item, overrides) {
    var key = (root.MoneyNoteParser || require("./parser")).normalizeName(item.name);
    if (overrides && overrides[key]) return overrides[key];
    return guessCategory(item.name, item.raw);
  }

  return {
    CATEGORIES: CATEGORIES,
    KEYWORDS: KEYWORDS,
    getCategory: getCategory,
    guessCategory: guessCategory,
    assignCategory: assignCategory
  };
});
