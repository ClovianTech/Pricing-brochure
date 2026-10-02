import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Trash2 } from 'lucide-react';
import { useStore } from '@/store/store';
import { useUI, type FormReq } from '@/store/ui';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, Segmented, Select, Textarea, Toggle } from '@/components/ui';
import { confirmDialog, toast } from '@/components/ui/feedback';
import type { Client, CompanyId, Lead, PersonalEntry, PersonalType, Project, Transaction } from '@/lib/types';
import { COMPANIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, LEAD_SOURCES, LEAD_STAGES, PERSONAL_CATEGORIES, PROJECT_CATEGORIES, PROJECT_STATUSES } from '@/lib/constants';
import { today, uid } from '@/lib/utils';
import { useMoney } from '@/lib/format';

const companyOptions = Object.values(COMPANIES).map((c) => ({ value: c.id, label: c.name }));
const tagsToStr = (t?: string[]) => (t ?? []).join(', ');
const strToTags = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const useDefaultCompany = (): CompanyId => { const s = useStore((x) => x.scope); return s === 'all' ? 'clovian' : s; };

function AmountInput({ value, onChange, autoFocus }: { value: number; onChange: (n: number) => void; autoFocus?: boolean }) {
  const { symbol } = useMoney();
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute font-semibold text-sm">{symbol}</span>
      <Input type="number" inputMode="decimal" min={0} autoFocus={autoFocus} value={value || ''} onChange={(e) => onChange(Number(e.target.value))} className="pl-9 num text-base font-semibold" placeholder="0" />
    </div>
  );
}

function Footer({ onCancel, onDelete, label = 'Save' }: { onCancel: () => void; onDelete?: () => void; label?: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      {onDelete && <Button type="button" variant="danger" size="icon" onClick={onDelete} aria-label="Delete"><Trash2 size={16} /></Button>}
      <div className="flex-1" />
      <Button type="button" onClick={onCancel}>Cancel</Button>
      <Button type="submit" form="entity-form" variant="primary">{label}</Button>
    </div>
  );
}

/* ---------------- Transaction ---------------- */
function TransactionForm({ initial, onClose }: { initial?: Partial<Transaction>; onClose: () => void }) {
  const st = useStore();
  const defCo = useDefaultCompany();
  const isEdit = !!initial?.id;
  const [f, setF] = useState<Transaction>({
    id: uid(), company: defCo, type: 'income', amount: 0, date: today(), category: 'Project Payment', description: '',
    method: 'Bank Transfer', status: 'paid', tags: [], ...initial,
  } as Transaction);
  const [tags, setTags] = useState(tagsToStr(initial?.tags));
  const set = <K extends keyof Transaction>(k: K, v: Transaction[K]) => setF((x) => ({ ...x, [k]: v }));
  const projects = st.projects.filter((p) => p.company === f.company);
  const clients = st.clients.filter((c) => c.company === f.company);
  const cats = f.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  useEffect(() => { if (!cats.includes(f.category)) set('category', cats[0]); }, [f.type]); // eslint-disable-line

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.amount) return toast('Enter an amount', 'bad');
    const proj = st.projects.find((p) => p.id === f.projectId);
    st.upsertTransaction({ ...f, clientId: f.clientId || proj?.clientId, tags: strToTags(tags) });
    toast(isEdit ? 'Transaction updated' : `${f.type === 'income' ? 'Income' : 'Expense'} recorded`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit transaction' : 'New transaction'} subtitle={COMPANIES[f.company].name}
      footer={<Footer onCancel={onClose} onDelete={isEdit ? async () => { if (await confirmDialog({ title: 'Delete transaction?', danger: true, confirmLabel: 'Delete' })) { st.removeTransaction(f.id); toast('Deleted', 'info'); onClose(); } } : undefined} />}>
      <form id="entity-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['income', 'expense'] as const).map((t) => (
            <button type="button" key={t} onClick={() => set('type', t)}
              className={clsx('h-12 rounded-xl font-bold text-sm ring-1 transition', f.type === t ? (t === 'income' ? 'bg-emerald-50 text-emerald-700 ring-emerald-300' : 'bg-rose-50 text-rose-700 ring-rose-300') : 'ring-line text-ink-mute hover:bg-ink/[.03]')}>
              {t === 'income' ? '↓ Money in' : '↑ Money out'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Amount"><AmountInput value={f.amount} onChange={(n) => set('amount', n)} autoFocus /></Field>
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} required /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => set('category', e.target.value)} options={cats} /></Field>
          <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value as Transaction['status'])} options={[{ value: 'paid', label: f.type === 'income' ? 'Received' : 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'overdue', label: 'Overdue' }]} /></Field>
        </div>
        <Field label="Description"><Input value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Milestone 2 payment" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(isEdit || st.scope === 'all') && <Field label="Company"><Select value={f.company} onChange={(e) => setF((x) => ({ ...x, company: e.target.value as CompanyId, projectId: undefined, clientId: undefined }))} options={companyOptions} /></Field>}
          <Field label="Project (optional)"><Select value={f.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || undefined)} options={[{ value: '', label: '— None —' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} /></Field>
          <Field label="Client (optional)"><Select value={f.clientId ?? ''} onChange={(e) => set('clientId', e.target.value || undefined)} options={[{ value: '', label: '— None —' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} /></Field>
          <Field label="Payment method"><Select value={f.method} onChange={(e) => set('method', e.target.value as Transaction['method'])} options={['Bank Transfer', 'UPI', 'Card', 'Cash', 'Stripe', 'PayPal', 'Cheque', 'Other']} /></Field>
        </div>
        <Field label="Tags" hint="Comma separated, e.g. gst, q3"><Input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
      </form>
    </Modal>
  );
}

/* ---------------- Project ---------------- */
function ProjectForm({ initial, onClose }: { initial?: Partial<Project>; onClose: () => void }) {
  const st = useStore();
  const defCo = useDefaultCompany();
  const isEdit = !!initial?.id;
  const [f, setF] = useState<Project>({
    id: uid(), company: defCo, name: '', category: PROJECT_CATEGORIES[initial?.company ?? defCo][0], billing: 'one-time', amount: 0,
    startDate: today(), status: 'active', progress: 0, priority: 'medium', estimatedCost: 0, description: '', comments: [], tags: [], ...initial,
  } as Project);
  const [tags, setTags] = useState(tagsToStr(initial?.tags));
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setF((x) => ({ ...x, [k]: v }));
  const clients = st.clients.filter((c) => c.company === f.company);
  const cats = useMemo(() => [...new Set([...PROJECT_CATEGORIES[f.company], ...st.projects.filter((p) => p.company === f.company).map((p) => p.category)])], [f.company, st.projects]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return toast('Give the project a name', 'bad');
    st.upsertProject({ ...f, tags: strToTags(tags), endDate: f.endDate || undefined });
    toast(isEdit ? 'Project updated' : 'Project created');
    onClose();
  };
  return (
    <Modal open onClose={onClose} size="lg" title={isEdit ? 'Edit project' : 'New project'} subtitle={COMPANIES[f.company].name}
      footer={<Footer onCancel={onClose} onDelete={isEdit ? async () => { if (await confirmDialog({ title: 'Delete project?', body: 'Linked transactions are kept but unlinked.', danger: true, confirmLabel: 'Delete' })) { st.removeProject(f.id); toast('Project deleted', 'info'); onClose(); } } : undefined} />}>
      <form id="entity-form" onSubmit={submit} className="space-y-4">
        <Field label="Project name"><Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. E-commerce website for Luxe" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(isEdit || st.scope === 'all') && <Field label="Company"><Select value={f.company} onChange={(e) => setF((x) => ({ ...x, company: e.target.value as CompanyId, clientId: undefined, category: PROJECT_CATEGORIES[e.target.value as CompanyId][0] }))} options={companyOptions} /></Field>}
          <Field label="Client"><Select value={f.clientId ?? ''} onChange={(e) => set('clientId', e.target.value || undefined)} options={[{ value: '', label: '— No client —' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} /></Field>
          <Field label="Category"><Input list="proj-cats" value={f.category} onChange={(e) => set('category', e.target.value)} /><datalist id="proj-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></Field>
        </div>
        <div className="rounded-2xl bg-canvas/70 ring-1 ring-line p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="label !mb-0">Billing model</span>
            <Segmented value={f.billing} onChange={(v) => set('billing', v)} options={[{ value: 'one-time', label: 'One-time' }, { value: 'monthly', label: 'Monthly recurring' }]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={f.billing === 'monthly' ? 'Monthly fee' : 'Project value'}><AmountInput value={f.amount} onChange={(n) => set('amount', n)} /></Field>
            <Field label={f.billing === 'monthly' ? 'Est. delivery cost / month' : 'Estimated cost (budget)'} hint="Used for margin & over-budget alerts"><AmountInput value={f.estimatedCost} onChange={(n) => set('estimatedCost', n)} /></Field>
            <Field label="Start date"><Input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
            <Field label={f.billing === 'monthly' ? 'Contract end (optional)' : 'Deadline / end date'}><Input type="date" value={f.endDate ?? ''} onChange={(e) => set('endDate', e.target.value)} /></Field>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value as Project['status'])} options={PROJECT_STATUSES.map((s) => ({ value: s.id, label: s.label }))} /></Field>
          <Field label="Priority"><Select value={f.priority} onChange={(e) => set('priority', e.target.value as Project['priority'])} options={['low', 'medium', 'high']} /></Field>
          <Field label={`Progress · ${f.progress}%`}><input type="range" min={0} max={100} step={5} value={f.progress} onChange={(e) => set('progress', Number(e.target.value))} className="w-full accent-[rgb(var(--accent))] h-10" /></Field>
        </div>
        <Field label="Description / scope"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Tags" hint="Comma separated"><Input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
      </form>
    </Modal>
  );
}

/* ---------------- Lead ---------------- */
function LeadForm({ initial, onClose }: { initial?: Partial<Lead>; onClose: () => void }) {
  const st = useStore();
  const defCo = useDefaultCompany();
  const isEdit = !!initial?.id;
  const [f, setF] = useState<Lead>({
    id: uid(), company: defCo, name: '', businessName: '', email: '', phone: '', source: 'Website', service: PROJECT_CATEGORIES[initial?.company ?? defCo][0],
    value: 0, billing: 'one-time', stage: 'new', priority: 'medium', createdAt: today(), tags: [], notes: '', activities: [], ...initial,
  } as Lead);
  const [tags, setTags] = useState(tagsToStr(initial?.tags));
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() && !f.businessName.trim()) return toast('Add a name or business', 'bad');
    const activities = isEdit ? f.activities : [{ id: uid(), at: new Date().toISOString(), type: 'note' as const, text: `Lead captured via ${f.source}.` }];
    st.upsertLead({ ...f, activities, tags: strToTags(tags), nextFollowUp: f.nextFollowUp || undefined, expectedClose: f.expectedClose || undefined });
    toast(isEdit ? 'Lead updated' : 'Lead added to pipeline');
    onClose();
  };
  return (
    <Modal open onClose={onClose} size="lg" title={isEdit ? 'Edit lead' : 'New lead'} subtitle={COMPANIES[f.company].name}
      footer={<Footer onCancel={onClose} onDelete={isEdit ? async () => { if (await confirmDialog({ title: 'Delete lead?', danger: true, confirmLabel: 'Delete' })) { st.removeLead(f.id); toast('Lead deleted', 'info'); onClose(); } } : undefined} />}>
      <form id="entity-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Contact name"><Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Business"><Input value={f.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Phone / WhatsApp"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(isEdit || st.scope === 'all') && <Field label="Company"><Select value={f.company} onChange={(e) => set('company', e.target.value as CompanyId)} options={companyOptions} /></Field>}
          <Field label="Source"><Select value={f.source} onChange={(e) => set('source', e.target.value)} options={LEAD_SOURCES} /></Field>
          <Field label="Service"><Input list="lead-svc" value={f.service} onChange={(e) => set('service', e.target.value)} /><datalist id="lead-svc">{PROJECT_CATEGORIES[f.company].map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Stage"><Select value={f.stage} onChange={(e) => set('stage', e.target.value as Lead['stage'])} options={LEAD_STAGES.map((s) => ({ value: s.id, label: s.label }))} /></Field>
          <Field label="Priority"><Select value={f.priority} onChange={(e) => set('priority', e.target.value as Lead['priority'])} options={['low', 'medium', 'high']} /></Field>
          <Field label="Billing"><Select value={f.billing} onChange={(e) => set('billing', e.target.value as Lead['billing'])} options={[{ value: 'one-time', label: 'One-time' }, { value: 'monthly', label: 'Monthly' }]} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={f.billing === 'monthly' ? 'Deal value / month' : 'Deal value'}><AmountInput value={f.value} onChange={(n) => set('value', n)} /></Field>
          <Field label="Next follow-up"><Input type="date" value={f.nextFollowUp ?? ''} onChange={(e) => set('nextFollowUp', e.target.value)} /></Field>
          <Field label="Expected close"><Input type="date" value={f.expectedClose ?? ''} onChange={(e) => set('expectedClose', e.target.value)} /></Field>
        </div>
        <Field label="Notes / requirement"><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <Field label="Tags"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="hot, budget-ok" /></Field>
      </form>
    </Modal>
  );
}

/* ---------------- Client ---------------- */
function ClientForm({ initial, onClose }: { initial?: Partial<Client>; onClose: () => void }) {
  const st = useStore();
  const defCo = useDefaultCompany();
  const isEdit = !!initial?.id;
  const [f, setF] = useState<Client>({ id: uid(), company: defCo, name: '', contactName: '', email: '', phone: '', industry: '', location: '', status: 'active', createdAt: today(), notes: '', ...initial } as Client);
  const set = <K extends keyof Client>(k: K, v: Client[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return toast('Client name is required', 'bad');
    st.upsertClient(f);
    toast(isEdit ? 'Client updated' : 'Client added');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit client' : 'New client'} subtitle={COMPANIES[f.company].name}
      footer={<Footer onCancel={onClose} onDelete={isEdit ? async () => { if (await confirmDialog({ title: 'Delete client?', body: 'Projects and transactions stay, but are unlinked.', danger: true, confirmLabel: 'Delete' })) { st.removeClient(f.id); toast('Client deleted', 'info'); onClose(); } } : undefined} />}>
      <form id="entity-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company / client name"><Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Contact person"><Input value={f.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Industry"><Input value={f.industry} onChange={(e) => set('industry', e.target.value)} /></Field>
          <Field label="Location"><Input value={f.location} onChange={(e) => set('location', e.target.value)} /></Field>
          {(isEdit || st.scope === 'all') && <Field label="Company"><Select value={f.company} onChange={(e) => set('company', e.target.value as CompanyId)} options={companyOptions} /></Field>}
          <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value as Client['status'])} options={[{ value: 'active', label: 'Active' }, { value: 'vip', label: 'VIP' }, { value: 'inactive', label: 'Inactive' }]} /></Field>
        </div>
        <Field label="Notes"><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </form>
    </Modal>
  );
}

/* ---------------- Personal ---------------- */
const PTYPES: { value: PersonalType; label: string; cls: string }[] = [
  { value: 'expense', label: 'Expense', cls: 'bg-rose-50 text-rose-700 ring-rose-300' },
  { value: 'income', label: 'Income', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-300' },
  { value: 'investment', label: 'Invest', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-300' },
  { value: 'saving', label: 'Save', cls: 'bg-teal-50 text-teal-700 ring-teal-300' },
];
function PersonalForm({ initial, onClose }: { initial?: Partial<PersonalEntry>; onClose: () => void }) {
  const st = useStore();
  const isEdit = !!initial?.id;
  const [f, setF] = useState<PersonalEntry>({ id: uid(), type: 'expense', amount: 0, date: today(), category: 'Groceries', account: st.settings.personalAccounts[0] ?? 'Cash', description: '', tags: [], essential: true, recurring: false, ...initial } as PersonalEntry);
  const [tags, setTags] = useState(tagsToStr(initial?.tags));
  const set = <K extends keyof PersonalEntry>(k: K, v: PersonalEntry[K]) => setF((x) => ({ ...x, [k]: v }));
  const cats = PERSONAL_CATEGORIES[f.type];
  useEffect(() => { if (!cats.includes(f.category)) set('category', cats[0]); }, [f.type]); // eslint-disable-line
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.amount) return toast('Enter an amount', 'bad');
    st.upsertPersonal({ ...f, tags: strToTags(tags) });
    toast(isEdit ? 'Entry updated' : 'Entry added');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit entry' : 'New personal entry'} subtitle="Personal finance"
      footer={<Footer onCancel={onClose} onDelete={isEdit ? async () => { if (await confirmDialog({ title: 'Delete entry?', danger: true, confirmLabel: 'Delete' })) { st.removePersonal(f.id); toast('Deleted', 'info'); onClose(); } } : undefined} />}>
      <form id="entity-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {PTYPES.map((t) => (
            <button type="button" key={t.value} onClick={() => set('type', t.value)}
              className={clsx('h-11 rounded-xl font-bold text-xs sm:text-sm ring-1 transition', f.type === t.value ? t.cls : 'ring-line text-ink-mute hover:bg-ink/[.03]')}>{t.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Amount"><AmountInput value={f.amount} onChange={(n) => set('amount', n)} autoFocus /></Field>
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        </div>
        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => <button type="button" key={c} onClick={() => set('category', c)} className={clsx('chip', f.category === c && 'chip-on')}>{c}</button>)}
          </div>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Description"><Input value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What was it?" /></Field>
          <Field label="Account"><Select value={f.account} onChange={(e) => set('account', e.target.value)} options={st.settings.personalAccounts} /></Field>
        </div>
        <Field label="Tags"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="trip-goa, family" /></Field>
        <div className="flex flex-wrap gap-6 pt-1">
          {f.type === 'expense' && <Toggle checked={!f.essential} onChange={(v) => set('essential', !v)} label="This is a 'want' (non-essential)" />}
          <Toggle checked={f.recurring} onChange={(v) => set('recurring', v)} label="Recurring monthly" />
        </div>
      </form>
    </Modal>
  );
}

export function FormHost() {
  const form = useUI((s) => s.form);
  const close = useUI((s) => s.closeForm);
  if (!form) return null;
  const f = form as FormReq;
  const k = f.initial?.id ?? f.kind;
  switch (f.kind) {
    case 'transaction': return <TransactionForm key={k} onClose={close} initial={f.initial} />;
    case 'project': return <ProjectForm key={k} onClose={close} initial={f.initial} />;
    case 'lead': return <LeadForm key={k} onClose={close} initial={f.initial} />;
    case 'client': return <ClientForm key={k} onClose={close} initial={f.initial} />;
    case 'personal': return <PersonalForm key={k} onClose={close} initial={f.initial} />;
  }
}
