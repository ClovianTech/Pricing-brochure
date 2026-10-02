import type { CompanyId, LeadStage, ProjectStatus, PersonalType } from './types';

export const COMPANIES: Record<CompanyId, { id: CompanyId; name: string; short: string; tagline: string }> = {
  clovian: { id: 'clovian', name: 'Clovian Tech', short: 'CT', tagline: 'Software & Technology' },
  blackx: { id: 'blackx', name: 'Black X Media', short: 'BX', tagline: 'Marketing Agency' },
};

export const PROJECT_CATEGORIES: Record<CompanyId, string[]> = {
  clovian: ['Web Development', 'Mobile App', 'Custom Software', 'SaaS Product', 'UI/UX Design', 'E-commerce', 'Maintenance & Support', 'Cloud & DevOps', 'AI / Automation'],
  blackx: ['Social Media Management', 'Performance Ads', 'SEO', 'Branding', 'Content Production', 'Video Production', 'Influencer Marketing', 'Email Marketing', 'Strategy & Consulting'],
};

export const INCOME_CATEGORIES = ['Project Payment', 'Retainer', 'Consulting', 'Advance', 'Licensing', 'Commission', 'Other Income'];
export const EXPENSE_CATEGORIES = ['Salaries', 'Freelancers', 'Software & Tools', 'Hosting & Cloud', 'Ad Spend', 'Office & Rent', 'Marketing', 'Equipment', 'Travel', 'Taxes & Fees', 'Utilities', 'Miscellaneous'];

export const PERSONAL_CATEGORIES: Record<PersonalType, string[]> = {
  income: ['Salary / Draw', 'Business Profit', 'Freelance', 'Dividends', 'Interest', 'Rental', 'Gift', 'Refund', 'Other'],
  expense: ['Groceries', 'Dining Out', 'Rent / EMI', 'Utilities', 'Transport', 'Fuel', 'Shopping', 'Health', 'Fitness', 'Entertainment', 'Subscriptions', 'Travel', 'Education', 'Family', 'Gifts & Donations', 'Insurance', 'Personal Care', 'Other'],
  investment: ['Stocks', 'Mutual Funds', 'Crypto', 'Gold', 'Real Estate', 'Fixed Deposit', 'Retirement', 'Other'],
  saving: ['Emergency Fund', 'Goal Savings', 'Other'],
};

export const LEAD_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Instagram', 'Facebook Ads', 'Google Ads', 'Cold Outreach', 'Upwork', 'Fiverr', 'Event', 'WhatsApp', 'Other'];

export const LEAD_STAGES: { id: LeadStage; label: string; prob: number; color: string }[] = [
  { id: 'new', label: 'New', prob: 0.1, color: '#94a3b8' },
  { id: 'contacted', label: 'Contacted', prob: 0.2, color: '#38bdf8' },
  { id: 'qualified', label: 'Qualified', prob: 0.4, color: '#2a78d6' },
  { id: 'proposal', label: 'Proposal Sent', prob: 0.6, color: '#7c3aed' },
  { id: 'negotiation', label: 'Negotiation', prob: 0.8, color: '#eda100' },
  { id: 'won', label: 'Won', prob: 1, color: '#0e9f6e' },
  { id: 'lost', label: 'Lost', prob: 0, color: '#e11d48' },
];
export const stageMeta = (s: LeadStage) => LEAD_STAGES.find((x) => x.id === s)!;

export const PROJECT_STATUSES: { id: ProjectStatus; label: string; tone: string }[] = [
  { id: 'planning', label: 'Planning', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { id: 'active', label: 'Active', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { id: 'on-hold', label: 'On Hold', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { id: 'completed', label: 'Completed', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  { id: 'cancelled', label: 'Cancelled', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
];
export const projectStatusMeta = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.id === s)!;

/** Validated categorical palette (fixed order, never cycled). */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const OTHER_COLOR = '#a3acb9';
export const INCOME_COLOR = '#2a78d6';
export const EXPENSE_COLOR = '#eb6834';

export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)', locale: 'en-IN' },
  { code: 'USD', label: 'US Dollar ($)', locale: 'en-US' },
  { code: 'PKR', label: 'Pakistani Rupee (Rs)', locale: 'en-PK' },
  { code: 'AED', label: 'UAE Dirham (AED)', locale: 'en-AE' },
  { code: 'GBP', label: 'British Pound (£)', locale: 'en-GB' },
  { code: 'EUR', label: 'Euro (€)', locale: 'en-IE' },
  { code: 'CAD', label: 'Canadian Dollar (C$)', locale: 'en-CA' },
  { code: 'AUD', label: 'Australian Dollar (A$)', locale: 'en-AU' },
];
