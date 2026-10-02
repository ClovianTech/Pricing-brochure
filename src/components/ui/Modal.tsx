import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Centered dialog on desktop, bottom sheet on mobile. */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-[fade-up_.2s_ease-out]" onClick={onClose} />
      <div className={clsx('relative w-full bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl ring-1 ring-line flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-sheet-up sm:animate-scale-in',
        size === 'sm' && 'sm:max-w-md', size === 'md' && 'sm:max-w-xl', size === 'lg' && 'sm:max-w-3xl')}>
        <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-ink/15" />
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-4 sm:pt-6 pb-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-ink-mute mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-9 w-9 shrink-0 grid place-items-center rounded-xl hover:bg-ink/5 text-ink-mute" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-5 sm:px-6 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-line flex justify-end gap-2 safe-bottom bg-canvas/40 sm:rounded-b-3xl">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Side drawer on desktop, full sheet on mobile. */
export function Drawer({ open, onClose, children, width = 'max-w-xl' }: { open: boolean; onClose: () => void; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className={clsx('relative h-full w-full bg-white/95 backdrop-blur-xl shadow-2xl ring-1 ring-line overflow-y-auto animate-slide-in', width)}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 h-9 w-9 grid place-items-center rounded-xl bg-white ring-1 ring-line hover:bg-ink/5 text-ink-mute" aria-label="Close"><X size={18} /></button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
