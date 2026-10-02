# Clovian Command Center

One elegant, light-themed command center for running **Clovian Tech** and **Black X Media** finances, projects, leads, clients, and your **personal finance**. It works on desktop and mobile.

## Features

| Area | What you get |
|---|---|
| **Workspace toggle** | Switch between Clovian Tech, Black X Media, or **All** (consolidated) from the top bar. Each workspace gets its own accent theme. |
| **Dashboard** | Net profit hero with a 12-month trend, MRR/ARR, receivables, weighted pipeline, cash-flow chart, revenue by service, active projects, follow-ups, and a mini funnel. |
| **Smart insights** | Generated automatically from your data: overdue invoices, follow-ups due, spending spikes, over-budget or late projects, MRR, hot leads. |
| **Finance** | Income and expense ledger linked to projects and clients. Smart views (unpaid, overdue, retainers, top 10%, unlinked) and filters (date presets and custom range, status, category, project, client, amount, search). Click a status to mark it paid, export to CSV, and see analytics. |
| **Projects** | Category, **one-time vs monthly recurring**, value, cost budget, start/end, **duration**, progress, priority. Each project tracks profit, margin, received, outstanding, and budget burn. Grid, Kanban (drag to change status), and table layouts. |
| **Project detail** | Timeline and duration, time-vs-progress risk, cost budget, record payments or expenses, expenses by category, and a comment timeline (notes / updates / issues / milestones). |
| **Leads & pipeline** | Kanban with drag-and-drop and a **0–100 smart lead score** (Hot/Warm/Cold). Next-best-action tips, quick follow-up scheduling, call/WhatsApp/email buttons, an activity log, and **Won → auto-create client + project**. Lead-source analytics. |
| **Clients (CRM)** | Lifetime value, outstanding, MRR, profit, projects, and payment history for each client. |
| **Reports** | Company comparison, monthly profit/loss chart, P&L statement (CSV export), expense breakdown, recurring vs one-time revenue mix, and the most profitable projects. |
| **Personal finance** | Income, expenses, investments, and savings across accounts. Needs-vs-wants split, smart views (wants, fixed/recurring, big spends, weekend, investments, over-budget), and filters for everything. Group by day or category, budgets with pacing, and a "money coach". |
| **Everywhere** | ⌘K / Ctrl+K command palette (search and quick actions), a quick-add button, bottom navigation and bottom-sheet forms on mobile, and backup/restore as JSON. |

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/ (works on Vercel, Netlify, GitHub Pages)
```

## Data

The app is **local-first**: all data is stored in your browser (localStorage), and nothing is sent to a server. It loads demo data the first time so you can explore. Go to **Settings → Clear all data** to start fresh, and use **Download backup / Restore backup** to move data between devices. You can also set your currency there (₹ INR by default; also $, Rs, AED, £, €, C$, A$).

## Tech

React 18, TypeScript, Vite, Tailwind CSS, Zustand (persisted state), Recharts, and Lucide icons.
