import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Plus, PiggyBank, TrendingUp, Wallet, Sparkles, Repeat, Flame, CalendarDays, ShoppingBag, LineChart, Tag, CreditCard, Trash2, Target, Percent } from 'lucide-react';
import { useStore } from '@/store/store';
import { useUI } from '@/store/ui';
import { useMoney } from '@/lib/format';
import { useQueryState } from '@/lib/hooks';
import { byCategory, personalInsights, personalSummary } from '@/lib/metrics';
import { downloadFile, fmtDate, groupBy, inRange, lastMonths, monthKey, parseDate, rangeFor, relDay, sum, toCSV, today, type RangePreset, RANGE_LABELS } from '@/lib/utils';
import { Badge, Button, Card, CardHeader, Empty, Input, PageHeader, Progress, Segmented, Select, Stat } from '@/components/ui';
import { AmountFilter, MultiFilter, RangeFilter, SearchBox, SmartViews } from '@/components/filters';
import { CashflowChart, Donut, TrendArea } from '@/components/charts';
import { InsightsPanel } from '@/components/Insights';
import { PERSONAL_CATEGORIES } from '@/lib/constants';
import { toast } from '@/components/ui/feedback';
import type { PersonalEntry, PersonalType } from '@/lib/types';

type View = 'wants' | 'fixed' | 'big' | 'weekend' | 'invest' | 'over-budget';
const TYPE_META: Record<PersonalType, { label: string; cls: string; icon: typeof Wallet; sign: string; text: string }> = {
  income: { label: 'Income', cls: 'bg-emerald-50 text-emerald-600', icon: ArrowDownLeft, sign: '+', text: 'text-emerald-600' },
  expense: { label: 'Expense', cls: 'bg-rose-50 text-rose-600', icon: ArrowUpRight, sign: '−', text: 'text-ink' },
  investment: { label: 'Investment', cls: 'bg-indigo-50 text-indigo-600', icon: LineChart, sign: '→', text: 'text-indigo-600' },
  saving: { label: 'Saving', cls: 'bg-teal-50 text-teal-600', icon: PiggyBank, sign: '→', text: 'text-teal-600' },
};

export default function Personal() {
  const st = useStore();
  const entries = st.personal;
  const openForm = useUI((s) => s.openForm);
  const { money, compact, symbol } = useMoney();

  const [tab, setTab] = useQueryState<'entries' | 'insights' | 'budgets'>('tab', 'entries');
  const [range, setRange] = useQueryState<RangePreset>('range', '30d');
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const [types, setTypes] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [need, setNeed] = useState<'all' | 'need' | 'want'>('all');
  const [amount, setAmount] = useState<{ min?: number; max?: number }>({});
  const [q, setQ] = useState('');
  const [view, setView] = useState<View | ''>('');
  const [sort, setSort] = useState<'new' | 'old' | 'big' | 'small'>('new');
  const [group, setGroup] = useState<'day' | 'category' | 'none'>('day');

  const r = rangeFor(range, custom);
  const ranged = useMemo(() => entries.filter((e) => inRange(e.date, r)), [entries, r.from, r.to]); // eslint-disable-line
  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const curM = monthKey(new Date());
    const spentByCat = groupBy(entries.filter((e) => e.type === 'expense' && monthKey(e.date) === curM), (e) => e.category);
    const over = new Set(st.budgets.filter((b) => sum(spentByCat[b.category] ?? [], (e) => e.amount) > b.limit).map((b) => b.category));
    const big = (() => { const a = ranged.filter((e) => e.type === 'expense').map((e) => e.amount).sort((x, y) => y - x); return a[Math.floor(a.length * 0.1)] ?? Infinity; })();
    let list = ranged.filter((e) => (!types.length || types.includes(e.type)) && (!cats.length || cats.includes(e.category)) && (!accounts.length || accounts.includes(e.account))
      && (!tags.length || e.tags.some((t) => tags.includes(t))) && (need === 'all' || (e.type === 'expense' && (need === 'need' ? e.essential : !e.essential)))
      && (amount.min === undefined || e.amount >= amount.min) && (amount.max === undefined || e.amount <= amount.max)
      && (!ql || `${e.description} ${e.category} ${e.account} ${e.tags.join(' ')}`.toLowerCase().includes(ql)));
    if (view === 'wants') list = list.filter((e) => e.type === 'expense' && !e.essential);
    if (view === 'fixed') list = list.filter((e) => e.recurring);
    if (view === 'big') list = list.filter((e) => e.type === 'expense' && e.amount >= big);
    if (view === 'weekend') list = list.filter((e) => e.type === 'expense' && [0, 6].includes(parseDate(e.date).getDay()));
    if (view === 'invest') list = list.filter((e) => e.type === 'investment' || e.type === 'saving');
    if (view === 'over-budget') list = list.filter((e) => e.type === 'expense' && over.has(e.category));
    const cmp = { new: (a: PersonalEntry, b: PersonalEntry) => b.date.localeCompare(a.date), old: (a: PersonalEntry, b: PersonalEntry) => a.date.localeCompare(b.date), big: (a: PersonalEntry, b: PersonalEntry) => b.amount - a.amount, small: (a: PersonalEntry, b: PersonalEntry) => a.amount - b.amount }[sort];
    return [...list].sort(cmp);
  }, [ranged, entries, st.budgets, types, cats, accounts, tags, need, amount, q, view, sort]);

  const s = personalSummary(filtered);
  const sAll = personalSummary(ranged);
  const insights = useMemo(() => personalInsights(entries, st.budgets, compact), [entries, st.budgets, compact]);
  const anyFilter = types.length || cats.length || accounts.length || tags.length || need !== 'all' || amount.min !== undefined || amount.max !== undefined || q || view;
  const clearAll = () => { setTypes([]); setCats([]); setAccounts([]); setTags([]); setNeed('all'); setAmount({}); setQ(''); setView(''); };

  const allCats = [...new Set(entries.map((e) => e.category))];
  const allTags = [...new Set(entries.flatMap((e) => e.tags))];
  const series = lastMonths(12).map((k) => { const m = personalSummary(entries.filter((e) => monthKey(e.date) === k)); return { key: k, income: m.income, expense: m.expense, net: m.income - m.expense }; });

  const groups: [string, PersonalEntry[]][] = group === 'none' ? [['', filtered]]
    : group === 'day' ? Object.entries(groupBy(filtered, (e) => e.date))
    : Object.entries(groupBy(filtered, (e) => e.category)).sort((a, b) => sum(b[1], (e) => e.amount) - sum(a[1], (e) => e.amount));

  const exportCSV = () => { downloadFile(`personal-${today()}.csv`, toCSV(filtered.map((e) => ({ date: e.date, type: e.type, amount: e.amount, category: e.category, account: e.account, description: e.description, need: e.type === 'expense' ? (e.essential ? 'need' : 'want') : '', recurring: e.recurring, tags: e.tags.join('|') }))), 'text/csv'); toast(`Exported ${filtered.length} entries`); };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Personal space" title={<>Personal <span className="text-gradient">Finance</span></>} subtitle="Every rupee you earn, spend, save and invest — sliced any way you like."
        actions={<>
          <Button icon={<Download size={16} />} onClick={exportCSV}>Export</Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm({ kind: 'personal' })}>Add entry</Button>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Income" value={compact(s.income)} icon={<ArrowDownLeft size={16} />} tone="good" hint={RANGE_LABELS[range]} />
        <Stat label="Spent" value={compact(s.expense)} icon={<ArrowUpRight size={16} />} tone="bad" hint={`${compact(s.wants)} on wants`} />
        <Stat label="Saved + invested" value={compact(s.saved + s.invested)} icon={<TrendingUp size={16} />} tone="accent" hint={`${compact(s.invested)} invested`} />
        <Stat label="Savings rate" value={`${sAll.savingsRate.toFixed(0)}%`} icon={<Percent size={16} />} tone={sAll.savingsRate >= 30 ? 'good' : 'warn'} hint="(income − spend) / income" />
      </div>

      {s.expense > 0 && (
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-sm font-bold">Needs vs wants</span>
            <span className="text-xs text-ink-mute">50/30/20 rule: keep wants under 30% of income</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
            <div style={{ flex: s.needs }} className="bg-[#2a78d6]" title="Needs" />
            <div style={{ flex: s.wants }} className="bg-[#e87ba4]" title="Wants" />
            <div style={{ flex: Math.max(0, s.saved + s.invested) }} className="bg-[#1baf7a]" title="Saved & invested" />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#2a78d6]" />Needs <b className="num">{compact(s.needs)}</b></span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#e87ba4]" />Wants <b className="num">{compact(s.wants)}</b>{s.income > 0 && <span className="text-ink-mute">({((s.wants / s.income) * 100).toFixed(0)}% of income)</span>}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#1baf7a]" />Saved & invested <b className="num">{compact(s.saved + s.invested)}</b></span>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'entries', label: 'Entries' }, { value: 'insights', label: 'Insights' }, { value: 'budgets', label: 'Budgets' }]} />
        <RangeFilter value={range} onChange={setRange} custom={custom} onCustom={setCustom} />
      </div>

      {tab === 'entries' && (
        <>
          <Card className="p-3 sm:p-4 space-y-3 relative z-10">
            <SmartViews<View> value={view} onChange={setView} views={[
              { id: 'wants', label: 'Wants only', icon: <ShoppingBag size={14} /> },
              { id: 'fixed', label: 'Fixed & recurring', icon: <Repeat size={14} /> },
              { id: 'big', label: 'Big spends', icon: <Flame size={14} /> },
              { id: 'weekend', label: 'Weekend spending', icon: <CalendarDays size={14} /> },
              { id: 'invest', label: 'Savings & investments', icon: <LineChart size={14} /> },
              { id: 'over-budget', label: 'Over-budget categories', icon: <Target size={14} /> },
            ]} />
            <div className="flex flex-wrap items-center gap-2">
              <SearchBox value={q} onChange={setQ} placeholder="Search description, category, tag…" className="w-full sm:w-72" />
              <MultiFilter label="Type" value={types} onChange={setTypes} options={(Object.keys(TYPE_META) as PersonalType[]).map((t) => ({ value: t, label: TYPE_META[t].label, count: ranged.filter((e) => e.type === t).length }))} />
              <MultiFilter label="Category" icon={<Tag size={13} />} value={cats} onChange={setCats} options={allCats.map((c) => ({ value: c, label: c, count: ranged.filter((e) => e.category === c).length })).sort((a, b) => b.count - a.count)} />
              <MultiFilter label="Account" icon={<CreditCard size={13} />} value={accounts} onChange={setAccounts} options={st.settings.personalAccounts.map((a) => ({ value: a, label: a }))} />
              {allTags.length > 0 && <MultiFilter label="Tags" value={tags} onChange={setTags} options={allTags.map((t) => ({ value: t, label: `#${t}` }))} />}
              <AmountFilter min={amount.min} max={amount.max} onChange={setAmount} />
              <Segmented size="sm" value={need} onChange={setNeed} options={[{ value: 'all', label: 'All' }, { value: 'need', label: 'Needs' }, { value: 'want', label: 'Wants' }]} />
              <div className="flex-1" />
              <select value={group} onChange={(e) => setGroup(e.target.value as typeof group)} className="chip !h-9 outline-none cursor-pointer"><option value="day">Group: Day</option><option value="category">Group: Category</option><option value="none">No grouping</option></select>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="chip !h-9 outline-none cursor-pointer"><option value="new">Newest</option><option value="old">Oldest</option><option value="big">Largest</option><option value="small">Smallest</option></select>
              {anyFilter ? <button onClick={clearAll} className="text-xs font-semibold text-accent px-2">Clear</button> : null}
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card><Empty icon={<Wallet size={24} />} title="No entries match" hint={`Nothing for ${RANGE_LABELS[range].toLowerCase()} with these filters.`} action={<Button variant="primary" onClick={() => openForm({ kind: 'personal' })}>Add entry</Button>} /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-line/70">
                {groups.map(([g, list]) => (
                  <div key={g || 'all'}>
                    {g && (
                      <div className="flex justify-between px-5 py-2 bg-canvas/50 text-[11px] font-semibold text-ink-mute uppercase tracking-wider">
                        <span>{group === 'day' ? `${fmtDate(g)} · ${relDay(g)}` : `${g} · ${list.length}`}</span>
                        <span className="num normal-case">{(() => { const sp = sum(list.filter((e) => e.type === 'expense'), (e) => e.amount); const inc = sum(list.filter((e) => e.type === 'income'), (e) => e.amount); return [inc ? `+${compact(inc)}` : '', sp ? `−${compact(sp)}` : ''].filter(Boolean).join('  ') || '—'; })()}</span>
                      </div>
                    )}
                    {list.map((e) => {
                      const t = TYPE_META[e.type];
                      return (
                        <button key={e.id} onClick={() => openForm({ kind: 'personal', initial: e })} className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-accent/[.03] text-left">
                          <span className={clsx('h-10 w-10 shrink-0 grid place-items-center rounded-xl', t.cls)}><t.icon size={17} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">{e.description || e.category}</div>
                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-mute">
                              <span>{e.category}</span><span className="hidden sm:inline">· {e.account}</span>
                              {group !== 'day' && <span>· {fmtDate(e.date)}</span>}
                              {e.recurring && <span className="inline-flex items-center gap-0.5 text-accent"><Repeat size={10} />monthly</span>}
                              {e.type === 'expense' && !e.essential && <span className="text-pink-600 font-semibold">want</span>}
                              {e.tags.map((tg) => <span key={tg} className="text-accent">#{tg}</span>)}
                            </div>
                          </div>
                          <span className={clsx('num font-bold text-[15px] shrink-0', t.text)}>{t.sign}{money(e.amount)}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 text-xs text-ink-mute border-t border-line bg-canvas/40 flex flex-wrap justify-between gap-2">
                <span>{filtered.length} entries</span>
                <span>Net cash flow <b className={clsx('num', s.net >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{money(s.net)}</b></span>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'insights' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
          <Card className="xl:col-span-2"><CardHeader title="Income vs spending" subtitle="Last 12 months" /><div className="px-5 pb-5"><CashflowChart data={series} expenseLabel="Spending" /></div></Card>
          <InsightsPanel items={insights} title="Money coach" />
          <Card><CardHeader title="Spending by category" subtitle={RANGE_LABELS[range]} /><div className="px-5 pb-5"><Donut data={byCategory(ranged.filter((e) => e.type === 'expense'))} centerLabel="spent" height={160} /></div></Card>
          <Card><CardHeader title="Investments" subtitle={RANGE_LABELS[range]} /><div className="px-5 pb-5"><Donut data={byCategory(ranged.filter((e) => e.type === 'investment'))} centerLabel="invested" height={160} /></div></Card>
          <Card>
            <CardHeader title="Daily spending" subtitle={RANGE_LABELS[range]} />
            <div className="px-5 pb-5">
              <TrendArea label="Spent" dataKey="v" height={200} color="#eb6834" xFormat={(k) => fmtDate(k).split(' ').slice(0, 2).join(' ')}
                data={Object.entries(groupBy(ranged.filter((e) => e.type === 'expense'), (e) => e.date)).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ key: k, v: sum(v, (e) => e.amount) }))} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'budgets' && <Budgets symbol={symbol} />}
    </div>
  );
}

function Budgets({ symbol }: { symbol: string }) {
  const st = useStore();
  const { compact } = useMoney();
  const [cat, setCat] = useState('');
  const [limit, setLimit] = useState(0);
  const curM = monthKey(new Date());
  const spent = groupBy(st.personal.filter((e) => e.type === 'expense' && monthKey(e.date) === curM), (e) => e.category);
  const avg3 = (c: string) => sum(lastMonths(4).slice(0, 3), (k) => sum(st.personal.filter((e) => e.type === 'expense' && e.category === c && monthKey(e.date) === k), (e) => e.amount)) / 3;
  const dayFrac = new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const unbudgeted = PERSONAL_CATEGORIES.expense.filter((c) => !st.budgets.some((b) => b.category === c));
  const totalLimit = sum(st.budgets, (b) => b.limit);
  const totalSpent = sum(st.budgets, (b) => sum(spent[b.category] ?? [], (e) => e.amount));
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
      <Card className="xl:col-span-2">
        <CardHeader title="Monthly budgets" subtitle={`${compact(totalSpent)} of ${compact(totalLimit)} used · ${(dayFrac * 100).toFixed(0)}% of month elapsed`} icon={<Target size={17} />} />
        <div className="px-5 pb-5 space-y-4">
          {st.budgets.length === 0 && <p className="text-sm text-ink-mute">No budgets yet — add one on the right.</p>}
          {st.budgets.map((b) => {
            const sp = sum(spent[b.category] ?? [], (e) => e.amount);
            const p = (sp / b.limit) * 100;
            const tone = p > 100 ? '#e11d48' : p > dayFrac * 100 + 15 ? '#d97706' : '#0e9f6e';
            return (
              <div key={b.category} className="group">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-semibold">{b.category}</span>
                  <span className="flex items-center gap-2"><span className="num"><b>{compact(sp)}</b> <span className="text-ink-mute">/ {compact(b.limit)}</span></span>
                    <button onClick={() => st.removeBudget(b.category)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-600"><Trash2 size={13} /></button></span>
                </div>
                <div className="relative">
                  <Progress value={p} color={tone} />
                  <div className="absolute top-[-3px] h-[14px] w-[2px] bg-ink/40 rounded" style={{ left: `${dayFrac * 100}%` }} title="Today" />
                </div>
                <div className="text-[11px] text-ink-mute mt-1">{p > 100 ? <span className="text-rose-600 font-semibold">Over by {compact(sp - b.limit)}</span> : `${compact(b.limit - sp)} left`} · 3-mo avg {compact(avg3(b.category))}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="p-5 h-fit">
        <h3 className="font-bold flex items-center gap-2"><Sparkles size={16} className="text-accent" />Add / update budget</h3>
        <div className="space-y-3 mt-4">
          <Select value={cat} onChange={(e) => { setCat(e.target.value); setLimit(Math.round(avg3(e.target.value) / 500) * 500 || 0); }} options={[{ value: '', label: 'Choose category…' }, ...PERSONAL_CATEGORIES.expense.map((c) => ({ value: c, label: c }))]} />
          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">{symbol}</span><Input type="number" className="pl-9" value={limit || ''} onChange={(e) => setLimit(Number(e.target.value))} placeholder="Monthly limit" /></div>
          {cat && <p className="text-xs text-ink-mute">Suggested from your 3-month average: <b>{compact(avg3(cat))}</b></p>}
          <Button variant="primary" className="w-full" disabled={!cat || !limit} onClick={() => { st.setBudget({ category: cat, limit }); toast('Budget saved'); setCat(''); setLimit(0); }}>Save budget</Button>
        </div>
        {unbudgeted.length > 0 && (
          <div className="mt-5 pt-4 border-t border-line">
            <div className="label">Unbudgeted spending this month</div>
            <div className="space-y-1.5">
              {unbudgeted.map((c) => ({ c, v: sum(spent[c] ?? [], (e) => e.amount) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 6).map((x) => (
                <button key={x.c} onClick={() => { setCat(x.c); setLimit(Math.round(avg3(x.c) / 500) * 500); }} className="w-full flex justify-between text-sm hover:text-accent"><span>{x.c}</span><Badge>{compact(x.v)}</Badge></button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
