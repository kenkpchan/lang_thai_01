(function () {
  const AUTH_KEY = "tv_auth_token";
  const MOBILE_LIB_MQ = window.matchMedia("(max-width: 900px)");

  const TONE_COLORS = {
    mid: "#5c6770",
    low: "#5b2d8e",
    falling: "#a33b4a",
    high: "#a67c00",
    rising: "#0e7c86",
  };
  const TONE_NAMES = {
    mid: "Mid",
    low: "Low",
    falling: "Falling",
    high: "High",
    rising: "Rising",
  };

  function getToken() {
    return sessionStorage.getItem(AUTH_KEY) || "";
  }

  function setToken(token) {
    if (token) sessionStorage.setItem(AUTH_KEY, token);
    else sessionStorage.removeItem(AUTH_KEY);
  }

  function apiBase() {
    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://127.0.0.1:8765/api";
    }
    return "/api";
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function googleTranslateUrl(thai) {
    return (
      "https://translate.google.com/?sl=th&tl=en&text=" +
      encodeURIComponent(thai) +
      "&op=translate"
    );
  }

  function openGoogleTranslateSpeak(thai) {
    const url = googleTranslateUrl(thai);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function formatWhen(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  function toneFromRomanSegment(seg) {
    if (/à/.test(seg)) return "low";
    if (/â/.test(seg)) return "falling";
    if (/á/.test(seg)) return "high";
    if (/ǎ/.test(seg)) return "rising";
    return "mid";
  }

  function renderToneRow(t) {
    const segs = (t.roman_syllables || "")
      .split("-")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (!segs.length) return "";
    const returnUrl = encodeURIComponent(
      location.pathname + location.search + location.hash
    );
    return (
      '<p class="tv-tone-row">' +
      segs
        .map(function (seg, i) {
          const tone = toneFromRomanSegment(seg);
          const col = TONE_COLORS[tone];
          const name = TONE_NAMES[tone];
          const href =
            "integrated-tone-vocab.html?roman=" +
            encodeURIComponent(seg) +
            "&return=" +
            returnUrl;
          const sep =
            i > 0 ? '<span class="tv-tone-sep" aria-hidden="true">·</span>' : "";
          return (
            sep +
            '<a class="tv-tone-syl" href="' +
            esc(href) +
            '" style="--tone-color:' +
            col +
            '" title="' +
            esc(name) +
            ' tone · tone workshop">' +
            '<span class="tv-tone-dot" aria-hidden="true"></span>' +
            '<span class="tv-tone-seg">' +
            esc(seg) +
            "</span>" +
            '<span class="visually-hidden">' +
            esc(name) +
            " tone</span></a>"
          );
        })
        .join("") +
      "</p>"
    );
  }

  function entryToTranslation(row) {
    if (!row) return null;
    return {
      thai_word: row.thai_word,
      roman_syllables: row.roman_syllables,
      roman_compact: row.roman_compact,
      chinese_traditional: row.chinese_traditional,
      meaning_en: row.meaning_en,
      example_thai: row.example_thai,
      example_roman: row.example_roman,
      example_chinese: row.example_chinese,
    };
  }

  function cardHtml(english, t, opts) {
    opts = opts || {};
    if (!t) return "";
    const tag = opts.cacheHit
      ? '<p class="tv-cache-tag">Saved card · no AI call</p>'
      : "";
    const orig =
      opts.originalInput && opts.originalInput !== english
        ? '<p class="tv-source">You typed · <strong>' +
          esc(opts.originalInput) +
          "</strong></p>"
        : "";
    const compact = (t.roman_compact || "").trim();
    const compactLine =
      compact && compact !== (t.roman_syllables || "").replace(/-/g, "")
        ? '<p class="tv-roman-compact">' + esc(compact) + "</p>"
        : "";
    return (
      tag +
      '<article class="tv-card-v1" aria-live="polite">' +
      (english
        ? '<p class="tv-source">English · <strong>' + esc(english) + "</strong></p>"
        : "") +
      orig +
      '<header class="tv-card-head">' +
      '<h2 class="tv-thai-main" lang="th">' +
      esc(t.thai_word) +
      "</h2>" +
      renderToneRow(t) +
      compactLine +
      '<p class="tv-zh-head" lang="zh-Hant">' +
      esc(t.chinese_traditional) +
      "</p>" +
      "</header>" +
      '<p class="tv-meaning">' +
      esc(t.meaning_en) +
      "</p>" +
      '<section class="tv-example" aria-label="Example sentence">' +
      '<p class="line-th" lang="th">' +
      esc(t.example_thai) +
      "</p>" +
      '<p class="line-ro">' +
      esc(t.example_roman) +
      "</p>" +
      '<p class="line-zh" lang="zh-Hant">' +
      esc(t.example_chinese) +
      "</p>" +
      "</section>" +
      '<div class="tv-gt"><a href="' +
      esc(googleTranslateUrl(t.thai_word)) +
      '" target="_blank" rel="noopener noreferrer">' +
      '<span class="tv-speaker" aria-hidden="true">🔊</span> Pronounce on Google Translate</a></div>' +
      "</article>"
    );
  }

  function renderCard(container, english, t, opts) {
    if (!t) {
      container.innerHTML =
        '<div class="tv-empty"><p>Enter English above and press <strong>Translate</strong>.</p></div>';
      return;
    }
    container.innerHTML = cardHtml(english, t, opts);
  }

  const els = {
    form: document.getElementById("tv-form"),
    input: document.getElementById("tv-english"),
    status: document.getElementById("tv-status"),
    banner: document.getElementById("tv-banner"),
    result: document.getElementById("tv-result"),
    historyList: document.getElementById("tv-history-list"),
    search: document.getElementById("tv-search"),
    statusFilter: document.getElementById("tv-status-filter"),
    dbPill: document.getElementById("tv-db-mode"),
    revision: document.getElementById("tv-revision"),
    notes: document.getElementById("tv-notes"),
    revStatus: document.getElementById("tv-rev-status"),
    btnSaveNotes: document.getElementById("tv-save-notes"),
    btnRetranslate: document.getElementById("tv-retranslate"),
    btnDelete: document.getElementById("tv-delete"),
    btnRefresh: document.getElementById("tv-refresh-card"),
    related: document.getElementById("tv-related"),
    relatedList: document.getElementById("tv-related-list"),
    suggestList: document.getElementById("tv-suggest-list"),
    btnSuggestLinks: document.getElementById("tv-suggest-links"),
    libDetail: document.getElementById("tv-lib-detail"),
    libSheet: document.getElementById("tv-lib-sheet"),
    sheetBody: document.getElementById("tv-sheet-body"),
    batchBar: document.getElementById("tv-batch-bar"),
    batchCount: document.getElementById("tv-batch-count"),
    batchClear: document.getElementById("tv-batch-clear"),
    libSelectToggle: document.getElementById("tv-lib-select-toggle"),
    todayIntro: document.getElementById("tv-today-intro"),
    recall: document.getElementById("tv-recall"),
    recallStep: document.getElementById("tv-recall-step"),
    recallCue: document.getElementById("tv-recall-cue"),
    recallReveal: document.getElementById("tv-recall-reveal"),
    recallAnswer: document.getElementById("tv-recall-answer"),
    recallRate: document.getElementById("tv-recall-rate"),
    todayStart: document.getElementById("tv-today-start"),
    todayReload: document.getElementById("tv-today-reload"),
    challengeForm: document.getElementById("tv-challenge-form"),
    challengeWebMode: document.getElementById("tv-challenge-web-mode"),
    challengePrompt: document.getElementById("tv-challenge-prompt"),
    challengeStatus: document.getElementById("tv-challenge-status"),
    challengeResult: document.getElementById("tv-challenge-result"),
    challengeRevision: document.getElementById("tv-challenge-revision"),
    challengeGenerate: document.getElementById("tv-challenge-generate"),
    challengeTopicSearch: document.getElementById("tv-challenge-topic-search"),
    challengeTopicFilter: document.getElementById("tv-challenge-topic-filter"),
    challengeTopicsList: document.getElementById("tv-challenge-topics-list"),
    challengeStarterGroups: document.getElementById("tv-challenge-starter-chips"),
    challengeTabPicks: document.getElementById("tv-challenge-tab-picks"),
    challengeTabCustom: document.getElementById("tv-challenge-tab-custom"),
    challengeTabSaved: document.getElementById("tv-challenge-tab-saved"),
    challengePanelPicks: document.getElementById("tv-challenge-panel-picks"),
    challengePanelCustom: document.getElementById("tv-challenge-panel-custom"),
    challengeCompose: document.getElementById("tv-challenge-compose"),
    challengeLayout: document.getElementById("tv-challenge-layout"),
    challengeSessionBar: document.getElementById("tv-challenge-session-bar"),
    challengeDupeChoice: document.getElementById("tv-challenge-dupe-choice"),
    challengePrimary: document.querySelector(".tv-challenge-primary"),
    dbModePill: document.getElementById("tv-db-mode"),
  };

  const views = {
    lookup: document.getElementById("tv-view-lookup"),
    today: document.getElementById("tv-view-today"),
    library: document.getElementById("tv-view-library"),
    challenge: document.getElementById("tv-view-challenge"),
  };

  let activeId = null;
  let activeEnglish = "";
  let activeRow = null;
  let pending = null;
  let libraryItems = [];
  let selectMode = false;
  let selectedIds = new Set();
  let todayQueue = [];
  let todayIndex = 0;
  let recallRevealed = false;
  let pendingSuggestions = [];
  const DEFAULT_IGNORE_PARTICLES = ["ค่ะ", "ครับ", "คะ", "นะ"];
  let lastChallengeData = null;
  let activeChallengeId = null;
  let challengeTopicItems = [];
  let challengeGlossHidden = false;
  let pendingStarterIdx = null;

  const CHALLENGE_STATUS_LABELS = {
    current: "Studying · 進行中",
    draft: "Draft · 草稿",
    reviewed: "Done · 完成",
    archived: "Archived · 封存",
  };

  const CHALLENGE_STARTER_GROUPS = [
    { id: "today", title: "Today · 今日" },
    { id: "out", title: "Out & about · 出門" },
    { id: "say", title: "Say this · 開口說" },
  ];

  const CHALLENGE_STARTERS = [
    {
      label: "Headlines today",
      prompt: "What are the top Thailand headline news today?",
      kind: "live",
      group: "today",
    },
    {
      label: "Bangkok weather",
      prompt: "What is the weather in Bangkok today?",
      kind: "live",
      group: "today",
    },
    {
      label: "Bangkok air quality",
      prompt: "What is the air quality in Bangkok today?",
      kind: "live",
      group: "today",
    },
    {
      label: "BTS / MRT updates",
      prompt: "Any travel or BTS/MRT disruption in Bangkok this week?",
      kind: "live",
      group: "today",
    },
    {
      label: "USD → baht",
      prompt: "What is the USD to Thai baht exchange rate today?",
      kind: "live",
      group: "today",
    },
    {
      label: "Upcoming holidays",
      prompt: "What festivals or public holidays are coming up in Thailand?",
      kind: "live",
      group: "today",
    },
    {
      label: "Trending story (simple Thai)",
      prompt:
        "Summarize one trending story in Thailand today in simple Thai sentences.",
      kind: "live",
      group: "today",
    },
    {
      label: "BTS Rabbit card",
      prompt: "Buy a one-day BTS rabbit card and ask how to top up.",
      kind: "practice",
      group: "out",
    },
    {
      label: "7-Eleven checkout",
      prompt: "At 7-Eleven: ask for a bag, straw, and receipt.",
      kind: "practice",
      group: "out",
    },
    {
      label: "Grab pickup",
      prompt: "Call a Grab: I'm at the main gate, silver car please.",
      kind: "practice",
      group: "out",
    },
    {
      label: "Pharmacy visit",
      prompt:
        "At the pharmacy: I have a headache and a slight fever—what do you recommend?",
      kind: "practice",
      group: "out",
    },
    {
      label: "Hair salon trim",
      prompt: "At the salon: trim only, keep length, no dye.",
      kind: "practice",
      group: "out",
    },
    {
      label: "Market bargaining",
      prompt: "At the market: ask price, bargain lightly, and say you'll take two.",
      kind: "practice",
      group: "out",
    },
    {
      label: "Coffee, less sugar",
      prompt: "Could I have a coffee with less sugar?",
      kind: "practice",
      group: "say",
    },
    {
      label: "Iced Thai tea, not sweet",
      prompt: "Order iced Thai tea, not too sweet, at a café.",
      kind: "practice",
      group: "say",
    },
    {
      label: "Bill & PromptPay",
      prompt: "Ask for the bill and pay by PromptPay at a restaurant.",
      kind: "practice",
      group: "say",
    },
    {
      label: "Introduce yourself",
      prompt:
        "Introduce yourself: name, country, why you're learning Thai (3–4 sentences).",
      kind: "practice",
      group: "say",
    },
    {
      label: "Polite refusal",
      prompt:
        "Polite refusal: a friend invites you out but you're busy tonight.",
      kind: "practice",
      group: "say",
    },
    {
      label: "Vegetarian order",
      prompt:
        "Explain you're vegetarian and ask which dishes have no fish sauce.",
      kind: "practice",
      group: "say",
    },
    {
      label: "Neighbor small talk",
      prompt: "Small talk with a neighbor: weekend plans and the heat or rain.",
      kind: "practice",
      group: "say",
    },
  ];

  function setStatus(msg, kind) {
    els.status.textContent = msg || "";
    els.status.className = "tv-status" + (kind ? " is-" + kind : "");
  }

  function setChallengeStatus(msg, kind) {
    if (!els.challengeStatus) return;
    els.challengeStatus.textContent = msg || "";
    els.challengeStatus.className = "tv-status" + (kind ? " is-" + kind : "");
  }

  async function ensureLibraryForChallenge() {
    if (libraryItems.length > 0) return libraryItems;
    try {
      const data = await api("/history?limit=500");
      libraryItems = data.items || [];
    } catch (e) {
      libraryItems = [];
    }
    return libraryItems;
  }

  function findKnownInSentence(thai, cards) {
    const hits = [];
    const used = new Set();
    const sorted = (cards || [])
      .slice()
      .filter(function (c) {
        return c.thai_word && c.revision_status !== "archived";
      })
      .sort(function (a, b) {
        return String(b.thai_word).length - String(a.thai_word).length;
      });
    for (let c = 0; c < sorted.length; c++) {
      const card = sorted[c];
      const w = String(card.thai_word).trim();
      if (w.length < 2) continue;
      let idx = 0;
      while ((idx = thai.indexOf(w, idx)) !== -1) {
        const key = idx + "|" + w;
        if (!used.has(key)) {
          hits.push({
            thai: w,
            card_id: card.id,
            english: card.english_input,
          });
          used.add(key);
        }
        idx += w.length;
      }
    }
    return hits.slice(0, 8);
  }

  function hasThaiScript(s) {
    return /[\u0E00-\u0E7F]/.test(String(s || ""));
  }

  function fallbackRomanHintClient(roman) {
    const r = String(roman || "").trim();
    if (!r) {
      return "Read the full Roman line below syllable by syllable.";
    }
    const parts = r
      .split(/\s*-\s*/)
      .map(function (p) {
        return p.trim();
      })
      .filter(Boolean);
    return "Read aloud: " + (parts.length ? parts.join(" · ") : r);
  }

  function renderHintTriplet(level, romanLine) {
    let h = "";
    let romanHint = level.hint_roman;
    if (!romanHint || hasThaiScript(romanHint)) {
      romanHint = fallbackRomanHintClient(romanLine);
    }
    h +=
      '<p class="tv-hint-line tv-hint-roman"><strong>Roman · 讀音：</strong> ' +
      esc(romanHint) +
      "</p>";
    let hintEn = level.hint_en;
    if (hintEn && hasThaiScript(hintEn)) {
      hintEn =
        "See chunk glosses below (English only here — Thai is in the chunks).";
    }
    if (hintEn) {
      h +=
        '<p class="tv-hint-line"><strong>English · 英文：</strong> ' +
        esc(hintEn) +
        "</p>";
    }
    let hintZh = level.hint_zh;
    if (hintZh && hasThaiScript(hintZh)) {
      hintZh = "請先看詞組與下方「完整句」的繁體譯文。";
    }
    if (hintZh) {
      h +=
        '<p class="tv-hint-line" lang="zh-Hant"><strong>繁體：</strong> ' +
        esc(hintZh) +
        "</p>";
    }
    return h;
  }

  function renderBeginnerHints(s, beg, known) {
    const strategy =
      beg.strategy || "Find the action word, then who or what it applies to.";
    const ignore = (beg.ignore || []).concat(DEFAULT_IGNORE_PARTICLES);
    const uniqIgnore = [];
    ignore.forEach(function (p) {
      if (p && s.thai.indexOf(p) !== -1 && uniqIgnore.indexOf(p) === -1) {
        uniqIgnore.push(p);
      }
    });
    let html =
      '<section class="tv-hint-level tv-hint-beginner">' +
      "<h4>Beginner · 入門</h4>" +
      '<p class="tv-guide-strategy">' +
      esc(strategy) +
      "</p>" +
      renderHintTriplet(beg, s.roman);
    if (known.length) {
      html +=
        '<p class="tv-guide-known"><strong>From your library · 詞庫：</strong> ';
      html += known
        .map(function (k) {
          return (
            '<button type="button" class="tv-guide-known-chip" data-card-id="' +
            esc(k.card_id) +
            '"><b lang="th">' +
            esc(k.thai) +
            "</b> · " +
            esc(k.english) +
            "</button>"
          );
        })
        .join("");
      html += "</p>";
    }
    if (uniqIgnore.length) {
      html +=
        '<p class="tv-guide-skip"><strong>Skip · 略過：</strong> ' +
        uniqIgnore
          .map(function (p) {
            return '<span lang="th">' + esc(p) + "</span>";
          })
          .join(", ") +
        "</p>";
    }
    const chunks = beg.chunks || [];
    if (chunks.length) {
      html += '<ul class="tv-guide-chunks">';
      chunks.forEach(function (ch) {
        html +=
          "<li><span class=\"tv-guide-role\">" +
          esc(ch.role) +
          '</span> <b lang="th">' +
          esc(ch.thai) +
          "</b>" +
          (ch.hint_en ? " · " + esc(ch.hint_en) : "") +
          "</li>";
      });
      html += "</ul>";
    }
    html += "</section>";
    return html;
  }

  function renderIntermediateHints(s, mid) {
    const strategy =
      mid.strategy ||
      "Split the sentence into clauses; note what Thai leaves unsaid.";
    let html =
      '<section class="tv-hint-level tv-hint-intermediate">' +
      "<h4>Intermediate · 進階</h4>" +
      '<p class="tv-guide-strategy">' +
      esc(strategy) +
      "</p>" +
      renderHintTriplet(mid, s.roman);
    const clauses = mid.clauses || [];
    if (clauses.length) {
      html += '<ul class="tv-guide-clauses">';
      clauses.forEach(function (cl) {
        html +=
          "<li><span class=\"tv-guide-job\">" +
          esc(cl.job) +
          '</span> <b lang="th">' +
          esc(cl.thai) +
          "</b></li>";
      });
      html += "</ul>";
    }
    if (mid.omitted) {
      html +=
        '<p class="tv-guide-omitted"><strong>Omitted · 省略：</strong> ' +
        esc(mid.omitted) +
        "</p>";
    }
    if (mid.watch) {
      html +=
        '<p class="tv-guide-watch"><strong>Watch · 注意：</strong> ' +
        esc(mid.watch) +
        "</p>";
    }
    html += "</section>";
    return html;
  }

  function renderGuideBody(s) {
    const guide = s.guide || {};
    const beg = guide.beginner || {};
    const mid = guide.intermediate || {};
    const known = findKnownInSentence(s.thai, libraryItems);
    return (
      '<div class="tv-challenge-guide-body">' +
      "<h3 class=\"tv-hint-head\">Reading hints · 讀句提示</h3>" +
      renderBeginnerHints(s, beg, known) +
      renderIntermediateHints(s, mid) +
      '<div class="tv-challenge-ref">' +
      "<h4>Full line · 完整句</h4>" +
      '<p class="tv-challenge-roman"><strong>Roman · 羅馬拼音：</strong> ' +
      esc(s.roman) +
      "</p>" +
      '<p class="tv-challenge-en tv-challenge-gloss"><strong>English · 英文：</strong> ' +
      '<span class="tv-challenge-gloss-text">' +
      esc(s.english) +
      "</span></p>" +
      (s.chinese_traditional
        ? '<p class="tv-challenge-zh tv-challenge-gloss" lang="zh-Hant"><strong>繁體：</strong> ' +
          '<span class="tv-challenge-gloss-text">' +
          esc(s.chinese_traditional) +
          "</span></p>"
        : "") +
      "</div></div>"
    );
  }

  function normalizeChallengePrompt(p) {
    return String(p || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function findSavedByPrompt(prompt) {
    const key = normalizeChallengePrompt(prompt);
    if (!key) return null;
    for (let i = 0; i < challengeTopicItems.length; i++) {
      const row = challengeTopicItems[i];
      if (normalizeChallengePrompt(row.prompt) === key) return row;
    }
    return null;
  }

  function challengeStatusLabel(st) {
    return CHALLENGE_STATUS_LABELS[st] || st || "Studying · 進行中";
  }

  function challengeWebModeLabel(mode) {
    if (mode === "live") return "Live web · Tavily";
    if (mode === "practice") return "Practice only";
    return "Auto";
  }

  function challengeRouteLabel(data) {
    if (data.web_decision === "live" && data.web_used) return "Live · Tavily";
    if (data.web_decision === "live") return "Live (fallback)";
    return "Practice · DeepSeek";
  }

  function setChallengeReadingMode(on) {
    const reading = !!on;
    if (els.challengePrimary) {
      els.challengePrimary.classList.toggle("tv-is-reading", reading);
    }
    if (els.challengeCompose) {
      els.challengeCompose.hidden = reading;
    }
  }

  function exitChallengeReading() {
    setChallengeReadingMode(false);
    challengeGlossHidden = false;
    if (els.challengeResult) els.challengeResult.innerHTML = "";
    if (els.challengeSessionBar) {
      els.challengeSessionBar.hidden = true;
      els.challengeSessionBar.innerHTML = "";
    }
    if (els.challengeRevision) {
      els.challengeRevision.hidden = true;
      els.challengeRevision.innerHTML = "";
    }
    activeChallengeId = null;
    lastChallengeData = null;
    setChallengeComposeTab("picks");
  }

  function applyChallengeGlossHidden() {
    if (!els.challengeResult) return;
    els.challengeResult.classList.toggle(
      "tv-challenge-gloss-hidden",
      challengeGlossHidden
    );
    const btn = els.challengeSessionBar
      ? els.challengeSessionBar.querySelector("[data-challenge-gloss-toggle]")
      : null;
    if (btn) {
      btn.textContent = challengeGlossHidden
        ? "Show English · 繁體 · 顯示"
        : "Hide English · 繁體 · 隱藏";
      btn.setAttribute(
        "aria-pressed",
        challengeGlossHidden ? "true" : "false"
      );
    }
  }

  function challengeTopicLabel(row) {
    return (
      (row && (row.topic_en || row.prompt)) ||
      "Challenge topic"
    );
  }

  function challengeTopicDate(iso) {
    if (!iso) return "";
    const d = String(iso).slice(0, 10);
    return d;
  }

  function challengeFilterQuery() {
    const f = els.challengeTopicFilter ? els.challengeTopicFilter.value : "active";
    if (f === "all") return { include_archived: "true" };
    if (f === "archived") return { status: "archived", include_archived: "true" };
    if (f === "reviewed") return { status: "reviewed" };
    return {};
  }

  function challengeListItemFromResponse(data) {
    if (!data || !data.id) return null;
    return {
      id: data.id,
      prompt: data.prompt,
      topic_en: data.topic_en,
      revision_status: data.revision_status || "current",
      web_decision: data.web_decision,
      updated_at: data.updated_at || new Date().toISOString(),
    };
  }

  function upsertChallengeTopicListItem(data) {
    const item = challengeListItemFromResponse(data);
    if (!item) return;
    challengeTopicItems = [item].concat(
      challengeTopicItems.filter(function (r) {
        return r.id !== item.id;
      })
    );
    renderChallengeTopicsList();
  }

  function ensureChallengeTopicsLoaded() {
    if (challengeTopicItems.length) return Promise.resolve();
    return loadChallengeTopics();
  }

  function loadChallengeTopics() {
    if (!els.challengeTopicsList) return Promise.resolve();
    const q = els.challengeTopicSearch
      ? els.challengeTopicSearch.value.trim()
      : "";
    const params = new URLSearchParams({ limit: "80" });
    if (q) params.set("q", q);
    const filt = challengeFilterQuery();
    Object.keys(filt).forEach(function (k) {
      params.set(k, filt[k]);
    });
    return api("/challenge?" + params.toString())
      .then(function (data) {
        challengeTopicItems = data.items || [];
        renderChallengeTopicsList();
      })
      .catch(function (e) {
        renderChallengeTopicsList();
        if (challengeTopicItems.length) return;
        const msg = (e && e.message) || "";
        if (/method not allowed/i.test(msg)) {
          setChallengeStatus(
            "Saved topics need an updated API. Stop the old server and run: node scripts/translation-api-local.mjs",
            "error"
          );
          return;
        }
        setChallengeStatus(
          msg ||
            "Could not load saved topics. Restart the local API (port 8765) if you recently updated.",
          "error"
        );
      });
  }

  function probeChallengeApi() {
    return api("/challenge?limit=1")
      .then(function () {
        return true;
      })
      .catch(function (e) {
        if (/method not allowed/i.test((e && e.message) || "")) {
          setChallengeStatus(
            "Challenge library API is out of date on port 8765. Restart: node scripts/translation-api-local.mjs",
            "error"
          );
        }
        return false;
      });
  }

  function renderChallengeTopicsList() {
    if (!els.challengeTopicsList) return;
    if (!challengeTopicItems.length) {
      els.challengeTopicsList.innerHTML =
        '<li class="tv-hint">No saved topics yet. Generate one to start.</li>';
      return;
    }
    els.challengeTopicsList.innerHTML = challengeTopicItems
      .map(function (row) {
        const on = row.id === activeChallengeId ? " is-on" : "";
        const title = esc(challengeTopicLabel(row));
        const meta =
          esc(challengeStatusLabel(row.revision_status || "current")) +
          " · " +
          esc(row.web_decision === "live" ? "Live" : "Practice") +
          " · " +
          esc(challengeTopicDate(row.updated_at));
        return (
          '<li><button type="button" class="tv-challenge-topic-row' +
          on +
          '" data-challenge-id="' +
          esc(row.id) +
          '"><span class="tv-challenge-topic-title">' +
          title +
          '</span><span class="tv-challenge-topic-meta">' +
          meta +
          "</span></button></li>"
        );
      })
      .join("");
  }

  function renderChallengeSessionBar(data) {
    if (!els.challengeSessionBar || !data) return;
    const title = challengeTopicLabel(data);
    const route = challengeRouteLabel(data);
    const mode = challengeWebModeLabel(data.web_mode_requested || "auto");
    els.challengeSessionBar.hidden = false;
    els.challengeSessionBar.innerHTML =
      '<div class="tv-challenge-session-main">' +
      "<h2 class=\"tv-challenge-session-title\">" +
      esc(title) +
      "</h2>" +
      '<p class="tv-challenge-session-meta">' +
      esc(route) +
      " · " +
      esc(mode) +
      "</p>" +
      "</div>" +
      '<div class="tv-challenge-session-actions">' +
      '<button type="button" class="tv-secondary" data-challenge-gloss-toggle aria-pressed="false">Hide English · 繁體 · 隱藏</button>' +
      (data.id
        ? '<button type="button" class="tv-secondary" data-challenge-regenerate>Regenerate · 重新生成</button>'
        : "") +
      '<button type="button" class="tv-secondary" data-challenge-new-topic>New topic · 新主題</button>' +
      "</div>";
    applyChallengeGlossHidden();
  }

  function renderChallengeRevision(data) {
    if (!els.challengeRevision) return;
    if (!data || !data.id) {
      els.challengeRevision.hidden = true;
      els.challengeRevision.innerHTML = "";
      return;
    }
    const notesVal = data.notes || "";
    const stVal = data.revision_status || "current";
    els.challengeRevision.hidden = false;
    els.challengeRevision.innerHTML =
      '<details class="tv-challenge-notes-drawer">' +
      "<summary>Notes & status · 備註與狀態</summary>" +
      '<p class="tv-hint">Kept when you regenerate this topic.</p>' +
      '<label for="tv-challenge-notes">Notes</label>' +
      '<textarea id="tv-challenge-notes" rows="2">' +
      esc(notesVal) +
      "</textarea>" +
      '<label for="tv-challenge-rev-status">Status</label>' +
      '<select id="tv-challenge-rev-status">' +
      ["current", "draft", "reviewed", "archived"]
        .map(function (st) {
          const sel = stVal === st ? " selected" : "";
          return (
            '<option value="' +
            st +
            '"' +
            sel +
            ">" +
            esc(challengeStatusLabel(st)) +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      '<div class="tv-actions">' +
      '<button type="button" class="tv-secondary" id="tv-challenge-save-revision">Save</button>' +
      '<button type="button" class="tv-danger" id="tv-challenge-delete">Delete topic</button>' +
      "</div></details>";
  }

  function applyChallengeTopic(data, opts) {
    opts = opts || {};
    lastChallengeData = data;
    activeChallengeId = data.id || null;
    if (els.challengePrompt && data.prompt) {
      els.challengePrompt.value = data.prompt;
    }
    if (els.challengeWebMode && data.web_mode_requested) {
      els.challengeWebMode.value = data.web_mode_requested;
    }
    if (els.challengeDupeChoice) els.challengeDupeChoice.hidden = true;
    pendingStarterIdx = null;
    if (els.challengeLayout) {
      els.challengeLayout.classList.remove("tv-challenge-tab-saved");
    }
    setChallengeComposeTab(
      els.challengeTabPicks ? "picks" : "custom",
      { skipLayoutSaved: true }
    );
    renderChallengeSessionBar(data);
    renderChallengeResult(data);
    renderChallengeRevision(data);
    upsertChallengeTopicListItem(data);
    if ((data.sentences || []).length && !opts.keepCompose) {
      setChallengeReadingMode(true);
      if (els.challengeResult && els.challengeResult.scrollIntoView) {
        els.challengeResult.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function openChallengeTopic(id) {
    if (!id) return Promise.resolve();
    setChallengeStatus("Loading saved topic…", "loading");
    return api("/challenge?id=" + encodeURIComponent(id))
      .then(function (data) {
        applyChallengeTopic(data.item || data);
        setChallengeStatus("", "");
      })
      .catch(function (e) {
        setChallengeStatus(e.message || "Could not load topic.", "error");
      });
  }

  function saveChallengeRevision() {
    if (!activeChallengeId || !els.challengeRevision) return Promise.resolve();
    const notesEl = els.challengeRevision.querySelector("#tv-challenge-notes");
    const statusEl = els.challengeRevision.querySelector("#tv-challenge-rev-status");
    return api("/challenge", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeChallengeId,
        notes: notesEl ? notesEl.value : "",
        revision_status: statusEl ? statusEl.value : "current",
      }),
    })
      .then(function (data) {
        const item = data.item || data;
        lastChallengeData = Object.assign({}, lastChallengeData, item);
        setChallengeStatus("Revision saved.", "");
        return loadChallengeTopics();
      })
      .catch(function (e) {
        setChallengeStatus(e.message, "error");
      });
  }

  function deleteChallengeTopic() {
    if (!activeChallengeId) return Promise.resolve();
    if (
      !window.confirm(
        "Delete this saved challenge topic? This cannot be undone."
      )
    ) {
      return Promise.resolve();
    }
    const id = activeChallengeId;
    return api("/challenge?id=" + encodeURIComponent(id), { method: "DELETE" })
      .then(function () {
        if (activeChallengeId === id) {
          exitChallengeReading();
        }
        setChallengeStatus("Topic deleted.", "");
        return loadChallengeTopics();
      })
      .catch(function (e) {
        setChallengeStatus(e.message, "error");
      });
  }

  function setChallengeComposeTab(which, opts) {
    opts = opts || {};
    const picks = which === "picks";
    const custom = which === "custom";
    const saved = which === "saved";
    if (els.challengeTabPicks) {
      els.challengeTabPicks.classList.toggle("is-on", picks);
      els.challengeTabPicks.setAttribute("aria-selected", picks ? "true" : "false");
      els.challengeTabPicks.tabIndex = picks ? 0 : -1;
    }
    if (els.challengeTabCustom) {
      els.challengeTabCustom.classList.toggle("is-on", custom);
      els.challengeTabCustom.setAttribute("aria-selected", custom ? "true" : "false");
      els.challengeTabCustom.tabIndex = custom ? 0 : -1;
    }
    if (els.challengeTabSaved) {
      els.challengeTabSaved.classList.toggle("is-on", saved);
      els.challengeTabSaved.setAttribute("aria-selected", saved ? "true" : "false");
      els.challengeTabSaved.tabIndex = saved ? 0 : -1;
    }
    if (els.challengePanelPicks) els.challengePanelPicks.hidden = !picks;
    if (els.challengePanelCustom) els.challengePanelCustom.hidden = !custom;
    if (!opts.skipLayoutSaved && els.challengeLayout) {
      els.challengeLayout.classList.toggle("tv-challenge-tab-saved", saved);
    }
    if (saved) loadChallengeTopics();
  }

  function renderChallengeStarterChips() {
    if (!els.challengeStarterGroups) return;
    els.challengeStarterGroups.innerHTML = CHALLENGE_STARTER_GROUPS.map(function (g) {
      const chips = CHALLENGE_STARTERS.map(function (s, i) {
        if (s.group !== g.id) return "";
        const kind = s.kind === "live" ? "live" : "practice";
        return (
          '<button type="button" class="tv-challenge-starter-chip" role="listitem" data-starter-idx="' +
          i +
          '" data-kind="' +
          kind +
          '" title="' +
          esc(s.prompt) +
          '">' +
          esc(s.label) +
          "</button>"
        );
      }).join("");
      return (
        '<section class="tv-challenge-starter-group">' +
        "<h3 class=\"tv-challenge-starter-group-title\">" +
        esc(g.title) +
        "</h3>" +
        '<div class="tv-challenge-starter-chips" role="list">' +
        chips +
        "</div></section>"
      );
    }).join("");
  }

  function setChallengeStartersBusy(busy) {
    if (!els.challengeStarterGroups) return;
    els.challengeStarterGroups
      .querySelectorAll(".tv-challenge-starter-chip")
      .forEach(function (btn) {
        btn.classList.toggle("is-busy", busy);
        btn.disabled = !!busy;
      });
  }

  function hideDupeChoice() {
    pendingStarterIdx = null;
    if (els.challengeDupeChoice) {
      els.challengeDupeChoice.hidden = true;
      els.challengeDupeChoice.innerHTML = "";
    }
  }

  function showDupeChoice(idx, existing) {
    pendingStarterIdx = idx;
    const s = CHALLENGE_STARTERS[idx];
    if (!els.challengeDupeChoice || !s) return;
    els.challengeDupeChoice.hidden = false;
    els.challengeDupeChoice.innerHTML =
      '<p class="tv-challenge-dupe-text">Already saved: <strong>' +
      esc(challengeTopicLabel(existing)) +
      "</strong></p>" +
      '<div class="tv-challenge-dupe-actions">' +
      '<button type="button" class="tv-primary" data-dupe-action="open">Open saved · 打開</button>' +
      '<button type="button" class="tv-secondary" data-dupe-action="new">New run · 再生成</button>' +
      '<button type="button" class="tv-secondary" data-dupe-action="cancel">Cancel</button>' +
      "</div>";
  }

  function runChallengeFromStarter(idx, forceNew) {
    const s = CHALLENGE_STARTERS[idx];
    if (!s) return;
    ensureChallengeTopicsLoaded().then(function () {
      if (!forceNew) {
        const existing = findSavedByPrompt(s.prompt);
        if (existing && existing.id) {
          showDupeChoice(idx, existing);
          return;
        }
      }
      hideDupeChoice();
      if (els.challengePrompt) els.challengePrompt.value = s.prompt;
      if (els.challengeWebMode) els.challengeWebMode.value = "auto";
      runChallengeGenerate({ prompt: s.prompt, web_mode: "auto" });
    });
  }

  function runChallengeGenerate(opts) {
    opts = opts || {};
    const prompt = (opts.prompt != null
      ? opts.prompt
      : els.challengePrompt.value
    ).trim();
    if (!prompt) {
      setChallengeStatus("Describe a topic first.", "error");
      return Promise.resolve();
    }
    const webMode = opts.web_mode ||
      (els.challengeWebMode ? els.challengeWebMode.value : "auto");
    const body = { prompt: prompt, web_mode: webMode };
    if (opts.regenerate_id) body.regenerate_id = opts.regenerate_id;

    setChallengeStatus(
      opts.regenerate_id
        ? "Regenerating Thai practice…"
        : "Generating Thai practice…",
      "loading"
    );
    if (els.challengeGenerate) els.challengeGenerate.disabled = true;
    setChallengeStartersBusy(true);
    if (els.challengeSessionBar) {
      els.challengeSessionBar
        .querySelectorAll("button")
        .forEach(function (b) {
          b.disabled = true;
        });
    }

    const isRegenerate = !!opts.regenerate_id;
    return api("/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (data) {
        return ensureLibraryForChallenge().then(function () {
          applyChallengeTopic(data, { keepCompose: isRegenerate });
          if (!data.id) {
            setChallengeStatus(
              "Generated, but not saved to the topic library. Restart the local API (node scripts/translation-api-local.mjs) and try again.",
              "error"
            );
            return;
          }
          const routeMsg =
            data.web_decision === "live" && data.web_used
              ? "Live data path. Saved for revision."
              : "Practice path. Saved for revision.";
          setChallengeStatus(
            data.regenerated ? "Regenerated and saved. " + routeMsg : routeMsg,
            ""
          );
          return loadChallengeTopics();
        });
      })
      .catch(function (e) {
        setChallengeStatus(e.message || "Challenge failed.", "error");
      })
      .finally(function () {
        if (els.challengeGenerate) els.challengeGenerate.disabled = false;
        setChallengeStartersBusy(false);
        if (els.challengeSessionBar) {
          els.challengeSessionBar
            .querySelectorAll("button")
            .forEach(function (b) {
              b.disabled = false;
            });
        }
      });
  }

  function renderChallengeResult(data) {
    if (!els.challengeResult) return;
    const sentences = data.sentences || [];
    const sources = data.source_links || [];
    const sourcesHtml = sources.length
      ? '<details class="tv-challenge-sources-drawer"><summary>Sources · 來源</summary><ul class="tv-challenge-sources">' +
        sources
          .map(function (l) {
            return (
              "<li><a href=\"" +
              esc(l.url) +
              '" target="_blank" rel="noopener noreferrer">' +
              esc(l.title || l.url) +
              "</a></li>"
            );
          })
          .join("") +
        "</ul></details>"
      : "";
    let routeNote = "";
    if (data.web_decision_reason) {
      routeNote =
        '<p class="tv-challenge-route-note">' +
        esc(data.web_decision_reason) +
        "</p>";
    }
    if (data.web_search_error) {
      routeNote +=
        '<p class="tv-challenge-web-warn">' + esc(data.web_search_error) + "</p>";
    }

    els.challengeResult.classList.toggle(
      "tv-challenge-gloss-hidden",
      challengeGlossHidden
    );
    els.challengeResult.innerHTML =
      (data.note_en || sourcesHtml || routeNote
        ? '<header class="tv-challenge-head tv-challenge-head-compact">' +
          (data.note_en
            ? "<p class=\"tv-challenge-note\">" + esc(data.note_en) + "</p>"
            : "") +
          routeNote +
          sourcesHtml +
          "</header>"
        : "") +
      '<ol class="tv-challenge-list">' +
      sentences
        .map(function (s, i) {
          return (
            '<li class="tv-challenge-sentence" data-sentence-idx="' +
            i +
            '">' +
            '<button type="button" class="tv-challenge-thai" lang="th" data-speak-thai="' +
            esc(s.thai) +
            '" title="Open Google Translate to hear this sentence">' +
            esc(s.thai) +
            "</button>" +
            '<p class="tv-challenge-speak-hint">Tap Thai · 🔊 Google Translate</p>' +
            '<div class="tv-challenge-guide">' +
            renderGuideBody(s) +
            "</div></li>"
          );
        })
        .join("") +
      "</ol>";
  }

  function setBanner(html) {
    if (!els.banner) return;
    els.banner.innerHTML = html || "";
    els.banner.hidden = !html;
  }

  function setRefreshVisible(show) {
    if (els.btnRefresh) els.btnRefresh.hidden = !show;
  }

  async function api(path, options) {
    options = options || {};
    const headers = Object.assign({}, options.headers || {});
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    options.headers = headers;
    options.credentials = "include";
    const res = await fetch(apiBase() + path, options);
    const data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      if (res.status === 401 && path.indexOf("/auth") !== 0) {
        setToken("");
        showLoginGate();
      }
      const err = new Error(data.error || "Request failed");
      err.code = data.code;
      throw err;
    }
    return data;
  }

  const loginEl = document.getElementById("tv-login");
  const appEl = document.getElementById("tv-app");
  const loginForm = document.getElementById("tv-login-form");
  const loginError = document.getElementById("tv-login-error");
  const userLabel = document.getElementById("tv-user-label");
  const btnLogout = document.getElementById("tv-logout");

  function showLoginGate() {
    if (loginEl) loginEl.hidden = false;
    if (appEl) appEl.hidden = true;
  }

  function showApp(username) {
    if (loginEl) loginEl.hidden = true;
    if (appEl) appEl.hidden = false;
    if (userLabel) userLabel.textContent = username ? "Signed in · " + username : "";
  }

  async function checkSession() {
    try {
      const data = await api("/auth", { method: "GET" });
      if (data.ok) {
        showApp(data.username);
        return true;
      }
    } catch (e) {
      /* not logged in */
    }
    showLoginGate();
    return false;
  }

  function setView(name) {
    Object.keys(views).forEach(function (key) {
      if (!views[key]) return;
      views[key].hidden = key !== name;
    });
    document.querySelectorAll(".tv-appnav-btn").forEach(function (btn) {
      const on = btn.getAttribute("data-view") === name;
      btn.classList.toggle("is-on", on);
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    if (name === "library") loadHistory();
    if (name === "today") {
      setView("lookup");
      return;
    }
    if (name === "challenge") {
      loadChallengeTopics();
      probeChallengeApi();
      setChallengeComposeTab("picks");
    }
    document.body.classList.toggle("tv-challenge-active", name === "challenge");
    if (els.dbModePill) els.dbModePill.hidden = name === "challenge";
  }

  document.querySelectorAll(".tv-appnav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setView(btn.getAttribute("data-view"));
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (loginError) loginError.textContent = "";
      const username = document.getElementById("tv-login-user").value.trim();
      const password = document.getElementById("tv-login-pass").value;
      api("/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password }),
      })
        .then(function (data) {
          if (data.token) setToken(data.token);
          showApp(data.username || username);
          loadHistory();
        })
        .catch(function (e) {
          if (loginError) loginError.textContent = e.message || "Login failed.";
        });
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      api("/auth?action=logout", { method: "POST" }).finally(function () {
        setToken("");
        showLoginGate();
      });
    });
  }

  async function translateRequest(body) {
    return api("/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function revisionBlockHtml(row) {
    row = row || activeRow || {};
    const notesVal = row.notes || "";
    const stVal = row.revision_status || "current";
    const labels = {
      current: "Studying · 進行中",
      draft: "Draft · 草稿",
      reviewed: "Done · 完成",
      archived: "Archived · 封存",
    };
    return (
      '<div class="tv-revision tv-revision-inline">' +
      '<label for="tv-notes-inline">Notes</label>' +
      '<textarea id="tv-notes-inline" rows="3">' +
      esc(notesVal) +
      "</textarea>" +
      '<label for="tv-rev-status-inline">Status</label>' +
      '<select id="tv-rev-status-inline">' +
      ["current", "draft", "reviewed", "archived"]
        .map(function (st) {
          const sel = stVal === st ? " selected" : "";
          return (
            '<option value="' +
            st +
            '"' +
            sel +
            ">" +
            esc(labels[st] || st) +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      '<div class="tv-actions">' +
      '<button type="button" class="tv-lib-save-inline">Save</button>' +
      '<button type="button" class="tv-lib-open-lookup">Open in Look up</button>' +
      "</div></div>"
    );
  }

  function renderLibraryDetail(row) {
    if (!row) {
      if (els.libDetail) {
        els.libDetail.innerHTML =
          '<p class="tv-hint">Pick a card from the list, or translate a new word in Look up.</p>';
      }
      return;
    }
    const html =
      cardHtml(row.english_input, entryToTranslation(row), {
        cacheHit: true,
        originalInput: row.original_input,
      }) + revisionBlockHtml(row);
    if (els.libDetail) els.libDetail.innerHTML = html;
    bindInlineRevision(els.libDetail);
  }

  function openLibrarySheet(row) {
    if (!els.libSheet || !els.sheetBody || !row) return;
    els.sheetBody.innerHTML =
      cardHtml(row.english_input, entryToTranslation(row), {
        cacheHit: true,
        originalInput: row.original_input,
      }) + revisionBlockHtml(row);
    els.libSheet.hidden = false;
    bindInlineRevision(els.sheetBody);
  }

  function closeLibrarySheet() {
    if (els.libSheet) els.libSheet.hidden = true;
  }

  document.querySelectorAll("[data-close-sheet]").forEach(function (el) {
    el.addEventListener("click", closeLibrarySheet);
  });

  function bindInlineRevision(root) {
    if (!root) return;
    const saveBtn = root.querySelector(".tv-lib-save-inline");
    const openBtn = root.querySelector(".tv-lib-open-lookup");
    const notesEl = root.querySelector("#tv-notes-inline");
    const statusEl = root.querySelector("#tv-rev-status-inline");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        if (!activeId) return;
        api("/history", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: activeId,
            notes: notesEl ? notesEl.value : "",
            revision_status: statusEl ? statusEl.value : "current",
          }),
        })
          .then(function () {
            if (els.notes && notesEl) els.notes.value = notesEl.value;
            if (els.revStatus && statusEl) els.revStatus.value = statusEl.value;
            setStatus("Saved.", "");
            return loadHistory();
          })
          .catch(function (e) {
            setStatus(e.message, "error");
          });
      });
    }
    if (openBtn) {
      openBtn.addEventListener("click", function () {
        closeLibrarySheet();
        setView("lookup");
        if (activeRow) {
          els.input.value = activeRow.english_input || "";
          renderCard(els.result, activeRow.english_input, entryToTranslation(activeRow), {
            cacheHit: true,
            originalInput: activeRow.original_input,
          });
          showRevision(activeRow);
        }
      });
    }
  }

  function showRevision(row) {
    if (!row || !row.id) {
      if (els.revision) els.revision.hidden = true;
      if (els.related) els.related.hidden = true;
      activeId = null;
      activeRow = null;
      setRefreshVisible(false);
      return;
    }
    activeId = row.id;
    activeRow = row;
    activeEnglish = row.english_input || "";
    if (els.revision) els.revision.hidden = false;
    if (els.related) els.related.hidden = false;
    if (els.notes) els.notes.value = row.notes || "";
    if (els.revStatus) els.revStatus.value = row.revision_status || "current";
    setRefreshVisible(true);
    loadRelated(row.id);
    renderLibraryDetail(row);
  }

  function applyCardResponse(data, opts) {
    opts = opts || {};
    const english = data.english_input || els.input.value.trim();
    const t = data.translation || entryToTranslation(data.history);
    renderCard(els.result, english, t, {
      cacheHit: data.cache_hit || opts.cacheHit,
      originalInput: data.original_input || data.english_raw,
    });
    if (data.history) showRevision(data.history);
    setBanner("");
    pending = null;
  }

  function handleTranslateResponse(data) {
    if (data.multiple_senses) {
      setBanner(
        '<p class="tv-banner-title">This English word has several saved senses. Pick one:</p>' +
          data.senses
            .map(function (s) {
              return (
                '<button type="button" class="tv-sense-pick" data-id="' +
                esc(s.id) +
                '"><b lang="th">' +
                esc(s.thai_word) +
                "</b> · " +
                esc(s.english_input) +
                " · " +
                esc(s.chinese_traditional) +
                "</button>"
              );
            })
            .join("")
      );
      setStatus("Choose a sense.", "");
      return;
    }

    if (data.needs_confirm_spelling) {
      pending = {
        type: "spelling",
        english_raw: data.english_raw,
        suggested: data.suggested_english,
        preview: data.preview,
        ambiguous: data.ambiguous,
      };
      if (data.preview) {
        renderCard(els.result, data.english_raw, data.preview, {
          originalInput: data.english_raw,
        });
      }
      let html =
        '<p class="tv-banner-title">' +
        (data.ambiguous
          ? "Input looks unclear. Check before saving."
          : "Possible spelling fix.") +
        "</p>";
      if (data.suggested_english) {
        html +=
          '<button type="button" class="tv-banner-btn" data-action="use-spelling">Use “' +
          esc(data.suggested_english) +
          "”</button>";
      }
      html +=
        '<button type="button" class="tv-banner-btn tv-banner-muted" data-action="keep-spelling">Keep what I typed</button>';
      setBanner(html);
      setStatus("Confirm spelling.", "");
      return;
    }

    if (data.needs_new_sense) {
      pending = {
        type: "sense",
        english_raw: data.english_raw,
        english_input: data.english_input,
        proposed: data.proposed,
        existing: data.existing,
      };
      renderCard(els.result, data.english_input, data.proposed, {
        originalInput: data.english_raw,
      });
      setBanner(
        '<p class="tv-banner-title">Different Thai meaning for the same English word.</p>' +
          '<button type="button" class="tv-banner-btn" data-action="save-sense">Save as new sense</button>' +
          '<button type="button" class="tv-banner-btn tv-banner-muted" data-action="cancel-sense">Cancel</button>'
      );
      setStatus("Same English, new sense?", "");
      return;
    }

    if (data.spelling_redirect) {
      applyCardResponse(data, { cacheHit: true });
      setStatus('Opened saved card for “' + data.suggested_english + "”.", "");
      return;
    }

    applyCardResponse(data, { cacheHit: data.cache_hit });
    setStatus(data.cache_hit ? "Opened saved card." : "Saved.", "");
    loadHistory();
    loadTodayQueue();
  }

  function statusDotClass(st) {
    if (st === "reviewed") return "is-reviewed";
    if (st === "draft") return "is-draft";
    if (st === "archived") return "is-archived";
    return "is-current";
  }

  function renderHistoryList(items) {
    libraryItems = items;
    if (!items.length) {
      els.historyList.innerHTML = '<p class="tv-hint">No cards yet.</p>';
      return;
    }
    els.historyList.innerHTML = items
      .map(function (row) {
        const on = row.id === activeId ? " is-active" : "";
        const st = row.revision_status || "current";
        const gloss =
          esc(row.english_input) +
          (row.chinese_traditional
            ? ' · <span class="tv-hist-zh-inline" lang="zh-Hant">' +
              esc(row.chinese_traditional) +
              "</span>"
            : "");
        const checked = selectedIds.has(row.id) ? " checked" : "";
        return (
          '<div class="tv-hist-item tv-hist-row' +
          on +
          '">' +
          '<input type="checkbox" class="tv-hist-check"' +
          (selectMode ? "" : " hidden") +
          checked +
          ' aria-label="Select card" data-check-id="' +
          esc(row.id) +
          '">' +
          '<button type="button" class="tv-hist-open" data-id="' +
          esc(row.id) +
          '">' +
          "<div><b lang=\"th\">" +
          esc(row.thai_word) +
          '</b><span class="tv-hist-gloss">' +
          gloss +
          "</span></div>" +
          '<span class="tv-status-dot ' +
          statusDotClass(st) +
          '" title="' +
          esc(st) +
          '"><span class="visually-hidden">' +
          esc(st) +
          "</span></span></button></div>"
        );
      })
      .join("");
    updateBatchBar();
  }

  function updateBatchBar() {
    if (!els.batchBar) return;
    els.batchBar.hidden = !selectMode;
    if (els.batchCount) {
      els.batchCount.textContent = selectedIds.size + " selected";
    }
  }

  async function loadHistory() {
    const q = els.search.value.trim();
    const st = els.statusFilter.value;
    const parts = [];
    if (q) parts.push("q=" + encodeURIComponent(q));
    parts.push("limit=200");
    if (st === "all") parts.push("include_archived=true");
    else if (st === "archived") parts.push("status=archived");
    else if (st && st !== "needs_wording") parts.push("status=" + encodeURIComponent(st));
    else if (!st) parts.push("include_archived=false");
    const qs = "?" + parts.join("&");
    try {
      const data = await api("/history" + qs);
      if (els.dbPill && data.db) els.dbPill.textContent = "DB · " + data.db;
      let items = data.items || [];
      if (st === "needs_wording") {
        items = items.filter(function (r) {
          return r.revision_status === "current" || r.revision_status === "draft";
        });
      }
      renderHistoryList(items);
    } catch (e) {
      els.historyList.innerHTML =
        '<p class="tv-hint is-error">' +
        esc(e.message) +
        ". Start: node scripts/translation-api-local.mjs</p>";
    }
  }

  function renderRelated(data) {
    els.suggestList.innerHTML = "";
    pendingSuggestions = [];
    const links = data.links || [];
    const weak = data.weak || [];
    if (!links.length && !weak.length) {
      els.relatedList.innerHTML =
        '<p class="tv-hint">No links yet. Use Suggest links after marking reviewed.</p>';
      return;
    }
    let html = "";
    links.forEach(function (l) {
      html +=
        '<button type="button" class="tv-link-chip" data-id="' +
        esc(l.card_id) +
        '">' +
        '<span class="tv-link-rel">' +
        esc(l.relation.replace(/_/g, " ")) +
        "</span> " +
        '<b lang="th">' +
        esc(l.thai_word) +
        "</b> " +
        esc(l.english_input) +
        '<button type="button" class="tv-link-remove" data-link-id="' +
        esc(l.link_id) +
        '" aria-label="Remove link">×</button></button>';
    });
    weak.forEach(function (l) {
      html +=
        '<button type="button" class="tv-link-chip tv-link-weak" data-id="' +
        esc(l.card_id) +
        '">' +
        '<span class="tv-link-rel">in example</span> ' +
        '<b lang="th">' +
        esc(l.thai_word) +
        "</b> " +
        esc(l.english_input) +
        '<button type="button" class="tv-link-add" data-add-id="' +
        esc(l.card_id) +
        '" data-relation="often_with">+</button></button>';
    });
    els.relatedList.innerHTML = html;
  }

  function renderSuggestions(items) {
    pendingSuggestions = items || [];
    if (!items || !items.length) {
      els.suggestList.innerHTML = "<p class=\"tv-hint\">No suggestions.</p>";
      return;
    }
    els.suggestList.innerHTML =
      '<p class="tv-hint">Suggested links — accept to save (may translate once if the word is not in your library).</p>' +
      items
        .map(function (s, idx) {
          const pending = s.pending || !s.card_id;
          const thai = s.thai_word
            ? '<b lang="th">' + esc(s.thai_word) + "</b> "
            : "";
          return (
            '<div class="tv-suggest-item' +
            (pending ? " tv-suggest-pending" : "") +
            '" data-sidx="' +
            idx +
            '">' +
            esc(s.relation.replace(/_/g, " ")) +
            " · " +
            thai +
            esc(s.english) +
            (s.reason ? " — " + esc(s.reason) : "") +
            '<div class="tv-suggest-actions">' +
            '<button type="button" class="tv-suggest-accept" data-sidx="' +
            idx +
            '">Accept</button>' +
            '<button type="button" class="tv-suggest-dismiss" data-sidx="' +
            idx +
            '">Dismiss</button>' +
            (s.card_id && !pending
              ? '<button type="button" class="tv-suggest-linknow" data-to="' +
                esc(s.card_id) +
                '" data-rel="' +
                esc(s.relation) +
                '">Link only</button>'
              : "") +
            "</div></div>"
          );
        })
        .join("");
  }

  async function loadRelated(cardId) {
    if (!cardId) return;
    try {
      const data = await api("/links?card_id=" + encodeURIComponent(cardId));
      renderRelated(data);
    } catch (e) {
      els.relatedList.innerHTML = '<p class="tv-hint">' + esc(e.message) + "</p>";
    }
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const english = els.input.value.trim();
    if (!english) {
      setStatus("Type a word or short phrase.", "error");
      return;
    }
    setView("lookup");
    setStatus("Looking up…", "loading");
    els.form.querySelector(".tv-primary").disabled = true;
    try {
      const data = await translateRequest({ english: english, save: true });
      handleTranslateResponse(data);
    } catch (e) {
      setStatus(e.message || "Translation failed.", "error");
    } finally {
      els.form.querySelector(".tv-primary").disabled = false;
    }
  }

  async function openCardById(id) {
    const data = await api("/history?id=" + encodeURIComponent(id));
    const row = data.item;
    if (!row) return;
    activeId = row.id;
    activeRow = row;
    els.input.value = row.english_input || "";
    showRevision(row);
    renderRelated(data);
    renderCard(els.result, row.english_input, entryToTranslation(row), {
      cacheHit: true,
      originalInput: row.original_input,
    });
    if (MOBILE_LIB_MQ.matches) openLibrarySheet(row);
    else renderLibraryDetail(row);
    await loadHistory();
  }

  async function loadTodayQueue() {
    if (!els.todayIntro) return;
    try {
      const data = await api("/review");
      todayQueue = data.items || [];
      const due = data.due_count || 0;
      const total = data.total_practiceable || todayQueue.length;
      if (!todayQueue.length) {
        els.todayIntro.textContent =
          "No cards ready to practice yet. Save a few words in Look up first.";
        if (els.todayStart) els.todayStart.disabled = true;
        return;
      }
      els.todayIntro.textContent =
        "Today's queue: " +
        todayQueue.length +
        " cards" +
        (due ? " (" + due + " due for review)" : "") +
        ". " +
        total +
        " cards in your active library.";
      if (els.todayStart) els.todayStart.disabled = false;
    } catch (e) {
      els.todayIntro.textContent = e.message || "Could not load queue.";
    }
  }

  function showRecallItem() {
    recallRevealed = false;
    if (todayIndex >= todayQueue.length) {
      els.recall.hidden = true;
      els.todayIntro.textContent = "Session complete. Nice work.";
      if (els.todayStart) els.todayStart.textContent = "Practice again";
      return;
    }
    const row = todayQueue[todayIndex];
    els.recall.hidden = false;
    els.recallStep.textContent =
      "Card " + (todayIndex + 1) + " of " + todayQueue.length;
    els.recallCue.textContent = row.english_input;
    els.recallAnswer.hidden = true;
    els.recallAnswer.innerHTML = "";
    els.recallRate.hidden = true;
    els.recallReveal.hidden = false;
  }

  function startRecallSession() {
    todayIndex = 0;
    if (els.todayStart) els.todayStart.textContent = "Start recall";
    showRecallItem();
  }

  if (els.todayStart) {
    els.todayStart.addEventListener("click", function () {
      if (!todayQueue.length) return;
      startRecallSession();
    });
  }

  if (els.todayReload) {
    els.todayReload.addEventListener("click", function () {
      loadTodayQueue();
    });
  }

  if (els.recallReveal) {
    els.recallReveal.addEventListener("click", function () {
      const row = todayQueue[todayIndex];
      if (!row || recallRevealed) return;
      recallRevealed = true;
      els.recallAnswer.hidden = false;
      els.recallAnswer.innerHTML = cardHtml(row.english_input, entryToTranslation(row), {
        cacheHit: true,
      });
      els.recallReveal.hidden = true;
      els.recallRate.hidden = false;
    });
  }

  if (els.recallRate) {
    els.recallRate.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-rating]");
      if (!btn || !recallRevealed) return;
      const row = todayQueue[todayIndex];
      const rating = btn.getAttribute("data-rating");
      api("/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: row.id, rating: rating }),
      })
        .then(function () {
          todayIndex += 1;
          showRecallItem();
          loadTodayQueue();
        })
        .catch(function (e) {
          setStatus(e.message, "error");
        });
    });
  }

  els.form.addEventListener("submit", onSubmit);

  if (els.challengeForm) {
    els.challengeForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      runChallengeGenerate();
    });
  }

  renderChallengeStarterChips();
  setChallengeComposeTab("picks");

  document.querySelectorAll("[data-challenge-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setChallengeComposeTab(btn.getAttribute("data-challenge-tab"));
    });
  });

  if (els.challengeStarterGroups) {
    els.challengeStarterGroups.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-starter-idx]");
      if (!btn || btn.disabled) return;
      const idx = parseInt(btn.getAttribute("data-starter-idx"), 10);
      if (Number.isNaN(idx)) return;
      runChallengeFromStarter(idx);
    });
  }

  if (els.challengeDupeChoice) {
    els.challengeDupeChoice.addEventListener("click", function (ev) {
      const action = ev.target.closest("[data-dupe-action]");
      if (!action || pendingStarterIdx === null) return;
      const kind = action.getAttribute("data-dupe-action");
      const idx = pendingStarterIdx;
      if (kind === "cancel") {
        hideDupeChoice();
        return;
      }
      if (kind === "open") {
        hideDupeChoice();
        const s = CHALLENGE_STARTERS[idx];
        const existing = s ? findSavedByPrompt(s.prompt) : null;
        if (existing) openChallengeTopic(existing.id);
        return;
      }
      if (kind === "new") {
        runChallengeFromStarter(idx, true);
      }
    });
  }

  if (els.challengeSessionBar) {
    els.challengeSessionBar.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-challenge-gloss-toggle]")) {
        challengeGlossHidden = !challengeGlossHidden;
        applyChallengeGlossHidden();
        return;
      }
      if (ev.target.closest("[data-challenge-regenerate]")) {
        if (!activeChallengeId) {
          setChallengeStatus("Open or generate a topic first.", "error");
          return;
        }
        runChallengeGenerate({ regenerate_id: activeChallengeId });
        return;
      }
      if (ev.target.closest("[data-challenge-new-topic]")) {
        exitChallengeReading();
        setChallengeStatus("", "");
      }
    });
  }

  if (els.challengeTopicsList) {
    els.challengeTopicsList.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-challenge-id]");
      if (!btn) return;
      openChallengeTopic(btn.getAttribute("data-challenge-id"));
    });
  }

  if (els.challengeRevision) {
    els.challengeRevision.addEventListener("click", function (ev) {
      if (ev.target.id === "tv-challenge-save-revision") {
        saveChallengeRevision();
        return;
      }
      if (ev.target.id === "tv-challenge-delete") {
        deleteChallengeTopic();
      }
    });
  }

  if (els.challengeTopicSearch) {
    els.challengeTopicSearch.addEventListener(
      "input",
      (function () {
        let t = null;
        return function () {
          clearTimeout(t);
          t = setTimeout(loadChallengeTopics, 280);
        };
      })()
    );
  }

  if (els.challengeTopicFilter) {
    els.challengeTopicFilter.addEventListener("change", loadChallengeTopics);
  }

  if (els.challengeResult) {
    els.challengeResult.addEventListener("click", function (ev) {
      const speak = ev.target.closest("[data-speak-thai]");
      if (speak) {
        openGoogleTranslateSpeak(speak.getAttribute("data-speak-thai"));
        return;
      }
      const knownChip = ev.target.closest(".tv-guide-known-chip");
      if (knownChip) {
        openCardById(knownChip.getAttribute("data-card-id")).catch(function (e) {
          setChallengeStatus(e.message, "error");
        });
      }
    });
  }

  els.search.addEventListener(
    "input",
    (function () {
      let t = null;
      return function () {
        clearTimeout(t);
        t = setTimeout(loadHistory, 280);
      };
    })()
  );

  els.statusFilter.addEventListener("change", loadHistory);

  els.historyList.addEventListener("change", function (ev) {
    const check = ev.target.closest(".tv-hist-check");
    if (!check || !selectMode) return;
    const id = check.getAttribute("data-check-id");
    if (check.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    updateBatchBar();
  });

  els.historyList.addEventListener("click", function (ev) {
    if (ev.target.closest(".tv-hist-check")) return;
    const btn = ev.target.closest(".tv-hist-open[data-id]");
    if (!btn) return;
    openCardById(btn.getAttribute("data-id")).catch(function (e) {
      setStatus(e.message, "error");
    });
  });

  if (els.libSelectToggle) {
    els.libSelectToggle.addEventListener("click", function () {
      selectMode = !selectMode;
      els.libSelectToggle.textContent = selectMode ? "Done" : "Select";
      if (!selectMode) selectedIds.clear();
      renderHistoryList(libraryItems);
    });
  }

  if (els.batchClear) {
    els.batchClear.addEventListener("click", function () {
      selectedIds.clear();
      renderHistoryList(libraryItems);
    });
  }

  if (els.batchBar) {
    els.batchBar.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-batch]");
      if (!btn || !selectedIds.size) return;
      const status = btn.getAttribute("data-batch");
      api("/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch: true,
          ids: [...selectedIds],
          revision_status: status,
        }),
      })
        .then(function () {
          selectedIds.clear();
          selectMode = false;
          if (els.libSelectToggle) els.libSelectToggle.textContent = "Select";
          setStatus("Updated " + status + ".", "");
          return loadHistory();
        })
        .catch(function (e) {
          setStatus(e.message, "error");
        });
    });
  }

  els.banner.addEventListener("click", function (ev) {
    const pick = ev.target.closest(".tv-sense-pick");
    if (pick) {
      openCardById(pick.getAttribute("data-id"));
      return;
    }
    const btn = ev.target.closest("[data-action]");
    if (!btn || !pending) return;
    const action = btn.getAttribute("data-action");
    if (action === "use-spelling" && pending.type === "spelling") {
      translateRequest({
        english: pending.english_raw,
        confirm_english: pending.suggested,
        spelling_confirmed: true,
        save: true,
      })
        .then(handleTranslateResponse)
        .catch(function (e) {
          setStatus(e.message, "error");
        });
    }
    if (action === "keep-spelling" && pending.type === "spelling") {
      translateRequest({
        english: pending.english_raw,
        spelling_confirmed: true,
        force_ai: true,
        save: true,
      })
        .then(handleTranslateResponse)
        .catch(function (e) {
          setStatus(e.message, "error");
        });
    }
    if (action === "save-sense" && pending.type === "sense") {
      translateRequest({
        english: pending.english_raw,
        save_new_sense: true,
        save: true,
      })
        .then(handleTranslateResponse)
        .catch(function (e) {
          setStatus(e.message, "error");
        });
    }
    if (action === "cancel-sense") {
      pending = null;
      setBanner("");
      setStatus("", "");
    }
  });

  els.btnRefresh.addEventListener("click", function () {
    if (!activeId) return;
    const english = els.input.value.trim() || activeEnglish;
    setStatus("Refreshing from AI…", "loading");
    translateRequest({
      english: english,
      force_ai: true,
      card_id: activeId,
      save: true,
    })
      .then(function (data) {
        handleTranslateResponse(data);
        setStatus("Card refreshed.", "");
      })
      .catch(function (e) {
        setStatus(e.message, "error");
      });
  });

  els.btnSaveNotes.addEventListener("click", function () {
    if (!activeId) return;
    api("/history", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeId,
        notes: els.notes.value,
        revision_status: els.revStatus.value,
      }),
    })
      .then(function () {
        setStatus("Saved.", "");
        return loadHistory();
      })
      .catch(function (e) {
        setStatus(e.message, "error");
      });
  });

  els.btnRetranslate.addEventListener("click", function () {
    els.btnRefresh.click();
  });

  els.btnDelete.addEventListener("click", function () {
    if (!activeId) return;
    if (!confirm("Delete this card?")) return;
    api("/history?id=" + encodeURIComponent(activeId), { method: "DELETE" })
      .then(function () {
        activeId = null;
        activeRow = null;
        els.revision.hidden = true;
        els.related.hidden = true;
        renderCard(els.result, "", null);
        renderLibraryDetail(null);
        setStatus("Deleted.", "");
        return loadHistory();
      })
      .catch(function (e) {
        setStatus(e.message, "error");
      });
  });

  els.relatedList.addEventListener("click", function (ev) {
    const remove = ev.target.closest(".tv-link-remove");
    if (remove) {
      ev.stopPropagation();
      const linkId = remove.getAttribute("data-link-id");
      api("/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_id: linkId }),
      }).then(function () {
        return loadRelated(activeId);
      });
      return;
    }
    const add = ev.target.closest(".tv-link-add");
    if (add) {
      ev.stopPropagation();
      api("/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_id: activeId,
          to_id: add.getAttribute("data-add-id"),
          relation: add.getAttribute("data-relation") || "often_with",
        }),
      }).then(function () {
        return loadRelated(activeId);
      });
      return;
    }
    const chip = ev.target.closest(".tv-link-chip[data-id]");
    if (chip) openCardById(chip.getAttribute("data-id"));
  });

  els.btnSuggestLinks.addEventListener("click", function () {
    if (!activeId) return;
    setStatus("Suggesting links…", "loading");
    api("/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suggest", card_id: activeId }),
    })
      .then(function (data) {
        renderSuggestions(data.suggestions || []);
        setStatus("", "");
      })
      .catch(function (e) {
        setStatus(e.message, "error");
      });
  });

  els.suggestList.addEventListener("click", function (ev) {
    const dismiss = ev.target.closest(".tv-suggest-dismiss");
    if (dismiss) {
      const idx = Number(dismiss.getAttribute("data-sidx"));
      pendingSuggestions.splice(idx, 1);
      renderSuggestions(pendingSuggestions);
      return;
    }
    const accept = ev.target.closest(".tv-suggest-accept");
    if (accept && activeId) {
      const s = pendingSuggestions[Number(accept.getAttribute("data-sidx"))];
      if (!s) return;
      setStatus("Accepting link…", "loading");
      api("/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          from_id: activeId,
          english: s.english,
          relation: s.relation,
          to_id: s.card_id || "",
        }),
      })
        .then(function () {
          pendingSuggestions = pendingSuggestions.filter(function (x) {
            return x !== s;
          });
          renderSuggestions(pendingSuggestions);
          setStatus("Link saved.", "");
          return loadRelated(activeId);
        })
        .catch(function (e) {
          setStatus(e.message, "error");
        });
      return;
    }
    const linkNow = ev.target.closest(".tv-suggest-linknow");
    if (linkNow && activeId) {
      api("/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_id: activeId,
          to_id: linkNow.getAttribute("data-to"),
          relation: linkNow.getAttribute("data-rel"),
        }),
      }).then(function () {
        return loadRelated(activeId);
      });
    }
  });

  renderCard(els.result, "", null);
  checkSession().then(function (ok) {
    if (ok) {
      loadHistory();
    }
  });
})();
