(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ThaiLetters = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const groups = {
    k: { label: "k", hint: "Unaspirated k. No puff of air." },
    kh: { label: "kh", hint: "Aspirated k. A puff of air. Every letter in this group is the same sound." },
    ng: { label: "ng", hint: "ng, as at the end of sing, here at the start of the syllable." },
    c: { label: "ch", hint: "Unaspirated ch. No puff, and not a voiced English j." },
    ch: { label: "chʰ", hint: "Aspirated ch. A puff of air." },
    s: { label: "s", hint: "s, as in see. High-class s and low-class s are the same sound." },
    y: { label: "y", hint: "y, as in yes." },
    d: { label: "d", hint: "Voiced d, as in day." },
    t: { label: "t", hint: "Unaspirated t. Voice off, no puff." },
    th: { label: "th", hint: "Aspirated t. A puff of air. Not the th in English think." },
    n: { label: "n", hint: "n, as in no." },
    b: { label: "b", hint: "Voiced b, as in boy." },
    p: { label: "p", hint: "Unaspirated p. Voice off, no puff." },
    ph: { label: "ph", hint: "Aspirated p. A puff of air. This ph is not the f in phone." },
    f: { label: "f", hint: "f, as in fan." },
    m: { label: "m", hint: "m, as in me." },
    r: { label: "r", hint: "A quick tap of the tongue. Not an English r, and not l." },
    l: { label: "l", hint: "l, as in love." },
    w: { label: "w", hint: "w, as in we." },
    h: { label: "h", hint: "h, as in he." },
    q: { label: "’", hint: "A catch in the throat. อ is also the support for a vowel that needs a written consonant." }
  };

  const letters = [
    { g: "ก", name: "ก ไก่", cls: "mid", group: "k", gloss: "chicken" },
    { g: "ข", name: "ข ไข่", cls: "high", group: "kh", gloss: "egg" },
    { g: "ฃ", name: "ฃ ขวด", cls: "high", group: "kh", gloss: "bottle", badge: "obsolete", note: "Obsolete. The word ขวด, bottle, is written with ข now." },
    { g: "ค", name: "ค ควาย", cls: "low", group: "kh", gloss: "buffalo" },
    { g: "ฅ", name: "ฅ คน", cls: "low", group: "kh", gloss: "person", badge: "obsolete", note: "Obsolete. The word คน, person, is written with ค now." },
    { g: "ฆ", name: "ฆ ระฆัง", cls: "low", group: "kh", gloss: "bell", badge: "learned", note: "Uncommon as a first letter. The memory word is ระฆัง, a bell." },
    { g: "ง", name: "ง งู", cls: "low", group: "ng", gloss: "snake" },
    { g: "จ", name: "จ จาน", cls: "mid", group: "c", gloss: "plate" },
    { g: "ฉ", name: "ฉ ฉิ่ง", cls: "high", group: "ch", gloss: "cymbals" },
    { g: "ช", name: "ช ช้าง", cls: "low", group: "ch", gloss: "elephant" },
    { g: "ซ", name: "ซ โซ่", cls: "low", group: "s", gloss: "chain" },
    { g: "ฌ", name: "ฌ เฌอ", cls: "low", group: "ch", gloss: "tree", badge: "learned", note: "Rare in everyday words. Same aspirated ch as ช." },
    { g: "ญ", name: "ญ หญิง", cls: "low", group: "y", gloss: "woman", note: "The name หญิง writes a silent ห in front, so the name follows high-class tone rules. ญ itself is low class. As a first sound it matches ย. As a last sound it is pronounced n." },
    { g: "ฎ", name: "ฎ ชฎา", cls: "mid", group: "d", gloss: "headdress", badge: "learned", note: "Same voiced d as ด. The memory word is ชฎา, a headdress." },
    { g: "ฏ", name: "ฏ ปฏัก", cls: "mid", group: "t", gloss: "goad", badge: "learned", note: "Same unaspirated t as ต. The memory word is ปฏัก, a goad." },
    { g: "ฐ", name: "ฐ ฐาน", cls: "high", group: "th", gloss: "base", badge: "learned", note: "Same aspirated t as ถ. Mostly in learned words." },
    { g: "ฑ", name: "ฑ มณโฑ", cls: "low", group: "th", gloss: "Montho", badge: "learned", note: "Same aspirated t as ท. The memory name is มณโฑ." },
    { g: "ฒ", name: "ฒ ผู้เฒ่า", cls: "low", group: "th", gloss: "elder", badge: "learned", note: "Same aspirated t as ท. The memory word is ผู้เฒ่า, an elder." },
    { g: "ณ", name: "ณ เณร", cls: "low", group: "n", gloss: "novice monk", badge: "learned", note: "Same n as น. Common in formal and Pali-Sanskrit words." },
    { g: "ด", name: "ด เด็ก", cls: "mid", group: "d", gloss: "child" },
    { g: "ต", name: "ต เต่า", cls: "mid", group: "t", gloss: "turtle" },
    { g: "ถ", name: "ถ ถุง", cls: "high", group: "th", gloss: "bag" },
    { g: "ท", name: "ท ทหาร", cls: "low", group: "th", gloss: "soldier" },
    { g: "ธ", name: "ธ ธง", cls: "low", group: "th", gloss: "flag" },
    { g: "น", name: "น หนู", cls: "low", group: "n", gloss: "mouse", note: "The name หนู writes a silent ห in front, so หนู rises. น itself is low class. Bare น in นา, a rice field, is a long live syllable and takes the mid tone." },
    { g: "บ", name: "บ ใบไม้", cls: "mid", group: "b", gloss: "leaf" },
    { g: "ป", name: "ป ปลา", cls: "mid", group: "p", gloss: "fish" },
    { g: "ผ", name: "ผ ผึ้ง", cls: "high", group: "ph", gloss: "bee" },
    { g: "ฝ", name: "ฝ ฝา", cls: "high", group: "f", gloss: "lid" },
    { g: "พ", name: "พ พาน", cls: "low", group: "ph", gloss: "ceremonial tray" },
    { g: "ฟ", name: "ฟ ฟัน", cls: "low", group: "f", gloss: "tooth" },
    { g: "ภ", name: "ภ สำเภา", cls: "low", group: "ph", gloss: "junk boat", badge: "learned", note: "Same aspirated p as พ. The memory word is สำเภา, a junk." },
    { g: "ม", name: "ม ม้า", cls: "low", group: "m", gloss: "horse" },
    { g: "ย", name: "ย ยักษ์", cls: "low", group: "y", gloss: "giant" },
    { g: "ร", name: "ร เรือ", cls: "low", group: "r", gloss: "boat" },
    { g: "ล", name: "ล ลิง", cls: "low", group: "l", gloss: "monkey" },
    { g: "ว", name: "ว แหวน", cls: "low", group: "w", gloss: "ring", note: "The name แหวน writes a silent ห in front, so แหวน rises. ว itself is low class. Bare ว in วาง, to place, is mid." },
    { g: "ศ", name: "ศ ศาลา", cls: "high", group: "s", gloss: "pavilion", badge: "learned", note: "Same s as ส. Common in learned words such as ศึกษา." },
    { g: "ษ", name: "ษ ฤๅษี", cls: "high", group: "s", gloss: "hermit", badge: "learned", note: "Same s as ส. The memory word is ฤๅษี, a hermit." },
    { g: "ส", name: "ส เสือ", cls: "high", group: "s", gloss: "tiger" },
    { g: "ห", name: "ห หีบ", cls: "high", group: "h", gloss: "chest", note: "High-class h. A silent ห in front of ง ญ น ม ย ร ล ว makes that syllable follow high-class tone rules. หนู, หญิง, and แหวน are the memory words that do this." },
    { g: "ฬ", name: "ฬ จุฬา", cls: "low", group: "l", gloss: "kite", badge: "learned", note: "Same l as ล. Rare outside names and a few words such as กีฬา." },
    { g: "อ", name: "อ อ่าง", cls: "mid", group: "q", gloss: "basin" },
    { g: "ฮ", name: "ฮ นกฮูก", cls: "low", group: "h", gloss: "owl" }
  ];

  letters.forEach(function (letter) {
    letter.sound = groups[letter.group].label;
    letter.hint = groups[letter.group].hint;
  });

  return { letters: letters, groups: groups };
});
