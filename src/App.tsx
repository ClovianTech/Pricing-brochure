import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FormHost } from '@/features/forms';
import { CommandPalette } from '@/features/CommandPalette';
import { FeedbackHost } from '@/components/ui/feedback';
import { SyncGate } from '@/features/SyncGate';
import Dashboard from '@/pages/Dashboard';

const Finance = lazy(() => import('@/pages/Finance'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const Leads = lazy(() => import('@/pages/Leads'));
const Clients = lazy(() => import('@/pages/Clients'));
const Reports = lazy(() => import('@/pages/Reports'));
const Personal = lazy(() => import('@/pages/Personal'));
const Settings = lazy(() => import('@/pages/Settings'));

const Loading = () => (
  <div className="space-y-4">
    {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-gradient-to-r from-white via-canvas to-white bg-[length:200%_100%] animate-shimmer ring-1 ring-line" />)}
  </div>
);

export default function App() {
  return (
    <HashRouter>
      <SyncGate>
      <AppShell>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/personal" element={<Personal />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </AppShell>
      <FormHost />
      <CommandPalette />
      </SyncGate>
      <FeedbackHost />
    </HashRouter>
  );
}
