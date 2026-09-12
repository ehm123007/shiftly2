import React, { useState } from 'react';
import { 
  Bell, 
  MessageSquare, 
  Shield, 
  LogOut, 
  Menu, 
  CheckCircle2, 
  Clock, 
  UserCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Employee, UserNotification } from '../types';

interface NavbarProps {
  currentEmployee: Employee;
  userRole: 'employee' | 'admin';
  unreadNotifsCount: number;
  unreadMessagesCount: number;
  notifications: UserNotification[];
  onOpenMobileMenu: () => void;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onMarkNotificationsRead: () => void;
  onToggleRole: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentEmployee,
  userRole,
  unreadNotifsCount,
  unreadMessagesCount,
  notifications,
  onOpenMobileMenu,
  onNavigate,
  onLogout,
  onMarkNotificationsRead,
  onToggleRole
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left branding & mobile menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-teal-400 font-bold text-base shadow-sm">
            <span className="tracking-tighter font-mono">SH</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">Shiftly</span>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                Live Roster
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 font-medium">Workforce Management & Shift Exchange</p>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Messages shortcut */}
        <button
          onClick={() => onNavigate('messages')}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Peer Messages & Coordination"
        >
          <MessageSquare className="h-4 w-4" />
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        {/* Notifications dropdown toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              if (!showNotifMenu && unreadNotifsCount > 0) {
                onMarkNotificationsRead();
              }
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <>
              {/* Backdrop to prevent click-through and close cleanly */}
              <div 
                className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px] sm:bg-transparent"
                onClick={() => setShowNotifMenu(false)} 
              />
              
              <div 
                id="navbar-notification-popup"
                className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                    {unreadNotifsCount > 0 && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.2 text-[10px] font-bold text-rose-700">
                        {unreadNotifsCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadNotifsCount > 0 && (
                      <button
                        onClick={onMarkNotificationsRead}
                        className="text-[11px] font-semibold text-teal-600 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifMenu(false)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <p className="font-semibold">No notifications</p>
                      <p className="text-[10px] mt-0.5">Roster modifications & messages will appear here</p>
                    </div>
                  ) : (
                    notifications.slice(0, 7).map(notif => (
                      <div
                        key={notif.id}
                        className={`flex flex-col gap-1 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          notif.read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/70 hover:bg-indigo-50'
                        }`}
                        onClick={() => {
                          if (notif.actionView) onNavigate(notif.actionView);
                          setShowNotifMenu(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                            {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>}
                            <span className="truncate">{notif.title}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 break-words">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-100 px-2 pt-2 flex items-center justify-between">
                  <button
                    onClick={() => {
                      onNavigate('notifications');
                      setShowNotifMenu(false);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 py-1"
                  >
                    Open Notification Center ({notifications.length}) →
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('history');
                      setShowNotifMenu(false);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 py-1"
                  >
                    30-Day Activity
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Role Switcher (for testing convenience) */}
        <button
          onClick={onToggleRole}
          className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-all ${
            userRole === 'admin'
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title="Switch view between Employee and Admin portal"
        >
          <Shield className="h-3.5 w-3.5 text-slate-600" />
          <span>{userRole === 'admin' ? 'Admin Portal' : 'Employee View'}</span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
            {currentEmployee.initials}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">{currentEmployee.name}</p>
            <p className="text-[10px] text-slate-500 font-mono">{currentEmployee.id}</p>
          </div>

          <button
            onClick={onLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
