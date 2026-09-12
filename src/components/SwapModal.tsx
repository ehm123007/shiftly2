import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  Users,
  DollarSign, 
  Plus,
  Minus,
  CalendarOff,
  Store,
  Calendar
} from 'lucide-react';
import { Employee, DaySchedule, ShiftCategory, SwapPlan, MarketPost } from '../types';
import { SHIFT_DEFINITIONS } from '../data/defaultData';
import { 
  checkShiftEligibility, 
  isShiftProtected, 
  generateDayOffPlans, 
  generateTimingChangePlans,
  getDayAvailableShiftsAndStaff 
} from '../utils/rosterEngine';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDayIndex: number;
  initialTab: 'day-off' | 'timing-change' | 'eh-claim';
  currentEmployee: Employee;
  allEmployees: Employee[];
  days: DaySchedule[];
  onSubmitPlan: (plan: SwapPlan, reason: string) => void;
  onDirectTimingChange: (dayIndex: number, newShift: ShiftCategory, newTiming: string, reason: string) => void;
  onSwapColleagueShift?: (dayIndex: number, targetColleague: Employee, reason: string) => void;
  onAdjustEH: (dayIndex: number, extraHours: number, reason: string) => void;
  onCreateMarketPost?: (newPost: Omit<MarketPost, 'id' | 'createdAt' | 'status'>) => void;
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  initialDayIndex,
  initialTab,
  currentEmployee,
  allEmployees,
  days,
  onSubmitPlan,
  onDirectTimingChange,
  onSwapColleagueShift,
  onAdjustEH,
  onCreateMarketPost
}) => {
  const [activeTab, setActiveTab] = useState<'day-off' | 'timing-change' | 'eh-claim'>(initialTab);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(initialDayIndex);
  const [selectedDesiredShift, setSelectedDesiredShift] = useState<ShiftCategory>('Morning');
  const [reason, setReason] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<'all' | '2' | '3' | '4' | '5'>('all');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submittedMessage, setSubmittedMessage] = useState<string>('');

  // Sync state when props change
  React.useEffect(() => {
    setSelectedDayIndex(initialDayIndex);
    setActiveTab(initialTab);
    setSubmitted(false);
    setReason('');
  }, [initialDayIndex, initialTab, isOpen]);

  const currentShift = currentEmployee.schedule[selectedDayIndex] || 'OFF';
  const currentTiming = currentEmployee.timings[selectedDayIndex] || SHIFT_DEFINITIONS[currentShift]?.time || 'Rest Day';
  const currentEH = currentEmployee.extraHours[selectedDayIndex] || 0;
  const currentDay = days[selectedDayIndex] || days[0];

  // Check if current shift is protected
  const protectedLeave = isShiftProtected(currentShift);

  // Day Off plans (Circular swaps)
  const dayOffPlans = useMemo(() => {
    if (protectedLeave || currentShift === 'OFF') return [];
    return generateDayOffPlans(currentEmployee, selectedDayIndex, allEmployees, days);
  }, [currentEmployee, selectedDayIndex, allEmployees, days, currentShift, protectedLeave]);

  // All available shifts and on-duty colleagues for the selected day
  const availableShiftGroups = useMemo(() => {
    return getDayAvailableShiftsAndStaff(selectedDayIndex, allEmployees, currentEmployee);
  }, [selectedDayIndex, allEmployees, currentEmployee]);

  // Colleagues who are scheduled OFF today (ideal candidates to cover for a day off)
  const colleaguesOffToday = useMemo(() => {
    const offGroup = availableShiftGroups.find(g => g.category === 'OFF');
    if (!offGroup) return [];
    return offGroup.colleagues;
  }, [availableShiftGroups]);

  // Available working shift groups (Morning, Day, Evening, Night, Overnight)
  const availableWorkingShiftGroups = useMemo(() => {
    return availableShiftGroups.filter(g => g.category !== 'OFF');
  }, [availableShiftGroups]);

  // Filtered Day Off plans
  const filteredDayOffPlans = useMemo(() => {
    if (groupFilter === 'all') return dayOffPlans;
    const size = parseInt(groupFilter, 10);
    return dayOffPlans.filter(p => p.members.length === size);
  }, [dayOffPlans, groupFilter]);

  // Desired shift check for females
  const desiredShiftCheck = useMemo(() => {
    return checkShiftEligibility(currentEmployee, selectedDesiredShift);
  }, [currentEmployee, selectedDesiredShift]);

  if (!isOpen) return null;

  const handleProposePlan = (plan: SwapPlan) => {
    onSubmitPlan(plan, reason || 'Shift coordination via Swap Desk');
    setSubmittedMessage(plan.description);
    setSubmitted(true);
  };

  // A working-day day-off can never be applied directly. It must become a proposal or marketplace listing.
  const handleApplyDirectDayOff = () => {
    setSubmittedMessage(`No roster change was made. Use an exchange proposal or post this day to the market so all affected employees can agree first.`);
    setSubmitted(true);
  };

  // Direct Shift Switch handler
  const handleApplyDirectTiming = () => {
    if (!desiredShiftCheck.eligible) return;
    const def = SHIFT_DEFINITIONS[selectedDesiredShift] || SHIFT_DEFINITIONS.Day;
    const timingStr = selectedDesiredShift === 'OFF' ? 'Rest Day' : def.time;
    onDirectTimingChange(
      selectedDayIndex, 
      selectedDesiredShift, 
      timingStr, 
      reason || `Shift timing changed to ${selectedDesiredShift}`
    );
    setSubmittedMessage(
      `Shift successfully updated to ${selectedDesiredShift} (${timingStr}) for ${currentDay.dayName} ${currentDay.dayNumber} ${currentDay.month}.`
    );
    setSubmitted(true);
  };

  // Swap with a specific colleague: always creates a consent request; never mutates the roster directly.
  const handleSwapWithColleague = (colleague: Employee) => {
    const myShift = currentEmployee.schedule[selectedDayIndex];
    const myTime = currentEmployee.timings[selectedDayIndex] || SHIFT_DEFINITIONS[myShift]?.time || 'Duty';
    const theirShift = colleague.schedule[selectedDayIndex];
    const theirTime = colleague.timings[selectedDayIndex] || SHIFT_DEFINITIONS[theirShift]?.time || 'Duty';
    const plan: SwapPlan = {
      id: `plan-peer-${Date.now()}`,
      members: [currentEmployee.id, colleague.id],
      type: 'timing-change',
      transfers: [
        { fromEmployeeId: currentEmployee.id, toEmployeeId: colleague.id, dateIndex: selectedDayIndex, date: currentDay.date, fromShift: myShift, fromTiming: myTime, toShift: theirShift, toTiming: theirTime },
        { fromEmployeeId: colleague.id, toEmployeeId: currentEmployee.id, dateIndex: selectedDayIndex, date: currentDay.date, fromShift: theirShift, fromTiming: theirTime, toShift: myShift, toTiming: myTime }
      ],
      description: `2-person exchange: ${currentEmployee.name.split(' ')[0]} takes ${colleague.name.split(' ')[0]}'s ${theirShift}; ${colleague.name.split(' ')[0]} takes ${myShift}.`,
      score: 98
    };
    handleProposePlan(plan);
  };

  // Request an off-duty colleague to cover: consent is required before either schedule changes.
  const handleRequestPeerDayOffCover = (colleague: Employee) => {
    const myShift = currentEmployee.schedule[selectedDayIndex];
    const myTime = currentEmployee.timings[selectedDayIndex] || SHIFT_DEFINITIONS[myShift]?.time || 'Duty';
    if (myShift === 'OFF') return;
    const plan: SwapPlan = {
      id: `plan-dayoff-cover-${Date.now()}`,
      members: [currentEmployee.id, colleague.id],
      type: 'direct-2',
      transfers: [{
        fromEmployeeId: currentEmployee.id,
        toEmployeeId: colleague.id,
        dateIndex: selectedDayIndex,
        date: currentDay.date,
        fromShift: myShift,
        fromTiming: myTime,
        toShift: 'OFF',
        toTiming: 'Rest Day'
      }],
      description: `${colleague.name.split(' ')[0]} proposes to cover your ${myShift} shift on ${currentDay.dayName}, giving you the day off.` ,
      score: 95
    };
    handleProposePlan(plan);
  };

  // Broadcast Day Off to Shift Market
  const handleBroadcastDayOffToMarket = (customNote?: string) => {
    if (onCreateMarketPost) {
      onCreateMarketPost({
        authorId: currentEmployee.id,
        authorName: currentEmployee.name,
        authorInitials: currentEmployee.initials,
        authorGender: currentEmployee.gender,
        authorRole: currentEmployee.role,
        type: 'desire-day-off',
        targetDate: currentDay.date,
        targetDateIndex: selectedDayIndex,
        currentShift,
        currentTiming,
        desiredShift: 'OFF',
        desiredTiming: 'Rest Day',
        willingToOffer: 'Will exchange with another day or offer 2,500 TK',
        note: customNote || reason || 'Seeking rest day on this date — open to exchange or 2,500 TK cash duty offer'
      });
      setSubmittedMessage(
        `Day off request has been posted directly to the Marketplace for ${currentDay.dayName}, ${currentDay.dayNumber} ${currentDay.month}. Interested teammates can take this shift or match with an exchange.`
      );
      setSubmitted(true);
    }
  };

  // Sell full time duty for 2,500 TK
  const handleSellFullDuty = () => {
    if (!onCreateMarketPost || currentShift === 'OFF') {
      setSubmittedMessage('You must have a scheduled working shift to offer full time duty for sale.');
      setSubmitted(true);
      return;
    }
    onCreateMarketPost({
      authorId: currentEmployee.id,
      authorName: currentEmployee.name,
      authorInitials: currentEmployee.initials,
      authorGender: currentEmployee.gender,
      authorRole: currentEmployee.role,
      type: 'sell-duty',
      targetDate: currentDay.date,
      targetDateIndex: selectedDayIndex,
      currentShift,
      currentTiming,
      desiredShift: 'OFF',
      desiredTiming: 'Rest Day',
      willingToOffer: 'Full time duty offer — 2,500 TK',
      note: reason || 'Selling full time duty for this day for 2,500 TK',
      dutyReward: 2500
    });
    setSubmittedMessage(`Full time duty offer posted for ${currentDay.dayName}, ${currentDay.dayNumber} ${currentDay.month}. An off-duty employee can claim this duty and earn 2,500 TK while you receive a Rest Day.`);
    setSubmitted(true);
  };

  const handleApplyEH = () => {
    if (!onCreateMarketPost || currentEH < 5) {
      setSubmittedMessage('No roster change was made. Only an existing EH day can be offered in the EH marketplace.');
      setSubmitted(true);
      return;
    }
    onCreateMarketPost({
      authorId: currentEmployee.id,
      authorName: currentEmployee.name,
      authorInitials: currentEmployee.initials,
      authorGender: currentEmployee.gender,
      authorRole: currentEmployee.role,
      type: 'eh-offer',
      targetDate: currentDay.date,
      targetDateIndex: selectedDayIndex,
      currentShift,
      currentTiming,
      desiredShift: 'Day',
      desiredTiming: 'EH Day',
      willingToOffer: 'EH opportunity — 2,000 TK',
      note: reason || 'Selling an existing EH day',
      ehReward: 2000
    });
    setSubmittedMessage(`EH offer posted for ${currentDay.dayName}, ${currentDay.dayNumber} ${currentDay.month}. An employee who is OFF that day can claim it for 2,000 TK.`);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Request Confirmed!</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {submittedMessage}
            </p>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 border border-slate-200 max-w-md mx-auto">
              ✓ Participants notified • Roster unchanged until everyone agrees
            </div>
            <button
              onClick={onClose}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
            >
              Back to Roster
            </button>
          </div>
        ) : (
          <>
            {/* Header & Target Day Selector */}
            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Workforce Schedule Exchange</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Shift Adjustment Engine
              </h2>
              
              {/* Day selection tabs */}
              <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1">
                {days.map((d, i) => {
                  const empShift = currentEmployee.schedule[i] || 'OFF';
                  const isSelected = selectedDayIndex === i;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDayIndex(i)}
                      className={`flex-1 min-w-[62px] py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`block text-[9px] uppercase font-bold ${isSelected ? 'text-teal-300' : 'text-slate-400'}`}>
                        {d.dayName}
                      </span>
                      <span className="text-xs font-bold">{d.dayNumber}</span>
                      <span className={`block text-[8px] font-mono mt-0.5 px-1 rounded truncate ${
                        isSelected ? 'bg-white/20 text-white' : empShift === 'OFF' ? 'bg-slate-200 text-slate-600' : 'bg-teal-50 text-teal-700'
                      }`}>
                        {empShift}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Day Context Card */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 mb-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Target Day Context</span>
                <p className="text-sm font-bold text-slate-900">
                  {currentDay.dayName}, {currentDay.dayNumber} {currentDay.month} · {currentShift}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{currentTiming}</p>
              </div>

              {currentEH >= 5 && (
                <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-1 text-xs font-bold text-amber-900">
                  EH Day Available · 2,000 TK
                </span>
              )}
            </div>

            {/* Protected Leave Block */}
            {protectedLeave ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-center space-y-2">
                <ShieldAlert className="h-8 w-8 text-rose-600 mx-auto" />
                <h4 className="text-sm font-bold text-rose-900">{currentShift} is Non-Exchangeable</h4>
                <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
                  Per labor regulations, statutory parental and maternity leaves are strictly protected. They cannot be swapped, surrendered, or exchanged for other shifts.
                </p>
              </div>
            ) : (
              <>
                {/* 3 Main Functional Tabs */}
                <div className="flex rounded-xl bg-slate-100 p-1 mb-5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('timing-change')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'timing-change'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Change Shift Timing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('day-off')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'day-off'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <CalendarOff className="h-3.5 w-3.5 text-teal-600" />
                    <span>Request Day Off</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('eh-claim')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'eh-claim'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                    <span>EH Marketplace</span>
                  </button>
                </div>

                {/* TAB 1: Change Shift Timing */}
                {activeTab === 'timing-change' && (
                  <div className="space-y-5">
                    {/* Shift Explanation Header */}
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Shift Change Options for {currentDay.dayName} ({currentDay.date})
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Current: {currentShift} ({currentTiming})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Swap timing with colleagues on duty today, or directly adjust your schedule. Female shift limits (02:00 to 22:00 max) are strictly preserved.
                      </p>
                    </div>

                    {/* Option A: Direct Shift Switch */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                      <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-indigo-600" />
                        <span>Direct Shift Selection</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Choose a new timing. Timing-only changes remain separate from day-off exchanges.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {(['Morning', 'Day', 'Evening', 'Night', 'Overnight'] as ShiftCategory[]).map(cat => {
                          const def = SHIFT_DEFINITIONS[cat] || SHIFT_DEFINITIONS.OFF;
                          const eligibility = checkShiftEligibility(currentEmployee, cat);
                          const isSelected = selectedDesiredShift === cat;
                          const timingLabel = cat === 'OFF' ? 'Rest Day' : def.time;

                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedDesiredShift(cat)}
                              className={`text-left p-2.5 rounded-xl border transition-all ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-2xs'
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">{cat}</span>
                                {!eligibility.eligible && (
                                  <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1 rounded">Policy Limit</span>
                                )}
                              </div>
                              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{timingLabel}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Policy Notice */}
                      {!desiredShiftCheck.eligible ? (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-800 mb-3">
                          <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <strong className="block font-bold">Policy Restriction:</strong>
                            <p>{desiredShiftCheck.reason}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 flex items-center gap-2 text-xs text-emerald-800 mb-3">
                          <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          <span>Shift selection complies with organizational labor regulations.</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason / Notes for shift change (e.g. Schedule adjustment, personal appointment)..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />

                        <button
                          type="button"
                          onClick={handleApplyDirectTiming}
                          disabled={!desiredShiftCheck.eligible}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                            desiredShiftCheck.eligible
                              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          Apply Shift Change to {selectedDesiredShift}
                        </button>
                      </div>
                    </div>

                    {/* Option B: Active Colleagues Working Other Shifts */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-teal-600" />
                          <span>Or Swap with Active Colleagues on {currentDay.dayName}</span>
                        </h4>
                        <span className="text-[10px] font-medium text-slate-500">
                          {availableWorkingShiftGroups.reduce((acc, g) => acc + g.colleagues.length, 0)} colleagues on duty
                        </span>
                      </div>

                      <div className="space-y-3">
                        {availableWorkingShiftGroups
                          .filter(g => g.category !== currentShift)
                          .map(group => {
                            const myEligibility = checkShiftEligibility(currentEmployee, group.category);

                            return (
                              <div key={group.category} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                                {/* Shift Header */}
                                <div className="flex items-center justify-between bg-slate-50/80 px-3 py-2 border-b border-slate-200 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900">{group.category}</span>
                                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {group.timing}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-semibold text-slate-600">
                                    {group.colleagues.length} {group.colleagues.length === 1 ? 'colleague' : 'colleagues'}
                                  </span>
                                </div>

                                {/* Colleagues list */}
                                <div className="p-2.5 space-y-2">
                                  {group.colleagues.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 py-1 px-2 italic">
                                      No colleagues currently assigned to this shift.
                                    </p>
                                  ) : (
                                    group.colleagues.map(({ employee: colleague }) => {
                                      const colleagueEligibility = currentShift === 'OFF'
                                        ? { eligible: true }
                                        : checkShiftEligibility(colleague, currentShift as ShiftCategory);

                                      const canSwap = myEligibility.eligible && colleagueEligibility.eligible;

                                      let blockerReason = '';
                                      if (!myEligibility.eligible) {
                                        blockerReason = myEligibility.reason || 'Not permitted for your profile';
                                      } else if (!colleagueEligibility.eligible) {
                                        blockerReason = `${colleague.name.split(' ')[0]} cannot take your shift: ${colleagueEligibility.reason}`;
                                      }

                                      return (
                                        <div 
                                          key={colleague.id}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white font-mono">
                                              {colleague.initials}
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-800">{colleague.name}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                                  colleague.gender === 'female' 
                                                    ? 'bg-rose-100 text-rose-700' 
                                                    : 'bg-sky-100 text-sky-700'
                                                }`}>
                                                  {colleague.gender === 'female' ? 'Female' : 'Male'}
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-slate-500 block">{colleague.role}</span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 self-end sm:self-center">
                                            {!canSwap ? (
                                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md">
                                                {blockerReason}
                                              </span>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => handleSwapWithColleague(colleague)}
                                                className="flex items-center gap-1 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors"
                                              >
                                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                                <span>Shift Timing with {colleague.name.split(' ')[0]}</span>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Request Day Off */}
                {activeTab === 'day-off' && (
                  <div className="space-y-5">
                    {/* Header Context */}
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Request Day Off on {currentDay.dayName} ({currentDay.date})
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Current: {currentShift} ({currentTiming})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Take a guaranteed Day Off via direct roster confirmation, ask an off-duty colleague to cover, broadcast to the Shift Market, or choose a circular rotation.
                      </p>
                    </div>

                    {currentShift === 'OFF' ? (
                      <div className="rounded-xl bg-teal-50 border border-teal-200 p-5 text-center space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-teal-600 mx-auto" />
                        <h4 className="text-sm font-bold text-teal-900">
                          You are Already OFF on {currentDay.dayName}
                        </h4>
                        <p className="text-xs text-teal-700 max-w-md mx-auto">
                          This date is already marked as a Rest Day in your workforce roster. If you would like to pick up a shift or claim Extra Duty, select the other tabs above.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Auto-posted to Marketplace Notice Banner */}
                        <div className="rounded-2xl border border-teal-300 bg-teal-50/80 p-4 shadow-2xs">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Store className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-extrabold text-teal-950 uppercase tracking-wide">
                                  Marketplace Listing Notice
                                </h4>
                                <span className="text-[10px] font-bold text-teal-800 bg-teal-200/70 px-2 py-0.5 rounded">
                                  Community Board
                                </span>
                              </div>
                              <p className="text-xs text-teal-900 mt-1 leading-relaxed">
                                When you apply for a Day Off on a working day, your shift is <strong>broadcast to the Marketplace</strong> so eligible off-duty colleagues can offer coverage, or you can match circular shift exchanges below. Roster stays untouched until full agreement.
                              </p>
                              <div className="mt-2.5 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleBroadcastDayOffToMarket()}
                                  className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                                >
                                  <Store className="h-3.5 w-3.5" />
                                  <span>Confirm Marketplace Listing</span>
                                </button>
                                <span className="text-[11px] text-teal-800 italic">
                                  (Listed as seeking Rest Day for {currentDay.dayName})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SELL FULL TIME DUTY OPTION (2,500 TK) */}
                        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-4 shadow-2xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 mt-0.5 font-extrabold">
                                ৳
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-extrabold text-slate-950">
                                    Sell Full Time Duty for 2,500 TK
                                  </h4>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                                    Paid Coverage
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                                  Need this day off urgently? Sell your full-time shift ({currentShift}) for <strong>2,500 TK</strong>. An off-duty colleague who wants to work this day can take it and claim the 2,500 TK cash payout while you get the Rest Day.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleSellFullDuty}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-xs transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0"
                            >
                              <DollarSign className="h-4 w-4" />
                              <span>Sell Duty (2,500 TK) →</span>
                            </button>
                          </div>
                        </div>

                        {/* OPTION 1: POST TO MARKETPLACE */}
                        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 p-4 shadow-2xs">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-extrabold text-xs">1</span>
                              <h4 className="text-sm font-extrabold text-slate-950">Option 1: Post Shift to Marketplace</h4>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                              Open Board Match
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                            Post this shift/day to the community Marketplace so another eligible employee who is off can offer to take it, or match with another day.
                          </p>

                          {onCreateMarketPost && (
                            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100">
                              <div className="text-xs text-slate-700">
                                <div>Listing: <strong>{currentShift} Shift</strong> on <strong>{currentDay.dayName}, {currentDay.dayNumber} {currentDay.month}</strong></div>
                                <span className="text-[10px] text-slate-500">Teammates can propose direct cover or multi-way links</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleBroadcastDayOffToMarket}
                                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
                              >
                                <Store className="h-4 w-4" />
                                <span>Post to Marketplace →</span>
                              </button>
                            </div>
                          )}

                          {/* Colleagues currently OFF today who could cover directly */}
                          {colleaguesOffToday.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-indigo-100/70">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                Or directly request an off-duty colleague to cover:
                              </span>
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {colleaguesOffToday.slice(0, 4).map(({ employee: colleague }) => {
                                  const eligibility = checkShiftEligibility(colleague, currentShift as ShiftCategory);
                                  return (
                                    <div
                                      key={colleague.id}
                                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                                    >
                                      <span className="font-semibold text-slate-800">{colleague.name} ({colleague.gender})</span>
                                      {eligibility.eligible ? (
                                        <button
                                          type="button"
                                          onClick={() => handleRequestPeerDayOffCover(colleague)}
                                          className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors"
                                        >
                                          Ask to Cover →
                                        </button>
                                      ) : (
                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Policy Limit</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* OPTION 2: FIND MULTI-PERSON EXCHANGE CHAINS */}
                        <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/20 p-4 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white font-extrabold text-xs">2</span>
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-950">Option 2: Find Multi-Person Exchange Chain</h4>
                                <p className="text-xs text-slate-600">
                                  Find circular chains (2, 3, 4, or 5 people) that give everyone their requested day off with zero coverage gaps.
                                </p>
                              </div>
                            </div>

                            {/* Group size filter */}
                            <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-teal-200 text-[10px] self-start sm:self-auto">
                              {(['all', '2', '3', '4', '5'] as const).map(size => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => setGroupFilter(size)}
                                  className={`px-2 py-1 rounded-md font-bold transition-all ${
                                    groupFilter === size ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {size === 'all' ? 'All' : `${size}P`}
                                </button>
                              ))}
                            </div>
                          </div>

                          {filteredDayOffPlans.length === 0 ? (
                            <div className="rounded-xl bg-white border border-slate-200 p-4 text-center text-xs text-slate-500 mt-3">
                              No circular rotation chains found for this day under current filter. Try posting to the Marketplace (Option 1) so colleagues can match with you.
                            </div>
                          ) : (
                            <div className="space-y-3 mt-3 max-h-72 overflow-y-auto pr-1">
                              {filteredDayOffPlans.map(plan => {
                                const members = plan.members.map(id => allEmployees.find(e => e.id === id)).filter(Boolean) as Employee[];

                                return (
                                  <div
                                    key={plan.id}
                                    className="rounded-xl border border-teal-200 bg-white p-3.5 hover:border-teal-400 transition-all shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="rounded-md bg-teal-100 text-teal-900 border border-teal-300 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                                        {plan.members.length}-Person Circular Chain
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        ✓ Zero Coverage Gap
                                      </span>
                                    </div>

                                    {/* Detailed Step-by-Step Path */}
                                    <div className="space-y-1.5 my-2.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Step-by-Step Replacement Flow:
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {plan.transfers.map((t, idx) => {
                                          const from = allEmployees.find(e => e.id === t.fromEmployeeId)?.name || t.fromEmployeeId;
                                          const to = allEmployees.find(e => e.id === t.toEmployeeId)?.name || t.toEmployeeId;
                                          return (
                                            <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                                              <div className="flex items-center justify-between font-bold text-slate-800">
                                                <span>Step {idx + 1}: {to.split(' ')[0]} replaces {from.split(' ')[0]}</span>
                                                <span className="text-slate-400 font-mono text-[10px]">{t.date}</span>
                                              </div>
                                              <div className="text-slate-600 mt-0.5">Works: {t.fromShift} ({t.fromTiming || 'Standard'})</div>
                                              <div className="text-teal-700 font-bold mt-0.5">Result: {from.split(' ')[0]} gets {t.toShift} (Rest Day)</div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        Requires agreement from all {plan.members.length} participants
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleProposePlan(plan)}
                                        className="rounded-lg bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs"
                                      >
                                        Propose Chain →
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 3: Extra Duty / EH */}
                {activeTab === 'eh-claim' && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-950 leading-relaxed">
                      <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                        <DollarSign className="h-4 w-4 text-amber-600" />
                        <span>EH Day Marketplace</span>
                      </div>
                      <p className="text-[11px] text-amber-900">
                        An <strong>EH day</strong> is a separate 5-hour full-day opportunity worth <strong>2,000 TK</strong>. An existing EH day may be offered in the marketplace; claiming it is restricted to employees who are OFF that date.
                      </p>
                      <p className="mt-1.5 text-[11px] text-amber-800 font-medium">
                        EH offers are separate from normal shift exchanges and are posted for eligible employees who are OFF on that date.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {currentDay.dayName}, {currentDay.dayNumber} {currentDay.month}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Current Shift: {currentShift} ({currentTiming})
                          </span>
                        </div>

                        <div>
                          {(currentEmployee.extraHours[selectedDayIndex] || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
                              EH Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                              No EH Offer
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Optional Operational Note / Reason
                        </label>
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g. Surge queue coverage, extra weekend support..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        {(currentEmployee.extraHours[selectedDayIndex] || 0) >= 5 ? (
                          <button
                            type="button"
                            onClick={handleApplyEH}
                            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <DollarSign className="h-4 w-4 text-slate-950" />
                            Post EH Day for 2,000 TK
                          </button>
                        ) : (
                          <div className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200 text-center">
                            No existing EH day to offer
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

