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
npm run dev       # http://localhost:5173 — passcode "dev" (or $APP_PASSCODE)
npm run build     # static site in dist/ plus the /api function, deployed on Vercel
```

In development, `/api/data` is served by Vite and stored in `.data/workspace.json`.

## Data & sync

Data syncs across devices. The whole workspace is one JSON document in a **private Vercel Blob store**. It is read and written through `api/data.ts`, and every request needs the passcode.

- **Unlock:** open the app on any device and enter the passcode. The device remembers it until you use **Settings → Sign out of this device**.
- **Saving:** every change is saved automatically within about a second. Other open devices pick it up within 20 seconds, or straight away when you switch back to them. The badge in the top bar shows *Synced / Saving / Offline*.
- **Two devices editing at once:** changes are merged record by record. If two devices edit the same record at the same moment, the later save wins. Edits made offline sync when the connection returns.
- **First run:** while the cloud is empty, the first device chooses to start empty or upload the data in that browser.
- **Backup:** **Settings → Download backup / Restore backup** still work. A restore replaces the data on every device.

Vercel project settings it needs:

| Variable | What it is |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Added automatically when the Blob store is connected to the project |
| `APP_PASSCODE` | The unlock passcode. To change it, edit it in Vercel → Settings → Environment Variables and redeploy. Devices then ask for the new one. |

## Tech

React 18, TypeScript, Vite, Tailwind CSS, Zustand (persisted state), Recharts, and Lucide icons.
