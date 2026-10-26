const ALLOWED_ORIGINS = [
  "http://localhost:5180",
  "http://127.0.0.1:5180",
  process.env.SITE_URL,
  process.env.URL,
].filter(Boolean);

/** @param {object | undefined} event */
export function responseHeaders(event, extra = {}) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  const base = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...base,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
      ...extra,
    };
  }
  return {
    ...base,
    "Access-Control-Allow-Origin": "*",
    ...extra,
  };
}

/** @param {object | undefined} event */
export function preflight(event) {
  return { statusCode: 204, headers: responseHeaders(event), body: "" };
}

/** @param {number} statusCode @param {unknown} body @param {object | undefined} event @param {Record<string,string>} [extraHeaders] */
export function json(statusCode, body, event, extraHeaders = {}) {
  return {
    statusCode,
    headers: responseHeaders(event, extraHeaders),
    body: JSON.stringify(body),
  };
}

export function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token) {
  const maxAge = 14 * 86400;
  return `tv_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader() {
  return "tv_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}
