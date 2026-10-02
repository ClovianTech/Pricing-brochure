import { create } from 'zustand';
import type { Client, Lead, PersonalEntry, Project, Transaction } from '@/lib/types';

export type FormReq =
  | { kind: 'transaction'; initial?: Partial<Transaction> }
  | { kind: 'project'; initial?: Partial<Project> }
  | { kind: 'lead'; initial?: Partial<Lead> }
  | { kind: 'client'; initial?: Partial<Client> }
  | { kind: 'personal'; initial?: Partial<PersonalEntry> };

export const useUI = create<{ form?: FormReq; palette: boolean; openForm: (f: FormReq) => void; closeForm: () => void; setPalette: (v: boolean) => void }>((set) => ({
  palette: false,
  openForm: (form) => set({ form }),
  closeForm: () => set({ form: undefined }),
  setPalette: (palette) => set({ palette }),
}));
