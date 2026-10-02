import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore, companyMatch } from '@/store/store';

export function useScoped() {
  const scope = useStore((s) => s.scope);
  const transactions = useStore((s) => s.transactions);
  const projects = useStore((s) => s.projects);
  const leads = useStore((s) => s.leads);
  const clients = useStore((s) => s.clients);
  return useMemo(() => {
    const m = companyMatch(scope);
    return { scope, transactions: transactions.filter(m), projects: projects.filter(m), leads: leads.filter(m), clients: clients.filter(m) };
  }, [scope, transactions, projects, leads, clients]);
}

/** State synced to the URL query string, so filtered views are linkable & survive refresh. */
export function useQueryState<T extends string>(key: string, def: T): [T, (v: T) => void] {
  const [sp, setSp] = useSearchParams();
  const v = (sp.get(key) as T) ?? def;
  const set = (nv: T) => {
    setSp((prev) => { const n = new URLSearchParams(prev); if (nv === def || nv === '') n.delete(key); else n.set(key, nv); return n; }, { replace: true });
  };
  return [v, set];
}
