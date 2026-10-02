import { create } from 'zustand';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './index';

interface ToastItem { id: number; text: string; tone: 'good' | 'bad' | 'info' }
interface ConfirmReq { title: string; body?: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void }
const useFeedback = create<{ toasts: ToastItem[]; confirm?: ConfirmReq }>(() => ({ toasts: [] }));

export const toast = (text: string, tone: ToastItem['tone'] = 'good') => {
  const id = Date.now() + Math.random();
  useFeedback.setState((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
  setTimeout(() => useFeedback.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2800);
};
export const confirmDialog = (opts: Omit<ConfirmReq, 'resolve'>) =>
  new Promise<boolean>((resolve) => useFeedback.setState({ confirm: { ...opts, resolve } }));

export function FeedbackHost() {
  const { toasts, confirm } = useFeedback();
  const close = (ok: boolean) => { confirm?.resolve(ok); useFeedback.setState({ confirm: undefined }); };
  return (
    <>
      <div className="fixed z-[80] left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="animate-fade-up flex items-center gap-2.5 pl-3 pr-4 h-11 rounded-2xl bg-ink text-white text-sm font-medium shadow-2xl">
            {t.tone === 'good' ? <CheckCircle2 size={18} className="text-emerald-400" /> : t.tone === 'bad' ? <AlertTriangle size={18} className="text-rose-400" /> : <Info size={18} className="text-sky-400" />}
            {t.text}
          </div>
        ))}
      </div>
      <Modal open={!!confirm} onClose={() => close(false)} title={confirm?.title ?? ''} size="sm"
        footer={<><Button onClick={() => close(false)}>Cancel</Button><Button variant={confirm?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{confirm?.confirmLabel ?? 'Confirm'}</Button></>}>
        <p className="text-sm text-ink-soft">{confirm?.body}</p>
      </Modal>
    </>
  );
}
