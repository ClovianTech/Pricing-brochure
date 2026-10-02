import { LayoutDashboard, Wallet, FolderKanban, Target, Users, BarChart3, PiggyBank, Settings } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Business' },
  { to: '/finance', label: 'Finance', icon: Wallet, group: 'Business' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, group: 'Business' },
  { to: '/leads', label: 'Leads & Pipeline', icon: Target, group: 'Growth' },
  { to: '/clients', label: 'Clients (CRM)', icon: Users, group: 'Growth' },
  { to: '/reports', label: 'Reports', icon: BarChart3, group: 'Growth' },
  { to: '/personal', label: 'Personal Finance', icon: PiggyBank, group: 'Personal' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'Personal' },
] as const;
