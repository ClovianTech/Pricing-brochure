export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const pad = (n: number) => String(n).padStart(2, '0');
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISODate(new Date());
export const parseDate = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
export const monthKey = (s: string | Date) => (typeof s === 'string' ? s.slice(0, 7) : `${s.getFullYear()}-${pad(s.getMonth() + 1)}`);
export const daysBetween = (a: string | Date, b: string | Date) => {
  const da = typeof a === 'string' ? parseDate(a) : a;
  const db = typeof b === 'string' ? parseDate(b) : b;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
};
/** Whole months a recurring engagement has run (inclusive of start month). */
export const monthsElapsed = (start: string, end?: string) => {
  const s = parseDate(start);
  const e = end ? parseDate(end) : new Date();
  const cap = e > new Date() ? new Date() : e;
  if (cap < s) return 0;
  return (cap.getFullYear() - s.getFullYear()) * 12 + (cap.getMonth() - s.getMonth()) + 1;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (s?: string) => {
  if (!s) return '—';
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtShort = (s: string) => { const d = parseDate(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fmtMonth = (key: string) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ’${String(y).slice(2)}`; };
export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const relDay = (s?: string) => {
  if (!s) return '';
  const n = daysBetween(today(), s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 0) return n < 30 ? `in ${n} days` : `in ${Math.round(n / 30)} mo`;
  return -n < 30 ? `${-n} days ago` : `${Math.round(-n / 30)} mo ago`;
};
export const humanDuration = (days: number) => {
  if (days < 0) return '—';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  const m = Math.round(days / 30.4);
  if (m < 24) return `${m} months`;
  return `${(days / 365).toFixed(1)} years`;
};

export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + (f(x) || 0), 0);
export const groupBy = <T,>(arr: T[], f: (x: T) => string) =>
  arr.reduce<Record<string, T[]>>((acc, x) => { (acc[f(x)] ||= []).push(x); return acc; }, {});
export const pct = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / Math.abs(b)) * 100);
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

export function downloadFile(name: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

/* ---------- Date range presets (shared by all smart filters) ---------- */
export type RangePreset = 'all' | 'today' | 'week' | 'month' | 'last-month' | 'quarter' | 'year' | '30d' | '90d' | 'custom';
export const RANGE_LABELS: Record<RangePreset, string> = {
  all: 'All time', today: 'Today', week: 'This week', month: 'This month', 'last-month': 'Last month',
  quarter: 'This quarter', year: 'This year', '30d': 'Last 30 days', '90d': 'Last 90 days', custom: 'Custom',
};
export function rangeFor(p: RangePreset, custom?: { from?: string; to?: string }): { from?: string; to?: string } {
  const now = new Date();
  switch (p) {
    case 'today': return { from: today(), to: today() };
    case 'week': { const d = addDays(now, -((now.getDay() + 6) % 7)); return { from: toISODate(d), to: today() }; }
    case 'month': return { from: toISODate(startOfMonth(now)), to: toISODate(endOfMonth(now)) };
    case 'last-month': { const m = addMonths(startOfMonth(now), -1); return { from: toISODate(m), to: toISODate(endOfMonth(m)) }; }
    case 'quarter': { const q = Math.floor(now.getMonth() / 3) * 3; return { from: toISODate(new Date(now.getFullYear(), q, 1)), to: toISODate(new Date(now.getFullYear(), q + 3, 0)) }; }
    case 'year': return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
    case '30d': return { from: toISODate(addDays(now, -29)), to: today() };
    case '90d': return { from: toISODate(addDays(now, -89)), to: today() };
    case 'custom': return custom ?? {};
    default: return {};
  }
}
export const inRange = (date: string, r: { from?: string; to?: string }) =>
  (!r.from || date >= r.from) && (!r.to || date <= r.to);

/** last N month keys ending with current month */
export const lastMonths = (n: number) => {
  const out: string[] = [];
  const s = startOfMonth(new Date());
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(addMonths(s, -i)));
  return out;
};
