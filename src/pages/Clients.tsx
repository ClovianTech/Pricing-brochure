import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Mail, MapPin, Pencil, Phone, Plus, Repeat, Users, Wallet, Building2, MessageCircle, Clock } from 'lucide-react';
import { useScoped, useQueryState } from '@/lib/hooks';
import { useMoney } from '@/lib/format';
import { useUI } from '@/store/ui';
import { projectFinancials } from '@/lib/metrics';
import { fmtDate, relDay, sum } from '@/lib/utils';
import { Avatar, Badge, Button, Card, Empty, PageHeader, Segmented, Stat } from '@/components/ui';
import { MultiFilter, SearchBox } from '@/components/filters';
import { Drawer } from '@/components/ui/Modal';
import { COMPANIES, projectStatusMeta } from '@/lib/constants';
import { scopeName } from '@/components/layout/Brand';
import type { Client } from '@/lib/types';

const STATUS: Record<Client['status'], { label: string; cls: string }> = {
  vip: { label: 'VIP', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  inactive: { label: 'Inactive', cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
};

export default function Clients() {
  const { scope, clients, projects, transactions } = useScoped();
  const openForm = useUI((s) => s.openForm);
  const { compact, money } = useMoney();
  const [openId, setOpenId] = useQueryState<string>('open', '');
  const [status, setStatus] = useState<'all' | Client['status']>('all');
  const [industries, setIndustries] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'ltv' | 'recent' | 'outstanding' | 'name'>('ltv');

  const rows = useMemo(() => clients.map((c) => {
    const tx = transactions.filter((t) => t.clientId === c.id);
    const ltv = sum(tx.filter((t) => t.type === 'income' && t.status === 'paid'), (t) => t.amount);
    const outstanding = sum(tx.filter((t) => t.type === 'income' && t.status !== 'paid'), (t) => t.amount);
    const cp = projects.filter((p) => p.clientId === c.id);
    const mrr = sum(cp.filter((p) => p.billing === 'monthly' && p.status === 'active'), (p) => p.amount);
    const lastPay = tx.filter((t) => t.type === 'income' && t.status === 'paid').sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
    const profit = sum(cp, (p) => projectFinancials(p, transactions).profit);
    return { c, ltv, outstanding, projects: cp, mrr, lastPay, profit };
  }), [clients, projects, transactions]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter(({ c }) => (status === 'all' || c.status === status) && (!industries.length || industries.includes(c.industry))
      && (!ql || `${c.name} ${c.contactName} ${c.email} ${c.phone} ${c.industry} ${c.location}`.toLowerCase().includes(ql)))
      .sort((a, b) => sort === 'ltv' ? b.ltv - a.ltv : sort === 'outstanding' ? b.outstanding - a.outstanding : sort === 'name' ? a.c.name.localeCompare(b.c.name) : (b.lastPay ?? '').localeCompare(a.lastPay ?? ''));
  }, [rows, q, status, industries, sort]);

  const totalLtv = sum(rows, (r) => r.ltv);
  const top = [...rows].sort((a, b) => b.ltv - a.ltv)[0];
  const open = rows.find((r) => r.c.id === openId);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={scopeName(scope)} title="Clients" subtitle="Your relationships — lifetime value, retainers, dues and history in one place."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm({ kind: 'client' })}>New client</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Clients" value={clients.length} hint={`${clients.filter((c) => c.status !== 'inactive').length} active`} icon={<Users size={16} />} />
        <Stat label="Lifetime revenue" value={compact(totalLtv)} hint={`avg ${compact(totalLtv / Math.max(1, clients.length))} per client`} icon={<Wallet size={16} />} tone="good" />
        <Stat label="Recurring clients" value={rows.filter((r) => r.mrr > 0).length} hint={`${compact(sum(rows, (r) => r.mrr))}/mo`} icon={<Repeat size={16} />} tone="ink" />
        <Stat label="Top client" value={top?.c.name ?? '—'} hint={top ? `${((top.ltv / Math.max(1, totalLtv)) * 100).toFixed(0)}% of revenue` : ''} icon={<Crown size={16} />} tone="warn" />
      </div>

      <Card className="p-3 sm:p-4 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search clients, contacts, phone…" className="w-full sm:w-72" />
          <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'vip', label: 'VIP' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <MultiFilter label="Industry" value={industries} onChange={setIndustries} options={[...new Set(clients.map((c) => c.industry).filter(Boolean))].map((i) => ({ value: i, label: i }))} />
          <div className="flex-1" />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="chip !h-9 outline-none cursor-pointer">
            <option value="ltv">Sort: Lifetime value</option><option value="recent">Sort: Last payment</option><option value="outstanding">Sort: Outstanding</option><option value="name">Sort: Name</option>
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? <Card><Empty icon={<Users size={24} />} title="No clients yet" action={<Button variant="primary" onClick={() => openForm({ kind: 'client' })}>Add client</Button>} /></Card> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <button key={r.c.id} onClick={() => setOpenId(r.c.id)} className="card card-hover p-5 text-left animate-fade-up" style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }}>
              <div className="flex items-start gap-3">
                <Avatar name={r.c.name} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{r.c.name}</div>
                  <div className="text-xs text-ink-mute truncate">{r.c.contactName} · {r.c.industry || '—'}</div>
                </div>
                <Badge className={STATUS[r.c.status].cls}>{r.c.status === 'vip' && <Crown size={11} />}{STATUS[r.c.status].label}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Lifetime</div><div className="num font-bold">{compact(r.ltv)}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Projects</div><div className="num font-bold">{r.projects.length}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Due</div><div className={clsx('num font-bold', r.outstanding ? 'text-amber-600' : 'text-ink-faint')}>{compact(r.outstanding)}</div></div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-line/70 text-xs text-ink-mute">
                <span className="inline-flex items-center gap-1"><Clock size={12} />{r.lastPay ? `Paid ${relDay(r.lastPay)}` : 'No payments yet'}</span>
                {r.mrr > 0 && <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><Repeat size={12} />{compact(r.mrr)}/mo</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Drawer open onClose={() => setOpenId('')}>
          <div className="p-5 sm:p-7 pr-16">
            <div className="flex items-start gap-4">
              <Avatar name={open.c.name} size={60} className="!rounded-2xl" />
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold truncate">{open.c.name}</h2>
                <p className="text-sm text-ink-mute">{open.c.contactName} · client since {fmtDate(open.c.createdAt)}</p>
                <div className="flex gap-1.5 mt-2"><Badge className={STATUS[open.c.status].cls}>{STATUS[open.c.status].label}</Badge><Badge className="bg-ink/5 text-ink-mute ring-transparent">{COMPANIES[open.c.company].name}</Badge></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 text-sm">
              {open.c.email && <a href={`mailto:${open.c.email}`} className="flex items-center gap-2 p-3 rounded-xl ring-1 ring-line hover:text-accent"><Mail size={15} />{open.c.email}</a>}
              {open.c.phone && <a href={`tel:${open.c.phone}`} className="flex items-center gap-2 p-3 rounded-xl ring-1 ring-line hover:text-accent"><Phone size={15} />{open.c.phone}</a>}
              {open.c.phone && <a href={`https://wa.me/${open.c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl ring-1 ring-line hover:text-emerald-600"><MessageCircle size={15} />WhatsApp</a>}
              {open.c.location && <div className="flex items-center gap-2 p-3 rounded-xl ring-1 ring-line"><MapPin size={15} />{open.c.location}</div>}
              {open.c.industry && <div className="flex items-center gap-2 p-3 rounded-xl ring-1 ring-line"><Building2 size={15} />{open.c.industry}</div>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
              {[['Lifetime', open.ltv], ['Outstanding', open.outstanding], ['MRR', open.mrr], ['Profit', open.profit]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-canvas ring-1 ring-line p-3"><div className="label !mb-0.5">{l}</div><div className="num font-bold">{compact(v as number)}</div></div>
              ))}
            </div>
            {open.c.notes && <p className="mt-5 text-sm text-ink-soft whitespace-pre-wrap">{open.c.notes}</p>}
            <div className="mt-6 flex items-center justify-between"><h3 className="font-bold">Projects</h3><Button size="sm" variant="soft" icon={<Plus size={13} />} onClick={() => openForm({ kind: 'project', initial: { company: open.c.company, clientId: open.c.id } })}>Add</Button></div>
            <div className="mt-2 space-y-2">
              {open.projects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-line hover:ring-accent/40">
                  <div className="min-w-0 flex-1"><div className="font-semibold text-sm truncate">{p.name}</div><div className="text-xs text-ink-mute">{p.category} · {p.billing === 'monthly' ? `${compact(p.amount)}/mo` : compact(p.amount)}</div></div>
                  <Badge className={projectStatusMeta(p.status).tone}>{projectStatusMeta(p.status).label}</Badge>
                </Link>
              ))}
              {!open.projects.length && <p className="text-sm text-ink-mute">No projects yet.</p>}
            </div>
            <h3 className="font-bold mt-6">Payment history</h3>
            <div className="mt-2 divide-y divide-line/70">
              {transactions.filter((t) => t.clientId === open.c.id && t.type === 'income').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15).map((t) => (
                <div key={t.id} className="flex justify-between py-2.5 text-sm"><div><div className="font-medium">{t.description}</div><div className="text-xs text-ink-mute">{fmtDate(t.date)}{t.status !== 'paid' && <span className="text-amber-600 font-semibold"> · {t.status}</span>}</div></div><span className="num font-bold text-[#2a78d6]">{money(t.amount)}</span></div>
              ))}
            </div>
            <div className="mt-6"><Button icon={<Pencil size={14} />} onClick={() => { const c = open.c; setOpenId(''); openForm({ kind: 'client', initial: c }); }}>Edit client</Button></div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
