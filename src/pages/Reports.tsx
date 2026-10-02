import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Download, Scale } from 'lucide-react';
import { useStore } from '@/store/store';
import { useScoped } from '@/lib/hooks';
import { useMoney } from '@/lib/format';
import { byCategory, mrr, projectFinancials, summarize } from '@/lib/metrics';
import { downloadFile, fmtMonth, sum, toCSV, pad } from '@/lib/utils';
import { Button, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { Donut, Legend } from '@/components/charts';
import { COMPANIES, SERIES } from '@/lib/constants';
import { scopeName, ScopeMark } from '@/components/layout/Brand';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CompanyId } from '@/lib/types';

export default function Reports() {
  const { scope, transactions, projects } = useScoped();
  const allTx = useStore((s) => s.transactions);
  const allProjects = useStore((s) => s.projects);
  const { money, compact } = useMoney();
  const years = [...new Set(allTx.map((t) => t.date.slice(0, 4)))].sort().reverse();
  const [year, setYear] = useState(years[0] ?? String(new Date().getFullYear()));

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`), [year]);
  const yTx = transactions.filter((t) => t.date.startsWith(year));
  const pl = months.map((k) => ({ key: k, ...summarize(yTx.filter((t) => t.date.startsWith(k))) }));
  const tot = summarize(yTx);

  const recurring = sum(yTx.filter((t) => t.type === 'income' && t.status === 'paid' && projects.find((p) => p.id === t.projectId)?.billing === 'monthly'), (t) => t.amount);
  const compare = (['clovian', 'blackx'] as CompanyId[]).map((c) => {
    const tx = allTx.filter((t) => t.company === c && t.date.startsWith(year));
    const s = summarize(tx);
    return { c, ...s, mrr: mrr(allProjects.filter((p) => p.company === c)), projects: allProjects.filter((p) => p.company === c && p.status === 'active').length };
  });
  const topProjects = projects.map((p) => ({ p, f: projectFinancials(p, transactions) })).sort((a, b) => b.f.profit - a.f.profit).slice(0, 8);

  const exportPL = () => downloadFile(`pnl-${scope}-${year}.csv`, toCSV(pl.map((m) => ({ month: m.key, income: m.income, expenses: m.expense, net: m.net, margin: m.margin.toFixed(1) }))), 'text/csv');

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scopeName(scope)} title="Reports" subtitle="Profit & loss, company comparison and what really makes you money."
        actions={<><Select value={year} onChange={(e) => setYear(e.target.value)} options={years.length ? years : [year]} className="!w-28" /><Button icon={<Download size={16} />} onClick={exportPL}>Export P&L</Button></>} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {compare.map((c, i) => (
          <Card key={c.c} className={clsx('p-5 relative overflow-hidden', scope === c.c && 'ring-2 ring-accent/30')}>
            <div className={clsx('absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl opacity-40', i === 0 ? 'bg-sky-300' : 'bg-fuchsia-300')} />
            <div className="relative flex items-center gap-3 mb-4"><ScopeMark scope={c.c} className="h-10 w-10" /><div><div className="font-bold">{COMPANIES[c.c].name}</div><div className="text-xs text-ink-mute">{COMPANIES[c.c].tagline} · {year}</div></div></div>
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[['Revenue', c.income], ['Expenses', c.expense], ['Profit', c.net], ['MRR', c.mrr]].map(([l, v]) => (
                <div key={l as string}><div className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute">{l}</div><div className={clsx('num font-bold text-lg', l === 'Profit' && ((v as number) >= 0 ? 'text-emerald-600' : 'text-rose-600'))}>{compact(v as number)}</div></div>
              ))}
            </div>
            <div className="relative text-xs text-ink-mute mt-3">{c.margin.toFixed(0)}% net margin · {c.projects} active projects</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Monthly profit" subtitle={`${scopeName(scope)} · ${year}`} icon={<Scale size={17} />} action={<Legend items={[{ label: 'Profit', color: SERIES[2] }, { label: 'Loss', color: SERIES[7] }]} />} />
        <div className="px-3 pb-5 h-[260px]">
          <ResponsiveContainer>
            <BarChart data={pl.map((m) => ({ ...m, pos: Math.max(0, m.net), neg: Math.min(0, m.net) }))} stackOffset="sign">
              <CartesianGrid vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="key" tickFormatter={fmtMonth} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={64} />
              <Tooltip formatter={(v: number) => compact(v)} labelFormatter={(l) => fmtMonth(String(l))} contentStyle={{ borderRadius: 12, border: '1px solid #e4eaf2', fontSize: 12 }} />
              <Bar dataKey="pos" name="Profit" stackId="a" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="neg" name="Loss" stackId="a" fill={SERIES[7]} radius={[0, 0, 4, 4]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <Card className="xl:col-span-2 overflow-x-auto">
          <CardHeader title="Profit & loss statement" subtitle={`${year} · cash basis (collected income)`} />
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-y border-line bg-canvas/50">{['Month', 'Income', 'Expenses', 'Net', 'Margin'].map((h, i) => <th key={h} className={clsx('table-head px-5 py-2.5', i && 'text-right')}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line/60">
              {pl.map((m) => (
                <tr key={m.key} className="hover:bg-accent/[.03]">
                  <td className="px-5 py-2.5 font-medium">{fmtMonth(m.key)}</td>
                  <td className="px-5 py-2.5 text-right num">{m.income ? money(m.income) : '—'}</td>
                  <td className="px-5 py-2.5 text-right num">{m.expense ? money(m.expense) : '—'}</td>
                  <td className={clsx('px-5 py-2.5 text-right num font-semibold', m.net > 0 ? 'text-emerald-600' : m.net < 0 ? 'text-rose-600' : 'text-ink-faint')}>{m.income || m.expense ? money(m.net) : '—'}</td>
                  <td className="px-5 py-2.5 text-right num text-ink-mute">{m.income ? `${m.margin.toFixed(0)}%` : '—'}</td>
                </tr>
              ))}
              <tr className="bg-canvas/70 font-bold"><td className="px-5 py-3">Total</td><td className="px-5 py-3 text-right num">{money(tot.income)}</td><td className="px-5 py-3 text-right num">{money(tot.expense)}</td><td className={clsx('px-5 py-3 text-right num', tot.net >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{money(tot.net)}</td><td className="px-5 py-3 text-right num">{tot.margin.toFixed(0)}%</td></tr>
            </tbody>
          </table>
        </Card>
        <div className="space-y-4 sm:space-y-5">
          <Card><CardHeader title="Expense breakdown" subtitle={year} /><div className="px-5 pb-5"><Donut data={byCategory(yTx.filter((t) => t.type === 'expense'))} centerLabel="spent" height={150} /></div></Card>
          <Card className="p-5">
            <div className="text-sm font-bold">Revenue mix</div>
            <div className="text-xs text-ink-mute mb-3">Recurring retainers vs one-time work</div>
            <div className="flex h-3 rounded-full overflow-hidden gap-[2px]"><div className="bg-[#1baf7a]" style={{ flex: recurring }} /><div className="bg-[#2a78d6]" style={{ flex: Math.max(0, tot.income - recurring) }} /></div>
            <div className="flex justify-between text-xs mt-2"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#1baf7a]" />Recurring {tot.income ? ((recurring / tot.income) * 100).toFixed(0) : 0}%</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#2a78d6]" />One-time & other</span></div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Most profitable projects" subtitle="All time, received − expenses" />
        <div className="px-5 pb-5 space-y-3">
          {topProjects.map(({ p, f }) => (
            <div key={p.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[220px_1fr_auto] gap-x-4 gap-y-1 items-center">
              <div className="text-sm font-semibold truncate">{p.name}</div>
              <div className="hidden sm:block h-2 rounded-full bg-ink/[.05]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (Math.max(0, f.profit) / Math.max(1, topProjects[0].f.profit)) * 100)}%`, background: 'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent2)))' }} /></div>
              <div className={clsx('num text-sm font-bold text-right', f.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{compact(f.profit)} <span className="text-ink-mute font-medium text-xs">· {f.margin.toFixed(0)}%</span></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
