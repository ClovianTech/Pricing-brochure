import clsx from 'clsx';
import { useId } from 'react';
import type { Scope } from '@/lib/types';

export const ClovianMark = ({ className }: { className?: string }) => (
  <img src="./clovian-mark.png" alt="Clovian Tech" className={clsx('object-contain', className)} draggable={false} />
);

export const BlackXMark = ({ className }: { className?: string }) => {
  const id = useId();
  return (
  <svg viewBox="0 0 40 40" className={className} aria-label="Black X Media">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a855f7" /><stop offset="1" stopColor="#ec4899" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" fill="#0b0b0f" />
    <path d="M11 11 L29 29 M29 11 L11 29" stroke={`url(#${id})`} strokeWidth="5.5" strokeLinecap="round" />
    <circle cx="20" cy="20" r="2.4" fill="#0b0b0f" />
  </svg>
  );
};

export const AllMark = ({ className }: { className?: string }) => {
  const id = useId();
  return (
  <svg viewBox="0 0 40 40" className={className} aria-label="All companies">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4f46e5" /><stop offset="1" stopColor="#38bdf8" /></linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
    <rect x="10" y="10" width="8.5" height="8.5" rx="2.5" fill="#fff" />
    <rect x="21.5" y="10" width="8.5" height="8.5" rx="2.5" fill="#fff" opacity=".7" />
    <rect x="10" y="21.5" width="8.5" height="8.5" rx="2.5" fill="#fff" opacity=".7" />
    <rect x="21.5" y="21.5" width="8.5" height="8.5" rx="2.5" fill="#fff" opacity=".45" />
  </svg>
  );
};

export const ScopeMark = ({ scope, className }: { scope: Scope; className?: string }) =>
  scope === 'clovian' ? <ClovianMark className={className} /> : scope === 'blackx' ? <BlackXMark className={className} /> : <AllMark className={className} />;

export const scopeName = (s: Scope) => (s === 'clovian' ? 'Clovian Tech' : s === 'blackx' ? 'Black X Media' : 'All Companies');
