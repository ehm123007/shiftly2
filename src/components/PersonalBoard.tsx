import React from 'react';
import { 
  Clock, 
  CalendarDays, 
  ArrowLeftRight, 
  MessageSquare, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Store,
  Megaphone,
  Coins
} from 'lucide-react';
import { Employee, DaySchedule, SwapRequest, ChatMessage, RosterChangeLog, NoticePost } from '../types';
import { SHIFT_DEFINITIONS } from '../data/defaultData';

interface PersonalBoardProps {
  employee: Employee;
  days: DaySchedule[];
  swapRequests: SwapRequest[];
  messages: ChatMessage[];
  auditLogs: RosterChangeLog[];
  notices?: NoticePost[];
  onOpenSwapModal: (dayIndex: number, defaultTab?: 'day-off' | 'timing-change' | 'eh-claim') => void;
  onNavigate: (view: string) => void;
}

export const PersonalBoard: React.FC<PersonalBoardProps> = ({
  employee,
  days,
  swapRequests,
  messages,
  auditLogs,
  notices = [],
  onOpenSwapModal,
  onNavigate
}) => {
  const workingDays = employee.schedule.filter(s => s !== 'OFF');
  const totalEH = employee.extraHours.filter(h => h >= 5).length * 5;
  const ehDaysCount = employee.extraHours.filter(h => h >= 5).length;
  const totalEHTaka = ehDaysCount * 2000;

  // Find next working shift
  const nextWorkIdx = employee.schedule.findIndex(s => s !== 'OFF');
  const nextDay = nextWorkIdx >= 0 ? days[nextWorkIdx] : null;
  const nextShift = nextWorkIdx >= 0 ? employee.schedule[nextWorkIdx] : 'Rest Day';
  const nextTiming = nextWorkIdx >= 0 ? employee.timings[nextWorkIdx] : 'None';

  // Personal swap requests
  const myRequests = swapRequests.filter(r => r.participantIds.includes(employee.id));
  const openRequestsCount = myRequests.filter(r => r.state === 'Pending').length;

  // Personal 30-day changes
  const myRecentChanges = auditLogs.filter(
    l => l.employeeId === employee.id || l.changedBy === employee.name
  ).slice(0, 3);

  // Recent messages for this employee
  const recentMessages = messages.filter(
    m => m.recipientId === employee.id || m.senderId === employee.id
  ).slice(-3).reverse();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-semibold text-teal-300 border border-teal-500/30">
                Workforce Operations Roster
              </span>
              <span className="font-mono text-xs text-slate-400">Employee ID: {employee.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {employee.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Track your upcoming scheduled shifts, exchange timings with colleagues, and review paid Extra Hours (EH) safely.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onOpenSwapModal(nextWorkIdx >= 0 ? nextWorkIdx : 0, 'timing-change')}
              className="flex items-center gap-1.5 rounded-xl bg-teal-400 px-3.5 py-2.5 text-xs font-bold text-slate-950 hover:bg-teal-300 transition-all shadow-sm"
            >
              <Clock className="h-4 w-4" />
              <span>Change Shift Timing</span>
            </button>
            <button
              onClick={() => onNavigate('market')}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 px-3.5 py-2.5 text-xs font-bold text-slate-950 transition-all shadow-sm"
            >
              <Store className="h-4 w-4" />
              <span>Shift Market</span>
            </button>
            <button
              onClick={() => onOpenSwapModal(nextWorkIdx >= 0 ? nextWorkIdx : 0, 'day-off')}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition-all"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Request Day Off</span>
            </button>
          </div>
        </div>

        {/* Regulatory Banner Notice */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-400" />
            <span>
              {employee.gender === 'female' ? (
                <><strong>Regulatory compliance active:</strong> Female shift limit strictly enforces 02:00–22:00. Night shifts are blocked.</>
              ) : (
                <><strong>General coverage active:</strong> 24/7 Day/Night/Overnight eligibility per operational guidelines.</>
              )}
            </span>
          </div>
          <span className="text-[11px] text-teal-300 font-medium">Policy verified</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Scheduled Shifts</span>
            <CalendarDays className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{workingDays.length} Shifts</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">{workingDays.length * 8.5} duty hours scheduled</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Next Shift</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
            {nextDay ? `${nextDay.dayName} ${nextDay.dayNumber}` : 'None'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">
            {nextShift} ({nextTiming})
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Extra Duty (EH) Pay</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600">
            {ehDaysCount > 0 ? `৳${totalEHTaka.toLocaleString()} TK` : '0 EH Days'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {ehDaysCount > 0 
              ? `${ehDaysCount} day${ehDaysCount > 1 ? 's' : ''} (${totalEH}h total • 2,000 TK/day)`
              : 'Full day EH = 5 hours (2,000 TK)'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Swap Requests</span>
            <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{openRequestsCount} Open</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Awaiting colleague review</p>
        </div>
      </div>

      {/* Week at a glance */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Week at a Glance</h2>
            <p className="text-xs text-slate-500">14 Sep – 20 Sep 2026 (Published Workforce Roster)</p>
          </div>
          <button
            onClick={() => onNavigate('roster')}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <span>Open Full Roster</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 overflow-x-auto pb-1">
          {days.map((day, idx) => {
            const shift = employee.schedule[idx];
            const def = SHIFT_DEFINITIONS[shift] || SHIFT_DEFINITIONS.OFF;
            const timing = employee.timings[idx] || def.time;
            const eh = employee.extraHours[idx] || 0;
            const isOff = shift === 'OFF';

            return (
              <div
                key={day.date}
                className={`min-w-[95px] flex flex-col justify-between rounded-xl p-3 border transition-all ${
                  isOff ? 'bg-slate-50 border-slate-200' : `${def.colorBg} border`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{day.dayName}</span>
                    <span className="text-xs font-bold text-slate-700">{day.dayNumber}</span>
                  </div>

                  <p className="text-xs font-bold leading-tight mt-1">{shift}</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">{timing}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400">Roster</span>

                  {!isOff ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenSwapModal(idx, 'timing-change')}
                        className="text-[10px] font-bold text-indigo-700 hover:underline"
                        title="Change timing or swap"
                      >
                        Shift
                      </button>
                      <span className="text-[10px] text-slate-300">·</span>
                      <button
                        onClick={() => onOpenSwapModal(idx, 'day-off')}
                        className="text-[10px] font-bold text-teal-700 hover:underline"
                        title="Request day off"
                      >
                        Day Off
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenSwapModal(idx, 'timing-change')}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:underline"
                      title="Pick up or assign shift"
                    >
                      Pick Shift
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Notice Board Broadcasts */}
      {notices.length > 0 && (
        <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50/50 via-white to-amber-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">Official Notice Board & Guidelines</h3>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
              Admin Directives ({notices.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notices.slice(0, 2).map(notice => (
              <div key={notice.id} className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    notice.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {notice.priority === 'high' ? 'High Priority' : 'Notice'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{notice.date}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{notice.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{notice.content}</p>
                <div className="pt-1 text-[10px] text-slate-400 font-medium">
                  Audience: <span className="text-slate-600 font-semibold">{notice.targetAudience}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Columns: Recent Messages & 30-Day Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Messages Preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Peer Shift Coordination</h3>
            </div>
            <button
              onClick={() => onNavigate('messages')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Open Inbox →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentMessages.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No recent messages. Start a conversation with a teammate.</p>
            ) : (
              recentMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => onNavigate('messages')}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 cursor-pointer transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex-shrink-0">
                    {msg.senderInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{msg.senderName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">{msg.text}</p>
                    {msg.shiftAttachment && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        Shift attached: {msg.shiftAttachment.shift} ({msg.shiftAttachment.date})
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 30-Day Activity History Preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Your Recent Roster Updates</h3>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Full 30-Day Log →
            </button>
          </div>

          <div className="space-y-2.5">
            {myRecentChanges.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No shift changes recorded in the past 30 days.</p>
            ) : (
              myRecentChanges.map(log => (
                <div key={log.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{log.changeType}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Date: <strong className="text-slate-800">{log.date}</strong> • {log.previousShift} → <strong className="text-emerald-700">{log.newShift}</strong>
                  </p>
                  {log.reason && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">"{log.reason}"</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
