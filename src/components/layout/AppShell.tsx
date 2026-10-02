import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronsLeft, Plus, Search, Wallet, FolderKanban, Target, Users, PiggyBank, Menu, Sparkles, Command, X } from 'lucide-react';
import { useStore } from '@/store/store';
import { useUI } from '@/store/ui';
import type { Scope } from '@/lib/types';
import { NAV } from './nav';
import { ScopeMark, scopeName } from './Brand';
import { Avatar } from '@/components/ui';

const SCOPES: Scope[] = ['clovian', 'blackx', 'all'];

function WorkspaceSwitch({ compact }: { compact?: boolean }) {
  const scope = useStore((s) => s.scope);
  const setScope = useStore((s) => s.setScope);
  const { pathname } = useLocation();
  const nav = useNavigate();
  const personal = pathname.startsWith('/personal');
  return (
    <div className="relative inline-flex p-1 rounded-2xl bg-white/70 backdrop-blur ring-1 ring-line shadow-sm">
      {SCOPES.map((s) => {
        const on = !personal && scope === s;
        return (
          <button key={s} onClick={() => { setScope(s); if (personal) nav('/'); }}
            className={clsx('relative flex items-center gap-2 rounded-xl transition-all duration-300', compact ? 'h-9 px-2' : 'h-9 pl-1.5 pr-3',
              on ? 'bg-gradient-to-br from-white to-white shadow-md ring-1 ring-line text-ink' : 'text-ink-mute hover:text-ink')}
            title={scopeName(s)}>
            <ScopeMark scope={s} className={clsx('h-6 w-6 transition', !on && 'grayscale opacity-60')} />
            {!compact && <span className="text-[13px] font-bold whitespace-nowrap">{s === 'all' ? 'All' : scopeName(s)}</span>}
            {on && <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-full bg-gradient-to-r from-accent to-accent2" />}
          </button>
        );
      })}
    </div>
  );
}

function QuickAdd({ align = 'right' }: { align?: 'right' | 'center' }) {
  const [open, setOpen] = useState(false);
  const openForm = useUI((s) => s.openForm);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const items = [
    { label: 'Income / Expense', hint: 'Company transaction', icon: Wallet, go: () => openForm({ kind: 'transaction' }) },
    { label: 'Project', hint: 'One-time or retainer', icon: FolderKanban, go: () => openForm({ kind: 'project' }) },
    { label: 'Lead', hint: 'Add to pipeline', icon: Target, go: () => openForm({ kind: 'lead' }) },
    { label: 'Client', hint: 'CRM contact', icon: Users, go: () => openForm({ kind: 'client' }) },
    { label: 'Personal entry', hint: 'Your own money', icon: PiggyBank, go: () => openForm({ kind: 'personal' }) },
  ];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className={clsx('grid place-items-center text-white bg-gradient-to-br from-accent to-accentdeep shadow-glow transition active:scale-95',
          align === 'center' ? 'h-14 w-14 rounded-2xl -mt-7 ring-4 ring-white' : 'h-10 w-10 rounded-xl')}
        aria-label="Quick add">
        <Plus size={align === 'center' ? 26 : 20} className={clsx('transition-transform', open && 'rotate-45')} />
      </button>
      {open && (
        <div className={clsx('absolute z-50 w-64 p-2 card shadow-lift animate-scale-in',
          align === 'center' ? 'bottom-16 left-1/2 -translate-x-1/2' : 'right-0 top-12')}>
          <div className="px-2.5 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">Quick add</div>
          {items.map((it) => (
            <button key={it.label} onClick={() => { setOpen(false); it.go(); }} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/5 text-left group">
              <span className="h-9 w-9 grid place-items-center rounded-lg bg-accent/10 text-accent group-hover:scale-110 transition"><it.icon size={17} /></span>
              <span><span className="block text-sm font-semibold text-ink">{it.label}</span><span className="block text-xs text-ink-mute">{it.hint}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggle = useStore((s) => s.toggleSidebar);
  const owner = useStore((s) => s.settings.ownerName);
  const groups = [...new Set(NAV.map((n) => n.group))];
  return (
    <aside className={clsx('hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300', collapsed ? 'w-[84px]' : 'w-[264px]')}>
      <div className="m-3 flex-1 flex flex-col card !rounded-3xl overflow-hidden">
        <div className={clsx('flex items-center h-20 border-b border-line/70', collapsed ? 'justify-center px-2' : 'px-5')}>
          {collapsed ? <img src="./clovian-mark.png" className="h-9" alt="" /> : <img src="./clovian-logo.png" className="h-10 object-contain" alt="Clovian Tech" />}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g}>
              {!collapsed && <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-ink-faint">{g}</div>}
              <div className="space-y-1">
                {NAV.filter((n) => n.group === g).map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.to === '/'} title={n.label}
                    className={({ isActive }) => clsx('relative flex items-center gap-3 h-11 rounded-xl text-sm font-semibold transition group',
                      collapsed ? 'justify-center' : 'px-3',
                      isActive ? 'text-accent bg-gradient-to-r from-accent/[.12] to-accent2/[.06]' : 'text-ink-soft hover:bg-ink/[.04] hover:text-ink')}>
                    {({ isActive }) => (<>
                      {isActive && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-gradient-to-b from-accent to-accent2" />}
                      <n.icon size={19} className={clsx('shrink-0 transition', !isActive && 'group-hover:scale-110')} />
                      {!collapsed && <span className="truncate">{n.label}</span>}
                    </>)}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className={clsx('p-3 border-t border-line/70 flex items-center gap-3', collapsed && 'flex-col')}>
          <Avatar name={owner} size={36} />
          {!collapsed && <div className="min-w-0 flex-1"><div className="text-sm font-bold truncate">{owner}</div><div className="text-[11px] text-ink-mute">Owner · Admin</div></div>}
          <button onClick={toggle} className="h-8 w-8 grid place-items-center rounded-lg text-ink-mute hover:bg-ink/5" title="Collapse sidebar">
            <ChevronsLeft size={17} className={clsx('transition', collapsed && 'rotate-180')} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 inset-y-0 w-[82%] max-w-xs bg-white shadow-2xl animate-[slide-in_.25s_reverse] p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <img src="./clovian-logo.png" className="h-9" alt="Clovian Tech" />
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-xl hover:bg-ink/5"><X size={18} /></button>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={onClose}
              className={({ isActive }) => clsx('flex items-center gap-3 h-12 px-3 rounded-xl text-[15px] font-semibold', isActive ? 'bg-accent/10 text-accent' : 'text-ink-soft')}>
              <n.icon size={20} />{n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

const MOBILE_TABS = [NAV[0], NAV[1], null, NAV[3], NAV[6]];

export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const scope = useStore((s) => s.scope);
  const setPalette = useUI((s) => s.setPalette);
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const personal = pathname.startsWith('/personal');

  useEffect(() => {
    document.documentElement.dataset.themeWs = personal ? 'personal' : scope;
  }, [personal, scope]);
  useEffect(() => { window.scrollTo({ top: 0 }); useUI.getState().closeForm(); }, [pathname]);

  return (
    <div className="min-h-full">
      <div className="fixed inset-x-0 top-0 h-[420px] grid-bg pointer-events-none -z-0" />
      <Sidebar />
      <MobileMenu open={menu} onClose={() => setMenu(false)} />
      <div className={clsx('relative transition-all duration-300', collapsed ? 'lg:pl-[84px]' : 'lg:pl-[264px]')}>
        <header className="sticky top-0 z-30 px-3 sm:px-6 lg:px-8 pt-3">
          <div className="flex items-center gap-2 sm:gap-3 h-14 px-2 sm:px-3 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-line/80 shadow-sm">
            <button onClick={() => setMenu(true)} className="lg:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-ink/5" aria-label="Menu"><Menu size={20} /></button>
            {personal ? (
              <div className="flex items-center gap-2 px-2">
                <span className="h-8 w-8 grid place-items-center rounded-lg bg-accent/10 text-accent"><Sparkles size={16} /></span>
                <span className="font-bold text-sm">Personal space</span>
                <span className="hidden sm:inline text-xs text-ink-mute">· private to you</span>
              </div>
            ) : (
              <>
                <div className="sm:hidden"><WorkspaceSwitch compact /></div>
                <div className="hidden sm:block"><WorkspaceSwitch /></div>
              </>
            )}
            <div className="flex-1" />
            <button onClick={() => setPalette(true)} className="hidden md:flex items-center gap-2 h-10 w-56 xl:w-72 px-3 rounded-xl bg-canvas ring-1 ring-line text-sm text-ink-faint hover:ring-accent/40 transition">
              <Search size={16} /> Search anything…
              <span className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-ink-mute bg-white ring-1 ring-line rounded-md px-1.5 h-5"><Command size={11} />K</span>
            </button>
            <button onClick={() => setPalette(true)} className="md:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-ink/5" aria-label="Search"><Search size={19} /></button>
            <div className="hidden lg:block"><QuickAdd /></div>
          </div>
        </header>
        <main className="px-3 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-12 max-w-[1500px] mx-auto">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-2 safe-bottom">
        <div className="flex items-center justify-around h-16 rounded-2xl bg-white/85 backdrop-blur-xl ring-1 ring-line shadow-lift">
          {MOBILE_TABS.map((n, i) => n === null ? <QuickAdd key={i} align="center" /> : (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => clsx('flex flex-col items-center gap-1 w-16 text-[10px] font-semibold transition', isActive ? 'text-accent' : 'text-ink-mute')}>
              <n.icon size={21} />{n.label.split(' ')[0]}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
