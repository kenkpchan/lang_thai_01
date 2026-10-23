const Thai = require("./thai.js");

const spelling = [
  ["ก", "aa", "", "none", "กา"],
  ["ก", "ai", "", "ek", "ไก่"],
  ["ก", "ao", "", "ek", "เก่า"],
  ["ด", "ai", "", "tho", "ได้"],
  ["ด", "ii", "", "none", "ดี"],
  ["ด", "uu", "", "none", "ดู"],
  ["ต", "o-short", "", "tri", "โต๊ะ"],
  ["ต", "ak", "ว", "cattawa", "ตั๋ว"],
  ["ต", "aw", "ง", "tho", "ต้อง"],
  ["ป", "aa", "", "tho", "ป้า"],
  ["บ", "aa", "น", "tho", "บ้าน"],
  ["น", "am", "", "tho", "น้ำ"],
  ["ม", "aa", "", "tho", "ม้า"],
  ["ม", "aa", "ก", "none", "มาก"],
  ["ม", "uue", "", "none", "มือ"],
  ["ม", "aa", "", "none", "มา"],
  ["ข", "aa", "ว", "tho", "ข้าว"],
  ["ข", "aa", "ว", "none", "ขาว"],
  ["ข", "aa", "", "none", "ขา"],
  ["ก", "i", "น", "none", "กิน"],
  ["ก", "ak", "บ", "none", "กับ"],
  ["ร", "ak", "ก", "none", "รัก"],
  ["ป", "aa", "ก", "none", "ปาก"],
  ["ป", "oei", "ด", "none", "เปิด"],
  ["ด", "oei", "น", "none", "เดิน"],
  ["ด", "e-short", "ก", "none", "เด็ก"],
  ["ร", "uea", "", "none", "เรือ"],
  ["ส", "uea", "", "none", "เสือ"],
  ["ล", "uea", "ก", "none", "เลือก"],
  ["บ", "aw", "ก", "none", "บอก"],
  ["ป", "ai", "", "none", "ไป"],
  ["ส", "ai2", "", "ek", "ใส่"],
  ["ม", "ae", "", "ek", "แม่"],
  ["น", "aa", "", "none", "นา"],
  ["จ", "a", "", "none", "จะ"],
  ["อ", "aa", "ง", "ek", "อ่าง"],
  ["ผ", "aa", "", "tho", "ผ้า"],
  ["ป", "aa", "", "ek", "ป่า"],
  ["พ", "aa", "", "none", "พา"],
  ["ม", "ai", "", "ek", "ไม่"],
  ["ม", "ai", "", "tho", "ไม้"],
  ["ห", "ai2", "", "tho", "ให้"],
  ["น", "ai2", "", "none", "ใน"],
  ["ช", "aa", "", "tho", "ช้า"],
  ["ล", "i", "ง", "none", "ลิง"],
  ["ง", "uu", "", "none", "งู"],
  ["ท", "ii", "", "ek", "ที่"],
  ["น", "ii", "", "tho", "นี้"],
  ["น", "ak", "น", "tho", "นั้น"],
  ["ว", "i", "ง", "ek", "วิ่ง"],
  ["ท", "u", "ง", "ek", "ทุ่ง"],
  ["ต", "uu", "", "tho", "ตู้"],
  ["ร", "e-short", "ว", "none", "เร็ว"],
  ["ล", "oei", "ก", "none", "เลิก"],
  ["ม", "uue", "ด", "none", "มืด"]
];

let failed = 0;
spelling.forEach(function (row) {
  const got = Thai.compose(row[0], row[1], row[2], row[3]).text;
  if (got !== row[4]) {
    failed += 1;
    console.log("SPELL", row[4], "got", got, [...got].map((c) => c.codePointAt(0).toString(16)).join(" "), "want", [...row[4]].map((c) => c.codePointAt(0).toString(16)).join(" "));
  }
});

const tones = [
  ["mid", "ก", "aa", "", "none", "mid"],
  ["mid", "ก", "a", "", "none", "low"],
  ["mid", "ป", "aa", "ก", "none", "low"],
  ["mid", "ก", "ai", "", "ek", "low"],
  ["mid", "ด", "ai", "", "tho", "falling"],
  ["mid", "ต", "o-short", "", "tri", "high"],
  ["mid", "ต", "ak", "ว", "cattawa", "rising"],
  ["mid", "ต", "aw", "ง", "tho", "falling"],
  ["high", "ข", "aa", "", "none", "rising"],
  ["high", "ข", "aa", "ว", "tho", "falling"],
  ["high", "ส", "ai2", "", "ek", "low"],
  ["low", "ม", "aa", "", "none", "mid"],
  ["low", "ร", "ak", "ก", "none", "high"],
  ["low", "ม", "aa", "ก", "none", "falling"],
  ["low", "ม", "ae", "", "ek", "falling"],
  ["low", "ม", "aa", "", "tho", "high"],
  ["low", "น", "am", "", "tho", "high"],
  ["low", "ล", "i", "ง", "none", "mid"],
  ["mid", "ก", "i", "น", "none", "mid"],
  ["low", "ช", "aa", "", "tho", "high"],
  ["low", "ค", "aa", "", "tri", null],
  ["low", "ล", "uea", "ก", "none", "falling"],
  ["mid", "ป", "oei", "ด", "none", "low"],
  ["mid", "ด", "oei", "น", "none", "mid"],
  ["mid", "ด", "e-short", "ก", "none", "low"],
  ["high", "ส", "uea", "", "none", "rising"],
  ["low", "ร", "uea", "", "none", "mid"],
  ["low", "ม", "ai", "", "ek", "falling"],
  ["low", "ม", "ai", "", "tho", "high"],
  ["high", "ห", "ai2", "", "tho", "falling"],
  ["low", "น", "ai2", "", "none", "mid"],
  ["low", "ร", "e-short", "ว", "none", "mid"],
  ["low", "ล", "oei", "ก", "none", "high"],
  ["mid", "ป", "oei", "ด", "none", "low"],
  ["low", "ม", "uue", "ด", "none", "falling"]
];

tones.forEach(function (row) {
  const got = Thai.judge(row[0], row[1], row[2], row[3], row[4]).tone;
  if (got !== row[5]) {
    failed += 1;
    console.log("TONE", row.join(" "), "got", got);
  }
});

const letters = require("./letters.js").letters;
if (letters.length !== 44) {
  failed += 1;
  console.log("COUNT", letters.length);
}
const counts = { mid: 0, high: 0, low: 0 };
letters.forEach(function (letter) { counts[letter.cls] += 1; });
if (counts.mid !== 9 || counts.high !== 11 || counts.low !== 24) {
  failed += 1;
  console.log("CLASS", counts);
}

const romans = [
  ["ก", "aa", "", "none", "mid", "gaa"],
  ["ก", "ai", "", "ek", "mid", "gài"],
  ["น", "am", "", "tho", "low", "náam"],
  ["ม", "aa", "", "tho", "low", "máa"],
  ["ป", "aa", "", "tho", "mid", "bpâa"],
  ["ข", "aa", "ว", "tho", "high", "khâao"],
  ["ข", "aa", "ว", "none", "high", "khǎao"],
  ["ม", "aa", "", "none", "low", "maa"],
  ["ป", "ai", "", "none", "mid", "bpai"],
  ["ม", "ae", "", "ek", "low", "mâe"],
  ["ม", "ai", "", "ek", "low", "mâi"],
  ["ม", "ai", "", "tho", "low", "mái"],
  ["ร", "ak", "ก", "none", "low", "rák"],
  ["ม", "aa", "ก", "none", "low", "mâak"],
  ["จ", "a", "", "none", "mid", "jà"],
  ["ด", "e-short", "ก", "none", "mid", "dèk"],
  ["ต", "o-short", "", "tri", "mid", "dtó"],
  ["ต", "aw", "ง", "tho", "mid", "dtâwng"],
  ["ต", "ak", "ว", "cattawa", "mid", "dtǔa"],
  ["บ", "aa", "น", "tho", "mid", "bâan"],
  ["บ", "aw", "ก", "none", "mid", "bàwk"],
  ["ส", "uea", "", "none", "high", "sǔea"],
  ["ร", "uea", "", "none", "low", "ruea"],
  ["ร", "e-short", "ว", "none", "low", "reo"],
  ["ล", "uea", "ก", "none", "low", "lûeak"],
  ["ง", "uu", "", "none", "low", "nguu"],
  ["อ", "aa", "ง", "ek", "mid", "àang"],
  ["ท", "ii", "", "ek", "low", "thîi"],
  ["น", "ii", "", "tho", "low", "níi"],
  ["ม", "uue", "", "none", "low", "mue"],
  ["ก", "ao", "", "ek", "mid", "gào"],
  ["ป", "aa", "ก", "none", "mid", "bpàak"],
  ["ด", "oei", "น", "none", "mid", "doen"]
];
romans.forEach(function (row) {
  const judged = Thai.judge(row[4], row[0], row[1], row[2], row[3]);
  const got = Thai.romanize(row[0], row[1], judged.final, judged.tone);
  if (got !== row[5]) {
    failed += 1;
    console.log("ROMAN", row[5], "got", got, "tone", judged.tone);
  }
});

console.log(failed ? "FAILED " + failed : "OK " + spelling.length + " spellings, " + tones.length + " tones, " + romans.length + " romans, " + letters.length + " letters");
process.exit(failed ? 1 : 0);
