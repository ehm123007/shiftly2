import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  ArrowLeftRight, 
  MessageSquare, 
  History, 
  Users, 
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  Building2,
  Bell,
  X,
  Store
} from 'lucide-react';
import { Employee } from '../types';

interface SidebarProps {
  activeView: string;
  userRole: 'employee' | 'admin';
  currentEmployee: Employee;
  pendingRequestsCount: number;
  unreadMessagesCount: number;
  unreadNotifsCount?: number;
  totalChangesCount: number;
  openMarketPostsCount?: number;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  userRole,
  currentEmployee,
  pendingRequestsCount,
  unreadMessagesCount,
  unreadNotifsCount = 0,
  totalChangesCount,
  openMarketPostsCount,
  mobileMenuOpen,
  onCloseMobileMenu,
  onNavigate
}) => {
  const navItems = [
    { id: 'board', label: 'Personal Board', icon: LayoutDashboard },
    { id: 'roster', label: 'My Roster', icon: CalendarDays },
    { 
      id: 'market', 
      label: 'Shift Market', 
      icon: Store, 
      badge: openMarketPostsCount && openMarketPostsCount > 0 ? openMarketPostsCount : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    { 
      id: 'swaps', 
      label: 'Swap Desk', 
      icon: ArrowLeftRight, 
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { 
      id: 'messages', 
      label: 'Messages & Chat', 
      icon: MessageSquare, 
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: Bell, 
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-800'
    },
    { id: 'history', label: '30-Day Activity', icon: History },
    { id: 'team', label: 'Team Coverage', icon: Users },
  ];

  if (userRole === 'admin') {
    navItems.push({
      id: 'admin',
      label: 'Roster Admin',
      icon: SlidersHorizontal,
      badge: totalChangesCount > 0 ? totalChangesCount : undefined,
      badgeColor: 'bg-teal-100 text-teal-800'
    });
  }

  const handleSelect = (viewId: string) => {
    onNavigate(viewId);
    onCloseMobileMenu();
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobileMenu}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400 text-slate-950 font-bold text-sm">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight">Shiftly</span>
              <span className="text-xs text-teal-400 font-mono ml-1">HQ</span>
            </div>
          </div>

          <button
            onClick={onCloseMobileMenu}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace Tag */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 p-2 text-xs border border-slate-700/50">
            <Building2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white truncate text-[11px]">Operations Hub</p>
              <p className="text-[10px] text-slate-400 truncate">Workforce & Service Delivery</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
          <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Workspace Navigation
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${item.badgeColor || 'bg-slate-700 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Operational Policies footer pill */}
        <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px]">
          <div className="flex items-center gap-1.5 text-teal-400 font-semibold mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Policy Guard Active</span>
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            {currentEmployee.gender === 'female'
              ? 'Female limit enforced: Max 22:00. Night/Overnight restricted.'
              : '24/7 Available (Day/Night/Overnight allowed per labor rules).'}
          </p>
        </div>

        {/* User Card */}
        <div className="border-t border-slate-800 p-3 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-slate-950 font-bold text-xs">
              {currentEmployee.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentEmployee.name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="font-mono">{currentEmployee.id}</span>
                <span>•</span>
                <span className="capitalize">{currentEmployee.gender}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
