export type CompanyId = 'clovian' | 'blackx';
export type Scope = CompanyId | 'all';

export type TxType = 'income' | 'expense';
export type TxStatus = 'paid' | 'pending' | 'overdue';
export type PayMethod = 'Bank Transfer' | 'Cash' | 'Card' | 'UPI' | 'PayPal' | 'Stripe' | 'Cheque' | 'Other';

export interface Transaction {
  id: string;
  company: CompanyId;
  type: TxType;
  amount: number;
  date: string; // yyyy-mm-dd
  category: string;
  description: string;
  clientId?: string;
  projectId?: string;
  method: PayMethod;
  status: TxStatus;
  tags: string[];
}

export type ClientStatus = 'active' | 'vip' | 'inactive';
export interface Client {
  id: string;
  company: CompanyId;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  location: string;
  status: ClientStatus;
  createdAt: string;
  notes: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
export type Billing = 'one-time' | 'monthly';
export type Priority = 'low' | 'medium' | 'high';

export interface Comment {
  id: string;
  at: string; // ISO datetime
  kind: 'note' | 'update' | 'issue' | 'milestone';
  text: string;
}

export interface Project {
  id: string;
  company: CompanyId;
  name: string;
  clientId?: string;
  category: string;
  billing: Billing;
  /** One-time: total contract value. Monthly: fee per month. */
  amount: number;
  startDate: string;
  endDate?: string; // deadline (one-time) or contract end (monthly). Empty = ongoing.
  status: ProjectStatus;
  progress: number;
  priority: Priority;
  estimatedCost: number;
  description: string;
  comments: Comment[];
  tags: string[];
}

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export interface LeadActivity {
  id: string;
  at: string;
  type: 'call' | 'email' | 'meeting' | 'whatsapp' | 'note' | 'stage';
  text: string;
}
export interface Lead {
  id: string;
  company: CompanyId;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  source: string;
  service: string;
  value: number;
  billing: Billing;
  stage: LeadStage;
  priority: Priority;
  createdAt: string;
  nextFollowUp?: string;
  expectedClose?: string;
  tags: string[];
  notes: string;
  lostReason?: string;
  activities: LeadActivity[];
  convertedClientId?: string;
  convertedProjectId?: string;
}

export type PersonalType = 'income' | 'expense' | 'investment' | 'saving';
export interface PersonalEntry {
  id: string;
  type: PersonalType;
  amount: number;
  date: string;
  category: string;
  account: string;
  description: string;
  tags: string[];
  /** need vs want — only meaningful for expenses */
  essential: boolean;
  recurring: boolean;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Settings {
  ownerName: string;
  currency: string; // ISO code
  locale: string;
  personalAccounts: string[];
}
