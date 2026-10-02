import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, FolderKanban, LayoutGrid, List, Plus, Repeat, Columns3, TrendingUp, Percent, Zap, AlertTriangle, Tag, Users } from 'lucide-react';
import { useScoped, useQueryState } from '@/lib/hooks';
import { useMoney } from '@/lib/format';
import { useUI } from '@/store/ui';
import { useStore } from '@/store/store';
import { mrr, projectFinancials, type ProjectFinancials } from '@/lib/metrics';
import { fmtDate, groupBy, sum } from '@/lib/utils';
import { Avatar, Badge, Button, Card, Empty, PageHeader, Progress, Segmented, Stat } from '@/components/ui';
import { MultiFilter, SearchBox, SmartViews } from '@/components/filters';
import { COMPANIES, PROJECT_STATUSES, projectStatusMeta } from '@/lib/constants';
import { scopeName } from '@/components/layout/Brand';
import type { Project, ProjectStatus } from '@/lib/types';
import { toast } from '@/components/ui/feedback';

type Sort = 'recent' | 'value' | 'profit' | 'margin' | 'deadline';
type View = 'risk' | 'due' | 'top' | 'low-margin';

export default function Projects() {
  const { scope, projects, transactions, clients } = useScoped();
  const openForm = useUI((s) => s.openForm);
  const upsert = useStore((s) => s.upsertProject);
  const { compact } = useMoney();
  const [layout, setLayout] = useQueryState<'grid' | 'board' | 'table'>('layout', 'grid');
  const [status, setStatus] = useQueryState<'open' | 'all' | ProjectStatus>('status', 'open');
  const [billing, setBilling] = useQueryState<'all' | 'one-time' | 'monthly'>('billing', 'all');
  const [cats, setCats] = useState<string[]>([]);
  const [clientF, setClientF] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [view, setView] = useState<View | ''>('');

  const rows = useMemo(() => projects.map((p) => ({ p, f: projectFinancials(p, transactions) })), [projects, transactions]);
  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    let list = rows.filter(({ p }) =>
      (status === 'all' || (status === 'open' ? ['active', 'planning', 'on-hold'].includes(p.status) : p.status === status))
      && (billing === 'all' || p.billing === billing) && (!cats.length || cats.includes(p.category)) && (!clientF.length || clientF.includes(p.clientId ?? ''))
      && (!ql || `${p.name} ${p.category} ${p.tags.join(' ')} ${clients.find((c) => c.id === p.clientId)?.name ?? ''}`.toLowerCase().includes(ql)));
    if (view === 'risk') list = list.filter(({ p, f }) => (p.estimatedCost && f.budgetUsed > 85 && p.progress < 85) || (f.daysLeft !== undefined && f.daysLeft < 0));
    if (view === 'due') list = list.filter(({ f }) => f.daysLeft !== undefined && f.daysLeft <= 30);
    if (view === 'top') list = [...list].sort((a, b) => b.f.profit - a.f.profit).slice(0, 5);
    if (view === 'low-margin') list = list.filter(({ f, p }) => f.margin < 35 && p.status !== 'planning');
    const key: Record<Sort, (x: { p: Project; f: ProjectFinancials }) => number | string> = {
      recent: (x) => x.p.startDate, value: (x) => x.f.contractValue, profit: (x) => x.f.profit, margin: (x) => x.f.margin, deadline: (x) => -(x.f.daysLeft ?? 99999),
    };
    return [...list].sort((a, b) => { const ka = key[sort](a), kb = key[sort](b); return ka < kb ? 1 : ka > kb ? -1 : 0; });
  }, [rows, status, billing, cats, clientF, q, sort, view, clients]);

  const active = rows.filter(({ p }) => p.status === 'active');
  const totals = {
    value: sum(filtered, (x) => (x.p.billing === 'one-time' ? x.f.contractValue : x.f.earned)),
    profit: sum(filtered, (x) => x.f.profit),
    margin: (() => { const base = sum(filtered, (x) => (x.p.billing === 'one-time' ? x.f.contractValue : x.f.earned)); return base ? ((base - sum(filtered, (x) => x.f.expenses)) / base) * 100 : 0; })(),
  };
  const catOpts = Object.entries(groupBy(projects, (p) => p.category)).map(([k, v]) => ({ value: k, label: k, count: v.length }));
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name ?? 'No client';

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scopeName(scope)} title="Projects" subtitle="Value, cost, profit & timeline of every engagement — one-time and recurring."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm({ kind: 'project' })}>New project</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Active projects" value={active.length} hint={`${rows.filter(({ p }) => p.status === 'planning').length} in planning`} icon={<FolderKanban size={16} />} />
        <Stat label="MRR (retainers)" value={compact(mrr(projects))} hint={`${active.filter(({ p }) => p.billing === 'monthly').length} monthly clients`} icon={<Repeat size={16} />} tone="good" />
        <Stat label="Value (filtered)" value={compact(totals.value)} hint={`${compact(totals.profit)} profit so far`} icon={<TrendingUp size={16} />} tone="ink" />
        <Stat label="Avg. margin" value={`${totals.margin.toFixed(0)}%`} hint="value minus costs" icon={<Percent size={16} />} tone={totals.margin >= 35 ? 'good' : 'warn'} />
      </div>

      <Card className="p-3 sm:p-4 space-y-3 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'open', label: 'Open' }, ...PROJECT_STATUSES.map((s) => ({ value: s.id, label: s.label })), { value: 'all', label: 'All' }]} />
          <Segmented size="sm" value={layout} onChange={setLayout} options={[{ value: 'grid', label: <LayoutGrid size={15} /> }, { value: 'board', label: <Columns3 size={15} /> }, { value: 'table', label: <List size={15} /> }]} />
        </div>
        <SmartViews<View> value={view} onChange={setView} views={[
          { id: 'risk', label: 'At risk', icon: <AlertTriangle size={14} /> },
          { id: 'due', label: 'Due in 30 days', icon: <CalendarDays size={14} /> },
          { id: 'top', label: 'Top 5 earners', icon: <Zap size={14} /> },
          { id: 'low-margin', label: 'Margin < 35%', icon: <Percent size={14} /> },
        ]} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search projects, clients, tags…" className="w-full sm:w-64" />
          <Segmented size="sm" value={billing} onChange={setBilling} options={[{ value: 'all', label: 'All billing' }, { value: 'one-time', label: 'One-time' }, { value: 'monthly', label: 'Monthly' }]} />
          <MultiFilter label="Category" icon={<Tag size={13} />} value={cats} onChange={setCats} options={catOpts} />
          <MultiFilter label="Client" icon={<Users size={13} />} value={clientF} onChange={setClientF} options={clients.map((c) => ({ value: c.id, label: c.name }))} />
          <div className="flex-1" />
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="chip !h-9 pr-2 outline-none cursor-pointer">
            <option value="recent">Sort: Newest</option><option value="value">Sort: Value</option><option value="profit">Sort: Profit</option><option value="margin">Sort: Margin</option><option value="deadline">Sort: Deadline</option>
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card><Empty icon={<FolderKanban size={24} />} title="No projects here" hint="Adjust filters or create your first project." action={<Button variant="primary" onClick={() => openForm({ kind: 'project' })}>New project</Button>} /></Card>
      ) : layout === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-3 px-3 snap-x">
          {PROJECT_STATUSES.map((s) => {
            const col = filtered.filter(({ p }) => p.status === s.id);
            return (
              <div key={s.id} className="w-[290px] shrink-0 snap-start"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { const id = e.dataTransfer.getData('text/plain'); const p = projects.find((x) => x.id === id); if (p && p.status !== s.id) { upsert({ ...p, status: s.id, progress: s.id === 'completed' ? 100 : p.progress }); toast(`Moved to ${s.label}`); } }}>
                <div className="flex items-center justify-between px-1 mb-3">
                  <Badge className={s.tone}>{s.label}</Badge>
                  <span className="text-xs text-ink-mute num">{col.length} · {compact(sum(col, (x) => x.f.contractValue))}</span>
                </div>
                <div className="space-y-3 min-h-[120px] rounded-2xl p-1">
                  {col.map((x) => <ProjectCard key={x.p.id} {...x} client={clientName(x.p.clientId)} showCo={scope === 'all'} draggable />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : layout === 'table' ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b border-line bg-canvas/50">{['Project', 'Category', 'Billing', 'Value', 'Received', 'Expenses', 'Profit', 'Margin', 'Duration', 'Status'].map((h) => <th key={h} className="table-head px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line/70">
              {filtered.map(({ p, f }) => (
                <tr key={p.id} className="hover:bg-accent/[.03]">
                  <td className="px-4 py-3"><Link to={`/projects/${p.id}`} className="font-semibold hover:text-accent">{p.name}</Link><div className="text-xs text-ink-mute">{clientName(p.clientId)}</div></td>
                  <td className="px-4 py-3 text-ink-soft">{p.category}</td>
                  <td className="px-4 py-3">{p.billing === 'monthly' ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Monthly</Badge> : <Badge>One-time</Badge>}</td>
                  <td className="px-4 py-3 num font-semibold">{compact(p.amount)}{p.billing === 'monthly' && <span className="text-ink-mute text-xs">/mo</span>}</td>
                  <td className="px-4 py-3 num">{compact(f.received)}</td>
                  <td className="px-4 py-3 num">{compact(f.expenses)}</td>
                  <td className={clsx('px-4 py-3 num font-bold', f.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{compact(f.profit)}</td>
                  <td className="px-4 py-3 num">{f.margin.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{f.durationLabel}</td>
                  <td className="px-4 py-3"><Badge className={projectStatusMeta(p.status).tone}>{projectStatusMeta(p.status).label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filtered.map((x, i) => <div key={x.p.id} className="animate-fade-up min-w-0" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}><ProjectCard {...x} client={clientName(x.p.clientId)} showCo={scope === 'all'} /></div>)}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ p, f, client, showCo, draggable }: { p: Project; f: ProjectFinancials; client: string; showCo?: boolean; draggable?: boolean }) {
  const { compact } = useMoney();
  const sm = projectStatusMeta(p.status);
  return (
    <Link to={`/projects/${p.id}`} draggable={draggable} onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
      className="block card card-hover p-4 sm:p-5 group">
      <div className="flex items-start gap-3">
        <Avatar name={p.name} size={42} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[15px] truncate group-hover:text-accent transition">{p.name}</div>
          <div className="text-xs text-ink-mute truncate">{client} · {p.category}</div>
        </div>
        {!draggable && <Badge className={sm.tone}>{sm.label}</Badge>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {p.billing === 'monthly' ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200"><Repeat size={11} />Monthly</Badge> : <Badge>One-time</Badge>}
        {p.priority === 'high' && <Badge className="bg-rose-50 text-rose-600 ring-rose-200">High priority</Badge>}
        {showCo && <Badge className="bg-ink/5 text-ink-mute ring-transparent">{COMPANIES[p.company].name}</Badge>}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute">{p.billing === 'monthly' ? 'Per month' : 'Value'}</div><div className="num font-bold">{compact(p.amount)}</div></div>
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Profit</div><div className={clsx('num font-bold', f.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{compact(f.profit)}</div></div>
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Margin</div><div className="num font-bold">{f.margin.toFixed(0)}%</div></div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-ink-mute mb-1.5">
          <span>{p.billing === 'monthly' ? f.durationLabel : `${p.progress}% · ${f.durationLabel}`}</span>
          <span className={clsx(f.daysLeft !== undefined && f.daysLeft < 0 && 'text-rose-600 font-semibold')}>
            {f.daysLeft !== undefined ? (f.daysLeft < 0 ? `${-f.daysLeft}d overdue` : `${f.daysLeft}d left`) : p.endDate ? fmtDate(p.endDate) : 'No end date'}
          </span>
        </div>
        <Progress value={p.billing === 'monthly' ? 100 : p.progress} thin />
      </div>
    </Link>
  );
}
