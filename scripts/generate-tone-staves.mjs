import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, "img", "tone-staves");

const COLORS = {
  mid: "#5c6770",
  low: "#5b2d8e",
  falling: "#a33b4a",
  high: "#a67c00",
  rising: "#0e7c86",
};

const LABELS = {
  mid: { en: "Mid", zh: "中" },
  low: { en: "Low", zh: "低" },
  falling: { en: "Fall", zh: "降" },
  high: { en: "High", zh: "高" },
  rising: { en: "Rise", zh: "升" },
};

/** y: smaller = higher pitch on staff */
const CONTOUR = {
  mid: "M14,20 L74,20",
  low: "M14,29 L74,29",
  falling: "M14,11 L74,29",
  high: "M14,11 L74,11",
  rising: "M14,29 L74,11",
};

const NOTE_Y = { mid: 20, low: 29, falling: 11, high: 11, rising: 29 };

function staffLines(n, y0, gap, stroke, opacity = 1) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const y = y0 + i * gap;
    s += `<line x1="10" y1="${y}" x2="78" y2="${y}" stroke="${stroke}" stroke-width="0.9" opacity="${opacity}"/>`;
  }
  return s;
}

function svgWrap(body, w, h, vb) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-hidden="true">\n` +
    body +
    `\n</svg>\n`
  );
}

const sets = {
  "set-01-classic": {
    name: "Classic · 標準五線",
    render(tone) {
      const c = COLORS[tone];
      const path = CONTOUR[tone];
      const ny = NOTE_Y[tone];
      return svgWrap(
        staffLines(5, 8, 6, "#b8b2a8") +
          `<path d="${path}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>` +
          `<ellipse cx="14" cy="${ny}" rx="3.2" ry="2.6" fill="${c}"/>`,
        88,
        40,
        "0 0 88 40",
      );
    },
  },
  "set-02-minimal": {
    name: "Minimal · 簡線",
    render(tone) {
      const c = COLORS[tone];
      return svgWrap(
        staffLines(3, 14, 6, "#d4cfc6", 0.85) +
          `<path d="${CONTOUR[tone]}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`,
        88,
        40,
        "0 0 88 40",
      );
    },
  },
  "set-03-labeled": {
    name: "Labeled · 標籤",
    render(tone) {
      const c = COLORS[tone];
      const lab = LABELS[tone];
      return svgWrap(
        staffLines(5, 6, 5.5, "#b8b2a8") +
          `<path d="${CONTOUR[tone]}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>` +
          `<text x="44" y="38" text-anchor="middle" font-family="sans-serif" font-size="7" fill="${c}">${lab.en} ${lab.zh}</text>`,
        88,
        42,
        "0 0 88 42",
      );
    },
  },
  "set-04-clef": {
    name: "Treble hint · 高音記號",
    render(tone) {
      const c = COLORS[tone];
      const clef =
        `<path d="M6,28 C6,22 8,18 10,16 C9,24 9,30 11,34 C10,32 8,30 7,28 Z" fill="none" stroke="#6a645c" stroke-width="1.1"/>` +
        `<circle cx="10.5" cy="14" r="2.2" fill="none" stroke="#6a645c" stroke-width="1"/>`;
      return svgWrap(
        clef +
          staffLines(5, 8, 6, "#b8b2a8") +
          `<path d="${CONTOUR[tone]}" fill="none" stroke="${c}" stroke-width="2.3" stroke-linecap="round"/>` +
          `<ellipse cx="16" cy="${NOTE_Y[tone]}" rx="2.8" ry="2.3" fill="${c}"/>`,
        88,
        40,
        "0 0 88 40",
      );
    },
  },
  "set-05-arrow": {
    name: "Direction · 方向箭頭",
    render(tone) {
      const c = COLORS[tone];
      const id = `arr-${tone}`;
      return svgWrap(
        `<defs><marker id="${id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="${c}"/></marker></defs>` +
          staffLines(5, 8, 6, "#c9c4bb", 0.7) +
          `<path d="${CONTOUR[tone]}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" marker-end="url(#${id})"/>`,
        88,
        40,
        "0 0 88 40",
      );
    },
  },
};

const tones = ["mid", "low", "falling", "high", "rising"];

for (const [setId, set] of Object.entries(sets)) {
  const dir = path.join(outRoot, setId);
  fs.mkdirSync(dir, { recursive: true });
  for (const tone of tones) {
    fs.writeFileSync(path.join(dir, `${tone}.svg`), set.render(tone), "utf8");
  }
}

const manifest = {
  sets: Object.entries(sets).map(([id, s]) => ({ id, name: s.name, tones })),
  colors: COLORS,
  labels: LABELS,
};
fs.writeFileSync(path.join(outRoot, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log("Wrote", Object.keys(sets).length * tones.length, "SVGs to", outRoot);
