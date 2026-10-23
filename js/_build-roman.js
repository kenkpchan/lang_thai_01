const fs = require("fs");
const vm = require("vm");
const sandbox = { module: { exports: {} }, exports: {}, globalThis: {} };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
function load(file) {
  sandbox.module.exports = {};
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox.module.exports;
}
const Letters = load("js/letters.js");
const Thai = load("js/thai.js");
sandbox.window = sandbox;
load("js/tnc-1000.js");
const words = sandbox.TNC1000.map(function (row) { return row[0]; });

const ONSET = {
  "ก": "g", "ข": "kh", "ฃ": "kh", "ค": "kh", "ฅ": "kh", "ฆ": "kh", "ง": "ng",
  "จ": "j", "ฉ": "ch", "ช": "ch", "ซ": "s", "ฌ": "ch", "ญ": "y",
  "ฎ": "d", "ฏ": "dt", "ฐ": "th", "ฑ": "th", "ฒ": "th", "ณ": "n",
  "ด": "d", "ต": "dt", "ถ": "th", "ท": "th", "ธ": "th", "น": "n",
  "บ": "b", "ป": "bp", "ผ": "ph", "ฝ": "f", "พ": "ph", "ฟ": "f", "ภ": "ph",
  "ม": "m", "ย": "y", "ร": "r", "ล": "l", "ว": "w",
  "ศ": "s", "ษ": "s", "ส": "s", "ห": "h", "ฬ": "l", "อ": "", "ฮ": "h"
};
const FINAL_SOUND = {
  "ก": ["k", false], "ข": ["k", false], "ค": ["k", false], "ฆ": ["k", false],
  "จ": ["t", false], "ช": ["t", false], "ซ": ["t", false], "ฎ": ["t", false], "ฏ": ["t", false],
  "ฐ": ["t", false], "ฑ": ["t", false], "ฒ": ["t", false], "ด": ["t", false], "ต": ["t", false],
  "ถ": ["t", false], "ท": ["t", false], "ธ": ["t", false], "ศ": ["t", false], "ษ": ["t", false], "ส": ["t", false],
  "บ": ["p", false], "ป": ["p", false], "พ": ["p", false], "ฟ": ["p", false], "ภ": ["p", false],
  "น": ["n", true], "ณ": ["n", true], "ร": ["n", true], "ล": ["n", true], "ฬ": ["n", true], "ญ": ["n", true],
  "ม": ["m", true], "ง": ["ng", true], "ย": ["y", true], "ว": ["w", true]
};
const CANON = { k: "ก", t: "ด", p: "บ", n: "น", m: "ม", ng: "ง", y: "ย", w: "ว" };
const CLUSTERS = {
  "ก": "รลว", "ข": "รลว", "ค": "รลว", "ฆ": "รลว",
  "ต": "ร", "ถ": "ร", "ท": "ร", "ธ": "ร", "ด": "ร",
  "ป": "รล", "พ": "รล", "ฟ": "รล", "ผ": "รล", "ภ": "รล", "บ": "รล"
};
const LEAD = "เแโไใ";
const TONE_CH = { none: "", ek: "\u0E48", tho: "\u0E49", tri: "\u0E4A", cattawa: "\u0E4B" };
const MARKS = ["none", "ek", "tho", "tri", "cattawa"];
const byGlyph = {};
Letters.letters.forEach(function (l) { byGlyph[l.g] = l; });

function applyTone(body, tone) {
  if (!tone || tone === "mid") return body;
  const map = {
    low: { a: "à", e: "è", i: "ì", o: "ò", u: "ù" },
    falling: { a: "â", e: "ê", i: "î", o: "ô", u: "û" },
    high: { a: "á", e: "é", i: "í", o: "ó", u: "ú" },
    rising: { a: "ǎ", e: "ě", i: "ǐ", o: "ǒ", u: "ǔ" }
  }[tone];
  for (let i = 0; i < body.length; i++) {
    if (map[body[i]]) return body.slice(0, i) + map[body[i]] + body.slice(i + 1);
  }
  return body;
}
function codaOf(sound) {
  if (sound === "w") return "o";
  return sound || "";
}
function romanParts(cons, body, sound, tone) {
  return ONSET[cons] + applyTone(body, tone) + codaOf(sound);
}
function insertAtOnset(text, ch) {
  const chars = [...text];
  let i = LEAD.indexOf(chars[0]) >= 0 ? 1 : 0;
  chars.splice(i, 0, ch);
  return chars.join("");
}
function insertCluster(text, cl) {
  const chars = [...text];
  let i = LEAD.indexOf(chars[0]) >= 0 ? 1 : 0;
  chars.splice(i + 1, 0, cl);
  return chars.join("");
}

const dict = {};
const shapeOf = {};
let collisionCount = 0;
function add(text, roman, shape) {
  if (!text || !roman) return;
  if (dict[text] && dict[text] !== roman) collisionCount += 1;
  else if (!dict[text]) {
    dict[text] = roman;
    if (shape) shapeOf[text] = shape;
  }
}
function force(text, roman, shape) {
  if (!text || !roman) return;
  dict[text] = roman;
  if (shape) shapeOf[text] = shape;
}

function addSpelled(v, cons, mark, realFinal) {
  const letter = byGlyph[cons];
  if (!letter) return;
  const sound = realFinal ? FINAL_SOUND[realFinal] : null;
  if (realFinal && !sound) return;
  const liveFinal = sound ? sound[1] : false;
  const canon = sound ? CANON[sound[0]] : "";
  let judged;
  if (Thai.vowelById(v.id)) {
    judged = Thai.judge(letter.cls, cons, v.id, canon, mark);
    if (!judged.tone) return;
    let text = judged.text;
    if (realFinal && judged.final) text = [...text].slice(0, -1).join("") + realFinal;
    if (v.keepY && text.slice(-1) !== "ย") text += "ย";
    add(text, Thai.romanize(cons, v.id, judged.final, judged.tone), {
      cons: cons, vowelId: v.id, final: judged.final || "", live: judged.live, long: judged.long, mark: mark
    });
    return;
  }
  if (v.blocksFinal && realFinal) return;
  if (v.needsFinal && !realFinal) return;
  const infoLive = v.liveForce || !realFinal ? !!v.long || !!v.liveForce : liveFinal;
  const infoLong = v.long;
  const live = v.liveForce || (!realFinal ? !!v.long : liveFinal);
  const tone = Thai.toneOf(letter.cls, live, realFinal ? infoLong : !!v.long, mark);
  if (!tone) return;
  const toneCh = TONE_CH[mark];
  let text = v.pre || "";
  text += cons;
  const post = v.post || "";
  if (v.up || v.lo) text += (v.up || "") + (v.lo || "") + toneCh + post;
  else text += toneCh + post;
  if (realFinal && !v.blocksFinal) text += realFinal;
  if (v.keepY && text.slice(-1) !== "ย") text += "ย";
  add(text, romanParts(cons, v.body, sound ? sound[0] : "", tone), {
    cons: cons, body: v.body, sound: sound ? sound[0] : "", live: live, long: realFinal ? !!v.long : !!v.long, mark: mark
  });
}

const extras = [
  { id: "ae-short", pre: "แ", post: "ะ", long: false, blocksFinal: true, body: "ae" },
  { id: "e-open", pre: "เ", post: "ะ", long: false, blocksFinal: true, body: "e" },
  { id: "o-ao", pre: "เ", post: "าะ", long: false, blocksFinal: true, body: "o" },
  { id: "ia", pre: "เ", up: "\u0E35", post: "ย", long: true, body: "ia" },
  { id: "ua", up: "\u0E31", post: "ว", long: true, body: "ua" },
  { id: "uai", post: "วย", liveForce: true, long: true, body: "uai" },
  { id: "oei-y", pre: "เ", post: "ย", liveForce: true, long: true, body: "oei" },
  { id: "ai-y", pre: "ไ", liveForce: true, long: true, body: "ai", keepY: true },
  { id: "ai2-y", pre: "ใ", liveForce: true, long: true, body: "ai", keepY: true }
];
const vowels = Thai.VOWELS.concat(extras);
const finals = [""].concat(Object.keys(FINAL_SOUND));

Letters.letters.forEach(function (letter) {
  vowels.forEach(function (v) {
    finals.forEach(function (fin) {
      MARKS.forEach(function (mark) {
        addSpelled(v, letter.g, mark, fin);
      });
    });
  });
});

// Clusters on spellings that already have a written vowel, and later on inherent vowels.
function applyClusters(only) {
  Object.keys(dict).forEach(function (text) {
    const chars = [...text];
    const i = LEAD.indexOf(chars[0]) >= 0 ? 1 : 0;
    const cons = chars[i];
    const allowed = CLUSTERS[cons];
    if (!allowed) return;
    const roman = dict[text];
    const onset = ONSET[cons];
    if (!onset || roman.indexOf(onset) !== 0) return;
    if (allowed.indexOf(chars[i + 1]) >= 0) return;
    [...allowed].forEach(function (cl) {
      if (only && only.indexOf(cl) < 0) return;
      const next = chars[i + 1];
      if (next === cl) return;
      add(insertCluster(text, cl), onset + { "ร": "r", "ล": "l", "ว": "w" }[cl] + roman.slice(onset.length));
    });
  });
}
applyClusters();

// Silent ห: same vowel shape on a sonorant, but high-class tone, ห written in front.
const SON = "งญนมยรลว";
[...SON].forEach(function (cons) {
  vowels.forEach(function (v) {
    finals.forEach(function (fin) {
      MARKS.forEach(function (mark) {
        const sound = fin ? FINAL_SOUND[fin] : null;
        if (fin && !sound) return;
        if (v.blocksFinal && fin) return;
        if (v.needsFinal && !fin) return;
        const liveFinal = sound ? sound[1] : false;
        const live = v.liveForce || (!fin ? !!v.long : liveFinal);
        const tone = Thai.toneOf("high", live, !!v.long, mark);
        if (!tone) return;
        const canon = sound ? CANON[sound[0]] : "";
        let text;
        if (Thai.vowelById(v.id)) {
          const judged = Thai.judge("high", cons, v.id, canon, mark);
          if (!judged.tone) return;
          text = judged.text;
          if (fin && judged.final) text = [...text].slice(0, -1).join("") + fin;
          if (v.keepY && text.slice(-1) !== "ย") text += "ย";
          text = insertAtOnset(text, "ห");
          const base = Thai.romanize(cons, v.id, judged.final, tone);
          add(text, base);
          return;
        }
        const toneCh = TONE_CH[mark];
        text = v.pre || "";
        text += cons;
        if (v.up || v.lo) text += (v.up || "") + (v.lo || "") + toneCh + (v.post || "");
        else text += toneCh + (v.post || "");
        if (fin && !v.blocksFinal) text += fin;
        if (v.keepY && text.slice(-1) !== "ย") text += "ย";
        text = insertAtOnset(text, "ห");
        add(text, romanParts(cons, v.body, sound ? sound[0] : "", tone));
      });
    });
  });
});

// Unwritten vowel: consonant + tone + final. Sonorant final uses short o and stays live.
// Stop final uses short o and is dead. Short a is the lone-consonant case below.
function addInherent(vowelBody, liveFlag) {
  Letters.letters.forEach(function (letter) {
    Object.keys(FINAL_SOUND).forEach(function (fin) {
      const sound = FINAL_SOUND[fin];
      if (sound[1] !== liveFlag) return;
      MARKS.forEach(function (mark) {
        const live = sound[1];
        const tone = Thai.toneOf(letter.cls, live, false, mark);
        if (!tone) return;
        add(letter.g + TONE_CH[mark] + fin, romanParts(letter.g, vowelBody, sound[0], tone), {
          cons: letter.g, body: vowelBody, sound: sound[0], live: live, long: false, mark: mark
        });
      });
    });
  });
}
addInherent("o", true);
addInherent("o", false);

// Silent ห in front of an unwritten vowel: หมด mòt, หนด nòt.
[...SON].forEach(function (cons) {
  Object.keys(FINAL_SOUND).forEach(function (fin) {
    const sound = FINAL_SOUND[fin];
    MARKS.forEach(function (mark) {
      const tone = Thai.toneOf("high", sound[1], false, mark);
      if (!tone) return;
      add("ห" + cons + TONE_CH[mark] + fin, romanParts(cons, "o", sound[0], tone), {
        cons: cons, body: "o", sound: sound[0], live: sound[1], long: false, mark: mark
      });
    });
  });
});

// เ + leading consonant + sonorant + อ is two syllables. เสนอ sà-nǒe, เสมอ sà-mǒe.
Letters.letters.forEach(function (lead) {
  if (lead.cls === "low") return;
  const tone1 = Thai.toneOf(lead.cls, false, false, "none");
  if (!tone1) return;
  [...SON].forEach(function (main) {
    const tone2 = Thai.toneOf("high", true, true, "none");
    add("เ" + lead.g + main + "อ", romanParts(lead.g, "a", "", tone1) + "-" + romanParts(main, "oe", "", tone2));
  });
});

// อ + ย is one onset: mid-class อ, pronounced y. อยาก อย่าง อยู่.
Object.keys(dict).slice().forEach(function (text) {
  const chars = [...text];
  const i = LEAD.indexOf(chars[0]) >= 0 ? 1 : 0;
  if (chars[i] !== "อ") return;
  const roman = dict[text];
  force(insertCluster(text, "ย"), "y" + roman);
});

// cons + tone + ว + final is the vowel ua, not a cluster plus อ.
Letters.letters.forEach(function (letter) {
  Object.keys(FINAL_SOUND).forEach(function (fin) {
    if (fin === "ย" || fin === "ว") return;
    const sound = FINAL_SOUND[fin];
    MARKS.forEach(function (mark) {
      const tone = Thai.toneOf(letter.cls, sound[1], true, mark);
      if (!tone) return;
      force(letter.g + TONE_CH[mark] + "ว" + fin, romanParts(letter.g, "ua", sound[0], tone));
    });
  });
});

// เ–ย and โ–ย are diphthongs.
Letters.letters.forEach(function (letter) {
  MARKS.forEach(function (mark) {
    const toneE = Thai.toneOf(letter.cls, true, true, mark);
    const toneO = Thai.toneOf(letter.cls, true, true, mark);
    if (toneE) force("เ" + letter.g + TONE_CH[mark] + "ย", romanParts(letter.g, "oei", "", toneE));
    if (toneO) force("โ" + letter.g + TONE_CH[mark] + "ย", romanParts(letter.g, "ooi", "", toneO));
  });
});

// รร is /a/ plus a final, or /an/ when the next consonant starts a new syllable.
Letters.letters.forEach(function (letter) {
  MARKS.forEach(function (mark) {
    const toneAn = Thai.toneOf(letter.cls, true, false, mark);
    if (toneAn) force(letter.g + TONE_CH[mark] + "รร", romanParts(letter.g, "a", "n", toneAn));
    Object.keys(FINAL_SOUND).forEach(function (fin) {
      const sound = FINAL_SOUND[fin];
      const tone = Thai.toneOf(letter.cls, sound[1], false, mark);
      if (!tone) return;
      force(letter.g + TONE_CH[mark] + "รร" + fin, romanParts(letter.g, "a", sound[0], tone));
    });
  });
});

// ก็ is irregular: mid class plus mai taikhu would be low, and the spoken tone is falling.
force("ก็", "gô");

// ส ศ ษ จ + ร keeps the ร in the spelling and leaves it out of the pronunciation.
["ส", "ศ", "ษ", "จ"].forEach(function (cons) {
  Object.keys(dict).slice().forEach(function (text) {
    const chars = [...text];
    const i = LEAD.indexOf(chars[0]) >= 0 ? 1 : 0;
    if (chars[i] !== cons || chars[i + 1] === "ร") return;
    const next = chars[i + 1];
    if (next === "\u0E38" || next === "\u0E39") return;
    force(insertCluster(text, "ร"), dict[text]);
  });
});

// A consonant by itself, before another syllable, is a short dead a.
Letters.letters.forEach(function (letter) {
  MARKS.forEach(function (mark) {
    const tone = Thai.toneOf(letter.cls, false, false, mark);
    if (!tone) return;
    add(letter.g + TONE_CH[mark], romanParts(letter.g, "a", "", tone));
  });
});

// พา + ะ is the short-o spelling used when เ already opened the previous syllable. เฉพาะ.
Letters.letters.forEach(function (letter) {
  MARKS.forEach(function (mark) {
    const tone = Thai.toneOf(letter.cls, false, false, mark);
    if (!tone) return;
    add(letter.g + TONE_CH[mark] + "าะ", romanParts(letter.g, "o", "", tone), {
      cons: letter.g, body: "o", sound: "", live: false, long: false, mark: mark
    });
  });
});

applyClusters("ร");

const VOWEL_CHARS = "ะัาำิีึืุูเแโใไ็";
function hasVowel(chars) {
  return chars.some(function (ch) { return VOWEL_CHARS.indexOf(ch) >= 0; });
}
function copyShape(from, to) {
  if (shapeOf[from] && !shapeOf[to]) shapeOf[to] = shapeOf[from];
}

// ร written before a stopped final is silent. สามารถ = สา-มาด, spelled มารถ.
// Same-sound double finals are one final. ศาสตร์ loses ์ and still has สต.
// ิ after –ั plus a final is silent. บัติ is bàt.
Object.keys(dict).slice().forEach(function (text) {
  const chars = [...text];
  const fin = chars[chars.length - 1];
  const sound = FINAL_SOUND[fin];
  if (!sound || sound[1] || !hasVowel(chars.slice(0, -1))) return;
  if (chars[chars.length - 2] !== "ร") {
    const withR = chars.slice();
    withR.splice(withR.length - 1, 0, "ร");
    const key = withR.join("");
    add(key, dict[text]);
    copyShape(text, key);
  }
  if ((chars.indexOf("า") >= 0 || chars.indexOf("\u0E31") >= 0) && chars.indexOf("\u0E34") < 0) {
    const withI = text + "\u0E34";
    add(withI, dict[text]);
    copyShape(text, withI);
  }
  Object.keys(FINAL_SOUND).forEach(function (extra) {
    if (extra === fin || FINAL_SOUND[extra][1] || FINAL_SOUND[extra][0] !== sound[0]) return;
    const both = chars.slice();
    both.splice(both.length - 1, 0, extra);
    const key = both.join("");
    add(key, dict[text]);
    copyShape(text, key);
  });
});

function preprocess(word) {
  let chars = [...word].filter(function (ch, i, arr) { return ch !== "์" && arr[i + 1] !== "์"; });
  let s = chars.join("");
  s = s.replace(/ทร/g, "ส");
  return s;
}

function onsetChar(text) {
  const chars = [...text];
  const i = LEAD.indexOf(chars[0]) >= 0 ? 1 : 0;
  return chars[i] || "";
}
function asHigh(text) {
  const sh = shapeOf[text];
  if (!sh) return "";
  const tone = Thai.toneOf("high", sh.live, sh.long, sh.mark);
  if (!tone) return "";
  if (sh.vowelId) return Thai.romanize(sh.cons, sh.vowelId, sh.final, tone);
  return romanParts(sh.cons, sh.body, sh.sound, tone);
}
function segment(word) {
  const memo = {};
  function pieceCost(piece) {
    const chars = [...piece];
    let cost = 10;
    if (LEAD.indexOf(chars[0]) >= 0) cost -= 1;
    if (chars.length === 1 && (piece === "อ" || piece === "ะ")) cost += 40;
    else if (chars.length === 1 && byGlyph[piece]) cost += 8;
    else if (chars.length >= 2 && !/[ะัาำิีึืุูเแโใไ็]/.test(piece) && "งญนมยรลว".indexOf(chars[0]) >= 0 && FINAL_SOUND[chars[chars.length - 1]] && !FINAL_SOUND[chars[chars.length - 1]][1]) cost += 20;
    return cost;
  }
  function go(s) {
    if (s === "") return { cost: 0, pieces: [] };
    if (memo[s] !== undefined) return memo[s];
    const chars = [...s];
    let best = null;
    for (let n = chars.length; n >= 1; n--) {
      const piece = chars.slice(0, n).join("");
      if (!dict[piece]) continue;
      const rest = go(chars.slice(n).join(""));
      if (!rest) continue;
      const cost = pieceCost(piece) + rest.cost;
      if (!best || cost < best.cost) best = { cost: cost, pieces: [piece].concat(rest.pieces) };
    }
    memo[s] = best;
    return best;
  }
  const found = go(word);
  const pieces = found ? found.pieces : null;
  if (segment.watch && segment.watch[word]) {
    console.log("PIECES", word, [...word].map(function (c) { return c + ":" + c.codePointAt(0).toString(16); }).join(" "));
    console.log("  ", pieces ? pieces.map(function (p) { return p + "=" + dict[p]; }).join(" | ") : "-");
  }
  if (!pieces) return null;
  const romans = [];
  let bareLead = false;
  pieces.forEach(function (piece) {
    let roman = dict[piece];
    const onset = onsetChar(piece);
    const letter = byGlyph[onset];
    if (bareLead && letter && letter.cls === "low" && "งญนมยรลว".indexOf(onset) >= 0) {
      const hi = asHigh(piece);
      if (hi) roman = hi;
    }
    romans.push(roman);
    const lead = byGlyph[onsetChar(piece)];
    bareLead = [...piece].length === 1 && !!lead && lead.cls !== "low" && lead.g !== "อ";
  });
  return romans;
}

const OVERRIDE = {
  "อยู่": "yûu",
  "ก็": "gô",
  "ฯลฯ": "lá",
  "สร้าง": "sâang",
  "จริง": "jing",
  "ศรี": "sǐi",
  "อังกฤษ": "ang-grìt",
  "พฤติกรรม": "phrút-dtì-gam",
  "ทฤษฎี": "thrít-sà-dii",
  "ถนน": "thà-nǒn",
  "แสดง": "sà-dǎeng",
  "เฉพาะ": "chà-phó",
  "โดยเฉพาะ": "dooi-chà-phó",
  "ปฏิบัติ": "bpà-dtì-bàt",
  "บัญญัติ": "ban-yàt",
  "พระราชบัญญัติ": "phrá-râat-chá-ban-yàt",
  "ประวัติศาสตร์": "bprà-wàt-dtì-sàat",
  "คุณสมบัติ": "khun-ná-sǒm-bàt",
  "ธรรมชาติ": "tham-má-châat",
  "วัฒนธรรม": "wát-thá-ná-tham",
  "รัฐธรรมนูญ": "rát-thà-tham-má-nuun",
  "ประโยชน์": "bprà-yòht",
  "ประโยค": "bprà-yòhk",
  "เพชร": "phét",
  "เกษตร": "gà-sèet",
  "มาตรฐาน": "mâat-dtrà-thǎan",
  "ภาพยนตร์": "phâap-phá-yon",
  "เศรษฐกิจ": "sèet-thà-gìt",
  "รัฐบาล": "rát-thà-baan",
  "มหาวิทยาลัย": "má-hǎa-wít-thá-yaa-lai",
  "บริษัท": "bàw-rí-sàt",
  "บริการ": "bàw-rí-gaan",
  "บริหาร": "bàw-rí-hǎan",
  "บริเวณ": "bàw-rí-ween",
  "กรณี": "gà-rá-nii",
  "พัฒนา": "phát-thá-naa",
  "ลักษณะ": "lák-sà-nà",
  "เหตุ": "hèet",
  "เหตุผล": "hèet-phǒn",
  "เหตุการณ์": "hèet-gaan",
  "ธุรกิจ": "thú-rá-gìt",
  "ปกติ": "bpòk-gà-dtì",
  "กรรมการ": "gam-má-gaan",
  "คณะกรรมการ": "khá-ná-gam-má-gaan",
  "พิจารณา": "phí-jaa-rá-naa",
  "ตกลง": "dtòk-long",
  "เรียบร้อย": "rîap-ráwy",
  "หลวง": "lǔang",
  "อนาคต": "à-naa-khót",
  "นคร": "ná-khawn",
  "สมอง": "sà-mǎwng",
  "รอบ": "râwp",
  "นอก": "nâawk",
  "นอกจาก": "nâwk-jàak",
  "นอกจากนี้": "nâwk-jàak-níi",
  "ตำรวจ": "dtaam-rùat",
  "งบประมาณ": "ngóp-bprà-maan",
  "สงบ": "sà-ngòp",
  "ยอด": "yâwt",
  "รวดเร็ว": "rûat-reo",
  "เยอะ": "yóe",
  "เถอะ": "thòe",
  "ขณะ": "khà-nà",
  "ขณะที่": "khà-nà-thîi",
  "ในขณะที่": "nai-khà-nà-thîi",
  "สหรัฐ": "sà-hà-rát",
  "สถานการณ์": "sà-thǎan-ná-gaan",
  "สาเหตุ": "sǎa-hèet",
  "ภายนอก": "phaai-nâawk",
  "โทรศัพท์": "thoo-rá-sàp",
  "นายกรัฐมนตรี": "naai-gràt-thà-mon-dtrii",
  "ศิลปะ": "sǐn-lá-bpà"
};
const failed = [];
const out = {};
words.forEach(function (th) {
  if (OVERRIDE[th]) { out[th] = OVERRIDE[th]; return; }
  const parts = segment(preprocess(th));
  if (!parts) { failed.push(th); return; }
  out[th] = parts.join("-");
});

const unparsed = words.filter(function (th) { return !dict[th] || OVERRIDE[th]; });
console.log("dict", Object.keys(dict).length);
console.log("collisions", collisionCount);
console.log("words", words.length, "romanized", Object.keys(out).length, "failed", failed.length);
console.log("FAILED");
console.log(failed.join(" "));
console.log("---SAMPLE---");
words.filter(function (th) { return failed.indexOf(th) < 0; }).slice(0, 80).forEach(function (th) {
  console.log(th + "\t" + out[th]);
});
fs.writeFileSync("js/_roman-review.txt", failed.join("\n") + "\n\n" + words.map(function (th) { return th + "\t" + (out[th] || "?"); }).join("\n"));
fs.writeFileSync("js/_roman-out.json", JSON.stringify(out));
fs.writeFileSync("js/tnc-roman.js", "window.TNC_ROMAN = " + JSON.stringify(out) + ";\n");
