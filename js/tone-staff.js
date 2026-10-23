(function (root) {
  const STAFF_SET = "set-01-classic";
  const TONE_IDS = ["mid", "low", "falling", "high", "rising"];
  const TONE_ALT = {
    mid: "Mid tone",
    low: "Low tone",
    falling: "Falling tone",
    high: "High tone",
    rising: "Rising tone",
  };

  function src(toneId) {
    return "img/tone-staves/" + STAFF_SET + "/" + toneId + ".svg";
  }

  function tag(toneId, w, h, cls) {
    if (!toneId || !TONE_ALT[toneId]) return "";
    w = w || 56;
    h = h || Math.round(w * 0.45);
    return (
      '<img class="tone-staff-icon' +
      (cls ? " " + cls : "") +
      '" src="' +
      src(toneId) +
      '" width="' +
      w +
      '" height="' +
      h +
      '" alt="' +
      TONE_ALT[toneId] +
      '">'
    );
  }

  function keyInlineHtml(w) {
    w = w || 64;
    const h = Math.round(w * 0.45);
    return TONE_IDS.map(function (id) {
      return tag(id, w, h);
    }).join("");
  }

  /** "low · เอก" or "mid · สามัญ" → stave img(s) */
  function tagsFromLabel(label, w, h) {
    if (!label) return "";
    w = w || 44;
    h = h || Math.round(w * 0.45);
    const wordToId = { mid: "mid", low: "low", high: "high", rising: "rising", falling: "falling", fall: "falling" };
    return label
      .split(" · ")
      .map(function (part) {
        const w0 = part.trim().toLowerCase().split(/\s+/)[0];
        const id = wordToId[w0];
        return id ? tag(id, w, h) : "";
      })
      .filter(Boolean)
      .join(" ");
  }

  root.ToneStaff = {
    STAFF_SET: STAFF_SET,
    TONE_IDS: TONE_IDS,
    TONE_ALT: TONE_ALT,
    src: src,
    tag: tag,
    keyInlineHtml: keyInlineHtml,
    tagsFromLabel: tagsFromLabel,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
