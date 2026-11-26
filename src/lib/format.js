/** Display formatters. Every number, date and duration in the UI goes through these. */
const IN = 'en-IN';

export const fmtNumber = (n, opts) => (n == null || Number.isNaN(n) ? '—' : Number(n).toLocaleString(IN, opts));
export const fmtCompact = (n) => (n == null ? '—' : Intl.NumberFormat(IN, { notation: 'compact', maximumFractionDigits: 1 }).format(n));
export const fmtPercent = (n, digits = 1) => (n == null ? '—' : `${Number(n).toFixed(digits).replace(/\.0+$/, '')}%`);
export const fmtCurrency = (n, digits = 0) =>
  n == null ? '—' : Number(n).toLocaleString(IN, { style: 'currency', currency: 'INR', maximumFractionDigits: digits });

/** 125 → "2m 05s"; 3725 → "1h 02m". */
export function fmtDuration(seconds) {
  if (seconds == null) return '—';
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(r).padStart(2, '0')}s`;
  return `${r}s`;
}

/** 125 → "02:05", 3725 → "1:02:05" (timers, audio). */
export function fmtClock(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const asDate = (d) => (d instanceof Date ? d : new Date(d));
export const fmtDate = (d) => (d ? asDate(d).toLocaleDateString(IN, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtTime = (d) => (d ? asDate(d).toLocaleTimeString(IN, { hour: 'numeric', minute: '2-digit' }) : '—');
export const fmtDateTime = (d) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—');

export function fmtRelative(d) {
  if (!d) return '—';
  const diff = (Date.now() - asDate(d).getTime()) / 1000;
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)} d ago`;
  return fmtDate(d);
}

/** "+91 98765 43210" */
export function fmtPhone(p) {
  if (!p) return '—';
  const d = String(p).replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p;
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

/** Delta between two numbers as a percent, for trend chips. */
export const pctChange = (now, before) => (before ? ((now - before) / before) * 100 : null);
