import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { useMoney } from '@/lib/format';
import { fmtMonth } from '@/lib/utils';
import { EXPENSE_COLOR, INCOME_COLOR, OTHER_COLOR, SERIES } from '@/lib/constants';
import { useId, type ReactNode } from 'react';

function TipBox({ title, rows }: { title: ReactNode; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl bg-white/95 backdrop-blur ring-1 ring-line shadow-lift px-3 py-2.5 text-xs min-w-[150px]">
      <div className="font-bold text-ink mb-1.5">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-mute">{r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}{r.label}</span>
          <span className="num font-semibold text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: i.color }} /> : <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />}
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Income vs expense bars per month with a net line (single shared axis). */
export function CashflowChart({ data, height = 280, incomeLabel = 'Income', expenseLabel = 'Expenses' }: { data: { key: string; income: number; expense: number; net: number }[]; height?: number; incomeLabel?: string; expenseLabel?: string }) {
  const { compact } = useMoney();
  return (
    <div>
      <Legend items={[{ label: incomeLabel, color: INCOME_COLOR }, { label: expenseLabel, color: EXPENSE_COLOR }, { label: 'Net', color: '#0f1b2d', dashed: true }]} />
      <div style={{ height }} className="mt-3 -ml-2">
        <ResponsiveContainer>
          <ComposedChart data={data} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="key" tickFormatter={fmtMonth} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={64} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <TipBox title={fmtMonth(String(label))} rows={[
                { label: incomeLabel, value: compact(payload[0].payload.income), color: INCOME_COLOR },
                { label: expenseLabel, value: compact(payload[0].payload.expense), color: EXPENSE_COLOR },
                { label: 'Net', value: compact(payload[0].payload.net), color: '#0f1b2d' },
              ]} />) : null} />
            <Bar dataKey="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Line dataKey="net" stroke="#0f1b2d" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendArea({ data, dataKey, height = 220, color = 'rgb(var(--accent))', label, xFormat = fmtMonth }: { data: Record<string, number | string>[]; dataKey: string; height?: number; color?: string; label: string; xFormat?: (s: string) => string }) {
  const { compact } = useMoney();
  const gid = `g-${dataKey}-${useId().replace(/:/g, '')}`;
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.25} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="key" tickFormatter={xFormat} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={64} />
          <Tooltip cursor={{ stroke: '#cbd5e1' }} content={({ active, payload, label: l }) => active && payload?.length ? <TipBox title={xFormat(String(l))} rows={[{ label, value: compact(Number(payload[0].value)), color }]} /> : null} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gid})`} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut + ranked legend (legend doubles as the table view). */
export function Donut({ data, centerLabel, height = 200 }: { data: { name: string; value: number }[]; centerLabel?: string; height?: number }) {
  const { compact } = useMoney();
  const total = data.reduce((a, d) => a + d.value, 0);
  const color = (name: string, i: number) => (name === 'Other' ? OTHER_COLOR : SERIES[i % SERIES.length]);
  if (!total) return <div className="text-sm text-ink-mute py-10 text-center">No data in this range</div>;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" animationDuration={700} innerRadius="68%" outerRadius="100%" paddingAngle={1.5} stroke="#fff" strokeWidth={2} cornerRadius={4}>
              {data.map((d, i) => <Cell key={d.name} fill={color(d.name, i)} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox title={String(payload[0].name)} rows={[{ label: 'Amount', value: compact(Number(payload[0].value)) }, { label: 'Share', value: `${((Number(payload[0].value) / total) * 100).toFixed(1)}%` }]} /> : null} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
          <div><div className="num text-lg font-bold">{compact(total)}</div><div className="text-[11px] text-ink-mute">{centerLabel}</div></div>
        </div>
      </div>
      <div className="w-full space-y-1.5 min-w-0">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-[3px] shrink-0" style={{ background: color(d.name, i) }} />
            <span className="text-ink-soft truncate flex-1">{d.name}</span>
            <span className="num font-semibold text-ink">{compact(d.value)}</span>
            <span className="text-[11px] text-ink-mute w-10 text-right">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
