/*
 * Date-window helpers for the platform pages (Credits, Usage) that filter on the client.
 * value = DateRangeFilter value {preset, from, to}. Days are whole local days ending at `anchor`.
 */
const DAY = 86400000;

export function dayWindow(value = { preset: '30d' }, anchor = new Date()) {
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  switch (value.preset) {
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      break;
    case 'mtd':
      start.setDate(1);
      break;
    case 'custom':
      if (value.from) {
        const f = new Date(value.from);
        f.setHours(0, 0, 0, 0);
        start.setTime(f.getTime());
      } else start.setDate(start.getDate() - 29);
      if (value.to) {
        const t = new Date(value.to);
        t.setHours(23, 59, 59, 999);
        end.setTime(t.getTime());
      }
      break;
    case 'today':
      break;
    default:
      start.setDate(start.getDate() - 29);
  }
  const days = Math.max(1, Math.round((end - start) / DAY));
  return { start, end, days };
}

/** Same-length window right before `w` (for "vs previous period" deltas). */
export const previousWindow = (w) => ({ start: new Date(w.start - w.days * DAY), end: new Date(w.start - 1), days: w.days });

export const inWindow = (d, w) => {
  const t = +new Date(d);
  return t >= +w.start && t <= +w.end;
};

/** Date of index i in a daily series of length n that ends on `anchor`. */
export const seriesDate = (i, n, anchor = new Date()) => {
  const d = new Date(anchor);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1 - i));
  return d;
};

export const DAY_MS = DAY;
