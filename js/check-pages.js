const fs = require("fs");
const files = fs.readdirSync(".").filter(function (f) { return f.endsWith(".html"); });
let bad = 0;
files.forEach(function (f) {
  const html = fs.readFileSync(f, "utf8");
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  let n = 0;
  while ((m = re.exec(html))) {
    n += 1;
    try { new Function(m[1]); }
    catch (e) { bad += 1; console.log("SYNTAX", f, n, e.message); }
  }
});
console.log(bad ? "FAIL " + bad : "OK " + files.length);
process.exit(bad ? 1 : 0);
