/**
 * HTTP client wrapper for the KayFlux REST API.
 * All methods prepend the base URL, parse JSON, and throw on non-2xx.
 */

const BASE_URL = process.env.KAYFLUX_API_URL || "http://localhost:3000";

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    throw new Error(`KayFlux API not reachable at ${BASE_URL} — ${err.message}`);
  }

  // Parse response body (may be empty on 204)
  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || text || `HTTP ${res.status}`;
    throw new Error(`KayFlux API error (${res.status}): ${msg}`);
  }

  return data;
}

export function get(path) {
  return request("GET", path);
}

export function post(path, body) {
  return request("POST", path, body);
}

export function put(path, body) {
  return request("PUT", path, body);
}

export function patch(path, body) {
  return request("PATCH", path, body);
}

export function del(path) {
  return request("DELETE", path);
}

/**
 * Connectivity check — hits GET /api/brands.
 * Returns true on success, throws on failure.
 */
export async function ping() {
  await get("/api/brands");
  return true;
}

export { BASE_URL };
