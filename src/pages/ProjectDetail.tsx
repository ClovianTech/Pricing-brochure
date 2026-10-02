import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, CalendarDays, Clock, Flag, MessageSquare, Pencil, Plus, Repeat, Send, Trash2, AlertCircle, Sparkles, Hourglass } from 'lucide-react';
import { useStore } from '@/store/store';
import { useUI } from '@/store/ui';
import { useMoney } from '@/lib/format';
import { projectFinancials } from '@/lib/metrics';
import { fmtDate, fmtDateTime, sum } from '@/lib/utils';
import { Avatar, Badge, Button, Card, CardHeader, Empty, Progress, Segmented, Select, Stat } from '@/components/ui';
import { COMPANIES, PROJECT_STATUSES, projectStatusMeta } from '@/lib/constants';
import { toast } from '@/components/ui/feedback';
import type { Comment } from '@/lib/types';

const KIND: Record<Comment['kind'], { label: string; icon: typeof Flag; cls: string }> = {
  note: { label: 'Note', icon: MessageSquare, cls: 'bg-slate-100 text-slate-600' },
  update: { label: 'Update', icon: Sparkles, cls: 'bg-sky-100 text-sky-600' },
  issue: { label: 'Issue', icon: AlertCircle, cls: 'bg-rose-100 text-rose-600' },
  milestone: { label: 'Milestone', icon: Flag, cls: 'bg-emerald-100 text-emerald-600' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const st = useStore();
  const openForm = useUI((s) => s.openForm);
  const { money, compact } = useMoney();
  const p = st.projects.find((x) => x.id === id);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Comment['kind']>('note');
  const [txTab, setTxTab] = useState<'all' | 'income' | 'expense'>('all');

  const txs = useMemo(() => st.transactions.filter((t) => t.projectId === id).sort((a, b) => b.date.localeCompare(a.date)), [st.transactions, id]);
  if (!p) return <Card><Empty title="Project not found" action={<Button onClick={() => nav('/projects')}>Back to projects</Button>} /></Card>;
  const f = projectFinancials(p, st.transactions);
  const client = st.clients.find((c) => c.id === p.clientId);
  const sm = projectStatusMeta(p.status);
  const timePct = p.endDate ? Math.min(100, Math.max(0, (f.durationDays ? (Math.max(0, f.durationDays - (f.daysLeft ?? 0)) / f.durationDays) : 1) * 100)) : 100;
  const expByCat = Object.entries(txs.filter((t) => t.type === 'expense').reduce<Record<string, number>>((a, t) => ({ ...a, [t.category]: (a[t.category] ?? 0) + t.amount }), {})).sort((a, b) => b[1] - a[1]);

  const addComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    st.addProjectComment(p.id, { kind, text: text.trim() });
    setText('');
    toast('Added to timeline');
  };

  return (
    <div className="space-y-5">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-accent"><ArrowLeft size={16} />Projects</Link>

      <Card className="p-5 sm:p-7 relative overflow-hidden animate-fade-up">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[.06] via-transparent to-accent2/[.08]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
          <Avatar name={p.name} size={64} className="!rounded-2xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge className={sm.tone}>{sm.label}</Badge>
              {p.billing === 'monthly' ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200"><Repeat size={11} />Monthly recurring</Badge> : <Badge>One-time</Badge>}
              <Badge className="bg-white/80 text-ink-soft ring-line">{p.category}</Badge>
              <Badge className="bg-ink/5 text-ink-mute ring-transparent">{COMPANIES[p.company].name}</Badge>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{p.name}</h1>
            <p className="text-sm text-ink-mute mt-1">{client ? <Link to={`/clients?open=${client.id}`} className="font-semibold text-ink-soft hover:text-accent">{client.name}</Link> : 'No client'}{p.description && ` · ${p.description}`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={p.status} onChange={(e) => { st.upsertProject({ ...p, status: e.target.value as typeof p.status, progress: e.target.value === 'completed' ? 100 : p.progress }); toast('Status updated'); }} options={PROJECT_STATUSES.map((s) => ({ value: s.id, label: s.label }))} className="!w-40" />
            <Button icon={<Pencil size={15} />} onClick={() => openForm({ kind: 'project', initial: p })}>Edit</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
        <Stat label={p.billing === 'monthly' ? 'Earned to date' : 'Contract value'} value={compact(p.billing === 'monthly' ? f.earned : f.contractValue)} hint={p.billing === 'monthly' ? `${compact(p.amount)} × ${f.monthsActive} mo` : undefined} />
        <Stat label="Received" value={compact(f.received)} tone="good" hint={f.pending ? `${compact(f.pending)} pending` : 'all clear'} />
        <Stat label="Outstanding" value={compact(f.outstanding)} tone={f.outstanding ? 'warn' : 'good'} hint="value − received" />
        <Stat label="Expenses" value={compact(f.expenses)} tone="bad" hint={p.estimatedCost ? `${f.budgetUsed.toFixed(0)}% of budget` : 'no budget set'} />
        <Stat label="Profit so far" value={compact(f.profit)} tone={f.profit >= 0 ? 'good' : 'bad'} hint="received − expenses" />
        <Stat label="Margin" value={`${f.margin.toFixed(0)}%`} tone={f.margin >= 35 ? 'good' : 'warn'} hint={`Projected ${compact(f.projectedProfit)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <div className="space-y-4 sm:space-y-5">
          <Card>
            <CardHeader title="Timeline & duration" icon={<CalendarDays size={17} />} />
            <div className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-canvas ring-1 ring-line p-3"><div className="label !mb-0.5">Start</div><div className="font-semibold">{fmtDate(p.startDate)}</div></div>
                <div className="rounded-xl bg-canvas ring-1 ring-line p-3"><div className="label !mb-0.5">{p.billing === 'monthly' ? 'Contract end' : 'Deadline'}</div><div className="font-semibold">{p.endDate ? fmtDate(p.endDate) : 'Ongoing'}</div></div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 grid place-items-center rounded-xl bg-accent/10 text-accent"><Hourglass size={18} /></span>
                <div>
                  <div className="font-bold">{f.durationLabel}</div>
                  <div className={clsx('text-xs', f.daysLeft !== undefined && f.daysLeft < 0 ? 'text-rose-600 font-semibold' : 'text-ink-mute')}>
                    {f.daysLeft !== undefined ? (f.daysLeft < 0 ? `${-f.daysLeft} days past deadline` : `${f.daysLeft} days remaining`) : p.status === 'completed' ? 'Delivered' : 'No deadline'}
                  </div>
                </div>
              </div>
              {p.billing === 'one-time' && (
                <>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-ink-soft">Work progress</span><span className="num font-bold">{p.progress}%</span></div>
                    <input type="range" min={0} max={100} step={5} value={p.progress} onChange={(e) => st.upsertProject({ ...p, progress: Number(e.target.value) })} className="w-full accent-[rgb(var(--accent))]" />
                  </div>
                  {p.endDate && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-ink-soft">Time elapsed</span><span className="num font-bold">{timePct.toFixed(0)}%</span></div>
                      <Progress value={timePct} color={timePct > p.progress + 15 ? '#e11d48' : undefined} />
                      {timePct > p.progress + 15 && <p className="text-[11px] text-rose-600 mt-1.5">Time is running ahead of progress — risk of delay.</p>}
                    </div>
                  )}
                </>
              )}
              {p.estimatedCost > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-ink-soft">Cost budget</span><span className="num font-bold">{compact(f.expenses)} / {compact(p.billing === 'monthly' ? p.estimatedCost * Math.max(1, f.monthsActive) : p.estimatedCost)}</span></div>
                  <Progress value={p.billing === 'monthly' ? (f.expenses / (p.estimatedCost * Math.max(1, f.monthsActive))) * 100 : f.budgetUsed} color={f.budgetUsed > 100 && p.billing === 'one-time' ? '#e11d48' : '#eb6834'} />
                </div>
              )}
            </div>
          </Card>
          {expByCat.length > 0 && (
            <Card>
              <CardHeader title="Where the money went" subtitle="Expenses by category" />
              <div className="px-5 pb-5 space-y-2.5">
                {expByCat.map(([c, v]) => (
                  <div key={c}><div className="flex justify-between text-sm"><span className="text-ink-soft">{c}</span><span className="num font-semibold">{compact(v)}</span></div>
                    <div className="h-1.5 rounded-full bg-ink/[.06] mt-1"><div className="h-full rounded-full bg-[#eb6834]" style={{ width: `${(v / expByCat[0][1]) * 100}%` }} /></div></div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card className="xl:col-span-1">
          <CardHeader title="Payments & expenses" subtitle={`${txs.length} linked transactions`} action={<Segmented size="sm" value={txTab} onChange={setTxTab} options={[{ value: 'all', label: 'All' }, { value: 'income', label: 'In' }, { value: 'expense', label: 'Out' }]} />} />
          <div className="px-5 pb-3 grid grid-cols-2 gap-2">
            <Button variant="soft" size="sm" icon={<ArrowDownLeft size={14} />} onClick={() => openForm({ kind: 'transaction', initial: { company: p.company, type: 'income', projectId: p.id, clientId: p.clientId, category: p.billing === 'monthly' ? 'Retainer' : 'Project Payment', amount: p.billing === 'monthly' ? p.amount : undefined, description: `${p.name} — payment` } })}>Record payment</Button>
            <Button variant="soft" size="sm" icon={<ArrowUpRight size={14} />} onClick={() => openForm({ kind: 'transaction', initial: { company: p.company, type: 'expense', projectId: p.id, category: 'Freelancers', description: `${p.name} — ` } })}>Add expense</Button>
          </div>
          <div className="px-2 pb-3 max-h-[520px] overflow-y-auto">
            {txs.filter((t) => txTab === 'all' || t.type === txTab).map((t) => (
              <button key={t.id} onClick={() => openForm({ kind: 'transaction', initial: t })} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/[.04] text-left">
                <span className={clsx('h-8 w-8 shrink-0 grid place-items-center rounded-lg', t.type === 'income' ? 'bg-[#2a78d6]/10 text-[#2a78d6]' : 'bg-[#eb6834]/10 text-[#c2511f]')}>{t.type === 'income' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span>
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{t.description || t.category}</div><div className="text-xs text-ink-mute">{fmtDate(t.date)} · {t.category}{t.status !== 'paid' && <span className="text-amber-600 font-semibold"> · {t.status}</span>}</div></div>
                <span className={clsx('num font-bold text-sm', t.type === 'income' ? 'text-[#2a78d6]' : 'text-ink')}>{t.type === 'income' ? '+' : '−'}{compact(t.amount)}</span>
              </button>
            ))}
            {!txs.length && <p className="text-sm text-ink-mute p-3">No payments or expenses yet.</p>}
          </div>
          <div className="px-5 py-3 border-t border-line text-xs flex justify-between bg-canvas/40 rounded-b-2xl">
            <span className="text-ink-mute">Net on project</span><span className={clsx('num font-bold', f.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{money(sum(txs.filter((t) => t.status === 'paid' || t.type === 'expense'), (t) => (t.type === 'income' ? t.amount : -t.amount)))}</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Comments & activity" subtitle="Notes, updates, issues, milestones" icon={<MessageSquare size={17} />} />
          <form onSubmit={addComment} className="px-5 pb-4">
            <div className="flex gap-1.5 mb-2">
              {(Object.keys(KIND) as Comment['kind'][]).map((k) => (
                <button type="button" key={k} onClick={() => setKind(k)} className={clsx('chip !h-7 !px-2.5', kind === k && 'chip-on')}>{KIND[k].label}</button>
              ))}
            </div>
            <div className="relative">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Write a comment… (Ctrl+Enter to post)"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addComment(e); }}
                className="input h-auto py-2.5 pr-12 resize-none" />
              <button type="submit" className="absolute right-2 bottom-2 h-8 w-8 grid place-items-center rounded-lg bg-accent text-white hover:brightness-110" aria-label="Post"><Send size={14} /></button>
            </div>
          </form>
          <div className="px-5 pb-5 relative">
            <div className="absolute left-[35px] top-1 bottom-6 w-px bg-line" />
            <div className="space-y-4">
              {p.comments.map((c) => {
                const k = KIND[c.kind];
                return (
                  <div key={c.id} className="relative flex gap-3 group">
                    <span className={clsx('relative z-10 h-8 w-8 shrink-0 grid place-items-center rounded-full ring-4 ring-white', k.cls)}><k.icon size={14} /></span>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 text-[11px] text-ink-mute"><span className="font-semibold text-ink-soft">{k.label}</span><Clock size={11} />{fmtDateTime(c.at)}
                        <button onClick={() => st.removeProjectComment(p.id, c.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-600" aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                      <p className="text-sm text-ink mt-0.5 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                    </div>
                  </div>
                );
              })}
              {!p.comments.length && <p className="text-sm text-ink-mute pl-12">No activity yet.</p>}
            </div>
          </div>
        </Card>
      </div>
      <div className="flex justify-end"><Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => openForm({ kind: 'project', initial: { company: p.company, clientId: p.clientId, category: p.category, billing: p.billing } })}>New project for this client</Button></div>
    </div>
  );
}
