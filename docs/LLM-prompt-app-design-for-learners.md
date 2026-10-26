# LLM prompt — design this Thai learning web app for effective study

Copy everything inside the fenced block below into a new chat with a capable model. Edit the **Project context** section if your repo has changed.

---

```markdown
## Role

You are a **senior learning-product designer** and **full-stack architect** specializing in **second-language acquisition**, **cognitive science for memory**, and **practical AI in education**. Your job is to propose a **coherent product design** for an existing Thai-learning web application—not generic language-app advice.

Optimize for **effective and efficient learning** (retention, transfer to speech, low cognitive load), not feature count.

## Project context (read-only facts)

**Repository:** Thai language workshop (static HTML/JS + Netlify Functions + optional Supabase).

**Already live or built:**

1. **Tone & syllable workshop** (`integrated-tone-vocab.html`) — Thai tones, vowel seats, TNC word list, romanization, tone staves, bundled Thai fonts (iOS tone-mark fix).
2. **Translation vocabulary app** (`integrated-translation-vocab.html`) — English → Thai card (“Version 1 · Clean Essential”: Thai, romanization, 繁體, English gloss, example sentence, Google Translate link).
3. **AI:** OpenAI-compatible API (e.g. DeepSeek) via server-side functions; API key never in browser.
4. **Cards DB:** Saved translations with `english_key`, revision status (`current`, `draft`, `reviewed`, `archived`), notes, lookup log, dedupe/cache (no repeat AI call for same word).
5. **Spelling / sense flow:** Typo confirmation, multiple senses per English key, “refresh card” vs cache hit.
6. **Relations:** Card links (synonym, formal variant, opposite, often_with, same_topic), weak links when Thai headword appears in another card’s example; optional AI “suggest links.”
7. **Auth:** Simple username/password against DB for translation app.
8. **Hosting:** Netlify + GitHub; local dev with proxy-aware Node API.

**Static UI prototypes (history panel ideas, not implemented):**

- `prototype-history-a.html` — two-pane list + detail for revision.
- `prototype-history-b.html` — gallery tiles + bottom sheet.
- `prototype-history-c.html` — review queue + dense table.

**Learner profile (assume unless I override):**

- L1: English; also reads **Traditional Chinese** glosses.
- Goal: spoken + reading Thai for daily life; cares about **tones** and **correct written Thai** (including tone marks).
- Often on **phone** and **desktop**; may be on a **corporate network** (proxy).

## What I want from you

Produce a **design package** that helps learners study **effectively and efficiently**. Include all of the following sections.

### 1. Learning principles (short)

- 5–8 bullets tying design to evidence-informed practice: e.g. retrieval practice, spacing, interleaving, elaboration, concreteness, feedback timing, cognitive load, transfer to production (speaking), role of L1/L2 glosses (English + 繁體).
- Call out what **AI changes** vs pre-AI apps (personalized examples, on-demand clarification, mistake diagnosis, generation at point of need—without replacing spaced repetition discipline).

### 2. Information architecture

- Map **screens/modules** (existing + proposed): how **tone workshop**, **translation cards**, **history/library**, **review queue**, **maps/graphs**, **practice modes** connect.
- Primary navigation for **mobile** vs **desktop**.
- What belongs in **one page** vs **separate flows**.

### 3. AI usage map (API-backed, server-side)

For each use case, specify:

| Use case | User trigger | Model output shape | Save to DB? | Cost/latency note |
|----------|--------------|-------------------|-------------|-------------------|

Cover at least:

- Translation card (existing) — extensions (register, politeness, particle hints).
- **On-demand:** “Explain this Thai word in context,” “Why this tone?”, “Compare near-synonyms.”
- **Generation:** Extra example sentences (level-controlled), dialogue snippets, mnemonics (optional, labeled as mnemonics not facts).
- **Review assist:** Summarize weak areas from card history; suggest **today’s 10 words** from past lookups.
- **Pronunciation / tone coach (text-first):** Romanization feedback, common tone errors for a syllable pattern (no need for audio API unless you recommend one explicitly).
- **Guardrails:** When **not** to call AI (cache hit, reviewed cards, homographs); confirmation UX for spelling/sense (align with existing patterns).

Do **not** propose exposing the API key client-side.

### 4. Memory / “brain map” panel (required deep dive)

Propose **1–2 concrete UI concepts** for a **memory map** or **knowledge graph** panel that helps learners see:

- **Nodes:** cards (Thai headword), English keys, topics (food, travel, work), grammar tags (class consonant, tone rule), linked cards.
- **Edges:** existing link types + suggested new types (e.g. “same root,” “collocation,” “confusable pair”).
- **Views:** e.g. “map around this word,” “topic cluster,” “confusable network (ไก่ vs ใกล้ style).”
- **Interactions:** tap node → open card; filter by status; hide archived; **manual vs AI-suggested** edges (learner must accept).
- **Pedagogy:** how the map supports **elaboration and discrimination**, not just pretty graphs—avoid overwhelming beginners (progressive disclosure: Starter / Intermediate / Expert).

Include a **text wireframe** or ASCII/Mermaid diagram for the map panel.

### 5. History / library at scale (50+ cards)

Compare the three prototype directions (A two-pane, B gallery+sheet, C table+queue) and recommend:

- Default for **phone** and **desktop**.
- Filters, search, batch actions (mark reviewed, archive, tag topic).
- How **繁體** and **English** appear in list rows without clutter.

### 6. Practice loops (beyond lookup)

Design **3 short practice modes** that reuse saved cards (minimal new content types), e.g.:

- Recall: EN → TH (or 繁體 → TH) with self-rating.
- Tone pick for a syllable from the tone workshop rules.
- “Fill the example” or reorder sentence tokens.

For each: duration, data read/written, AI optional or not.

### 7. Integration with tone workshop

- Explicit links from a **translation card** to **tone/syllable builder** when the headword is a single syllable or key phrase.
- Shared **romanization** conventions (already documented in workshop).
- One paragraph on **single visual language** (colors for tone/class/seats).

### 8. Technical fit (constraints)

- Prefer **static frontend + Netlify Functions + Supabase** (or local JSON in dev)—no mandatory React rewrite unless you justify heavily.
- Respect **corporate proxy** for server-side `fetch`.
- **Auth** for learner data; tone workshop may stay public or gated—state recommendation.
- Accessibility: Thai + Chinese fonts, contrast, keyboard.

### 9. Phased roadmap

| Phase | Goal | User-visible outcome | Rough effort (S/M/L) |
|-------|------|----------------------|----------------------|
| Phase 0 | … | … | … |
| Phase 1 | … | … | … |
| … | | | |

At least **4 phases**; Phase 0 = polish existing translation + history UX.

### 10. Risks and anti-patterns

- Over-reliance on AI translation without retrieval.
- Duplicate cards / sense clutter.
- Map UI that looks cool but does not improve recall.
- Latency on slow networks; proxy failures.

## Output format

- Use clear headings matching sections 1–10.
- Use **tables** where specified.
- Include **one Mermaid diagram** for overall module flow and **one** for the memory-map concept.
- End with **“Top 5 recommendations if we only build one sprint”** (prioritized, justified).
- Write so a **solo developer** can implement incrementally.
- Do **not** write production code unless I ask in a follow-up; wireframes and data field names are welcome.

## Optional overrides (fill in if you know them)

- Primary audience age/level: {{e.g. adult A2→B1}}
- Must work offline: {{yes/no}}
- Budget sensitivity to AI calls: {{high/medium/low}}
- Favorite prototype (A/B/C): {{or “undecided”}}

Begin by restating the learner goal in one sentence, then proceed with section 1.
```

---

## Short variant (same chat, less context)

```markdown
Design improvements for a Thai learning site: tone workshop + AI translation cards (Netlify Functions, Supabase, EN→TH+roman+繁體 cards, history, links, auth). Focus on effective learning, scaled history UI (prototypes A/B/C in repo), server-side AI uses beyond translate, and a memory/brain-map panel for words and relations. Principles, IA, AI map table, map wireframe, practice modes, phases, top 5 sprint picks. No client API key. Static HTML preferred.
```

---

*File: `docs/LLM-prompt-app-design-for-learners.md`*
