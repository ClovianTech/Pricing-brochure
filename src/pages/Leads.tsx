import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Columns3, Flame, List, Mail, MessageCircle, Phone, Plus, Snowflake, Target, TrendingUp, Trophy, Users, Percent, CalendarCheck, Gem, Pencil, ArrowRightCircle, XCircle, Send, PhoneCall, Video, StickyNote, Sparkles } from 'lucide-react';
import { useScoped, useQueryState } from '@/lib/hooks';
import { useMoney } from '@/lib/format';
import { useStore } from '@/store/store';
import { useUI } from '@/store/ui';
import { leadScore, scoreLabel, weightedValue } from '@/lib/metrics';
import { addDays, daysBetween, fmtDate, fmtDateTime, groupBy, relDay, sum, toISODate, today } from '@/lib/utils';
import { Avatar, Badge, Button, Card, CardHeader, Empty, PageHeader, Segmented, Select, Stat } from '@/components/ui';
import { MultiFilter, SearchBox, SmartViews } from '@/components/filters';
import { Drawer } from '@/components/ui/Modal';
import { COMPANIES, LEAD_SOURCES, LEAD_STAGES, stageMeta } from '@/lib/constants';
import { scopeName } from '@/components/layout/Brand';
import { confirmDialog, toast } from '@/components/ui/feedback';
import type { Lead, LeadActivity, LeadStage } from '@/lib/types';

type View = 'hot' | 'followups' | 'stale' | 'closing' | 'big';

export default function Leads() {
  const { scope, leads } = useScoped();
  const allLeads = useStore((s) => s.leads);
  const moveLead = useStore((s) => s.moveLead);
  const openForm = useUI((s) => s.openForm);
  const { compact } = useMoney();
  const [layout, setLayout] = useQueryState<'board' | 'list'>('layout', 'board');
  const [viewQ, setViewQ] = useQueryState<View | ''>('view', '');
  const [sortQ] = useQueryState<string>('sort', '');
  const [q, setQ] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [prio, setPrio] = useState<string[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [openId, setOpenId] = useState<string>();
  const [dragOver, setDragOver] = useState<LeadStage>();

  const scored = useMemo(() => leads.map((l) => ({ l, s: leadScore(l, allLeads) })), [leads, allLeads]);
  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    let list = scored.filter(({ l }) => (!sources.length || sources.includes(l.source)) && (!services.length || services.includes(l.service)) && (!prio.length || prio.includes(l.priority))
      && (!ql || `${l.name} ${l.businessName} ${l.email} ${l.phone} ${l.service} ${l.tags.join(' ')} ${l.notes}`.toLowerCase().includes(ql)));
    const open = (l: Lead) => l.stage !== 'won' && l.stage !== 'lost';
    if (viewQ === 'hot') list = list.filter(({ l, s }) => open(l) && s >= 70);
    if (viewQ === 'followups') list = list.filter(({ l }) => open(l) && l.nextFollowUp && l.nextFollowUp <= toISODate(addDays(new Date(), 2)));
    if (viewQ === 'stale') list = list.filter(({ l }) => open(l) && daysBetween((l.activities[0]?.at ?? l.createdAt).slice(0, 10), today()) > 10);
    if (viewQ === 'closing') list = list.filter(({ l }) => open(l) && l.expectedClose && l.expectedClose.slice(0, 7) === today().slice(0, 7));
    if (viewQ === 'big') { const vals = list.map(({ l }) => (l.billing === 'monthly' ? l.value * 12 : l.value)).sort((a, b) => b - a); const cut = vals[Math.floor(vals.length / 4)] ?? 0; list = list.filter(({ l }) => (l.billing === 'monthly' ? l.value * 12 : l.value) >= cut); }
    return [...list].sort((a, b) => (sortQ === 'score' || layout === 'list' ? b.s - a.s : b.l.createdAt.localeCompare(a.l.createdAt)));
  }, [scored, q, sources, services, prio, viewQ, sortQ, layout]);

  const openL = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
  const won = leads.filter((l) => l.stage === 'won').length;
  const lost = leads.filter((l) => l.stage === 'lost').length;
  const annual = (l: Lead) => (l.billing === 'monthly' ? l.value * 12 : l.value);
  const bySource = Object.entries(groupBy(leads, (l) => l.source)).map(([k, v]) => ({ k, n: v.length, won: v.filter((l) => l.stage === 'won').length, val: sum(v.filter((l) => l.stage !== 'lost'), annual) })).sort((a, b) => b.val - a.val);
  const stages = LEAD_STAGES.filter((s) => showClosed || (s.id !== 'won' && s.id !== 'lost'));
  const open = filtered.find((x) => x.l.id === openId)?.l ?? allLeads.find((l) => l.id === openId);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scopeName(scope)} title="Leads & Pipeline" subtitle="AI-style lead scoring, follow-up discipline and one-click conversion to projects."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm({ kind: 'lead' })}>New lead</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Open pipeline" value={compact(sum(openL, annual))} hint={`${openL.length} open leads`} icon={<Target size={16} />} />
        <Stat label="Weighted forecast" value={compact(sum(openL, weightedValue))} hint="value × stage probability" icon={<TrendingUp size={16} />} tone="good" />
        <Stat label="Win rate" value={`${won + lost ? ((won / (won + lost)) * 100).toFixed(0) : 0}%`} hint={`${won} won · ${lost} lost`} icon={<Trophy size={16} />} tone="warn" />
        <Stat label="Follow-ups due" value={openL.filter((l) => l.nextFollowUp && l.nextFollowUp <= today()).length} hint="today or overdue" icon={<CalendarClock size={16} />} tone="bad" />
      </div>

      <Card className="p-3 sm:p-4 space-y-3 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SmartViews<View> value={viewQ} onChange={setViewQ} views={[
            { id: 'hot', label: 'Hot leads', icon: <Flame size={14} /> },
            { id: 'followups', label: 'Follow up next 48h', icon: <CalendarCheck size={14} /> },
            { id: 'stale', label: 'Going cold (10d+)', icon: <Snowflake size={14} /> },
            { id: 'closing', label: 'Closing this month', icon: <Percent size={14} /> },
            { id: 'big', label: 'Biggest deals', icon: <Gem size={14} /> },
          ]} />
          <Segmented size="sm" value={layout} onChange={setLayout} options={[{ value: 'board', label: <Columns3 size={15} /> }, { value: 'list', label: <List size={15} /> }]} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search name, business, phone, notes…" className="w-full sm:w-72" />
          <MultiFilter label="Source" value={sources} onChange={setSources} options={LEAD_SOURCES.map((s) => ({ value: s, label: s, count: leads.filter((l) => l.source === s).length })).filter((o) => o.count)} />
          <MultiFilter label="Service" value={services} onChange={setServices} options={[...new Set(leads.map((l) => l.service))].map((s) => ({ value: s, label: s }))} />
          <MultiFilter label="Priority" value={prio} onChange={setPrio} options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
          <button onClick={() => setShowClosed(!showClosed)} className={clsx('chip !h-9', showClosed && 'chip-on')}>Show won / lost</button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card><Empty icon={<Target size={24} />} title="No leads match" hint="Capture every enquiry here — the score tells you who to call first." action={<Button variant="primary" onClick={() => openForm({ kind: 'lead' })}>Add lead</Button>} /></Card>
      ) : layout === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-3 px-3 snap-x snap-mandatory sm:snap-none">
          {stages.map((st) => {
            const col = filtered.filter(({ l }) => l.stage === st.id);
            return (
              <div key={st.id} className={clsx('w-[85vw] sm:w-[290px] shrink-0 snap-start rounded-2xl p-2 transition', dragOver === st.id && 'bg-accent/[.06] ring-2 ring-accent/30 ring-dashed')}
                onDragOver={(e) => { e.preventDefault(); setDragOver(st.id); }} onDragLeave={() => setDragOver(undefined)}
                onDrop={(e) => { setDragOver(undefined); const id = e.dataTransfer.getData('text/plain'); if (id) { moveLead(id, st.id); toast(`Moved to ${st.label}`); } }}>
                <div className="flex items-center gap-2 px-1 mb-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
                  <span className="font-bold text-sm">{st.label}</span>
                  <span className="text-xs text-ink-mute">{col.length}</span>
                  <span className="ml-auto text-xs font-semibold num text-ink-soft">{compact(sum(col, (x) => annual(x.l)))}</span>
                </div>
                <div className="h-1 rounded-full mb-3" style={{ background: `linear-gradient(90deg, ${st.color}, transparent)` }} />
                <div className="space-y-2.5 min-h-[100px]">
                  {col.map(({ l, s }) => <LeadCard key={l.id} l={l} score={s} onOpen={() => setOpenId(l.id)} showCo={scope === 'all'} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-line/70">
            {filtered.map(({ l, s }) => {
              const sl = scoreLabel(s);
              return (
                <button key={l.id} onClick={() => setOpenId(l.id)} className="w-full grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1.4fr_1fr_120px_130px_110px] gap-3 md:gap-4 items-center px-4 md:px-5 py-3 text-left hover:bg-accent/[.03]">
                  <ScoreRing score={s} />
                  <div className="min-w-0"><div className="font-semibold text-sm truncate">{l.businessName || l.name}</div><div className="text-xs text-ink-mute truncate">{l.name} · {l.source}</div></div>
                  <div className="hidden md:block text-sm text-ink-soft truncate">{l.service}</div>
                  <div className="hidden md:block"><Badge dot={stageMeta(l.stage).color}>{stageMeta(l.stage).label}</Badge></div>
                  <div className={clsx('hidden md:block text-xs', l.nextFollowUp && l.nextFollowUp < today() ? 'text-rose-600 font-semibold' : 'text-ink-mute')}>{l.nextFollowUp ? `Follow-up ${relDay(l.nextFollowUp)}` : '—'}</div>
                  <div className="text-right"><div className="num font-bold text-sm">{compact(l.value)}{l.billing === 'monthly' && <span className="text-[10px] text-ink-mute">/mo</span>}</div><Badge className={clsx(sl.cls, '!h-5 !text-[10px] mt-0.5')}>{sl.label}</Badge></div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Lead sources" subtitle="Where your best business comes from" icon={<Users size={17} />} />
        <div className="px-5 pb-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {bySource.map((x) => (
            <div key={x.k} className="rounded-xl ring-1 ring-line p-3 bg-white/70">
              <div className="flex justify-between text-sm"><span className="font-semibold">{x.k}</span><span className="text-ink-mute text-xs">{x.n} leads</span></div>
              <div className="num font-bold mt-1">{compact(x.val)}</div>
              <div className="text-[11px] text-ink-mute">{x.won} won · {x.n ? ((x.won / x.n) * 100).toFixed(0) : 0}% conversion</div>
            </div>
          ))}
        </div>
      </Card>

      <LeadDrawer lead={open} onClose={() => setOpenId(undefined)} />
    </div>
  );
}

function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const sl = scoreLabel(score);
  const r = size / 2 - 3, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`Lead score ${score} — ${sl.label}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={3.5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={sl.dot} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center num text-[11px] font-bold">{score}</span>
    </div>
  );
}

function LeadCard({ l, score, onOpen, showCo }: { l: Lead; score: number; onOpen: () => void; showCo?: boolean }) {
  const { compact } = useMoney();
  const overdue = l.nextFollowUp && l.nextFollowUp < today() && l.stage !== 'won' && l.stage !== 'lost';
  return (
    <div draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)} onClick={onOpen}
      className="card card-hover p-3.5 cursor-pointer active:cursor-grabbing select-none">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{l.businessName || l.name}</div>
          <div className="text-xs text-ink-mute truncate">{l.name} · {l.source}</div>
        </div>
        <ScoreRing score={score} size={36} />
      </div>
      <div className="text-xs text-ink-soft mt-2 truncate">{l.service}</div>
      <div className="flex items-center justify-between mt-3">
        <span className="num font-bold">{compact(l.value)}{l.billing === 'monthly' && <span className="text-[10px] text-ink-mute font-semibold">/mo</span>}</span>
        {l.nextFollowUp && l.stage !== 'won' && l.stage !== 'lost' && (
          <span className={clsx('inline-flex items-center gap-1 text-[11px] font-semibold', overdue ? 'text-rose-600' : l.nextFollowUp === today() ? 'text-amber-600' : 'text-ink-mute')}><CalendarClock size={12} />{relDay(l.nextFollowUp)}</span>
        )}
      </div>
      {(showCo || l.priority === 'high') && (
        <div className="flex gap-1 mt-2">
          {l.priority === 'high' && <Badge className="bg-rose-50 text-rose-600 ring-rose-200 !h-5 !text-[10px]">High priority</Badge>}
          {showCo && <Badge className="bg-ink/5 text-ink-mute ring-transparent !h-5 !text-[10px]">{COMPANIES[l.company].short}</Badge>}
        </div>
      )}
    </div>
  );
}

const ACT: Record<LeadActivity['type'], { label: string; icon: typeof Phone }> = {
  call: { label: 'Call', icon: PhoneCall }, email: { label: 'Email', icon: Mail }, meeting: { label: 'Meeting', icon: Video },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle }, note: { label: 'Note', icon: StickyNote }, stage: { label: 'Stage', icon: ArrowRightCircle },
};

function LeadDrawer({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const st = useStore();
  const openForm = useUI((s) => s.openForm);
  const nav = useNavigate();
  const { money } = useMoney();
  const [type, setType] = useState<LeadActivity['type']>('call');
  const [text, setText] = useState('');
  if (!lead) return null;
  const score = leadScore(lead, st.leads);
  const sl = scoreLabel(score);
  const closed = lead.stage === 'won' || lead.stage === 'lost';
  const idle = daysBetween((lead.activities[0]?.at ?? lead.createdAt).slice(0, 10), today());
  const tips: string[] = [];
  if (lead.nextFollowUp && lead.nextFollowUp < today()) tips.push(`Follow-up is ${-daysBetween(today(), lead.nextFollowUp)} days late — reach out now.`);
  if (!lead.nextFollowUp && !closed) tips.push('No follow-up scheduled. Set one so this lead doesn’t slip.');
  if (idle > 7 && !closed) tips.push(`No contact for ${idle} days. A quick WhatsApp check-in works well.`);
  if (lead.stage === 'proposal') tips.push('Proposal sent — ask for feedback within 48h and offer a call.');
  if (lead.stage === 'negotiation') tips.push('In negotiation — consider a time-bound offer to close.');

  const log = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    st.addLeadActivity(lead.id, { type, text: text.trim() });
    setText('');
    toast('Activity logged');
  };
  const setFollow = (days: number) => { st.upsertLead({ ...lead, nextFollowUp: toISODate(addDays(new Date(), days)) }); toast(`Follow-up set for ${relDay(toISODate(addDays(new Date(), days)))}`); };

  return (
    <Drawer open onClose={onClose}>
      <div className="p-5 sm:p-7 pr-16">
        <div className="flex items-start gap-4">
          <Avatar name={lead.businessName || lead.name} size={56} className="!rounded-2xl" />
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-tight truncate">{lead.businessName || lead.name}</h2>
            <p className="text-sm text-ink-mute">{lead.name} · {lead.source} · added {fmtDate(lead.createdAt)}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge dot={stageMeta(lead.stage).color}>{stageMeta(lead.stage).label}</Badge>
              <Badge className={sl.cls}>{sl.label} · {score}</Badge>
              <Badge className="bg-ink/5 text-ink-mute ring-transparent">{COMPANIES[lead.company].name}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <a href={lead.phone ? `tel:${lead.phone}` : undefined} className={clsx('h-11 rounded-xl ring-1 ring-line flex items-center justify-center gap-2 text-sm font-semibold hover:bg-accent/5 hover:text-accent', !lead.phone && 'opacity-40 pointer-events-none')}><Phone size={15} />Call</a>
          <a href={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer" className={clsx('h-11 rounded-xl ring-1 ring-line flex items-center justify-center gap-2 text-sm font-semibold hover:bg-emerald-50 hover:text-emerald-600', !lead.phone && 'opacity-40 pointer-events-none')}><MessageCircle size={15} />WhatsApp</a>
          <a href={lead.email ? `mailto:${lead.email}` : undefined} className={clsx('h-11 rounded-xl ring-1 ring-line flex items-center justify-center gap-2 text-sm font-semibold hover:bg-accent/5 hover:text-accent', !lead.email && 'opacity-40 pointer-events-none')}><Mail size={15} />Email</a>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl bg-canvas ring-1 ring-line p-3"><div className="label !mb-0.5">Deal value</div><div className="num font-bold text-lg">{money(lead.value)}{lead.billing === 'monthly' && <span className="text-xs text-ink-mute">/mo</span>}</div></div>
          <div className="rounded-xl bg-canvas ring-1 ring-line p-3"><div className="label !mb-0.5">Service</div><div className="font-semibold text-sm truncate">{lead.service}</div></div>
          <div className="rounded-xl bg-canvas ring-1 ring-line p-3"><div className="label !mb-0.5">Next follow-up</div><div className={clsx('font-semibold text-sm', lead.nextFollowUp && lead.nextFollowUp < today() && 'text-rose-600')}>{lead.nextFollowUp ? `${fmtDate(lead.nextFollowUp)} · ${relDay(lead.nextFollowUp)}` : '—'}</div></div>
          <div className="rounded-xl bg-canvas ring-1 ring-line p-3"><div className="label !mb-0.5">Expected close</div><div className="font-semibold text-sm">{fmtDate(lead.expectedClose)}</div></div>
        </div>

        {tips.length > 0 && (
          <div className="mt-5 rounded-2xl p-4 bg-gradient-to-br from-accent/[.08] to-accent2/[.08] ring-1 ring-accent/15">
            <div className="flex items-center gap-2 text-sm font-bold text-accent mb-2"><Sparkles size={15} />Next best action</div>
            <ul className="space-y-1 text-sm text-ink-soft list-disc pl-5">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}

        {!closed && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label !mb-0 mr-1">Follow up in</span>
              {[[1, 'Tomorrow'], [3, '3 days'], [7, '1 week'], [14, '2 weeks']].map(([d, l]) => <button key={d} onClick={() => setFollow(d as number)} className="chip">{l}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={lead.stage} onChange={(e) => { st.moveLead(lead.id, e.target.value as LeadStage); toast('Stage updated'); }} options={LEAD_STAGES.filter((s) => s.id !== 'won' && s.id !== 'lost').map((s) => ({ value: s.id, label: `Stage: ${s.label}` }))} className="!w-48" />
              <Button variant="primary" icon={<Trophy size={15} />} onClick={() => { const r = st.convertLead(lead.id); if (r) { toast('Won! Client & project created 🎉'); onClose(); nav(`/projects/${r.projectId}`); } }}>Won → Create project</Button>
              <Button variant="danger" icon={<XCircle size={15} />} onClick={async () => { if (await confirmDialog({ title: 'Mark as lost?', body: 'It will move to the Lost column. You can reopen it later.', confirmLabel: 'Mark lost', danger: true })) { st.moveLead(lead.id, 'lost', 'Marked lost'); toast('Marked as lost', 'info'); } }}>Lost</Button>
            </div>
          </div>
        )}
        {closed && (
          <div className="mt-5 flex flex-wrap gap-2">
            {lead.convertedProjectId && <Button variant="soft" onClick={() => { onClose(); nav(`/projects/${lead.convertedProjectId}`); }}>Open project</Button>}
            <Button onClick={() => st.moveLead(lead.id, 'qualified')}>Reopen lead</Button>
            {lead.lostReason && <span className="text-sm text-ink-mute self-center">Reason: {lead.lostReason}</span>}
          </div>
        )}

        {lead.notes && <div className="mt-5"><div className="label">Notes</div><p className="text-sm text-ink-soft whitespace-pre-wrap">{lead.notes}</p></div>}

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3"><div className="font-bold">Activity</div><Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={() => { onClose(); openForm({ kind: 'lead', initial: lead }); }}>Edit lead</Button></div>
          <form onSubmit={log} className="rounded-2xl ring-1 ring-line p-3 bg-white">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-2">
              {(['call', 'whatsapp', 'email', 'meeting', 'note'] as const).map((k) => { const A = ACT[k]; return <button type="button" key={k} onClick={() => setType(k)} className={clsx('chip !h-7 !px-2.5 shrink-0', type === k && 'chip-on')}><A.icon size={12} />{A.label}</button>; })}
            </div>
            <div className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`What happened on the ${ACT[type].label.toLowerCase()}?`} className="input !h-10" />
              <Button type="submit" variant="primary" size="icon" className="!h-10 !w-10 shrink-0"><Send size={15} /></Button>
            </div>
          </form>
          <div className="mt-4 space-y-3">
            {lead.activities.map((a) => { const A = ACT[a.type]; return (
              <div key={a.id} className="flex gap-3">
                <span className="h-8 w-8 shrink-0 grid place-items-center rounded-full bg-accent/10 text-accent"><A.icon size={14} /></span>
                <div className="min-w-0"><div className="text-[11px] text-ink-mute"><span className="font-semibold text-ink-soft">{A.label}</span> · {fmtDateTime(a.at)}</div><p className="text-sm">{a.text}</p></div>
              </div>
            ); })}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
