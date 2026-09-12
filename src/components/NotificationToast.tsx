import React, { useEffect } from 'react';
import { 
  X, 
  Bell, 
  MessageSquare, 
  ArrowLeftRight, 
  Calendar, 
  ShieldAlert, 
  ExternalLink 
} from 'lucide-react';
import { UserNotification } from '../types';

interface NotificationToastProps {
  notification: UserNotification | null;
  onDismiss: () => void;
  onNavigate: (view: string, context?: any) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onNavigate
}) => {
  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'admin-alert':
        return <ShieldAlert className="h-5 w-5 text-amber-500" />;
      case 'roster-updated':
        return <Calendar className="h-5 w-5 text-teal-500" />;
      case 'swap-request':
      case 'swap-approved':
        return <ArrowLeftRight className="h-5 w-5 text-indigo-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-sky-500" />;
      default:
        return <Bell className="h-5 w-5 text-teal-400" />;
    }
  };

  const handleAction = () => {
    if (notification.actionView) {
      onNavigate(notification.actionView, notification.metadata);
    }
    onDismiss();
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 w-[calc(100vw-2rem)] max-w-sm pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900 text-white p-4 shadow-2xl backdrop-blur-md flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 flex-shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">{notification.title}</span>
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">
              Just now
            </span>

            {notification.actionView && (
              <button
                onClick={handleAction}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
              >
                <span>View Now</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
