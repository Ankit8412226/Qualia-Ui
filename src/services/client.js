/*
 * The single seam between UI and backend. Today every service resolves mock data after a short delay
 * so loading states are real. To integrate the API, replace `mock()` calls in the product services
 * with `http()` calls; screens don't change.
 */
const LATENCY = [180, 520];

/** Demo: add ?fail=1 to any URL to make every mock call fail, to review error states and Retry. */
const demoFail = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fail');

export function mock(value, { fail } = {}) {
  if (!fail && demoFail()) fail = 'Demo failure (?fail=1). Remove it from the URL and retry.';
  const ms = LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0]);
  return new Promise((resolve, reject) => {
    setTimeout(() => (fail ? reject(new Error(fail)) : resolve(typeof value === 'function' ? value() : structuredClone(value))), ms);
  });
}

/** Placeholder for the real HTTP client (base URL, auth header, error mapping). Not used yet. */
export async function http(path, { method = 'GET', body, base = '' } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
