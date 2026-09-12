import React, { useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  ArrowLeftRight, 
  MessageSquare, 
  Calendar, 
  ShieldAlert, 
  Clock, 
  ExternalLink,
  Filter,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { UserNotification, Employee } from '../types';

interface NotificationCenterProps {
  notifications: UserNotification[];
  currentEmployee: Employee;
  userRole: 'employee' | 'admin';
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onMarkOneAsRead: (id: string) => void;
  onDeleteOne: (id: string) => void;
  onNavigate: (view: string, context?: any) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  currentEmployee,
  userRole,
  onMarkAllAsRead,
  onClearAll,
  onMarkOneAsRead,
  onDeleteOne,
  onNavigate
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);

  // Filter notifications based on role and active tab:
  // For admin: sees their notifications + any notification with userId === 'ADMIN' or 'ALL'
  // For employee: sees notifications for their id or 'ALL'
  const relevantNotifications = notifications.filter(n => {
    if (userRole === 'admin') {
      return n.userId === 'ADMIN' || n.userId === currentEmployee.id || n.userId === 'ALL';
    }
    return n.userId === currentEmployee.id || n.userId === 'ALL';
  });

  const filteredNotifications = relevantNotifications.filter(n => {
    if (unreadOnly && n.read) return false;
    if (filterType === 'all') return true;
    if (filterType === 'admin') return n.type === 'admin-alert';
    if (filterType === 'roster') return n.type === 'roster-updated';
    if (filterType === 'swap') return n.type === 'swap-request' || n.type === 'swap-approved';
    if (filterType === 'message') return n.type === 'message';
    return true;
  });

  const unreadCount = relevantNotifications.filter(n => !n.read).length;

  const getNotifIcon = (type: UserNotification['type']) => {
    switch (type) {
      case 'admin-alert':
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      case 'roster-updated':
        return <Calendar className="h-4 w-4 text-teal-600" />;
      case 'swap-request':
      case 'swap-approved':
        return <ArrowLeftRight className="h-4 w-4 text-indigo-600" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-sky-600" />;
      case 'eh-alert':
        return <DollarSign className="h-4 w-4 text-emerald-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  const handleItemClick = (notif: UserNotification) => {
    onMarkOneAsRead(notif.id);
    if (notif.actionView) {
      onNavigate(notif.actionView, notif.metadata);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Alerts & Dispatch</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {userRole === 'admin' 
              ? 'Real-time alert dispatch for all roster modifications, swap approvals, and colleague messages.'
              : 'Stay notified on your roster changes, shift swap requests from peers, and team messages.'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold transition-all shadow-2xs"
            >
              <CheckCheck className="h-3.5 w-3.5 text-teal-600" />
              <span>Mark All Read</span>
            </button>
          )}

          {relevantNotifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 text-xs font-semibold transition-all"
              title="Clear all alerts"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Alerts ({relevantNotifications.length})
          </button>

          {userRole === 'admin' && (
            <button
              onClick={() => setFilterType('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                filterType === 'admin' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Admin Roster Alerts</span>
            </button>
          )}

          <button
            onClick={() => setFilterType('roster')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              filterType === 'roster' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Roster Updates</span>
          </button>

          <button
            onClick={() => setFilterType('swap')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              filterType === 'swap' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Swap Desk</span>
          </button>

          <button
            onClick={() => setFilterType('message')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              filterType === 'message' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Messages</span>
          </button>
        </div>

        {/* Toggle unread only */}
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer self-end md:self-center">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <span>Unread only</span>
        </label>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No notifications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You are all caught up! Roster changes, peer messages, and swap requests will appear here automatically.
            </p>
          </div>
        ) : (
          filteredNotifications.map(notif => {
            const isUnread = !notif.read;
            const isAdminAlert = notif.type === 'admin-alert';

            return (
              <div
                key={notif.id}
                className={`group rounded-2xl border p-4 transition-all flex items-start justify-between gap-3 shadow-2xs ${
                  isAdminAlert
                    ? isUnread ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'
                    : isUnread ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className="flex items-start gap-3 flex-1 cursor-pointer"
                  onClick={() => handleItemClick(notif)}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 mt-0.5 ${
                    isAdminAlert
                      ? 'bg-amber-100 text-amber-800'
                      : notif.type === 'roster-updated'
                      ? 'bg-teal-100 text-teal-800'
                      : notif.type === 'swap-request' || notif.type === 'swap-approved'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}>
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                      )}
                      {isAdminAlert && (
                        <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider">
                          Admin Governance
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Metadata pill details */}
                    {notif.metadata && (
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-mono flex-wrap">
                        {notif.metadata.employeeName && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            Agent: {notif.metadata.employeeName}
                          </span>
                        )}
                        {notif.metadata.date && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            Date: {notif.metadata.date}
                          </span>
                        )}
                        {notif.metadata.newShift && (
                          <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded font-bold">
                            Shift: {notif.metadata.newShift}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>

                      {notif.actionView && (
                        <span className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline">
                          <span>Open in {notif.actionView.toUpperCase()}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isUnread && (
                    <button
                      onClick={() => onMarkOneAsRead(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteOne(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
