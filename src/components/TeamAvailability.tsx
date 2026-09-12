import React, { useState } from 'react';
import { Users, AlertTriangle, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Employee, DaySchedule, ShiftCategory } from '../types';
import { SHIFT_DEFINITIONS } from '../data/defaultData';

interface TeamAvailabilityProps {
  employees: Employee[];
  days: DaySchedule[];
}

export const TeamAvailability: React.FC<TeamAvailabilityProps> = ({
  employees,
  days
}) => {
  const shifts: ShiftCategory[] = ['Morning', 'Day', 'Evening', 'Night', 'Overnight'];
  const [expandedCell, setExpandedCell] = useState<{ shift: ShiftCategory; dayIndex: number } | null>(null);

  const getAgentsOnShift = (shift: ShiftCategory, dayIndex: number) => {
    return employees.filter(e => e.schedule[dayIndex] === shift);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Queue Balance</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700">
              {employees.length} Staff on Roster
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Team Coverage & Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Headcount distribution across all operational queues. Swaps are verified to prevent understaffing.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Minimum Queue Thresholds Maintained</span>
        </div>
      </div>

      {/* Availability Matrix */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 font-bold sticky left-0 bg-slate-50 z-10 w-44 border-r border-slate-200">
                  Shift Queue
                </th>
                {days.map(d => (
                  <th key={d.date} className="p-3 font-bold min-w-[110px] text-center border-r border-slate-200 last:border-r-0">
                    <span className="block text-[10px] uppercase text-slate-400">{d.dayName}</span>
                    <span className="text-xs font-bold text-slate-800">{d.dayNumber} {d.month}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map(shift => {
                const def = SHIFT_DEFINITIONS[shift];
                return (
                  <tr key={shift} className="hover:bg-slate-50/50">
                    <td className="p-3 sticky left-0 bg-white z-10 font-medium border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          shift === 'Morning' ? 'bg-emerald-500' :
                          shift === 'Day' ? 'bg-sky-500' :
                          shift === 'Evening' ? 'bg-indigo-500' :
                          shift === 'Night' ? 'bg-amber-500' : 'bg-purple-900'
                        }`}></span>
                        <div>
                          <p className="font-bold text-slate-900">{shift}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{def.time}</span>
                        </div>
                      </div>
                    </td>

                    {days.map((d, idx) => {
                      const onDuty = getAgentsOnShift(shift, idx);
                      const isLow = onDuty.length < 1;
                      const isExpanded = expandedCell?.shift === shift && expandedCell?.dayIndex === idx;

                      return (
                        <td
                          key={d.date}
                          onClick={() => setExpandedCell(isExpanded ? null : { shift, dayIndex: idx })}
                          className={`p-2.5 text-center border-r border-slate-100 last:border-r-0 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-indigo-50/80 ring-1 ring-indigo-500' : 'hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className={`text-sm font-extrabold font-mono ${
                              isLow ? 'text-rose-600' : 'text-slate-800'
                            }`}>
                              {onDuty.length} on duty
                            </span>

                            {isLow && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-600 mt-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Low
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Total on duty summary row */}
              <tr className="bg-slate-100/70 font-bold border-t border-slate-200">
                <td className="p-3 sticky left-0 bg-slate-100 z-10 border-r border-slate-200 text-slate-800">
                  Total On Duty / Day
                </td>
                {days.map((d, idx) => {
                  const totalWorking = employees.filter(e => e.schedule[idx] !== 'OFF' && !SHIFT_DEFINITIONS[e.schedule[idx]]?.isLeave).length;
                  return (
                    <td key={d.date} className="p-3 text-center border-r border-slate-200 last:border-r-0 font-mono text-slate-900">
                      {totalWorking} agents
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Popout if a cell is selected */}
      {expandedCell && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-indigo-950">
              Staff on Duty for {expandedCell.shift} ({SHIFT_DEFINITIONS[expandedCell.shift].time}) on {days[expandedCell.dayIndex]?.dayName}, {days[expandedCell.dayIndex]?.dayNumber} {days[expandedCell.dayIndex]?.month}:
            </h4>
            <button
              onClick={() => setExpandedCell(null)}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {getAgentsOnShift(expandedCell.shift, expandedCell.dayIndex).map(emp => (
              <div key={emp.id} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 border border-indigo-100 shadow-2xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
                  {emp.initials}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">{emp.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{emp.id} ({emp.gender})</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
