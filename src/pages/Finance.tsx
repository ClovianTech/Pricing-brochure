import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Plus, Clock, AlertTriangle, Repeat, Flame, CheckCircle2, FolderKanban, Users, Tag } from 'lucide-react';
import { useScoped, useQueryState } from '@/lib/hooks';
import { useMoney } from '@/lib/format';
import { useStore } from '@/store/store';
import { useUI } from '@/store/ui';
import { summarize, monthlySeries, byCategory } from '@/lib/metrics';
import { downloadFile, fmtDate, groupBy, inRange, rangeFor, sum, toCSV, type RangePreset, relDay, today } from '@/lib/utils';
import { Badge, Button, Card, CardHeader, Empty, PageHeader, Segmented, Stat } from '@/components/ui';
import { AmountFilter, MultiFilter, RangeFilter, SearchBox, SmartViews } from '@/components/filters';
import { CashflowChart, Donut } from '@/components/charts';
import { COMPANIES } from '@/lib/constants';
import { scopeName } from '@/components/layout/Brand';
import { toast } from '@/components/ui/feedback';
import type { Transaction } from '@/lib/types';

type View = 'unpaid' | 'overdue' | 'retainers' | 'big' | 'unlinked';
const STATUS_BADGE: Record<Transaction['status'], string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export default function Finance() {
  const { scope, transactions, projects, clients } = useScoped();
  const upsert = useStore((s) => s.upsertTransaction);
  const openForm = useUI((s) => s.openForm);
  const { money, compact } = useMoney();

  const [tab, setTab] = useQueryState<'list' | 'analytics'>('tab', 'list');
  const [range, setRange] = useQueryState<RangePreset>('range', 'all');
  const [type, setType] = useQueryState<'all' | 'income' | 'expense'>('type', 'all');
  const [statusQ, setStatusQ] = useQueryState<string>('status', '');
  const [view, setView] = useState<View | ''>('');
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const [q, setQ] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [projF, setProjF] = useState<string[]>([]);
  const [clientF, setClientF] = useState<string[]>([]);
  const [amount, setAmount] = useState<{ min?: number; max?: number }>({});
  const [sort, setSort] = useState<'date' | 'amount'>('date');
  const statuses = statusQ ? statusQ.split(',') : [];

  const r = rangeFor(range, custom);
  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const bigCut = (() => { const a = transactions.map((t) => t.amount).sort((x, y) => y - x); return a[Math.floor(a.length * 0.1)] ?? Infinity; })();
    let list = transactions.filter((t) =>
      inRange(t.date, r) && (type === 'all' || t.type === type) && (!statuses.length || statuses.includes(t.status))
      && (!cats.length || cats.includes(t.category)) && (!projF.length || projF.includes(t.projectId ?? '__none'))
      && (!clientF.length || clientF.includes(t.clientId ?? '__none'))
      && (amount.min === undefined || t.amount >= amount.min) && (amount.max === undefined || t.amount <= amount.max)
      && (!ql || `${t.description} ${t.category} ${t.tags.join(' ')} ${projects.find((p) => p.id === t.projectId)?.name ?? ''} ${clients.find((c) => c.id === t.clientId)?.name ?? ''}`.toLowerCase().includes(ql)));
    if (view === 'unpaid') list = list.filter((t) => t.type === 'income' && t.status !== 'paid');
    if (view === 'overdue') list = list.filter((t) => t.status === 'overdue');
    if (view === 'retainers') list = list.filter((t) => t.category === 'Retainer');
    if (view === 'big') list = list.filter((t) => t.amount >= bigCut);
    if (view === 'unlinked') list = list.filter((t) => !t.projectId);
    return [...list].sort((a, b) => (sort === 'date' ? b.date.localeCompare(a.date) : b.amount - a.amount));
  }, [transactions, r.from, r.to, type, statusQ, cats, projF, clientF, amount, q, view, sort, projects, clients]); // eslint-disable-line

  const s = summarize(filtered);
  const anyFilter = range !== 'all' || type !== 'all' || statuses.length || cats.length || projF.length || clientF.length || amount.min !== undefined || amount.max !== undefined || q || view;
  const clearAll = () => { setRange('all'); setType('all'); setStatusQ(''); setCats([]); setProjF([]); setClientF([]); setAmount({}); setQ(''); setView(''); };

  const catOpts = Object.entries(groupBy(transactions, (t) => t.category)).map(([k, v]) => ({ value: k, label: k, count: v.length })).sort((a, b) => b.count - a.count);
  const projOpts = [{ value: '__none', label: 'No project' }, ...projects.map((p) => ({ value: p.id, label: p.name }))];
  const clientOpts = [{ value: '__none', label: 'No client' }, ...clients.map((c) => ({ value: c.id, label: c.name }))];

  const exportCSV = () => {
    downloadFile(`transactions-${scope}-${today()}.csv`, toCSV(filtered.map((t) => ({
      date: t.date, company: COMPANIES[t.company].name, type: t.type, amount: t.amount, category: t.category, description: t.description,
      project: projects.find((p) => p.id === t.projectId)?.name ?? '', client: clients.find((c) => c.id === t.clientId)?.name ?? '', status: t.status, method: t.method, tags: t.tags.join('|'),
    }))), 'text/csv');
    toast(`Exported ${filtered.length} rows`);
  };

  const grouped = sort === 'date' ? Object.entries(groupBy(filtered, (t) => t.date)) : [['', filtered] as [string, Transaction[]]];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scopeName(scope)} title="Finance" subtitle="Every rupee in and out — filtered, linked and explained."
        actions={<>
          <Button icon={<Download size={16} />} onClick={exportCSV}>Export</Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm({ kind: 'transaction' })}>New transaction</Button>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Money in" value={compact(s.income)} icon={<ArrowDownLeft size={16} />} tone="good" hint={`${filtered.filter((t) => t.type === 'income').length} entries`} />
        <Stat label="Money out" value={compact(s.expense)} icon={<ArrowUpRight size={16} />} tone="bad" hint={`${filtered.filter((t) => t.type === 'expense').length} entries`} />
        <Stat label="Net" value={compact(s.net)} hint={`${s.margin.toFixed(0)}% margin`} tone="accent" icon={<CheckCircle2 size={16} />} />
        <Stat label="To collect" value={compact(s.receivable)} hint={s.overdue ? `${compact(s.overdue)} overdue` : 'pending invoices'} tone="warn" icon={<Clock size={16} />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'list', label: 'Transactions' }, { value: 'analytics', label: 'Analytics' }]} />
        <Segmented size="sm" value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expenses' }]} />
      </div>

      <Card className="p-3 sm:p-4 space-y-3 relative z-10">
        <SmartViews<View> value={view} onChange={setView} views={[
          { id: 'unpaid', label: 'Unpaid invoices', icon: <Clock size={14} /> },
          { id: 'overdue', label: 'Overdue', icon: <AlertTriangle size={14} /> },
          { id: 'retainers', label: 'Retainers', icon: <Repeat size={14} /> },
          { id: 'big', label: 'Top 10% by size', icon: <Flame size={14} /> },
          { id: 'unlinked', label: 'Not linked to project', icon: <FolderKanban size={14} /> },
        ]} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search description, project, client, tag…" className="w-full sm:w-72" />
          <RangeFilter value={range} onChange={setRange} custom={custom} onCustom={setCustom} />
          <MultiFilter label="Status" value={statuses} onChange={(v) => setStatusQ(v.join(','))} options={[{ value: 'paid', label: 'Paid / received' }, { value: 'pending', label: 'Pending' }, { value: 'overdue', label: 'Overdue' }]} />
          <MultiFilter label="Category" icon={<Tag size={13} />} value={cats} onChange={setCats} options={catOpts} />
          <MultiFilter label="Project" icon={<FolderKanban size={13} />} value={projF} onChange={setProjF} options={projOpts} />
          <MultiFilter label="Client" icon={<Users size={13} />} value={clientF} onChange={setClientF} options={clientOpts} />
          <AmountFilter min={amount.min} max={amount.max} onChange={setAmount} />
          <div className="flex-1" />
          <Segmented size="sm" value={sort} onChange={setSort} options={[{ value: 'date', label: 'Newest' }, { value: 'amount', label: 'Largest' }]} />
          {anyFilter ? <button onClick={clearAll} className="text-xs font-semibold text-accent px-2">Clear all</button> : null}
        </div>
      </Card>

      {tab === 'analytics' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
          <Card className="xl:col-span-3"><CardHeader title="Cash flow trend" subtitle="Filtered transactions · last 12 months" /><div className="px-5 pb-5"><CashflowChart data={monthlySeries(filtered, 12)} /></div></Card>
          <Card><CardHeader title="Expenses by category" /><div className="px-5 pb-5"><Donut data={byCategory(filtered.filter((t) => t.type === 'expense'))} centerLabel="spent" height={160} /></div></Card>
          <Card><CardHeader title="Income by category" /><div className="px-5 pb-5"><Donut data={byCategory(filtered.filter((t) => t.type === 'income' && t.status === 'paid'))} centerLabel="collected" height={160} /></div></Card>
          <Card>
            <CardHeader title="Top paying clients" subtitle="Collected in range" />
            <div className="px-5 pb-5 space-y-3">
              {Object.entries(groupBy(filtered.filter((t) => t.type === 'income' && t.status === 'paid' && t.clientId), (t) => t.clientId!))
                .map(([id, xs]) => ({ id, v: sum(xs, (t) => t.amount) })).sort((a, b) => b.v - a.v).slice(0, 7).map((x, i, arr) => (
                  <div key={x.id}>
                    <div className="flex justify-between text-sm"><span className="font-medium truncate">{clients.find((c) => c.id === x.id)?.name}</span><span className="num font-semibold">{compact(x.v)}</span></div>
                    <div className="h-1.5 rounded-full bg-ink/[.06] mt-1.5"><div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(x.v / arr[0].v) * 100}%` }} /></div>
                    {i === 0 && <div className="text-[11px] text-ink-mute mt-1">{((x.v / Math.max(1, s.income)) * 100).toFixed(0)}% of income — {x.v / Math.max(1, s.income) > 0.35 ? 'high concentration risk' : 'healthy spread'}</div>}
                  </div>
                ))}
            </div>
          </Card>
        </div>
      ) : filtered.length === 0 ? (
        <Card><Empty title="No transactions match" hint="Try widening the date range or clearing filters." action={anyFilter ? <Button onClick={clearAll}>Clear filters</Button> : <Button variant="primary" onClick={() => openForm({ kind: 'transaction' })}>Add first transaction</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_170px_150px_110px_130px] gap-4 px-5 py-3 border-b border-line table-head bg-canvas/50">
            <span>Description</span><span>Category</span><span>Project / Client</span><span>Status</span><span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-line/70">
            {grouped.slice(0, 120).map(([date, list]) => (
              <div key={date || 'all'}>
                {date && (
                  <div className="flex justify-between px-5 py-2 bg-canvas/40 text-[11px] font-semibold text-ink-mute uppercase tracking-wider">
                    <span>{fmtDate(date)} · {relDay(date)}</span>
                    <span className="num normal-case">{(() => { const n = sum(list, (t) => (t.type === 'income' ? t.amount : -t.amount)); return `${n >= 0 ? '+' : '−'}${compact(Math.abs(n))}`; })()}</span>
                  </div>
                )}
                {list.map((t) => {
                  const proj = projects.find((p) => p.id === t.projectId);
                  const cli = clients.find((c) => c.id === t.clientId);
                  return (
                    <div key={t.id} onClick={() => openForm({ kind: 'transaction', initial: t })}
                      className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_170px_150px_110px_130px] gap-3 md:gap-4 items-center px-4 md:px-5 py-3 hover:bg-accent/[.03] cursor-pointer transition">
                      <div className="flex items-center gap-3 min-w-0 md:col-span-1">
                        <span className={clsx('h-9 w-9 shrink-0 grid place-items-center rounded-xl', t.type === 'income' ? 'bg-[#2a78d6]/10 text-[#2a78d6]' : 'bg-[#eb6834]/10 text-[#c2511f]')}>
                          {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </span>
                        <div className="min-w-0 hidden md:block">
                          <div className="text-sm font-semibold truncate">{t.description || t.category}</div>
                          <div className="text-xs text-ink-mute truncate">{t.method}{scope === 'all' ? ` · ${COMPANIES[t.company].name}` : ''}{sort === 'amount' ? ` · ${fmtDate(t.date)}` : ''}</div>
                        </div>
                      </div>
                      <div className="md:hidden min-w-0">
                        <div className="text-sm font-semibold truncate">{t.description || t.category}</div>
                        <div className="text-xs text-ink-mute truncate">{t.category}{proj ? ` · ${proj.name}` : ''}</div>
                      </div>
                      <div className="hidden md:block text-sm text-ink-soft truncate">{t.category}</div>
                      <div className="hidden md:block min-w-0">
                        <div className="text-sm truncate">{proj?.name ?? <span className="text-ink-faint">—</span>}</div>
                        <div className="text-xs text-ink-mute truncate">{cli?.name}</div>
                      </div>
                      <div className="hidden md:block">
                        <button onClick={(e) => { e.stopPropagation(); if (t.status !== 'paid') { upsert({ ...t, status: 'paid' }); toast('Marked as paid'); } }}
                          title={t.status !== 'paid' ? 'Click to mark paid' : undefined}>
                          <Badge className={STATUS_BADGE[t.status]}>{t.status === 'paid' ? (t.type === 'income' ? 'Received' : 'Paid') : t.status === 'pending' ? 'Pending' : 'Overdue'}</Badge>
                        </button>
                      </div>
                      <div className="text-right">
                        <div className={clsx('num font-bold text-[15px]', t.type === 'income' ? 'text-[#2a78d6]' : 'text-ink')}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</div>
                        <div className="md:hidden mt-0.5"><Badge className={clsx(STATUS_BADGE[t.status], '!h-5 !text-[10px]')}>{t.status}</Badge></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {filtered.length > 0 && <div className="px-5 py-3 text-xs text-ink-mute border-t border-line bg-canvas/40">{filtered.length} transactions · {range !== 'all' ? `${fmtDate(r.from)} – ${fmtDate(r.to)}` : 'all time'}</div>}
        </Card>
      )}
    </div>
  );
}
