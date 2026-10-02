import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, FolderKanban, Plus, Search, Target, Users, ArrowRightLeft } from 'lucide-react';
import { useStore } from '@/store/store';
import { useUI } from '@/store/ui';
import { NAV } from '@/components/layout/nav';
import { COMPANIES } from '@/lib/constants';
import type { Scope } from '@/lib/types';

interface Item { id: string; group: string; label: string; hint?: string; icon: React.ReactNode; run: () => void }

export function CommandPalette() {
  const open = useUI((s) => s.palette);
  const setOpen = useUI((s) => s.setPalette);
  const openForm = useUI((s) => s.openForm);
  const st = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!useUI.getState().palette); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [setOpen]);
  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 10); } }, [open]);

  const items = useMemo<Item[]>(() => {
    const close = () => setOpen(false);
    const go = (to: string, scope?: Scope) => () => { if (scope) st.setScope(scope); nav(to); close(); };
    const base: Item[] = [
      ...NAV.map((n) => ({ id: `nav${n.to}`, group: 'Go to', label: n.label, icon: <n.icon size={16} />, run: go(n.to) })),
      { id: 'a-tx', group: 'Create', label: 'New income / expense', icon: <Plus size={16} />, run: () => { close(); openForm({ kind: 'transaction' }); } },
      { id: 'a-pr', group: 'Create', label: 'New project', icon: <Plus size={16} />, run: () => { close(); openForm({ kind: 'project' }); } },
      { id: 'a-ld', group: 'Create', label: 'New lead', icon: <Plus size={16} />, run: () => { close(); openForm({ kind: 'lead' }); } },
      { id: 'a-cl', group: 'Create', label: 'New client', icon: <Plus size={16} />, run: () => { close(); openForm({ kind: 'client' }); } },
      { id: 'a-pe', group: 'Create', label: 'New personal entry', icon: <Plus size={16} />, run: () => { close(); openForm({ kind: 'personal' }); } },
      ...(['clovian', 'blackx', 'all'] as Scope[]).map((s) => ({ id: `ws-${s}`, group: 'Switch workspace', label: s === 'all' ? 'All companies' : COMPANIES[s].name, icon: <ArrowRightLeft size={16} />, run: () => { st.setScope(s); close(); } })),
    ];
    if (!q.trim()) return base;
    const ql = q.toLowerCase();
    const match = (s: string) => s.toLowerCase().includes(ql);
    const data: Item[] = [
      ...st.projects.filter((p) => match(`${p.name} ${p.category}`)).slice(0, 6).map((p) => ({ id: p.id, group: 'Projects', label: p.name, hint: `${COMPANIES[p.company].name} · ${p.category}`, icon: <FolderKanban size={16} />, run: go(`/projects/${p.id}`, p.company) })),
      ...st.leads.filter((l) => match(`${l.name} ${l.businessName} ${l.phone} ${l.email}`)).slice(0, 6).map((l) => ({ id: l.id, group: 'Leads', label: l.businessName || l.name, hint: `${l.name} · ${COMPANIES[l.company].name}`, icon: <Target size={16} />, run: go('/leads', l.company) })),
      ...st.clients.filter((c) => match(`${c.name} ${c.contactName} ${c.email} ${c.phone}`)).slice(0, 6).map((c) => ({ id: c.id, group: 'Clients', label: c.name, hint: c.contactName, icon: <Users size={16} />, run: go(`/clients?open=${c.id}`, c.company) })),
    ];
    return [...data, ...base.filter((b) => match(b.label))];
  }, [q, st, nav, openForm, setOpen]);

  useEffect(() => setIdx(0), [q]);
  if (!open) return null;
  const groups = [...new Set(items.map((i) => i.group))];
  let n = -1;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-3 sm:p-6 pt-[10vh]">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-line overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-line">
          <Search size={19} className="text-accent" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects, leads, clients or type a command…"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter') items[idx]?.run();
              if (e.key === 'Escape') setOpen(false);
            }}
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink-faint" />
          <kbd className="hidden sm:block text-[11px] font-semibold text-ink-mute ring-1 ring-line rounded-md px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {items.length === 0 && <div className="p-8 text-center text-sm text-ink-mute">No results for “{q}”</div>}
          {groups.map((g) => (
            <div key={g} className="mb-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[.18em] text-ink-faint">{g}</div>
              {items.filter((i) => i.group === g).map((it) => {
                n++;
                const my = n;
                return (
                  <button key={it.id} onMouseEnter={() => setIdx(my)} onClick={it.run}
                    className={clsx('w-full flex items-center gap-3 px-3 h-11 rounded-xl text-left text-sm transition', idx === my ? 'bg-accent/10 text-accent' : 'text-ink-soft')}>
                    <span className={clsx('h-7 w-7 grid place-items-center rounded-lg', idx === my ? 'bg-accent text-white' : 'bg-ink/5')}>{it.icon}</span>
                    <span className="font-semibold truncate">{it.label}</span>
                    {it.hint && <span className="text-xs text-ink-mute truncate">{it.hint}</span>}
                    {idx === my && <CornerDownLeft size={14} className="ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
