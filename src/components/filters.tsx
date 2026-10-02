import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarRange, Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { RANGE_LABELS, type RangePreset } from '@/lib/utils';
import { Input } from './ui';

function usePop() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return { open, setOpen, ref };
}

export function Popover({ trigger, children, active, align = 'left', width = 'w-64' }: { trigger: ReactNode; children: (close: () => void) => ReactNode; active?: boolean; align?: 'left' | 'right'; width?: string }) {
  const { open, setOpen, ref } = usePop();
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className={clsx('chip !h-9', active && 'chip-on')}>
        {trigger}<ChevronDown size={13} className={clsx('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className={clsx('absolute z-40 mt-2 p-2 card shadow-lift animate-scale-in max-h-[60vh] overflow-y-auto', width, align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function RangeFilter({ value, onChange, custom, onCustom }: { value: RangePreset; onChange: (v: RangePreset) => void; custom: { from?: string; to?: string }; onCustom: (c: { from?: string; to?: string }) => void }) {
  const presets: RangePreset[] = ['all', 'today', 'week', 'month', 'last-month', '30d', '90d', 'quarter', 'year', 'custom'];
  return (
    <Popover active={value !== 'all'} trigger={<><CalendarRange size={14} />{RANGE_LABELS[value]}</>} width="w-72">
      {(close) => (
        <div>
          <div className="grid grid-cols-2 gap-1">
            {presets.map((p) => (
              <button key={p} type="button" onClick={() => { onChange(p); if (p !== 'custom') close(); }}
                className={clsx('h-9 px-3 rounded-lg text-left text-sm font-medium', value === p ? 'bg-accent/10 text-accent' : 'hover:bg-ink/[.04] text-ink-soft')}>{RANGE_LABELS[p]}</button>
            ))}
          </div>
          {value === 'custom' && (
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-line">
              <Input type="date" value={custom.from ?? ''} onChange={(e) => onCustom({ ...custom, from: e.target.value || undefined })} className="!h-9 !text-xs" />
              <Input type="date" value={custom.to ?? ''} onChange={(e) => onCustom({ ...custom, to: e.target.value || undefined })} className="!h-9 !text-xs" />
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

export function MultiFilter({ label, options, value, onChange, icon }: { label: string; options: { value: string; label: string; count?: number }[]; value: string[]; onChange: (v: string[]) => void; icon?: ReactNode }) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Popover active={value.length > 0} trigger={<>{icon}{label}{value.length > 0 && <span className="ml-0.5 h-5 min-w-5 px-1 grid place-items-center rounded-full bg-accent text-white text-[10px]">{value.length}</span>}</>}>
      {() => (
        <div>
          {options.length === 0 && <div className="p-3 text-sm text-ink-mute">No options</div>}
          {options.map((o) => {
            const on = value.includes(o.value);
            return (
              <button key={o.value} type="button" onClick={() => toggle(o.value)} className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg hover:bg-ink/[.04] text-sm text-left">
                <span className={clsx('h-4 w-4 rounded-[5px] grid place-items-center ring-1 transition', on ? 'bg-accent ring-accent text-white' : 'ring-ink/20')}>{on && <Check size={11} strokeWidth={3} />}</span>
                <span className="flex-1 truncate text-ink-soft">{o.label}</span>
                {o.count !== undefined && <span className="text-[11px] text-ink-faint">{o.count}</span>}
              </button>
            );
          })}
          {value.length > 0 && <button type="button" onClick={() => onChange([])} className="w-full mt-1 pt-2 border-t border-line text-xs font-semibold text-accent h-8">Clear</button>}
        </div>
      )}
    </Popover>
  );
}

export function AmountFilter({ min, max, onChange }: { min?: number; max?: number; onChange: (v: { min?: number; max?: number }) => void }) {
  const active = min !== undefined || max !== undefined;
  return (
    <Popover active={active} trigger={<><SlidersHorizontal size={14} />Amount</>} width="w-60">
      {() => (
        <div className="p-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Min" value={min ?? ''} onChange={(e) => onChange({ min: e.target.value ? Number(e.target.value) : undefined, max })} className="!h-9" />
            <Input type="number" placeholder="Max" value={max ?? ''} onChange={(e) => onChange({ min, max: e.target.value ? Number(e.target.value) : undefined })} className="!h-9" />
          </div>
          {active && <button type="button" onClick={() => onChange({})} className="text-xs font-semibold text-accent">Reset</button>}
        </div>
      )}
    </Popover>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={clsx('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9 pr-8 !h-9 !rounded-full" />
      {value && <button type="button" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"><X size={14} /></button>}
    </div>
  );
}

export function SmartViews<T extends string>({ views, value, onChange }: { views: { id: T; label: string; icon?: ReactNode }[]; value: T | ''; onChange: (v: T | '') => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
      {views.map((v) => (
        <button key={v.id} type="button" onClick={() => onChange(value === v.id ? '' : v.id)}
          className={clsx('chip !h-9 shrink-0', value === v.id && '!bg-gradient-to-r from-accent to-accentdeep !text-white !border-transparent shadow-glow')}>
          {v.icon}{v.label}
        </button>
      ))}
    </div>
  );
}
