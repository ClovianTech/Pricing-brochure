import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, CalendarClock, FolderKanban, Receipt, Repeat, Target, TrendingUp, Wallet, Phone, Mail, MessageCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useScoped } from '@/lib/hooks';
import { useMoney } from '@/lib/format';
import { useStore } from '@/store/store';
import { useUI } from '@/store/ui';
import { companyInsights, leadScore, monthlySeries, mrr, projectFinancials, scoreLabel, summarize, byCategory, weightedValue } from '@/lib/metrics';
import { monthKey, pct, today, relDay, fmtShort, addMonths, startOfMonth, sum } from '@/lib/utils';
import { Avatar, Badge, Button, Card, CardHeader, PageHeader, Progress, Stat } from '@/components/ui';
import { CashflowChart, Donut, TrendArea } from '@/components/charts';
import { InsightsPanel } from '@/components/Insights';
import { scopeName } from '@/components/layout/Brand';
import { projectStatusMeta, stageMeta, LEAD_STAGES, COMPANIES } from '@/lib/constants';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const { scope, transactions, projects, leads, clients } = useScoped();
  const owner = useStore((s) => s.settings.ownerName);
  const openForm = useUI((s) => s.openForm);
  const { money, compact } = useMoney();

  const d = useMemo(() => {
    const thisM = monthKey(new Date());
    const lastM = monthKey(addMonths(startOfMonth(new Date()), -1));
    const cur = summarize(transactions.filter((t) => monthKey(t.date) === thisM));
    const prev = summarize(transactions.filter((t) => monthKey(t.date) === lastM));
    const prevToDate = summarize(transactions.filter((t) => monthKey(t.date) === lastM && Number(t.date.slice(8, 10)) <= new Date().getDate()));
    const all = summarize(transactions);
    const series = monthlySeries(transactions, 12);
    const ytd = summarize(transactions.filter((t) => t.date.slice(0, 4) === today().slice(0, 4)));
    const openLeads = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
    const pipeline = sum(openLeads, (l) => (l.billing === 'monthly' ? l.value * 12 : l.value));
    const weighted = sum(openLeads, weightedValue);
    const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'planning');
    const followUps = openLeads.filter((l) => l.nextFollowUp && l.nextFollowUp <= today()).sort((a, b) => (a.nextFollowUp! < b.nextFollowUp! ? -1 : 1));
    const upcoming = openLeads.filter((l) => l.nextFollowUp && l.nextFollowUp > today()).sort((a, b) => (a.nextFollowUp! < b.nextFollowUp! ? -1 : 1));
    const revenueByCat = byCategory(transactions.filter((t) => t.type === 'income' && t.status === 'paid' && t.projectId && t.date >= `${today().slice(0, 4)}-01-01`).map((t) => ({ amount: t.amount, category: projects.find((p) => p.id === t.projectId)?.category ?? 'Other' })), 6);
    return { cur, prev, prevToDate, all, series, ytd, pipeline, weighted, openLeads, activeProjects, followUps, upcoming, revenueByCat, mrr: mrr(projects) };
  }, [transactions, projects, leads]);

  const insights = useMemo(() => companyInsights(transactions, projects, leads, compact), [transactions, projects, leads, compact]);
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={scopeName(scope)} title={<>{greeting()}, <span className="text-gradient">{owner.split(' ')[0]}</span></>}
        subtitle={`Here’s how ${scope === 'all' ? 'your companies are' : scopeName(scope) + ' is'} doing — ${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}.`}
        actions={<>
          <Button icon={<Target size={16} />} onClick={() => openForm({ kind: 'lead' })}>Add lead</Button>
          <Button variant="primary" icon={<Receipt size={16} />} onClick={() => openForm({ kind: 'transaction' })}>Record transaction</Button>
        </>} />

      {/* Hero */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <Card className="xl:col-span-2 p-5 sm:p-7 relative overflow-hidden animate-fade-up">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[.07] via-transparent to-accent2/[.08]" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-accent/10" />
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-accent2/20" />
          <div className="relative grid sm:grid-cols-[1.2fr_1fr] gap-6 items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.18em] text-ink-mute">Net profit · this month</div>
              <div className={`num text-4xl sm:text-5xl font-bold mt-2 ${d.cur.net >= 0 ? 'text-ink' : 'text-rose-600'}`}>{money(d.cur.net)}</div>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
                <Badge className="bg-white/80 text-ink-soft ring-line">Last month {compact(d.prev.net)}</Badge>
                {d.cur.income > 0
                  ? <Badge className={d.cur.margin >= 20 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}>{Math.max(-999, d.cur.margin).toFixed(0)}% margin</Badge>
                  : <Badge className="bg-white/80 text-ink-mute ring-line">No income collected yet</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Collected', v: d.cur.income, c: 'text-[#2a78d6]' },
                { l: 'Spent', v: d.cur.expense, c: 'text-[#c2511f]' },
                { l: 'YTD revenue', v: d.ytd.income, c: 'text-ink' },
                { l: 'YTD profit', v: d.ytd.net, c: 'text-ink' },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl bg-white/80 ring-1 ring-line/80 p-3">
                  <div className="text-[11px] font-semibold text-ink-mute uppercase tracking-wider">{x.l}</div>
                  <div className={`num text-lg font-bold mt-0.5 ${x.c}`}>{compact(x.v)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-ink-mute uppercase tracking-wider">Net profit trend · 12 months</span>
              <span className="text-ink-mute">Best: <b className="num text-ink">{compact(Math.max(...d.series.map((x) => x.net)))}</b></span>
            </div>
            <TrendArea data={d.series} dataKey="net" label="Net profit" height={170} />
          </div>
        </Card>
        <InsightsPanel items={insights} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Revenue (month)" value={compact(d.cur.income)} delta={d.prevToDate.income ? pct(d.cur.income, d.prevToDate.income) : undefined} hint={`vs ${compact(d.prevToDate.income)} same time last month`} icon={<Banknote size={16} />} />
        <Stat label="MRR" value={compact(d.mrr)} hint={`${compact(d.mrr * 12)} ARR`} icon={<Repeat size={16} />} tone="good" />
        <Stat label="Receivables" value={compact(d.all.receivable)} hint={d.all.overdue ? `${compact(d.all.overdue)} overdue` : 'nothing overdue'} icon={<Wallet size={16} />} tone={d.all.overdue ? 'bad' : 'warn'} />
        <Stat label="Weighted pipeline" value={compact(d.weighted)} hint={`${d.openLeads.length} open · ${compact(d.pipeline)} total`} icon={<TrendingUp size={16} />} tone="ink" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <Card className="xl:col-span-2">
          <CardHeader title="Cash flow" subtitle="Last 12 months · collected vs spent" action={<Link to="/finance" className="text-xs font-semibold text-accent inline-flex items-center gap-1">Finance <ArrowRight size={13} /></Link>} />
          <div className="px-5 pb-5"><CashflowChart data={d.series} /></div>
        </Card>
        <Card>
          <CardHeader title="Revenue by service" subtitle="This year, collected" />
          <div className="px-5 pb-5"><Donut data={d.revenueByCat} centerLabel="collected" height={170} /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-5">
        {/* Projects */}
        <Card className="xl:col-span-3">
          <CardHeader title="Active projects" subtitle={`${d.activeProjects.length} in motion`} icon={<FolderKanban size={17} />} action={<Link to="/projects" className="text-xs font-semibold text-accent inline-flex items-center gap-1">All <ArrowRight size={13} /></Link>} />
          <div className="px-2 sm:px-3 pb-3">
            {d.activeProjects.slice(0, 6).map((p) => {
              const f = projectFinancials(p, transactions);
              const sm = projectStatusMeta(p.status);
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl hover:bg-accent/[.04] transition">
                  <Avatar name={p.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                      {scope === 'all' && <Badge className="bg-ink/5 text-ink-mute ring-transparent !h-5">{COMPANIES[p.company].short}</Badge>}
                    </div>
                    <div className="text-xs text-ink-mute truncate">{clientName(p.clientId)} · {p.billing === 'monthly' ? `${compact(p.amount)}/mo` : compact(p.amount)}</div>
                    <Progress value={p.progress} thin className="mt-2 max-w-[260px]" />
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={sm.tone}>{sm.label}</Badge>
                    <div className={`num text-sm font-bold mt-1.5 ${f.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{compact(f.profit)}</div>
                    <div className="text-[10px] text-ink-mute">profit so far</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Follow-ups */}
        <Card className="xl:col-span-2">
          <CardHeader title="Follow-ups" subtitle="Don’t let warm leads go cold" icon={<CalendarClock size={17} />} action={<Link to="/leads" className="text-xs font-semibold text-accent inline-flex items-center gap-1">Pipeline <ArrowRight size={13} /></Link>} />
          <div className="px-3 pb-3 space-y-1">
            {[...d.followUps, ...d.upcoming].slice(0, 6).map((l) => {
              const due = l.nextFollowUp! <= today();
              const sc = scoreLabel(leadScore(l, leads));
              return (
                <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-ink/[.03]">
                  <div className={`w-12 shrink-0 text-center rounded-lg py-1 ${due ? 'bg-rose-50 text-rose-600' : 'bg-accent/[.07] text-accent'}`}>
                    <div className="text-[10px] font-bold uppercase">{due ? (l.nextFollowUp! < today() ? 'Late' : 'Today') : 'Next'}</div>
                    <div className="text-xs font-bold">{fmtShort(l.nextFollowUp!)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{l.businessName || l.name}</div>
                    <div className="text-xs text-ink-mute truncate">{stageMeta(l.stage).label} · {compact(l.value)}{l.billing === 'monthly' ? '/mo' : ''} · {relDay(l.nextFollowUp)}</div>
                  </div>
                  <span className="h-2 w-2 rounded-full" style={{ background: sc.dot }} title={sc.label} />
                  <div className="flex gap-1">
                    {l.phone && <a href={`tel:${l.phone}`} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-accent/10 text-ink-mute hover:text-accent"><Phone size={14} /></a>}
                    {l.phone && <a href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hidden sm:grid h-8 w-8 place-items-center rounded-lg hover:bg-emerald-50 text-ink-mute hover:text-emerald-600"><MessageCircle size={14} /></a>}
                    {l.email && <a href={`mailto:${l.email}`} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-accent/10 text-ink-mute hover:text-accent"><Mail size={14} /></a>}
                  </div>
                </div>
              );
            })}
            {!d.followUps.length && !d.upcoming.length && <p className="text-sm text-ink-mute p-3">No follow-ups scheduled.</p>}
          </div>
          {/* mini funnel */}
          <div className="px-5 pb-5 pt-2 border-t border-line/70">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute mb-2.5 mt-3">Pipeline funnel</div>
            <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
              {LEAD_STAGES.filter((s) => s.id !== 'lost' && s.id !== 'won').map((s) => {
                const v = leads.filter((l) => l.stage === s.id).length;
                return v ? <div key={s.id} title={`${s.label}: ${v}`} style={{ flex: v, background: s.color }} /> : null;
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {LEAD_STAGES.filter((s) => s.id !== 'lost' && s.id !== 'won').map((s) => (
                <span key={s.id} className="text-[11px] text-ink-mute inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.label} {leads.filter((l) => l.stage === s.id).length}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
