// Hop-by-hop headers must not be forwarded to the next hop.
const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'accept-encoding',
  'keep-alive',
  'upgrade',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'expect',
]);

function cleanHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (HOP_BY_HOP.has(String(key).toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Deliver a captured request to a target URL.
 * Never throws — network failures are returned as { error }.
 */
export async function deliver(target, method, headers, body) {
  const started = Date.now();
  const verb = String(method || 'POST').toUpperCase();
  try {
    const response = await fetch(target, {
      method: verb,
      headers: cleanHeaders(headers),
      body: verb === 'GET' || verb === 'HEAD' ? undefined : body,
      redirect: 'manual',
    });
    const text = await response.text();
    return {
      status: response.status,
      durationMs: Date.now() - started,
      responseBody: text.slice(0, 8000),
      error: null,
    };
  } catch (err) {
    return {
      status: null,
      durationMs: Date.now() - started,
      responseBody: null,
      error: err?.message || String(err),
    };
  }
}
