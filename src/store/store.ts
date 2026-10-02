import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Budget, Client, Comment, CompanyId, Lead, LeadActivity, LeadStage, PersonalEntry, Project, Scope, Settings, Transaction,
} from '@/lib/types';
import { uid, today } from '@/lib/utils';
import { stageMeta } from '@/lib/constants';
import { buildSeed } from './seed';

export interface DataState {
  transactions: Transaction[];
  clients: Client[];
  projects: Project[];
  leads: Lead[];
  personal: PersonalEntry[];
  budgets: Budget[];
  settings: Settings;
}

interface Store extends DataState {
  scope: Scope;
  setScope: (s: Scope) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  upsertTransaction: (t: Transaction) => void;
  removeTransaction: (id: string) => void;
  upsertClient: (c: Client) => void;
  removeClient: (id: string) => void;
  upsertProject: (p: Project) => void;
  removeProject: (id: string) => void;
  addProjectComment: (projectId: string, c: Omit<Comment, 'id' | 'at'>) => void;
  removeProjectComment: (projectId: string, commentId: string) => void;
  upsertLead: (l: Lead) => void;
  removeLead: (id: string) => void;
  moveLead: (id: string, stage: LeadStage, lostReason?: string) => void;
  addLeadActivity: (id: string, a: Omit<LeadActivity, 'id' | 'at'>) => void;
  convertLead: (id: string) => { clientId: string; projectId: string } | undefined;
  upsertPersonal: (e: PersonalEntry) => void;
  removePersonal: (id: string) => void;
  setBudget: (b: Budget) => void;
  removeBudget: (category: string) => void;
  updateSettings: (s: Partial<Settings>) => void;

  importData: (d: DataState) => void;
  loadDemo: () => void;
  clearAll: () => void;
}

const upsert = <T extends { id: string }>(arr: T[], item: T) =>
  arr.some((x) => x.id === item.id) ? arr.map((x) => (x.id === item.id ? item : x)) : [item, ...arr];

const emptyData = (settings: Settings): DataState => ({
  transactions: [], clients: [], projects: [], leads: [], personal: [], budgets: [], settings,
});

export const defaultSettings: Settings = {
  ownerName: 'Founder',
  currency: 'INR',
  locale: 'en-IN',
  personalAccounts: ['Bank — Savings', 'Bank — Current', 'Credit Card', 'Cash', 'UPI Wallet'],
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed(defaultSettings),
      scope: 'clovian',
      setScope: (scope) => set({ scope }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      upsertTransaction: (t) => set((s) => ({ transactions: upsert(s.transactions, t) })),
      removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) })),
      upsertClient: (c) => set((s) => ({ clients: upsert(s.clients, c) })),
      removeClient: (id) => set((s) => ({
        clients: s.clients.filter((x) => x.id !== id),
        projects: s.projects.map((p) => (p.clientId === id ? { ...p, clientId: undefined } : p)),
        transactions: s.transactions.map((t) => (t.clientId === id ? { ...t, clientId: undefined } : t)),
      })),
      upsertProject: (p) => set((s) => ({ projects: upsert(s.projects, p) })),
      removeProject: (id) => set((s) => ({
        projects: s.projects.filter((x) => x.id !== id),
        transactions: s.transactions.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
      })),
      addProjectComment: (projectId, c) => set((s) => ({
        projects: s.projects.map((p) => p.id === projectId
          ? { ...p, comments: [{ ...c, id: uid(), at: new Date().toISOString() }, ...p.comments] } : p),
      })),
      removeProjectComment: (projectId, commentId) => set((s) => ({
        projects: s.projects.map((p) => p.id === projectId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p),
      })),
      upsertLead: (l) => set((s) => ({ leads: upsert(s.leads, l) })),
      removeLead: (id) => set((s) => ({ leads: s.leads.filter((x) => x.id !== id) })),
      moveLead: (id, stage, lostReason) => set((s) => ({
        leads: s.leads.map((l) => l.id === id && l.stage !== stage ? {
          ...l, stage, lostReason: stage === 'lost' ? lostReason ?? l.lostReason : undefined,
          activities: [{ id: uid(), at: new Date().toISOString(), type: 'stage', text: `Moved to ${stageMeta(stage).label}${lostReason ? ` — ${lostReason}` : ''}` }, ...l.activities],
        } : l),
      })),
      addLeadActivity: (id, a) => set((s) => ({
        leads: s.leads.map((l) => l.id === id ? { ...l, activities: [{ ...a, id: uid(), at: new Date().toISOString() }, ...l.activities] } : l),
      })),
      convertLead: (id) => {
        const lead = get().leads.find((l) => l.id === id);
        if (!lead) return;
        const existing = get().clients.find((c) => c.company === lead.company && c.name.toLowerCase() === (lead.businessName || lead.name).toLowerCase());
        const client: Client = existing ?? {
          id: uid(), company: lead.company, name: lead.businessName || lead.name, contactName: lead.name,
          email: lead.email, phone: lead.phone, industry: '', location: '', status: 'active', createdAt: today(), notes: lead.notes,
        };
        const project: Project = {
          id: uid(), company: lead.company, name: `${lead.service} — ${client.name}`, clientId: client.id, category: lead.service,
          billing: lead.billing, amount: lead.value, startDate: today(), status: 'planning', progress: 0, priority: lead.priority,
          estimatedCost: 0, description: lead.notes, tags: lead.tags,
          comments: [{ id: uid(), at: new Date().toISOString(), kind: 'milestone', text: `Converted from lead (${lead.source}).` }],
        };
        set((s) => ({
          clients: existing ? s.clients : [client, ...s.clients],
          projects: [project, ...s.projects],
          leads: s.leads.map((l) => l.id === id ? {
            ...l, stage: 'won', convertedClientId: client.id, convertedProjectId: project.id,
            activities: [{ id: uid(), at: new Date().toISOString(), type: 'stage', text: 'Won 🎉 — converted to client & project' }, ...l.activities],
          } : l),
        }));
        return { clientId: client.id, projectId: project.id };
      },
      upsertPersonal: (e) => set((s) => ({ personal: upsert(s.personal, e) })),
      removePersonal: (id) => set((s) => ({ personal: s.personal.filter((x) => x.id !== id) })),
      setBudget: (b) => set((s) => ({ budgets: [...s.budgets.filter((x) => x.category !== b.category), b] })),
      removeBudget: (category) => set((s) => ({ budgets: s.budgets.filter((x) => x.category !== category) })),
      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      importData: (d) => set({ ...emptyData(get().settings), ...d, settings: { ...defaultSettings, ...d.settings } }),
      loadDemo: () => set(buildSeed(get().settings)),
      clearAll: () => set(emptyData(get().settings)),
    }),
    {
      name: 'clovian-command-center-v1',
      version: 1,
    },
  ),
);

export const companyMatch = (scope: Scope) => (x: { company: CompanyId }) => scope === 'all' || x.company === scope;
