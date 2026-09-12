import React from 'react';
import { 
  Clock, 
  Calendar, 
  ArrowLeftRight, 
  Lock, 
  AlertTriangle, 
  PlusCircle, 
  Sparkles, 
  Info,
  ShieldCheck,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Employee, DaySchedule, ShiftCategory } from '../types';
import { SHIFT_DEFINITIONS } from '../data/defaultData';
import { isShiftProtected } from '../utils/rosterEngine';

interface RosterViewProps {
  employee: Employee;
  days: DaySchedule[];
  onOpenSwapModal: (dayIndex: number, defaultTab: 'day-off' | 'timing-change' | 'eh-claim') => void;
}

export const RosterView: React.FC<RosterViewProps> = ({
  employee,
  days,
  onOpenSwapModal
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Official Schedule</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700">
              Week 38 (14–20 Sep 2026)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Workforce Roster
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your weekly shift assignments. Choose <strong>Change Timing</strong>, <strong>Take Day Off</strong>, or <strong>Manage EH (Extra Hours)</strong>.
          </p>
        </div>

        {/* Regulatory summary badge */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            employee.gender === 'female' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
          }`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800">
              {employee.gender === 'female' ? 'Female Shift Limits Active' : 'Unrestricted Shift Access'}
            </p>
            <p className="text-[11px] text-slate-500">
              {employee.gender === 'female' ? 'Highest limit 02:00–22:00. Night shift protected.' : 'Eligible for all 24/7 shifts.'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Shift Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
        {days.map((day, idx) => {
          const shift = employee.schedule[idx];
          const def = SHIFT_DEFINITIONS[shift] || SHIFT_DEFINITIONS.OFF;
          const timing = employee.timings[idx] || def.time;
          const eh = (employee.extraHours[idx] || 0) >= 5 ? 5 : 0;
          const isOff = shift === 'OFF';
          const isProtected = isShiftProtected(shift);

          return (
            <div
              key={day.date}
              className={`flex flex-col justify-between rounded-2xl p-4 border transition-all shadow-xs ${
                isOff
                  ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                  : `${def.colorBg} border`
              }`}
            >
              {/* Header: Day & Date */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-black/5 mb-3">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {day.dayName}
                    </span>
                    <span className="text-lg font-extrabold text-slate-900">
                      {day.dayNumber} {day.month}
                    </span>
                  </div>

                  {isProtected ? (
                    <span 
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700"
                      title="Parental / Maternity leave is non-exchangeable per bank labor policy."
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  ) : eh > 0 ? (
                    <span className="flex items-center gap-0.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950 shadow-xs">
                      <DollarSign className="h-2.5 w-2.5" />
                      <span>EH</span>
                    </span>
                  ) : null}
                </div>

                {/* Shift Category & Exact Timing */}
                <div className="my-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 leading-snug">
                      {shift}
                    </span>
                  </div>

                  <p className="text-xs font-mono font-medium text-slate-700 mt-1">
                    {timing}
                  </p>

                  {/* EH Info line */}
                  {eh > 0 && (
                    <div className="mt-2 rounded-lg bg-amber-100/70 p-1.5 text-[11px] text-amber-900 font-medium">
                      <strong>EH Day:</strong> eligible for the separate EH marketplace
                    </div>
                  )}

                  {/* Protected leave info */}
                  {isProtected && (
                    <div className="mt-2 rounded-lg bg-rose-100/80 p-1.5 text-[10px] text-rose-900 font-medium leading-tight">
                      Protected Statutory Leave (Cannot be swapped)
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-black/5 space-y-1.5">
                {isProtected ? (
                  <button
                    disabled
                    className="w-full py-1.5 text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    <Lock className="h-3 w-3" />
                    <span>Locked Leave</span>
                  </button>
                ) : isOff ? (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onOpenSwapModal(idx, 'timing-change')}
                      className="w-full py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Clock className="h-3 w-3 text-indigo-600" />
                      <span>Assign / Pick Shift</span>
                    </button>
                    <button
                      onClick={() => onOpenSwapModal(idx, 'eh-claim')}
                      className="w-full py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <PlusCircle className="h-3 w-3 text-amber-600" />
                      <span>Claim EH (2,000 TK)</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenSwapModal(idx, 'timing-change')}
                      className="w-full py-1.5 text-[11px] font-bold text-slate-900 bg-white/90 hover:bg-white rounded-lg border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-1 hover:border-slate-300"
                    >
                      <Clock className="h-3 w-3 text-indigo-600" />
                      <span>Change Timing</span>
                    </button>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => onOpenSwapModal(idx, 'day-off')}
                        className="flex-1 py-1 text-[10px] font-semibold text-slate-700 hover:bg-black/5 rounded-md transition-colors"
                      >
                        Take Day Off
                      </button>
                      <button
                        onClick={() => onOpenSwapModal(idx, 'eh-claim')}
                        className="py-1 px-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100/50 rounded-md transition-colors"
                        title="Adjust Extra Hours"
                      >
                        EH ±
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Roster Policy and Guidelines */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Info className="h-4 w-4 text-indigo-600" />
          <span>Workforce Shift Policies & Definitions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60">
            <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              <span>Female Shift Safety Limit</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Per regulatory standards, female agents cannot work past 22:00. Allowed shifts: Morning, Day, and Evening (up to 22:00). Night (16:00–00:00) and Overnight (22:30–07:30) are restricted to male staff.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60">
            <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-rose-600" />
              <span>Protected Leaves Non-Exchangeable</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Maternity Leave and Parental Leave cannot be exchanged or transferred under any circumstances to prevent labor non-compliance.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60">
            <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-amber-600" />
              <span>EH (Extra Hours / Overtime)</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              <strong>EH</strong> represents paid extra work beyond standard shift hours. Extra hours can be claimed on rest days, extended before/after shifts, and swapped with supervisor audit tracking.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-bold text-slate-800">Shift Timings:</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            Morning (07:00–15:30)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500"></span>
            Day (10:00–18:30)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
            Evening (13:30–22:00)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            Night (16:00–00:00)*
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-900"></span>
            Overnight (22:30–07:30)*
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
            Rest Day (OFF)
          </span>
        </div>
      </div>
    </div>
  );
};
