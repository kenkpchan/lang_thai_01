import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, "img", "vowel-seats");

const COLORS = {
  before: "#7c3aed",
  above: "#db2777",
  below: "#9a3412",
  after: "#0f766e",
};

const SEATS = ["before", "above", "below", "after"];

function svgWrap(body, w = 52, h = 52, vb = "0 0 52 52") {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-hidden="true">\n` +
    body +
    `\n</svg>\n`
  );
}

/** Consonant anchor box */
function consBox(stroke = "#8a847c") {
  return `<rect x="19" y="19" width="14" height="14" rx="2" fill="#f6f4ee" stroke="${stroke}" stroke-width="1.2"/>` +
    `<text x="26" y="29" text-anchor="middle" font-family="Noto Sans Thai, sans-serif" font-size="11" fill="#1c1b19">ก</text>`;
}

function arrowHead(color, tipX, tipY, dir) {
  const d = {
    right: `M${tipX},${tipY} l-5,-3 l0,6 z`,
    left: `M${tipX},${tipY} l5,-3 l0,6 z`,
    down: `M${tipX},${tipY} l-3,-5 l6,0 z`,
    up: `M${tipX},${tipY} l-3,5 l6,0 z`,
  }[dir];
  return `<path d="${d}" fill="${color}"/>`;
}

const renderers = {
  "set-01-classic": {
    name: "Classic · 直箭＋輔音框",
    draw(seat) {
      const c = COLORS[seat];
      let body = consBox();
      if (seat === "before") {
        body += `<line x1="6" y1="26" x2="17" y2="26" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>` + arrowHead(c, 19, 26, "right");
        body += `<circle cx="8" cy="26" r="3" fill="${c}" opacity="0.35"/>`;
      } else if (seat === "above") {
        body += `<line x1="26" y1="6" x2="26" y2="17" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>` + arrowHead(c, 26, 19, "down");
        body += `<circle cx="26" cy="8" r="3" fill="${c}" opacity="0.35"/>`;
      } else if (seat === "below") {
        body += `<line x1="26" y1="46" x2="26" y2="35" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>` + arrowHead(c, 26, 33, "up");
        body += `<circle cx="26" cy="44" r="3" fill="${c}" opacity="0.35"/>`;
      } else {
        body += `<line x1="46" y1="26" x2="35" y2="26" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>` + arrowHead(c, 33, 26, "left");
        body += `<circle cx="44" cy="26" r="3" fill="${c}" opacity="0.35"/>`;
      }
      return svgWrap(body);
    },
  },
  "set-02-minimal": {
    name: "Minimal · 細箭",
    draw(seat) {
      const c = COLORS[seat];
      let body = `<rect x="20" y="20" width="12" height="12" rx="1" fill="none" stroke="#c9c4bb" stroke-width="1"/>`;
      const mk = (x1, y1, x2, y2, dir) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.8" stroke-linecap="round"/>` + arrowHead(c, x2, y2, dir);
      if (seat === "before") body += mk(4, 26, 18, 26, "right");
      else if (seat === "above") body += mk(26, 4, 26, 18, "down");
      else if (seat === "below") body += mk(26, 48, 26, 34, "up");
      else body += mk(48, 26, 34, 26, "left");
      return svgWrap(body);
    },
  },
  "set-03-labeled": {
    name: "Labeled · 箭＋前上後下",
    draw(seat) {
      const c = COLORS[seat];
      const zh = { before: "前", above: "上", below: "下", after: "後" }[seat];
      let body = consBox();
      if (seat === "before") {
        body += `<line x1="5" y1="26" x2="17" y2="26" stroke="${c}" stroke-width="2"/>` + arrowHead(c, 19, 26, "right");
        body += `<text x="7" y="29" font-family="sans-serif" font-size="8" fill="${c}">${zh}</text>`;
      } else if (seat === "above") {
        body += `<line x1="26" y1="5" x2="26" y2="17" stroke="${c}" stroke-width="2"/>` + arrowHead(c, 26, 19, "down");
        body += `<text x="28" y="10" font-family="sans-serif" font-size="8" fill="${c}">${zh}</text>`;
      } else if (seat === "below") {
        body += `<line x1="26" y1="47" x2="26" y2="35" stroke="${c}" stroke-width="2"/>` + arrowHead(c, 26, 33, "up");
        body += `<text x="28" y="48" font-family="sans-serif" font-size="8" fill="${c}">${zh}</text>`;
      } else {
        body += `<line x1="47" y1="26" x2="35" y2="26" stroke="${c}" stroke-width="2"/>` + arrowHead(c, 33, 26, "left");
        body += `<text x="42" y="29" font-family="sans-serif" font-size="8" fill="${c}">${zh}</text>`;
      }
      return svgWrap(body);
    },
  },
  "set-04-slot": {
    name: "Slot · 虛線座位",
    draw(seat) {
      const c = COLORS[seat];
      let body = consBox("#6a645c");
      const slot = (x, y, w, h) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="none" stroke="${c}" stroke-width="1.3" stroke-dasharray="2 2"/>`;
      if (seat === "before") {
        body += slot(3, 22, 12, 8);
        body += `<path d="M16 26 H19" stroke="${c}" stroke-width="2" fill="none"/>` + arrowHead(c, 19, 26, "right");
      } else if (seat === "above") {
        body += slot(22, 3, 8, 10);
        body += `<path d="M26 14 V19" stroke="${c}" stroke-width="2" fill="none"/>` + arrowHead(c, 26, 19, "down");
      } else if (seat === "below") {
        body += slot(22, 39, 8, 10);
        body += `<path d="M26 39 V33" stroke="${c}" stroke-width="2" fill="none"/>` + arrowHead(c, 26, 33, "up");
      } else {
        body += slot(37, 22, 12, 8);
        body += `<path d="M36 26 H33" stroke="${c}" stroke-width="2" fill="none"/>` + arrowHead(c, 33, 26, "left");
      }
      return svgWrap(body);
    },
  },
  "set-05-arc": {
    name: "Arc · 弧箭",
    draw(seat) {
      const c = COLORS[seat];
      let body = `<circle cx="26" cy="26" r="8" fill="#f6f4ee" stroke="#8a847c" stroke-width="1"/>` +
        `<text x="26" y="29" text-anchor="middle" font-family="Noto Sans Thai, sans-serif" font-size="10" fill="#1c1b19">ก</text>`;
      if (seat === "before") {
        body += `<path d="M6 26 Q14 14 22 22" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` + arrowHead(c, 22, 22, "right");
      } else if (seat === "above") {
        body += `<path d="M26 6 Q38 14 30 22" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` + arrowHead(c, 30, 22, "down");
      } else if (seat === "below") {
        body += `<path d="M26 46 Q14 38 22 30" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` + arrowHead(c, 22, 30, "up");
      } else {
        body += `<path d="M46 26 Q38 38 30 30" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` + arrowHead(c, 30, 30, "left");
      }
      return svgWrap(body);
    },
  },
};

for (const [setId, set] of Object.entries(renderers)) {
  const dir = path.join(outRoot, setId);
  fs.mkdirSync(dir, { recursive: true });
  for (const seat of SEATS) {
    fs.writeFileSync(path.join(dir, `${seat}.svg`), set.draw(seat), "utf8");
  }
}

fs.writeFileSync(
  path.join(outRoot, "manifest.json"),
  JSON.stringify(
    {
      seats: SEATS,
      colors: COLORS,
      sets: Object.entries(renderers).map(([id, s]) => ({ id, name: s.name })),
    },
    null,
    2,
  ),
  "utf8",
);
console.log("Wrote", Object.keys(renderers).length * SEATS.length, "vowel-seat SVGs");
