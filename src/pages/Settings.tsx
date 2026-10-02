import { useRef, useState } from 'react';
import { Database, Download, RotateCcw, Trash2, Upload, User, Wallet, X, Plus, ShieldCheck, LogOut } from 'lucide-react';
import { useStore, type DataState } from '@/store/store';
import { Button, Card, CardHeader, Field, Input, PageHeader, Select } from '@/components/ui';
import { CURRENCIES } from '@/lib/constants';
import { downloadFile, today } from '@/lib/utils';
import { confirmDialog, toast } from '@/components/ui/feedback';
import { hasUnsyncedChanges, signOut, useSync } from '@/store/sync';

export default function Settings() {
  const st = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [acc, setAcc] = useState('');
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const counts = [['Transactions', st.transactions.length], ['Projects', st.projects.length], ['Clients', st.clients.length], ['Leads', st.leads.length], ['Personal entries', st.personal.length]] as const;

  const backup = () => {
    const data: DataState = { transactions: st.transactions, clients: st.clients, projects: st.projects, leads: st.leads, personal: st.personal, budgets: st.budgets, settings: st.settings };
    downloadFile(`clovian-backup-${today()}.json`, JSON.stringify({ app: 'clovian-command-center', version: 1, exportedAt: new Date().toISOString(), data }, null, 2), 'application/json');
    toast('Backup downloaded');
  };
  const restore = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      const data = (json.data ?? json) as DataState;
      if (!Array.isArray(data.transactions) || !Array.isArray(data.projects)) throw new Error('bad');
      if (!(await confirmDialog({ title: 'Restore this backup?', body: 'Current data will be replaced with the backup contents.', confirmLabel: 'Restore', danger: true }))) return;
      st.importData(data);
      toast('Backup restored');
    } catch { toast('That file is not a valid backup', 'bad'); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader eyebrow="Workspace" title="Settings" subtitle="Profile, currency, accounts and your data." />
      <Card>
        <CardHeader title="Profile & currency" icon={<User size={17} />} />
        <div className="px-5 pb-5 grid sm:grid-cols-2 gap-4">
          <Field label="Your name"><Input value={st.settings.ownerName} onChange={(e) => st.updateSettings({ ownerName: e.target.value })} /></Field>
          <Field label="Currency" hint="Used across both companies and personal finance"><Select value={st.settings.currency} onChange={(e) => st.updateSettings({ currency: e.target.value, locale: CURRENCIES.find((c) => c.code === e.target.value)?.locale ?? 'en-US' })} options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))} /></Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Personal accounts" subtitle="Bank accounts, cards and wallets used in personal finance" icon={<Wallet size={17} />} />
        <div className="px-5 pb-5">
          <div className="flex flex-wrap gap-2">
            {st.settings.personalAccounts.map((a) => (
              <span key={a} className="chip !pr-1.5">{a}<button onClick={() => st.updateSettings({ personalAccounts: st.settings.personalAccounts.filter((x) => x !== a) })} className="h-5 w-5 grid place-items-center rounded-full hover:bg-rose-50 hover:text-rose-600"><X size={12} /></button></span>
            ))}
          </div>
          <form className="flex gap-2 mt-3 max-w-sm" onSubmit={(e) => { e.preventDefault(); if (acc.trim() && !st.settings.personalAccounts.includes(acc.trim())) { st.updateSettings({ personalAccounts: [...st.settings.personalAccounts, acc.trim()] }); setAcc(''); } }}>
            <Input value={acc} onChange={(e) => setAcc(e.target.value)} placeholder="e.g. HDFC Credit Card" /><Button type="submit" icon={<Plus size={15} />}>Add</Button>
          </form>
        </div>
      </Card>
      <Card>
        <CardHeader title="Your data" subtitle="Synced to your private cloud workspace and shared across your devices." icon={<Database size={17} />} />
        <div className="px-5 pb-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {counts.map(([l, n]) => <div key={l} className="rounded-xl bg-canvas ring-1 ring-line p-3"><div className="num text-xl font-bold">{n}</div><div className="text-[11px] text-ink-mute">{l}</div></div>)}
          </div>
          <div className="flex items-start gap-3 rounded-xl p-3 bg-emerald-50/70 ring-1 ring-emerald-200 text-sm text-emerald-800"><ShieldCheck size={18} className="shrink-0 mt-0.5" /><span>Every change syncs automatically to every device you unlock with your passcode{lastSyncedAt ? ` (last synced ${new Date(lastSyncedAt).toLocaleTimeString()})` : ''}. Clearing or restoring data here changes it everywhere, so download a backup first.</span></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={<Download size={16} />} onClick={backup}>Download backup</Button>
            <Button icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>Restore backup</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
            <Button icon={<RotateCcw size={16} />} onClick={async () => { if (await confirmDialog({ title: 'Load demo data?', body: 'Replaces all current data with sample data.', confirmLabel: 'Load demo', danger: true })) { st.loadDemo(); toast('Demo data loaded'); } }}>Load demo data</Button>
            <Button icon={<LogOut size={16} />} onClick={async () => { if (await confirmDialog({ title: 'Sign out of this device?', body: hasUnsyncedChanges() ? 'Some changes have not synced yet and will be lost. Your cloud data stays safe.' : 'This device forgets the passcode and its local copy. Your cloud data stays safe.', confirmLabel: 'Sign out', danger: hasUnsyncedChanges() })) signOut(); }}>Sign out of this device</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={async () => { if (await confirmDialog({ title: 'Start fresh?', body: 'This deletes ALL transactions, projects, clients, leads and personal entries. Download a backup first.', confirmLabel: 'Delete everything', danger: true })) { st.clearAll(); toast('All data cleared', 'info'); } }}>Clear all data</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
