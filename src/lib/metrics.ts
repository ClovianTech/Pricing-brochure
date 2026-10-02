import type { Lead, PersonalEntry, Project, Transaction } from './types';
import { daysBetween, groupBy, humanDuration, lastMonths, monthKey, monthsElapsed, parseDate, sum, today, addMonths, toISODate, startOfMonth, pct, clamp } from './utils';
import { stageMeta } from './constants';

/* ---------------- Projects ---------------- */
export interface ProjectFinancials {
  received: number;
  pending: number;
  expenses: number;
  /** what has been earned so far (one-time: contract; monthly: fee × months run) */
  earned: number;
  /** total expected value (monthly + ongoing = 12-month run-rate) */
  contractValue: number;
  profit: number;
  projectedProfit: number;
  margin: number;
  monthsActive: number;
  durationDays: number;
  durationLabel: string;
  budgetUsed: number;
  daysLeft?: number;
  outstanding: number;
}

export function projectFinancials(p: Project, txs: Transaction[]): ProjectFinancials {
  const linked = txs.filter((t) => t.projectId === p.id);
  const income = linked.filter((t) => t.type === 'income');
  const received = sum(income.filter((t) => t.status === 'paid'), (t) => t.amount);
  const pending = sum(income.filter((t) => t.status !== 'paid'), (t) => t.amount);
  const expenses = sum(linked.filter((t) => t.type === 'expense'), (t) => t.amount);
  const monthsActive = p.billing === 'monthly' ? monthsElapsed(p.startDate, p.status === 'cancelled' || p.status === 'completed' ? p.endDate : undefined) : 0;
  let contractValue: number;
  let earned: number;
  if (p.billing === 'one-time') { contractValue = p.amount; earned = p.amount; }
  else {
    earned = p.amount * monthsActive;
    contractValue = p.endDate ? p.amount * Math.max(1, monthsElapsedFull(p.startDate, p.endDate)) : p.amount * 12;
  }
  const endRef = p.endDate && (p.status === 'completed' || p.status === 'cancelled' || p.endDate < today()) ? p.endDate : today();
  const durationDays = Math.max(0, daysBetween(p.startDate, p.endDate ?? endRef));
  const durationLabel = p.billing === 'monthly' && !p.endDate ? `Ongoing · ${monthsActive} mo` : humanDuration(durationDays);
  const profit = received - expenses;
  const base = p.billing === 'one-time' ? contractValue : earned;
  const projectedProfit = base - Math.max(expenses, p.status === 'completed' ? expenses : p.estimatedCost);
  // completed / recurring: actual margin. In-flight one-time: projected using the larger of spend-so-far and budget.
  const costBasis = p.billing === 'one-time' && p.status !== 'completed' && p.status !== 'cancelled' ? Math.max(expenses, p.estimatedCost) : expenses;
  const margin = base > 0 ? ((base - costBasis) / base) * 100 : 0;
  const daysLeft = p.endDate && p.status !== 'completed' && p.status !== 'cancelled' ? daysBetween(today(), p.endDate) : undefined;
  const outstanding = Math.max(0, (p.billing === 'one-time' ? contractValue : earned) - received);
  return { received, pending, expenses, earned, contractValue, profit, projectedProfit, margin, monthsActive, durationDays, durationLabel, budgetUsed: p.estimatedCost ? (expenses / p.estimatedCost) * 100 : 0, daysLeft, outstanding };
}
function monthsElapsedFull(start: string, end: string) {
  const s = parseDate(start), e = parseDate(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
}

export const mrr = (projects: Project[]) =>
  sum(projects.filter((p) => p.billing === 'monthly' && p.status === 'active'), (p) => p.amount);

/* ---------------- Finance ---------------- */
export function summarize(txs: Transaction[]) {
  const income = sum(txs.filter((t) => t.type === 'income' && t.status === 'paid'), (t) => t.amount);
  const expense = sum(txs.filter((t) => t.type === 'expense'), (t) => t.amount);
  const receivable = sum(txs.filter((t) => t.type === 'income' && t.status !== 'paid'), (t) => t.amount);
  const overdue = sum(txs.filter((t) => t.type === 'income' && t.status === 'overdue'), (t) => t.amount);
  return { income, expense, net: income - expense, receivable, overdue, margin: income ? ((income - expense) / income) * 100 : 0 };
}

export function monthlySeries(txs: Transaction[], months = 12) {
  const keys = lastMonths(months);
  const g = groupBy(txs, (t) => monthKey(t.date));
  return keys.map((k) => {
    const list = g[k] ?? [];
    const s = summarize(list);
    return { key: k, income: s.income, expense: s.expense, net: s.net };
  });
}

export function byCategory<T extends { category: string; amount: number }>(list: T[], top = 7) {
  const g = groupBy(list, (x) => x.category);
  const rows = Object.entries(g).map(([name, xs]) => ({ name, value: sum(xs, (x) => x.amount) })).sort((a, b) => b.value - a.value);
  if (rows.length <= top + 1) return rows;
  const head = rows.slice(0, top);
  return [...head, { name: 'Other', value: sum(rows.slice(top), (r) => r.value) }];
}

/* ---------------- Leads ---------------- */
const SOURCE_QUALITY: Record<string, number> = { Referral: 1, LinkedIn: 0.75, Website: 0.7, Event: 0.7, 'Google Ads': 0.6, Instagram: 0.55, 'Facebook Ads': 0.5, WhatsApp: 0.55, Upwork: 0.5, Fiverr: 0.4, 'Cold Outreach': 0.35 };

/** 0–100 smart score: stage, deal size vs pipeline, source quality, engagement, freshness, follow-up discipline. */
export function leadScore(l: Lead, all: Lead[]) {
  if (l.stage === 'won') return 100;
  if (l.stage === 'lost') return 0;
  const open = all.filter((x) => x.company === l.company && x.stage !== 'lost');
  const annual = (x: Lead) => (x.billing === 'monthly' ? x.value * 12 : x.value);
  const maxV = Math.max(1, ...open.map(annual));
  const stage = stageMeta(l.stage).prob; // 0.1 – 0.8
  const size = Math.sqrt(annual(l) / maxV);
  const source = SOURCE_QUALITY[l.source] ?? 0.45;
  const lastTouch = l.activities[0]?.at.slice(0, 10) ?? l.createdAt;
  const idle = daysBetween(lastTouch, today());
  const engagement = clamp(l.activities.filter((a) => a.type !== 'stage' && a.type !== 'note').length / 4, 0, 1);
  const fresh = idle <= 3 ? 1 : idle <= 10 ? 0.65 : idle <= 21 ? 0.35 : 0.1;
  const prio = l.priority === 'high' ? 1 : l.priority === 'medium' ? 0.6 : 0.3;
  const overdue = l.nextFollowUp && l.nextFollowUp < today() ? 0.08 : 0;
  const score = (stage * 0.32 + size * 0.2 + source * 0.14 + fresh * 0.14 + engagement * 0.1 + prio * 0.1 - overdue) * 100;
  return Math.round(clamp(score, 1, 99));
}
export const scoreLabel = (s: number) =>
  s >= 70 ? { label: 'Hot', cls: 'bg-rose-50 text-rose-600 ring-rose-200', dot: '#e11d48' }
  : s >= 45 ? { label: 'Warm', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: '#d97706' }
  : { label: 'Cold', cls: 'bg-sky-50 text-sky-700 ring-sky-200', dot: '#0284c7' };

export const weightedValue = (l: Lead) => (l.billing === 'monthly' ? l.value * 12 : l.value) * stageMeta(l.stage).prob;

/* ---------------- Personal ---------------- */
export function personalSummary(list: PersonalEntry[]) {
  const income = sum(list.filter((e) => e.type === 'income'), (e) => e.amount);
  const expense = sum(list.filter((e) => e.type === 'expense'), (e) => e.amount);
  const invested = sum(list.filter((e) => e.type === 'investment'), (e) => e.amount);
  const saved = sum(list.filter((e) => e.type === 'saving'), (e) => e.amount);
  const wants = sum(list.filter((e) => e.type === 'expense' && !e.essential), (e) => e.amount);
  return { income, expense, invested, saved, wants, needs: expense - wants, net: income - expense - invested - saved, savingsRate: income ? ((income - expense) / income) * 100 : 0 };
}

/* ---------------- Smart insights ---------------- */
export interface Insight { tone: 'good' | 'warn' | 'bad' | 'info'; title: string; detail: string; to?: string }

export function companyInsights(txs: Transaction[], projects: Project[], leads: Lead[], fmt: (n: number) => string): Insight[] {
  const out: Insight[] = [];
  const thisM = monthKey(new Date());
  const lastM = monthKey(addMonths(startOfMonth(new Date()), -1));
  const dayOfMonth = new Date().getDate();
  const cur = summarize(txs.filter((t) => monthKey(t.date) === thisM));
  const prev = summarize(txs.filter((t) => monthKey(t.date) === lastM));
  const prevToDate = summarize(txs.filter((t) => monthKey(t.date) === lastM && parseDate(t.date).getDate() <= dayOfMonth));

  const overdue = txs.filter((t) => t.type === 'income' && t.status === 'overdue');
  if (overdue.length) out.push({ tone: 'bad', title: `${fmt(sum(overdue, (t) => t.amount))} overdue`, detail: `${overdue.length} invoice${overdue.length > 1 ? 's are' : ' is'} past due. Chase payment today.`, to: '/finance?status=overdue' });

  const pendingFollow = leads.filter((l) => l.nextFollowUp && l.nextFollowUp <= today() && l.stage !== 'won' && l.stage !== 'lost');
  if (pendingFollow.length) out.push({ tone: 'warn', title: `${pendingFollow.length} follow-up${pendingFollow.length > 1 ? 's' : ''} due`, detail: `Top: ${pendingFollow.sort((a, b) => b.value - a.value)[0].businessName}. Leads go cold after ~7 days without contact.`, to: '/leads?view=followups' });

  if (prevToDate.expense > 0) {
    const ch = pct(cur.expense, prevToDate.expense);
    if (ch > 15) out.push({ tone: 'warn', title: `Spending up ${ch.toFixed(0)}%`, detail: `vs the same point last month (${fmt(prevToDate.expense)} → ${fmt(cur.expense)}).`, to: '/finance?range=month&type=expense' });
  }
  if (prev.income > 0 && prev.net > 0) out.push({ tone: 'info', title: `Last month net: ${fmt(prev.net)}`, detail: `${prev.margin.toFixed(0)}% margin on ${fmt(prev.income)} collected.` });

  const active = projects.filter((p) => p.status === 'active');
  for (const p of active) {
    const f = projectFinancials(p, txs);
    if (p.estimatedCost && f.budgetUsed > 90 && p.progress < 85) {
      out.push({ tone: 'bad', title: `${p.name} over budget risk`, detail: `${f.budgetUsed.toFixed(0)}% of cost budget used at ${p.progress}% progress.`, to: `/projects/${p.id}` });
    } else if (f.daysLeft !== undefined && f.daysLeft < 0) {
      out.push({ tone: 'warn', title: `${p.name} past deadline`, detail: `${-f.daysLeft} days late at ${p.progress}% progress.`, to: `/projects/${p.id}` });
    } else if (f.daysLeft !== undefined && f.daysLeft <= 14 && p.progress < 70) {
      out.push({ tone: 'warn', title: `${p.name} deadline in ${f.daysLeft}d`, detail: `Only ${p.progress}% done. Consider adding resources.`, to: `/projects/${p.id}` });
    }
  }
  const m = mrr(projects);
  if (m > 0) out.push({ tone: 'good', title: `MRR ${fmt(m)}`, detail: `${projects.filter((p) => p.billing === 'monthly' && p.status === 'active').length} active retainers → ${fmt(m * 12)} annual run-rate.`, to: '/projects?billing=monthly' });

  const hot = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost' && leadScore(l, leads) >= 70);
  if (hot.length) out.push({ tone: 'good', title: `${hot.length} hot lead${hot.length > 1 ? 's' : ''} ready`, detail: `${fmt(sum(hot, (l) => l.value))} in high-intent deals. Prioritise these today.`, to: '/leads?sort=score' });
  return out;
}

export function personalInsights(list: PersonalEntry[], budgets: { category: string; limit: number }[], fmt: (n: number) => string): Insight[] {
  const out: Insight[] = [];
  const thisM = monthKey(new Date());
  const month = list.filter((e) => monthKey(e.date) === thisM);
  const spent = groupBy(month.filter((e) => e.type === 'expense'), (e) => e.category);
  const dayFrac = new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  for (const b of budgets) {
    const s = sum(spent[b.category] ?? [], (e) => e.amount);
    if (s > b.limit) out.push({ tone: 'bad', title: `${b.category} over budget`, detail: `${fmt(s)} of ${fmt(b.limit)} (${((s / b.limit) * 100).toFixed(0)}%).` });
    else if (s / b.limit > dayFrac + 0.2 && s / b.limit > 0.6) out.push({ tone: 'warn', title: `${b.category} pacing high`, detail: `${((s / b.limit) * 100).toFixed(0)}% used, ${(dayFrac * 100).toFixed(0)}% of month gone.` });
  }
  const months = lastMonths(4).slice(0, 3);
  const avg = sum(months, (k) => personalSummary(list.filter((e) => monthKey(e.date) === k)).savingsRate) / 3;
  if (avg) out.push({ tone: avg >= 30 ? 'good' : 'warn', title: `Savings rate ${avg.toFixed(0)}%`, detail: `3-month average. ${avg >= 30 ? 'Excellent — above the 30% benchmark.' : 'Aim for 30%+ by trimming wants.'}` });
  const subs = list.filter((e) => e.recurring && e.type === 'expense' && monthKey(e.date) === months[months.length - 1]);
  if (subs.length) out.push({ tone: 'info', title: `${fmt(sum(subs, (e) => e.amount))}/mo recurring`, detail: `${subs.length} fixed commitments (EMI, bills, subscriptions).` });
  return out;
}

export const sixMonthAgo = () => toISODate(addMonths(startOfMonth(new Date()), -5));
