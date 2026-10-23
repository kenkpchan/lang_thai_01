(function (root) {
  function synth() {
    return root.speechSynthesis || null;
  }
  function voices() {
    const s = synth();
    return s ? s.getVoices() : [];
  }
  function norm(lang) {
    return String(lang || "").toLowerCase().replace(/_/g, "-");
  }
  function pick(prefix) {
    const want = norm(prefix);
    const list = voices();
    if (want === "zh" || want === "zh-cn" || want === "zh-hans") {
      return list.find(function (v) { return /^zh-cn|^zh-hans|^cmn/.test(norm(v.lang)); })
        || list.find(function (v) {
          const lang = norm(v.lang);
          return lang.indexOf("zh") === 0 && lang.indexOf("zh-hk") !== 0 && lang.indexOf("yue") !== 0;
        }) || null;
    }
    if (want === "zh-hk" || want === "yue") {
      return list.find(function (v) {
        const lang = norm(v.lang);
        return lang.indexOf("zh-hk") === 0 || lang.indexOf("yue") === 0;
      }) || null;
    }
    return list.find(function (v) { return norm(v.lang).indexOf(want) === 0; }) || null;
  }
  function whenVoices(cb) {
    const s = synth();
    if (!s) {
      cb([]);
      return;
    }
    let sent = false;
    function finish() {
      const list = voices();
      if (!list.length || sent) return;
      sent = true;
      s.removeEventListener("voiceschanged", finish);
      cb(list);
    }
    finish();
    if (sent) return;
    s.addEventListener("voiceschanged", finish);
    setTimeout(function () {
      if (sent) return;
      sent = true;
      s.removeEventListener("voiceschanged", finish);
      cb(voices());
    }, 1500);
  }
  function speak(text, prefix, onend) {
    const s = synth();
    const voice = pick(prefix);
    if (!s || !voice || !text) return false;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.86;
    if (onend) u.onend = onend;
    s.speak(u);
    return true;
  }
  function stop() {
    if (synth()) synth().cancel();
  }
  function google(text) {
    if (!text) return false;
    const url = "https://translate.google.com/?sl=th&tl=zh-TW&text=" + encodeURIComponent(text) + "&op=translate";
    const win = window.open(url, "thaiGoogleRead", "popup=yes,width=560,height=760");
    if (win) win.focus();
    return !!win;
  }
  root.ThaiSpeak = { speak: speak, pick: pick, whenVoices: whenVoices, stop: stop, google: google };
})(typeof globalThis !== "undefined" ? globalThis : this);
