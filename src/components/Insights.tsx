import clsx from 'clsx';
import { AlertOctagon, AlertTriangle, ChevronRight, Lightbulb, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Insight } from '@/lib/metrics';
import { Card } from './ui';

const TONE = {
  good: { icon: TrendingUp, cls: 'bg-emerald-50 text-emerald-600' },
  warn: { icon: AlertTriangle, cls: 'bg-amber-50 text-amber-600' },
  bad: { icon: AlertOctagon, cls: 'bg-rose-50 text-rose-600' },
  info: { icon: Lightbulb, cls: 'bg-sky-50 text-sky-600' },
};

export function InsightsPanel({ items, title = 'Smart insights' }: { items: Insight[]; title?: string }) {
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-gradient-to-br from-accent/20 to-accent2/20 blur-3xl" />
      <div className="relative flex items-center gap-2.5 mb-4">
        <span className="h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-white shadow-glow"><Sparkles size={17} /></span>
        <div>
          <h3 className="font-bold text-[15px]">{title}</h3>
          <p className="text-xs text-ink-mute">Auto-generated from your live data</p>
        </div>
      </div>
      <div className="relative space-y-2">
        {items.length === 0 && <p className="text-sm text-ink-mute py-4">All clear — nothing needs your attention right now. ✨</p>}
        {items.slice(0, 6).map((it, i) => {
          const t = TONE[it.tone];
          const body = (
            <div className={clsx('flex items-start gap-3 p-3 rounded-xl ring-1 ring-line/70 bg-white/70 transition animate-fade-up', it.to && 'hover:ring-accent/30 hover:bg-white group')} style={{ animationDelay: `${i * 60}ms` }}>
              <span className={clsx('h-8 w-8 shrink-0 grid place-items-center rounded-lg', t.cls)}><t.icon size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-ink">{it.title}</div>
                <div className="text-xs text-ink-mute mt-0.5 leading-relaxed">{it.detail}</div>
              </div>
              {it.to && <ChevronRight size={16} className="text-ink-faint mt-2 group-hover:translate-x-0.5 group-hover:text-accent transition" />}
            </div>
          );
          return it.to ? <Link key={i} to={it.to} className="block">{body}</Link> : <div key={i}>{body}</div>;
        })}
      </div>
    </Card>
  );
}
