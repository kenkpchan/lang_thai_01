(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Thai = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TONE_MARK = { none: "", ek: "\u0E48", tho: "\u0E49", tri: "\u0E4A", cattawa: "\u0E4B" };
  const TONE_NAME = {
    mid: { en: "Mid", th: "สามัญ" },
    low: { en: "Low", th: "เอก" },
    falling: { en: "Falling", th: "โท" },
    high: { en: "High", th: "ตรี" },
    rising: { en: "Rising", th: "จัตวา" }
  };

  const VOWELS = [
    { id: "aa", group: "after", label: "–า", name: "long aa", long: true, post: "า" },
    { id: "a", group: "after", label: "–ะ", name: "short a", long: false, post: "ะ", blocksFinal: true },
    { id: "aw", group: "after", label: "–อ", name: "long aw", long: true, post: "อ" },
    { id: "am", group: "above", label: "–ำ", name: "am", long: true, am: true, liveForce: true, blocksFinal: true, why: "ำ already ends in an m sound, so the syllable is live." },
    { id: "i", group: "above", label: "–ิ", name: "short i", long: false, up: "\u0E34" },
    { id: "ii", group: "above", label: "–ี", name: "long ii", long: true, up: "\u0E35" },
    { id: "ue", group: "above", label: "–ึ", name: "short ue", long: false, up: "\u0E36" },
    { id: "uue", group: "above", label: "–ือ", name: "long uue", long: true, up: "\u0E37", post: "อ" },
    { id: "ak", group: "above", label: "–ั", name: "short a before a final", long: false, up: "\u0E31", needsFinal: true },
    { id: "u", group: "below", label: "–ุ", name: "short u", long: false, lo: "\u0E38" },
    { id: "uu", group: "below", label: "–ู", name: "long uu", long: true, lo: "\u0E39" },
    { id: "e", group: "before", label: "เ–", name: "long e", long: true, pre: "เ" },
    { id: "ae", group: "before", label: "แ–", name: "long ae", long: true, pre: "แ" },
    { id: "o", group: "before", label: "โ–", name: "long o", long: true, pre: "โ" },
    { id: "o-short", group: "before", label: "โ–ะ", name: "short o", long: false, pre: "โ", post: "ะ", blocksFinal: true },
    { id: "ai", group: "before", label: "ไ–", name: "ai", long: true, pre: "ไ", liveForce: true, blocksFinal: true, why: "ไ already ends in a y sound, so the syllable is live." },
    { id: "ai2", group: "before", label: "ใ–", name: "ai, the ใ spelling", long: true, pre: "ใ", liveForce: true, blocksFinal: true, why: "ใ already ends in a y sound, so the syllable is live. It is the less common spelling of the same sound as ไ." },
    { id: "e-short", group: "around", label: "เ–็–", name: "short e", long: false, pre: "เ", up: "\u0E47", needsFinal: true },
    { id: "oei", group: "around", label: "เ–ิ–", name: "oe before a final", long: true, pre: "เ", up: "\u0E34", needsFinal: true },
    { id: "oe", group: "around", label: "เ–อ", name: "long oe", long: true, pre: "เ", post: "อ" },
    { id: "ao", group: "around", label: "เ–า", name: "ao", long: true, pre: "เ", post: "า", liveForce: true, blocksFinal: true, why: "เ–า already ends in a w sound, so the syllable is live." },
    { id: "uea", group: "around", label: "เ–ือ", name: "uea", long: true, pre: "เ", up: "\u0E37", post: "อ" }
  ];

  function vowelById(id) {
    return VOWELS.find(function (v) { return v.id === id; }) || null;
  }

  function toneOf(cls, live, long, mark) {
    if (mark === "tri") return cls === "mid" ? "high" : null;
    if (mark === "cattawa") return cls === "mid" ? "rising" : null;
    if (mark === "ek") return cls === "low" ? "falling" : "low";
    if (mark === "tho") return cls === "low" ? "high" : "falling";
    if (live) return cls === "high" ? "rising" : "mid";
    if (cls === "low") return long ? "falling" : "high";
    return "low";
  }

  function compose(cons, vowelId, final, mark) {
    const vowel = vowelById(vowelId);
    const tone = TONE_MARK[mark] || "";
    let fin = final || "";
    let note = "";
    if (!vowel) return { text: cons || "", final: "", note: "", vowel: null };
    if (vowel.blocksFinal && fin) {
      note = "This vowel already ends the syllable, so the extra final is left off.";
      fin = "";
    }
    if (vowel.needsFinal && !fin) {
      fin = "น";
      note = "This vowel is written together with a final. น stands in until you choose one.";
    }
    let text = vowel.pre || "";
    text += cons;
    if (vowel.am) text += tone + "\u0E33";
    else if (vowel.up || vowel.lo) text += (vowel.up || "") + (vowel.lo || "") + tone + (vowel.post || "");
    else text += tone + (vowel.post || "");
    text += fin;
    return { text: text, final: fin, note: note, vowel: vowel };
  }

  function analyze(vowel, fin) {
    if (!vowel) return { live: false, long: false, why: "" };
    if (vowel.liveForce) return { live: true, long: true, why: vowel.why };
    if (!fin) {
      if (vowel.long) return { live: true, long: true, why: "The vowel is long and the syllable stays open, so it is live." };
      return { live: false, long: false, why: "The vowel is short and the syllable ends there, so it is dead." };
    }
    if ("นมงยว".indexOf(fin) !== -1) {
      return { live: true, long: !!vowel.long, why: "It ends in " + fin + ", and that ending keeps a syllable live." };
    }
    return { live: false, long: !!vowel.long, why: "It ends in " + fin + ", a stopped consonant, so the syllable is dead." };
  }

  const ONSET = {
    "ก": "g", "ข": "kh", "ฃ": "kh", "ค": "kh", "ฅ": "kh", "ฆ": "kh", "ง": "ng",
    "จ": "j", "ฉ": "ch", "ช": "ch", "ซ": "s", "ฌ": "ch", "ญ": "y",
    "ฎ": "d", "ฏ": "dt", "ฐ": "th", "ฑ": "th", "ฒ": "th", "ณ": "n",
    "ด": "d", "ต": "dt", "ถ": "th", "ท": "th", "ธ": "th", "น": "n",
    "บ": "b", "ป": "bp", "ผ": "ph", "ฝ": "f", "พ": "ph", "ฟ": "f", "ภ": "ph",
    "ม": "m", "ย": "y", "ร": "r", "ล": "l", "ว": "w",
    "ศ": "s", "ษ": "s", "ส": "s", "ห": "h", "ฬ": "l", "อ": "", "ฮ": "h"
  };
  const VOWEL_BODY = {
    aa: "aa", a: "a", aw: "aw", am: "aam", i: "i", ii: "ii", ue: "eu", uue: "ue",
    ak: "a", u: "u", uu: "uu", e: "ee", ae: "ae", o: "oh", "o-short": "o",
    ai: "ai", ai2: "ai", "e-short": "e", oei: "oe", oe: "oe", ao: "ao", uea: "uea"
  };
  const TONE_VOWEL = {
    low: { a: "à", e: "è", i: "ì", o: "ò", u: "ù" },
    falling: { a: "â", e: "ê", i: "î", o: "ô", u: "û" },
    high: { a: "á", e: "é", i: "í", o: "ó", u: "ú" },
    rising: { a: "ǎ", e: "ě", i: "ǐ", o: "ǒ", u: "ǔ" }
  };

  function romanize(cons, vowelId, final, tone) {
    const onset = ONSET[cons] != null ? ONSET[cons] : "";
    let body = VOWEL_BODY[vowelId] || "";
    let coda = "";
    if (vowelId === "ak" && final === "ว") body = "ua";
    else if (vowelId === "ak" && final === "ย") body = "ai";
    else if (final === "ว") coda = "o";
    else if (final === "ย" && /a$/.test(body)) coda = "i";
    else if (final === "ก") coda = "k";
    else if (final === "ด") coda = "t";
    else if (final === "บ") coda = "p";
    else if (final === "น") coda = "n";
    else if (final === "ม") coda = "m";
    else if (final === "ง") coda = "ng";
    else if (final === "ย") coda = "y";
    if (tone && tone !== "mid" && TONE_VOWEL[tone]) {
      const map = TONE_VOWEL[tone];
      for (let i = 0; i < body.length; i++) {
        if (map[body[i]]) {
          body = body.slice(0, i) + map[body[i]] + body.slice(i + 1);
          break;
        }
      }
    }
    return onset + body + coda;
  }

  function judge(cls, cons, vowelId, final, mark) {
    const built = compose(cons, vowelId, final, mark);
    const info = analyze(built.vowel, built.final);
    const tone = toneOf(cls, info.live, info.long, mark || "none");
    return {
      text: built.text,
      final: built.final,
      note: built.note,
      vowel: built.vowel,
      live: info.live,
      long: info.long,
      why: info.why,
      tone: tone
    };
  }

  return {
    VOWELS: VOWELS,
    TONE_MARK: TONE_MARK,
    TONE_NAME: TONE_NAME,
    vowelById: vowelById,
    toneOf: toneOf,
    compose: compose,
    analyze: analyze,
    judge: judge,
    romanize: romanize
  };
});
