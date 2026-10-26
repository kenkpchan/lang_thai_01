import { generateChallenge, classifyChallengeWebNeed } from "./ai.mjs";
import { tavilySearch } from "./tavily.mjs";

const MAX_LEN = 400;

/** @param {string} mode */
export function normalizeWebMode(mode) {
  const m = String(mode || "auto").trim().toLowerCase();
  if (m === "live" || m === "web" || m === "internet") return "live";
  if (m === "practice" || m === "offline" || m === "deepseek") return "practice";
  return "auto";
}

/**
 * @param {string} prompt
 * @param {string} webModeRequested
 * @param {{ use_web?: boolean }} [opts]
 */
export async function runChallengeGeneration(prompt, webModeRequested, opts = {}) {
  const text = String(prompt || "").trim();
  if (!text) {
    const err = new Error("Describe a topic or challenge in English.");
    err.code = "VALIDATION";
    throw err;
  }
  if (text.length > MAX_LEN) {
    const err = new Error(`Keep the prompt under ${MAX_LEN} characters.`);
    err.code = "VALIDATION";
    throw err;
  }

  const mode = normalizeWebMode(webModeRequested);

  let webDecision = "practice";
  let webDecisionReason = "Conversational Thai practice (no web search).";

  if (mode === "practice" || opts.use_web === false) {
    webDecision = "practice";
    webDecisionReason = "Practice-only mode selected.";
  } else if (mode === "live") {
    webDecision = "live";
    webDecisionReason = "Live web mode selected.";
  } else {
    const route = await classifyChallengeWebNeed(text);
    webDecision = route.needs_web ? "live" : "practice";
    webDecisionReason = route.reason_en;
  }

  const hasTavily = !!process.env.TAVILY_API_KEY;
  let webSources = [];
  let webSearchError = null;
  let webSearchAttempted = false;

  if (webDecision === "live") {
    if (!hasTavily) {
      webSearchError = "TAVILY_API_KEY is not set; using DeepSeek practice mode.";
      webDecision = "practice";
      webDecisionReason += " (No Tavily key on server.)";
    } else {
      webSearchAttempted = true;
      try {
        const search = await tavilySearch(text, { max_results: 5 });
        webSources = search.results;
        if (!webSources.length) {
          webSearchError =
            "Web search returned no results; using DeepSeek practice text.";
          webDecision = "practice";
        }
      } catch (e) {
        webSearchError = e.message || "Web search failed";
        webDecision = "practice";
      }
    }
  }

  const result = await generateChallenge(text, {
    webSources: webSources.length ? webSources : undefined,
  });

  return {
    prompt: text,
    ...result,
    web_mode_requested: mode,
    web_decision: webDecision,
    web_decision_reason: webDecisionReason,
    web_search_attempted: webSearchAttempted,
    web_search_error: webSearchError,
  };
}
