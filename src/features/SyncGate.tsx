import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';
import { Cloud, CloudOff, Database, Loader2, Lock, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { connect, initialise, startSync, useSync } from '@/store/sync';

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-full grid place-items-center px-4 py-10">
    <div className="fixed inset-x-0 top-0 h-[420px] grid-bg pointer-events-none" />
    <div className="relative w-full max-w-sm card !rounded-3xl p-6 sm:p-7 shadow-lift animate-scale-in">
      <img src="./clovian-logo.png" className="h-10 mx-auto mb-6 object-contain" alt="Clovian Tech" />
      {children}
    </div>
  </div>
);

function LockScreen() {
  const error = useSync((s) => s.error);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | undefined>(error);
  return (
    <Shell>
      <div className="text-center mb-5">
        <h1 className="text-lg font-bold">Clovian Tech Management System</h1>
        <p className="text-sm text-ink-mute mt-1">Enter your passcode to open your workspace.</p>
      </div>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        if (!code.trim() || busy) return;
        setBusy(true);
        setMsg(await connect(code.trim()));
        setBusy(false);
      }}>
        <Input type="password" autoFocus autoComplete="current-password" placeholder="Passcode" value={code} onChange={(e) => setCode(e.target.value)} />
        {msg && <p className="text-sm text-rose-600">{msg}</p>}
        <Button type="submit" variant="primary" className="w-full justify-center" disabled={busy}
          icon={busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}>Unlock</Button>
      </form>
      <p className="text-[11px] text-ink-faint text-center mt-5">Your data syncs securely across every device you unlock.</p>
    </Shell>
  );
}

function SetupScreen() {
  const count = useSync((s) => s.localCounts ?? 0);
  const [busy, setBusy] = useState(false);
  const go = async (useLocal: boolean) => { setBusy(true); await initialise(useLocal); };
  return (
    <Shell>
      <div className="text-center mb-5">
        <h1 className="text-lg font-bold">Set up your workspace</h1>
        <p className="text-sm text-ink-mute mt-1">Your cloud workspace is empty. How do you want to start?</p>
      </div>
      <div className="space-y-2.5">
        <Button variant="primary" className="w-full justify-center" disabled={busy} icon={<Sparkles size={16} />} onClick={() => go(false)}>Start with an empty workspace</Button>
        <Button className="w-full justify-center" disabled={busy || count === 0} icon={<Database size={16} />} onClick={() => go(true)}>
          Upload this browser’s data ({count} records)
        </Button>
      </div>
      <p className="text-[11px] text-ink-faint text-center mt-5">This browser’s data may be the demo sample data. Uploading copies it to every device.</p>
    </Shell>
  );
}

const Connecting = () => (
  <div className="min-h-full grid place-items-center text-ink-mute"><Loader2 className="animate-spin" /></div>
);

export function SyncGate({ children }: { children: ReactNode }) {
  const status = useSync((s) => s.status);
  useEffect(() => { startSync(); }, []);
  if (status === 'locked') return <LockScreen />;
  if (status === 'setup') return <SetupScreen />;
  if (status === 'connecting') return <Connecting />;
  return <>{children}</>;
}

export function SyncBadge() {
  const { status, error } = useSync();
  const ui = {
    synced: { icon: <Cloud size={16} />, label: 'Synced', cls: 'text-emerald-600' },
    saving: { icon: <RefreshCw size={15} className="animate-spin" />, label: 'Saving…', cls: 'text-ink-mute' },
    offline: { icon: <CloudOff size={16} />, label: 'Offline', cls: 'text-amber-600' },
    error: { icon: <TriangleAlert size={16} />, label: 'Sync error', cls: 'text-rose-600' },
  }[status as 'synced' | 'saving' | 'offline' | 'error'];
  if (!ui) return null;
  return (
    <span title={error ?? ui.label} className={clsx('flex items-center gap-1.5 h-10 px-2 text-xs font-semibold', ui.cls)}>
      {ui.icon}<span className="hidden xl:inline">{ui.label}</span>
    </span>
  );
}
