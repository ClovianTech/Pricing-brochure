import clsx from 'clsx';
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ArrowDownRight, ArrowUpRight, Inbox } from 'lucide-react';
import { initials } from '@/lib/utils';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'icon'; icon?: ReactNode }>(
  ({ variant = 'secondary', size = 'md', icon, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'icon' && 'h-9 w-9 text-sm',
        variant === 'primary' && 'text-white bg-gradient-to-br from-accent to-accentdeep shadow-glow hover:brightness-110',
        variant === 'secondary' && 'bg-white text-ink-soft border border-line hover:border-accent/40 hover:text-accent shadow-sm',
        variant === 'ghost' && 'text-ink-soft hover:bg-ink/5 hover:text-ink',
        variant === 'soft' && 'bg-accent/10 text-accent hover:bg-accent/15',
        variant === 'danger' && 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  ),
);

export const Card = ({ className, children, hover, ...rest }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) => (
  <div {...rest} className={clsx('card', hover && 'card-hover', className)}>{children}</div>
);

export const CardHeader = ({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) => (
  <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
    <div className="flex items-center gap-3 min-w-0">
      {icon && <div className="h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-accent/10 text-accent">{icon}</div>}
      <div className="min-w-0">
        <h3 className="font-bold text-[15px] text-ink truncate">{title}</h3>
        {subtitle && <p className="text-xs text-ink-mute mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

export const Badge = ({ children, className, dot }: { children: ReactNode; className?: string; dot?: string }) => (
  <span className={clsx('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', className ?? 'bg-slate-50 text-slate-600 ring-slate-200')}>
    {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
    {children}
  </span>
);

export const Field = ({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) => (
  <label className={clsx('block', className)}>
    <span className="label">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-ink-faint mt-1">{hint}</span>}
  </label>
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((p, ref) => <input ref={ref} {...p} className={clsx('input', p.className)} />);
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={clsx('input resize-none', p.className)} />;
export const Select = ({ options, className, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }) => (
  <select {...p} className={clsx('input pr-8 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7788%27 stroke-width=%272.5%27><path d=%27m6 9 6 6 6-6%27/></svg>")] bg-no-repeat bg-[right_.75rem_center]', className)}>
    {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={clsx('inline-flex p-1 rounded-xl bg-ink/[.04] ring-1 ring-inset ring-line/80 overflow-x-auto no-scrollbar max-w-full', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={clsx('rounded-lg font-semibold transition whitespace-nowrap', size === 'sm' ? 'px-2.5 h-7 text-xs' : 'px-3.5 h-8 text-[13px]',
            value === o.value ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-ink-mute hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, delta, deltaGood = 'up', hint, icon, tone = 'accent', className }: {
  label: string; value: ReactNode; delta?: number; deltaGood?: 'up' | 'down'; hint?: ReactNode; icon?: ReactNode; tone?: 'accent' | 'good' | 'warn' | 'bad' | 'ink'; className?: string;
}) {
  const good = delta === undefined ? null : deltaGood === 'up' ? delta >= 0 : delta <= 0;
  const toneCls = { accent: 'bg-accent/10 text-accent', good: 'bg-emerald-50 text-emerald-600', warn: 'bg-amber-50 text-amber-600', bad: 'bg-rose-50 text-rose-600', ink: 'bg-ink/5 text-ink' }[tone];
  return (
    <Card hover className={clsx('p-4 sm:p-5 relative overflow-hidden group', className)}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent2/10 blur-2xl opacity-0 group-hover:opacity-100 transition" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold text-ink-mute uppercase tracking-wider truncate">{label}</span>
        {icon && <span className={clsx('h-8 w-8 grid place-items-center rounded-lg shrink-0', toneCls)}>{icon}</span>}
      </div>
      <div className="num text-xl sm:text-[26px] font-bold mt-2 text-ink truncate">{value}</div>
      <div className="flex items-center gap-2 mt-1.5 text-xs min-h-[18px]">
        {delta !== undefined && isFinite(delta) && (
          <span className={clsx('inline-flex items-center gap-0.5 font-semibold', good ? 'text-emerald-600' : 'text-rose-600')}>
            {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(delta).toFixed(0)}%
          </span>
        )}
        {hint && <span className="text-ink-mute truncate">{hint}</span>}
      </div>
    </Card>
  );
}

export const Progress = ({ value, className, color, thin }: { value: number; className?: string; color?: string; thin?: boolean }) => (
  <div className={clsx('w-full rounded-full bg-ink/[.06] overflow-hidden', thin ? 'h-1.5' : 'h-2', className)}>
    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color ?? 'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent2)))' }} />
  </div>
);

const AV = ['from-sky-400 to-blue-600', 'from-violet-400 to-fuchsia-600', 'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-600', 'from-rose-400 to-pink-600', 'from-indigo-400 to-indigo-700'];
export const Avatar = ({ name, size = 36, className }: { name: string; size?: number; className?: string }) => {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length;
  return (
    <div className={clsx('shrink-0 grid place-items-center rounded-xl text-white font-bold bg-gradient-to-br shadow-sm', AV[h], className)} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  );
};

export const Empty = ({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="h-14 w-14 rounded-2xl grid place-items-center bg-accent/10 text-accent mb-4 animate-float">{icon ?? <Inbox size={24} />}</div>
    <p className="font-bold text-ink">{title}</p>
    {hint && <p className="text-sm text-ink-mute mt-1 max-w-sm">{hint}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const PageHeader = ({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-fade-up">
    <div className="min-w-0">
      {eyebrow && <div className="text-xs font-semibold text-accent uppercase tracking-[.18em] mb-1.5">{eyebrow}</div>}
      <h1 className="font-display text-2xl sm:text-[32px] font-bold tracking-tight text-ink leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-ink-mute mt-1.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5 text-sm font-medium text-ink-soft">
    <span className={clsx('relative h-6 w-10 rounded-full transition', checked ? 'bg-accent' : 'bg-ink/15')}>
      <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
    </span>
    {label}
  </button>
);
