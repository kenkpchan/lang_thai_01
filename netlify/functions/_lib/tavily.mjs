/**
 * Tavily web search (server-side only). See https://docs.tavily.com
 */

/** @param {string} prompt */
export function tavilyTopicForPrompt(prompt) {
  const p = String(prompt || "").toLowerCase();
  if (/news|headline|headlines|breaking|today|latest|current events/.test(p)) {
    return "news";
  }
  return "general";
}

/**
 * @param {string} query
 * @param {{ max_results?: number, topic?: string, search_depth?: string }} [opts]
 */
export async function tavilySearch(query, opts = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    const err = new Error("TAVILY_API_KEY is not configured on the server.");
    err.code = "CONFIG";
    throw err;
  }

  const max_results = Math.min(Math.max(Number(opts.max_results) || 5, 1), 8);
  const topic = opts.topic || tavilyTopicForPrompt(query);
  const search_depth = opts.search_depth === "advanced" ? "advanced" : "basic";

  let res;
  try {
    res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: String(query).trim(),
        max_results,
        search_depth,
        topic,
        include_answer: false,
      }),
    });
  } catch (e) {
    const hint =
      e?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" || e?.message === "fetch failed"
        ? " Check HTTP_PROXY/HTTPS_PROXY for Tavily."
        : "";
    const err = new Error((e?.message || "Tavily network error") + hint);
    err.code = "NETWORK";
    throw err;
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      payload?.detail?.error ||
      payload?.error ||
      (typeof payload?.detail === "string" ? payload.detail : null) ||
      res.statusText ||
      "Tavily search failed";
    const err = new Error(msg);
    err.code = res.status === 401 ? "CONFIG" : "TAVILY";
    throw err;
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  return {
    query: payload.query || query,
    topic,
    results: results.map((r) => ({
      title: String(r.title || "").trim(),
      url: String(r.url || "").trim(),
      content: String(r.content || "").trim(),
    })).filter((r) => r.title || r.content),
  };
}
