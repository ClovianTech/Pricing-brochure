import type { Client, CompanyId, Lead, LeadStage, PersonalEntry, Project, Settings, Transaction, Budget, PayMethod } from '@/lib/types';
import type { DataState } from './store';
import { addDays, addMonths, startOfMonth, toISODate } from '@/lib/utils';

/** Deterministic demo data relative to today, so the dashboard always feels "live". */
export function buildSeed(settings: Settings): DataState {
  let seed = 42;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const between = (lo: number, hi: number, step = 500) => Math.round((lo + rnd() * (hi - lo)) / step) * step;
  let n = 0;
  const id = (p: string) => `${p}${(++n).toString(36)}`;
  const now = new Date();
  const d = (daysAgo: number) => toISODate(addDays(now, -daysAgo));
  const iso = (daysAgo: number, h = 11) => { const x = addDays(now, -daysAgo); x.setHours(h, Math.floor(rnd() * 59)); return x.toISOString(); };

  /* ---------------- Clients ---------------- */
  const clientDefs: [CompanyId, string, string, string, string][] = [
    ['clovian', 'Nimbus Logistics', 'Arjun Mehta', 'Logistics', 'Mumbai'],
    ['clovian', 'Verde Health', 'Sara Khan', 'Healthcare', 'Dubai'],
    ['clovian', 'Quantica Labs', 'Daniel Ross', 'Fintech', 'London'],
    ['clovian', 'UrbanNest Realty', 'Priya Nair', 'Real Estate', 'Bengaluru'],
    ['clovian', 'Orbit Education', 'Rahul Verma', 'EdTech', 'Delhi'],
    ['clovian', 'Kraft & Co.', 'Emily Clarke', 'Retail', 'Toronto'],
    ['blackx', 'Luxe Aura Salon', 'Neha Kapoor', 'Beauty', 'Mumbai'],
    ['blackx', 'FitForge Gyms', 'Vikram Singh', 'Fitness', 'Pune'],
    ['blackx', 'Brew Theory Café', 'Ananya Rao', 'F&B', 'Bengaluru'],
    ['blackx', 'Solace Interiors', 'Kabir Malhotra', 'Interior Design', 'Delhi'],
    ['blackx', 'Zenith Motors', 'Imran Sheikh', 'Automotive', 'Hyderabad'],
    ['blackx', 'Petal & Thread', 'Meera Joshi', 'Fashion', 'Jaipur'],
  ];
  const clients: Client[] = clientDefs.map(([company, name, contactName, industry, location], i) => ({
    id: id('c'), company, name, contactName, industry, location,
    email: `${contactName.split(' ')[0].toLowerCase()}@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    phone: `+91 98${String(10000000 + i * 7314529).slice(0, 8)}`,
    status: i % 5 === 0 ? 'vip' : i === 5 ? 'inactive' : 'active',
    createdAt: d(380 - i * 25), notes: '',
  }));
  const cl = (company: CompanyId, i: number) => clients.filter((c) => c.company === company)[i].id;

  /* ---------------- Projects ---------------- */
  type PDef = [CompanyId, string, number, string, 'one-time' | 'monthly', number, number, number | null, Project['status'], number, Project['priority'], number];
  // company, name, clientIdx, category, billing, amount, startDaysAgo, endDaysAgo(neg=future), status, progress, priority, estCost
  const pdefs: PDef[] = [
    ['clovian', 'Fleet Tracking Platform', 0, 'Custom Software', 'one-time', 850000, 140, -40, 'active', 68, 'high', 300000],
    ['clovian', 'Patient Portal & App', 1, 'Mobile App', 'one-time', 620000, 210, 30, 'completed', 100, 'medium', 210000],
    ['clovian', 'Trading Dashboard Maintenance', 2, 'Maintenance & Support', 'monthly', 85000, 300, null, 'active', 100, 'medium', 18000],
    ['clovian', 'Property Listing Website', 3, 'Web Development', 'one-time', 240000, 60, -20, 'active', 45, 'medium', 90000],
    ['clovian', 'LMS SaaS Build', 4, 'SaaS Product', 'one-time', 1200000, 95, -120, 'active', 30, 'high', 420000],
    ['clovian', 'Cloud Hosting & DevOps', 0, 'Cloud & DevOps', 'monthly', 48000, 260, null, 'active', 100, 'low', 14000],
    ['clovian', 'Store Revamp', 5, 'E-commerce', 'one-time', 310000, 330, 240, 'completed', 100, 'low', 150000],
    ['clovian', 'AI Support Chatbot', 2, 'AI / Automation', 'one-time', 420000, 10, -75, 'planning', 5, 'high', 160000],
    ['blackx', 'Social Media Retainer', 0, 'Social Media Management', 'monthly', 65000, 280, null, 'active', 100, 'medium', 16000],
    ['blackx', 'Meta & Google Ads', 1, 'Performance Ads', 'monthly', 80000, 200, null, 'active', 100, 'high', 18000],
    ['blackx', 'Brand Identity Refresh', 2, 'Branding', 'one-time', 180000, 75, 15, 'completed', 100, 'medium', 60000],
    ['blackx', 'Showroom Launch Campaign', 4, 'Video Production', 'one-time', 260000, 35, -25, 'active', 55, 'high', 140000],
    ['blackx', 'SEO Growth Program', 3, 'SEO', 'monthly', 45000, 150, null, 'active', 100, 'medium', 8000],
    ['blackx', 'Festive Influencer Drive', 5, 'Influencer Marketing', 'one-time', 150000, 20, -30, 'on-hold', 25, 'medium', 90000],
    ['blackx', 'Content Studio Retainer', 2, 'Content Production', 'monthly', 50000, 120, null, 'active', 100, 'low', 12000],
  ];
  const comments = ['Kickoff call done — scope signed off.', 'Client requested two extra revisions on the homepage.', 'Milestone 1 delivered and approved.', 'Waiting on content & assets from client.', 'Payment reminder sent for pending invoice.', 'Performance up 32% MoM — client happy.'];
  const kinds: Project['comments'][number]['kind'][] = ['milestone', 'issue', 'milestone', 'issue', 'update', 'update'];
  const projects: Project[] = pdefs.map(([company, name, ci, category, billing, amount, s, e, status, progress, priority, est]) => ({
    id: id('p'), company, name, clientId: cl(company, ci), category, billing, amount,
    startDate: d(s), endDate: e === null ? undefined : d(e), status, progress, priority, estimatedCost: est,
    description: `${category} engagement for ${clients.find((c) => c.id === cl(company, ci))!.name}.`,
    tags: billing === 'monthly' ? ['retainer'] : [],
    comments: [0, 1, 2].map((k) => { const j = Math.floor(rnd() * comments.length); return { id: id('m'), at: iso(Math.max(1, Math.floor(s * (1 - k / 3)))), kind: kinds[j], text: comments[j] }; })
      .sort((a, b) => b.at.localeCompare(a.at)),
  }));

  /* ---------------- Transactions ---------------- */
  const transactions: Transaction[] = [];
  const methods: PayMethod[] = ['Bank Transfer', 'UPI', 'Card', 'Stripe', 'PayPal'];
  const tx = (t: Omit<Transaction, 'id' | 'tags' | 'method' | 'status'> & Partial<Transaction>) =>
    transactions.push({ id: id('t'), tags: [], method: pick(methods), status: 'paid', ...t });

  for (const p of projects) {
    const startAgo = pdefs[projects.indexOf(p)][6];
    if (p.billing === 'monthly') {
      for (let m = 0; m * 30 <= startAgo; m++) {
        const ago = startAgo - m * 30;
        tx({ company: p.company, type: 'income', amount: p.amount, date: d(ago), category: 'Retainer', description: `${p.name} — monthly fee`, clientId: p.clientId, projectId: p.id, method: 'Bank Transfer', status: ago < 2 ? 'pending' : 'paid' });
        tx({ company: p.company, type: 'expense', amount: between(p.estimatedCost * 0.7, p.estimatedCost * 1.2), date: d(Math.max(0, ago - 3)), category: p.company === 'blackx' && p.category === 'Performance Ads' ? 'Ad Spend' : 'Freelancers', description: `${p.name} — delivery cost`, projectId: p.id });
      }
    } else if (p.status !== 'planning') {
      tx({ company: p.company, type: 'income', amount: Math.round(p.amount * 0.4), date: d(startAgo - 2), category: 'Advance', description: `${p.name} — 40% advance`, clientId: p.clientId, projectId: p.id });
      if (p.progress >= 50) tx({ company: p.company, type: 'income', amount: Math.round(p.amount * 0.3), date: d(Math.round(startAgo * 0.4)), category: 'Project Payment', description: `${p.name} — milestone 2`, clientId: p.clientId, projectId: p.id });
      if (p.status === 'completed') tx({ company: p.company, type: 'income', amount: Math.round(p.amount * 0.3), date: d(Math.max(1, (pdefs[projects.indexOf(p)][7] ?? 0) - 5)), category: 'Project Payment', description: `${p.name} — final payment`, clientId: p.clientId, projectId: p.id, status: p.name.startsWith('Brand') ? 'overdue' : 'paid' });
      const parts = p.status === 'completed' ? 4 : Math.max(1, Math.round((p.progress / 100) * 4));
      for (let k = 0; k < parts; k++) {
        tx({ company: p.company, type: 'expense', amount: between((p.estimatedCost / 4) * 0.8, (p.estimatedCost / 4) * 1.15), date: d(Math.max(0, Math.round(startAgo - (k + 0.5) * (startAgo / (parts + 0.5))))), category: p.category.includes('Video') || p.category.includes('Influencer') ? 'Freelancers' : pick(['Freelancers', 'Software & Tools', 'Freelancers']), description: `${p.name} — ${pick(['dev sprint', 'design work', 'production cost', 'third-party API', 'contractor payout'])}`, projectId: p.id });
      }
    } else {
      tx({ company: p.company, type: 'income', amount: Math.round(p.amount * 0.25), date: d(2), category: 'Advance', description: `${p.name} — booking advance`, clientId: p.clientId, projectId: p.id, status: 'pending' });
    }
  }
  // operating expenses, 12 months (future-dated entries in the current month are skipped)
  for (let m = 0; m < 12; m++) {
    const first = startOfMonth(addMonths(now, -m));
    const at = (off: number, f: (date: string) => void) => { const x = addDays(first, off); if (x <= now) f(toISODate(x)); };
    at(27, (date) => tx({ company: 'clovian', type: 'expense', amount: 140000 + (m < 6 ? 25000 : 0), date, category: 'Salaries', description: 'Team payroll', method: 'Bank Transfer' }));
    at(4, (date) => tx({ company: 'clovian', type: 'expense', amount: 35000, date, category: 'Office & Rent', description: 'Office rent', method: 'Bank Transfer' }));
    at(9, (date) => tx({ company: 'clovian', type: 'expense', amount: between(12000, 18000), date, category: 'Hosting & Cloud', description: 'AWS / Vercel / domains', method: 'Card' }));
    at(11, (date) => tx({ company: 'clovian', type: 'expense', amount: between(8000, 11000), date, category: 'Software & Tools', description: 'Figma, GitHub, Notion, Slack', method: 'Card' }));
    at(14, (date) => tx({ company: 'clovian', type: 'income', amount: between(30000, 75000), date, category: 'Consulting', description: 'Tech consulting hours', method: 'Bank Transfer' }));
    at(27, (date) => tx({ company: 'blackx', type: 'expense', amount: 90000 + (m < 4 ? 15000 : 0), date, category: 'Salaries', description: 'Team payroll', method: 'Bank Transfer' }));
    at(4, (date) => tx({ company: 'blackx', type: 'expense', amount: 22000, date, category: 'Office & Rent', description: 'Studio rent', method: 'Bank Transfer' }));
    at(10, (date) => tx({ company: 'blackx', type: 'expense', amount: between(6000, 9000), date, category: 'Software & Tools', description: 'Adobe CC, Canva, Meta Business tools', method: 'Card' }));
    at(16, (date) => tx({ company: 'blackx', type: 'expense', amount: between(8000, 16000), date, category: 'Marketing', description: 'Own brand promotion', method: 'Card' }));
    if (m % 3 === 1) at(18, (date) => tx({ company: m % 2 ? 'clovian' : 'blackx', type: 'expense', amount: between(15000, 45000), date, category: pick(['Equipment', 'Travel', 'Taxes & Fees']), description: pick(['New laptop', 'Client visit travel', 'GST & compliance', 'Camera gear']) }));
  }

  /* ---------------- Leads ---------------- */
  type LDef = [CompanyId, string, string, string, string, number, 'one-time' | 'monthly', LeadStage, Lead['priority'], number, number | null];
  // company, name, business, source, service, value, billing, stage, priority, createdDaysAgo, followUpDaysFromNow
  const ldefs: LDef[] = [
    ['clovian', 'Rohan Gupta', 'Swift Couriers', 'Referral', 'Custom Software', 950000, 'one-time', 'negotiation', 'high', 24, 1],
    ['clovian', 'Aisha Patel', 'BloomKart', 'Website', 'E-commerce', 380000, 'one-time', 'proposal', 'high', 15, -2],
    ['clovian', 'Tom Becker', 'Nordic Pay', 'LinkedIn', 'SaaS Product', 1500000, 'one-time', 'qualified', 'medium', 12, 3],
    ['clovian', 'Kavya Iyer', 'CareConnect', 'Upwork', 'Mobile App', 520000, 'one-time', 'contacted', 'medium', 6, 0],
    ['clovian', 'Farhan Ali', 'Tasty Bites Chain', 'Cold Outreach', 'Web Development', 160000, 'one-time', 'new', 'low', 2, 2],
    ['clovian', 'Lena Schmidt', 'GreenGrid Energy', 'Event', 'AI / Automation', 680000, 'one-time', 'new', 'medium', 1, 1],
    ['clovian', 'Manish Shah', 'Shah Textiles', 'Referral', 'Maintenance & Support', 30000, 'monthly', 'proposal', 'medium', 20, -5],
    ['clovian', 'Chris Young', 'PixelForge', 'Website', 'UI/UX Design', 140000, 'one-time', 'lost', 'low', 45, null],
    ['clovian', 'Divya Menon', 'MedLine Labs', 'LinkedIn', 'Custom Software', 720000, 'one-time', 'won', 'high', 60, null],
    ['blackx', 'Simran Kaur', 'Glow Up Clinic', 'Instagram', 'Social Media Management', 45000, 'monthly', 'negotiation', 'high', 18, 0],
    ['blackx', 'Aditya Rao', 'Peak Realty', 'Facebook Ads', 'Performance Ads', 80000, 'monthly', 'proposal', 'high', 10, 2],
    ['blackx', 'Zoya Merchant', 'Velvet Bakes', 'Instagram', 'Branding', 120000, 'one-time', 'qualified', 'medium', 8, -1],
    ['blackx', 'Harsh Vardhan', 'Gearhead Garage', 'Google Ads', 'SEO', 35000, 'monthly', 'contacted', 'medium', 5, 1],
    ['blackx', 'Isha Bansal', 'Mode Atelier', 'Referral', 'Influencer Marketing', 200000, 'one-time', 'new', 'medium', 1, 1],
    ['blackx', 'Yusuf Khan', 'Khan Sweets', 'WhatsApp', 'Social Media Management', 30000, 'monthly', 'new', 'low', 3, 4],
    ['blackx', 'Tanya Arora', 'Bliss Weddings', 'Website', 'Video Production', 160000, 'one-time', 'lost', 'medium', 40, null],
    ['blackx', 'Kunal Desai', 'UrbanFit Wear', 'LinkedIn', 'Performance Ads', 60000, 'monthly', 'won', 'high', 50, null],
  ];
  const leads: Lead[] = ldefs.map(([company, name, businessName, source, service, value, billing, stage, priority, created, fu]) => ({
    id: id('l'), company, name, businessName, source, service, value, billing, stage, priority,
    email: `${name.split(' ')[0].toLowerCase()}@${businessName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    phone: `+91 9${String(800000000 + Math.floor(rnd() * 99999999))}`,
    createdAt: d(created), nextFollowUp: fu === null ? undefined : d(-fu), expectedClose: stage === 'won' || stage === 'lost' ? undefined : d(-(10 + Math.floor(rnd() * 40))),
    tags: priority === 'high' ? ['hot'] : [], notes: `Interested in ${service.toLowerCase()}.`,
    lostReason: stage === 'lost' ? pick(['Budget too low', 'Went with competitor', 'No response']) : undefined,
    activities: [
      ...(stage !== 'new' ? [{ id: id('a'), at: iso(Math.max(0, created - 3)), type: pick(['call', 'email', 'whatsapp', 'meeting'] as const), text: pick(['Discovery call — strong fit, wants timeline.', 'Sent portfolio and case studies.', 'Shared pricing deck on WhatsApp.', 'Met at office, discussed scope.']) }] : []),
      { id: id('a'), at: iso(created), type: 'note' as const, text: `Lead captured via ${source}.` },
    ],
  }));

  /* ---------------- Personal ---------------- */
  const personal: PersonalEntry[] = [];
  const pe = (e: Omit<PersonalEntry, 'id' | 'tags' | 'recurring' | 'essential'> & Partial<PersonalEntry>) =>
    personal.push({ id: id('e'), tags: [], recurring: false, essential: true, ...e });
  for (let m = 0; m < 12; m++) {
    const first = startOfMonth(addMonths(now, -m));
    const dd = (off: number) => { const x = addDays(first, off); return x > now ? null : toISODate(x); };
    const at = (off: number, f: (date: string) => void) => { const v = dd(off); if (v) f(v); };
    at(0, (date) => pe({ type: 'income', amount: 250000, date, category: 'Salary / Draw', account: 'Bank — Savings', description: "Founder's draw — Clovian Tech", recurring: true }));
    at(2, (date) => pe({ type: 'income', amount: 120000, date, category: 'Business Profit', account: 'Bank — Savings', description: 'Profit share — Black X Media', recurring: true }));
    at(1, (date) => pe({ type: 'expense', amount: 55000, date, category: 'Rent / EMI', account: 'Bank — Savings', description: 'Home EMI', recurring: true }));
    at(5, (date) => pe({ type: 'investment', amount: 40000, date, category: 'Mutual Funds', account: 'Bank — Savings', description: 'Monthly SIP', recurring: true }));
    at(5, (date) => pe({ type: 'investment', amount: between(5000, 25000, 1000), date, category: pick(['Stocks', 'Crypto', 'Gold']), account: 'Bank — Savings', description: 'Market buy' }));
    at(6, (date) => pe({ type: 'saving', amount: 20000, date, category: 'Emergency Fund', account: 'Bank — Savings', description: 'Auto-transfer to emergency fund', recurring: true }));
    at(3, (date) => pe({ type: 'expense', amount: between(4500, 7500, 100), date, category: 'Utilities', account: 'UPI Wallet', description: 'Electricity, internet & mobile', recurring: true }));
    at(9, (date) => pe({ type: 'expense', amount: 1999, date, category: 'Subscriptions', account: 'Credit Card', description: 'Netflix + Spotify + iCloud', recurring: true, essential: false }));
    at(10, (date) => pe({ type: 'expense', amount: 3500, date, category: 'Fitness', account: 'Credit Card', description: 'Gym membership', recurring: true, essential: false }));
    at(14, (date) => pe({ type: 'expense', amount: 8000, date, category: 'Insurance', account: 'Bank — Savings', description: 'Health + term insurance', recurring: true }));
    for (let w = 0; w < 4; w++) {
      at(w * 7 + 2, (date) => pe({ type: 'expense', amount: between(2500, 5200, 50), date, category: 'Groceries', account: pick(['UPI Wallet', 'Credit Card']), description: pick(['BigBasket order', 'Weekly groceries', 'Supermarket run']) }));
      at(w * 7 + 5, (date) => pe({ type: 'expense', amount: between(900, 4200, 50), date, category: 'Dining Out', account: 'Credit Card', description: pick(['Dinner with family', 'Swiggy order', 'Coffee meeting', 'Weekend brunch']), essential: false }));
      at(w * 7 + 4, (date) => pe({ type: 'expense', amount: between(1200, 2600, 50), date, category: pick(['Fuel', 'Transport']), account: 'Credit Card', description: pick(['Petrol', 'Uber rides', 'Car service']) }));
    }
    at(17, (date) => pe({ type: 'expense', amount: between(3000, 18000, 100), date, category: pick(['Shopping', 'Entertainment', 'Personal Care', 'Gifts & Donations', 'Health']), account: 'Credit Card', description: pick(['Amazon order', 'Movie & concert', 'Salon & grooming', 'Birthday gift', 'Doctor visit']), essential: false }));
    if (m % 4 === 1) at(20, (date) => pe({ type: 'expense', amount: between(25000, 70000, 1000), date, category: 'Travel', account: 'Credit Card', description: pick(['Goa weekend trip', 'Flight tickets', 'Family vacation']), essential: false }));
    if (m % 3 === 0) at(25, (date) => pe({ type: 'income', amount: between(3000, 9000, 100), date, category: 'Dividends', account: 'Bank — Savings', description: 'Quarterly dividends' }));
  }
  const budgets: Budget[] = [
    { category: 'Groceries', limit: 18000 }, { category: 'Dining Out', limit: 9000 }, { category: 'Shopping', limit: 10000 },
    { category: 'Fuel', limit: 6000 }, { category: 'Entertainment', limit: 5000 }, { category: 'Travel', limit: 30000 },
  ];

  const sortD = <T extends { date: string }>(a: T[]) => a.sort((x, y) => y.date.localeCompare(x.date));
  return { transactions: sortD(transactions), clients, projects, leads, personal: sortD(personal), budgets, settings };
}
