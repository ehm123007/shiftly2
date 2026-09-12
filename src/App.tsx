import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { PersonalBoard } from './components/PersonalBoard';
import { RosterView } from './components/RosterView';
import { SwapModal } from './components/SwapModal';
import { SwapDeskView } from './components/SwapDeskView';
import { MessagesView } from './components/MessagesView';
import { AuditLogView } from './components/AuditLogView';
import { AdminPortal } from './components/AdminPortal';
import { TeamAvailability } from './components/TeamAvailability';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationToast } from './components/NotificationToast';
import { MarketView } from './components/MarketView';

import { 
  Employee, 
  DaySchedule, 
  SwapRequest, 
  RosterChangeLog, 
  ChatMessage, 
  UserNotification, 
  SwapPlan, 
  ShiftCategory,
  MarketPost,
  MarketMatchOption,
  UserSessionLog,
  NoticePost
} from './types';
import { SHIFT_DEFINITIONS } from './data/defaultData';
import { calculateExtraHoursForShift, checkShiftEligibility, generateMarketplaceDayOffChains } from './utils/rosterEngine';
import { OrgSelectLandingView } from './components/OrgSelectLandingView';

import { 
  loadEmployees, 
  saveEmployees, 
  loadDays, 
  saveDays, 
  loadRequests, 
  saveRequests, 
  loadAuditLogs, 
  saveAuditLogs, 
  loadMessages, 
  saveMessages, 
  loadNotifications, 
  saveNotifications, 
  loadMarketPosts,
  saveMarketPosts,
  loadSession, 
  saveSession, 
  loadUserSessions,
  saveUserSessions,
  loadNotices,
  saveNotices,
  loadSelectedOrg,
  saveSelectedOrg,
  logRosterChange, 
  resetAllData 
} from './utils/storage';

export default function App() {
  // Global persistent states
  const [selectedOrg, setSelectedOrg] = useState<string | null>(loadSelectedOrg);
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [days, setDays] = useState<DaySchedule[]>(loadDays);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>(loadRequests);
  const [auditLogs, setAuditLogs] = useState<RosterChangeLog[]>(loadAuditLogs);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [notifications, setNotifications] = useState<UserNotification[]>(loadNotifications);
  const [marketPosts, setMarketPosts] = useState<MarketPost[]>(loadMarketPosts);
  const [userSessions, setUserSessions] = useState<UserSessionLog[]>(loadUserSessions);
  const [notices, setNotices] = useState<NoticePost[]>(loadNotices);

  // Active toast alert for real-time visual feedback
  const [activeToast, setActiveToast] = useState<UserNotification | null>(null);

  // User session
  const [session, setSession] = useState<{ userId: string; role: 'employee' | 'admin' } | null>(loadSession);
  
  // Navigation & UI state
  const [activeView, setActiveView] = useState<string>('board');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Swap modal configuration
  const [swapModalConfig, setSwapModalConfig] = useState<{
    isOpen: boolean;
    dayIndex: number;
    tab: 'day-off' | 'timing-change' | 'eh-claim';
  }>({
    isOpen: false,
    dayIndex: 2,
    tab: 'timing-change'
  });

  // Keep storage synced when states change
  useEffect(() => {
    saveEmployees(employees);
  }, [employees]);

  useEffect(() => {
    saveDays(days);
  }, [days]);

  useEffect(() => {
    saveRequests(swapRequests);
  }, [swapRequests]);

  useEffect(() => {
    saveAuditLogs(auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveMarketPosts(marketPosts);
  }, [marketPosts]);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    saveUserSessions(userSessions);
  }, [userSessions]);

  useEffect(() => {
    saveNotices(notices);
  }, [notices]);

  useEffect(() => {
    saveSelectedOrg(selectedOrg);
  }, [selectedOrg]);

  // Determine active employee
  const currentEmployee = employees.find(e => e.id === session?.userId) || employees[0];
  const userRole = session?.role || 'employee';

  const isEligibleForShift = (employee: Employee, shift: ShiftCategory, timing?: string): boolean =>
    checkShiftEligibility(employee, shift, timing).eligible;

  // Counts
  const relevantNotifs = notifications.filter(n => 
    userRole === 'admin' 
      ? (n.userId === 'ADMIN' || n.userId === currentEmployee?.id || n.userId === 'ALL')
      : (n.userId === currentEmployee?.id || n.userId === 'ALL')
  );
  const unreadNotifsCount = relevantNotifs.filter(n => !n.read).length;
  const unreadMessagesCount = messages.filter(m => m.recipientId === currentEmployee?.id).length;
  const pendingRequestsCount = swapRequests.filter(r => r.state === 'Pending' && (userRole === 'admin' || r.participantIds.includes(currentEmployee?.id))).length;
  const openMarketPostsCount = marketPosts.filter(p => p.status === 'open').length;

  // Log in as employee via Bank ID
  const handleLoginEmployee = (employeeId: string) => {
    setSession({ userId: employeeId, role: 'employee' });
    setActiveView('board');

    // Audit login session
    const target = employees.find(e => e.id === employeeId);
    if (target) {
      const newSessionLog: UserSessionLog = {
        id: `sess-${Date.now()}-${target.id}`,
        userId: target.id,
        userName: target.name,
        role: 'employee',
        loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        status: 'online',
        deviceInfo: 'Agent Desktop Terminal',
        ipAddress: `10.24.88.${Math.floor(Math.random() * 150 + 20)}`
      };
      setUserSessions(prev => [newSessionLog, ...prev.filter(s => s.userId !== target.id)]);
    }
  };

  // Log in as Admin - Password check without exposing plain text in UI
  const handleLoginAdmin = (user: string, pass: string): boolean => {
    if (user.toLowerCase() === 'admin' && pass === 'haque@123007') {
      setSession({ userId: employees[0].id, role: 'admin' });
      setActiveView('admin');

      const adminSessionLog: UserSessionLog = {
        id: `sess-admin-${Date.now()}`,
        userId: 'EMP-ADMIN',
        userName: 'Admin Moderator (Haque)',
        role: 'admin',
        loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        status: 'online',
        deviceInfo: 'Supervisor Console (Secured)',
        ipAddress: '10.24.1.1'
      };
      setUserSessions(prev => [adminSessionLog, ...prev.filter(s => s.userId !== 'EMP-ADMIN')]);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    if (session) {
      setUserSessions(prev => prev.map(s => {
        if (s.userId === session.userId || (session.role === 'admin' && s.userId === 'EMP-ADMIN')) {
          return {
            ...s,
            status: 'offline',
            logoutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return s;
      }));
    }
    setSession(null);
    setActiveView('board');
  };

  // Admin-to-User messaging handler (sender identity strictly 'Admin')
  const handleSendAdminMessage = (recipientId: string, text: string) => {
    const adminMsg: ChatMessage = {
      id: `admin-msg-${Date.now()}`,
      conversationId: recipientId === 'TEAM_LOUNGE' ? 'TEAM_LOUNGE' : ['ADMIN', recipientId].sort().join('-'),
      senderId: 'ADMIN',
      senderName: 'Admin',
      senderInitials: 'AD',
      recipientId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, adminMsg]);

    // Send targeted notification
    if (recipientId === 'TEAM_LOUNGE') {
      const broadcastNotif: UserNotification = {
        id: `notif-admin-broadcast-${Date.now()}`,
        userId: 'ALL',
        title: 'Official Admin Broadcast',
        message: text.length > 70 ? `${text.slice(0, 70)}...` : text,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'admin-alert',
        actionView: 'messages'
      };
      setNotifications(prev => [broadcastNotif, ...prev]);
    } else {
      const notif: UserNotification = {
        id: `notif-admin-direct-${Date.now()}`,
        userId: recipientId,
        title: 'Official Directive from Admin',
        message: text.length > 70 ? `${text.slice(0, 70)}...` : text,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'admin-alert',
        actionView: 'messages'
      };
      setNotifications(prev => [notif, ...prev]);
    }
  };

  const handleToggleRole = () => {
    if (!session) return;
    const nextRole = session.role === 'admin' ? 'employee' : 'admin';
    setSession({ ...session, role: nextRole });
    if (nextRole === 'admin') {
      setActiveView('admin');
    } else {
      setActiveView('board');
    }
  };

  const handleMarkNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkOneNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleDeleteOneNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    if (userRole === 'admin') {
      setNotifications(prev => prev.filter(n => n.userId !== 'ADMIN' && n.userId !== currentEmployee.id));
    } else {
      setNotifications(prev => prev.filter(n => n.userId !== currentEmployee.id));
    }
  };

  // Open Swap Modal helper
  const handleOpenSwapModal = (dayIndex: number, defaultTab: 'day-off' | 'timing-change' | 'eh-claim' = 'timing-change') => {
    setSwapModalConfig({
      isOpen: true,
      dayIndex,
      tab: defaultTab
    });
  };

  // Create a proposal only. The roster is never mutated here.
  const createPendingSwapRequest = (plan: SwapPlan, reason: string, linkedPostId?: string): string => {
    const me = currentEmployee;
    const uniqueMembers = Array.from(new Set(plan.members));
    if (uniqueMembers.length < 2) {
      throw new Error('A roster exchange must contain at least two participants.');
    }

    const participants = uniqueMembers.map(id => employees.find(e => e.id === id)?.name || id);
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const groupChatId = `EXCHANGE:${requestId}`;
    const newReq: SwapRequest = {
      id: requestId,
      requesterId: me.id,
      requesterName: me.name,
      type: plan.type === 'timing-change' ? 'timing-change' : 'day-off',
      targetDateIndex: plan.transfers[0]?.dateIndex ?? 0,
      targetDate: plan.transfers[0]?.date ?? days[0].date,
      currentShift: plan.transfers[0]?.fromShift ?? 'Day',
      currentTiming: plan.transfers[0]?.fromTiming ?? 'Standard',
      participants,
      participantIds: uniqueMembers,
      approvedByIds: [me.id],
      consentRequiredCount: uniqueMembers.length,
      groupChatId,
      plan: { ...plan, members: uniqueMembers },
      reason,
      createdAt: new Date().toISOString(),
      state: 'Pending'
    };

    setSwapRequests(prev => [newReq, ...prev]);

    if (linkedPostId) {
      setMarketPosts(prev => prev.map(post =>
        post.id === linkedPostId
          ? { ...post, status: 'pending', linkedRequestId: requestId, participantIds: uniqueMembers }
          : post
      ));
    }

    const timestamp = new Date().toISOString();
    const createdNotifs: UserNotification[] = uniqueMembers
      .filter(memberId => memberId !== me.id)
      .map(memberId => ({
        id: `notif-${requestId}-${memberId}`,
        userId: memberId,
        title: 'Exchange Proposal Needs Your Agreement',
        message: `${me.name} proposed a ${uniqueMembers.length}-person exchange. Review the linked steps and agree before the roster can change.`,
        timestamp,
        read: false,
        type: 'swap-request',
        actionView: 'swaps',
        metadata: { employeeId: me.id, employeeName: me.name, date: newReq.targetDate, conversationId: groupChatId }
      }));

    createdNotifs.push({
      id: `admin-notif-swap-${requestId}`,
      userId: 'ADMIN',
      title: 'Exchange Proposal Created',
      message: `${me.name} created a ${uniqueMembers.length}-person roster exchange. It is pending until every participant agrees.`,
      timestamp,
      read: false,
      type: 'admin-alert',
      actionView: 'swaps',
      metadata: { employeeId: me.id, employeeName: me.name, date: newReq.targetDate, conversationId: groupChatId }
    });

    const groupMessage: ChatMessage = {
      id: `msg-${requestId}`,
      conversationId: groupChatId,
      senderId: me.id,
      senderName: me.name,
      senderInitials: me.initials,
      recipientId: groupChatId,
      text: `Exchange proposal created. ${plan.description} Everyone must agree before any roster change is applied.`,
      timestamp,
      groupName: `${uniqueMembers.length}-Person Exchange • ${newReq.targetDate}`,
      groupParticipantIds: uniqueMembers
    };
    setMessages(prev => [...prev, groupMessage]);

    const userToast: UserNotification = {
      id: `toast-${requestId}`,
      userId: me.id,
      title: 'Exchange Proposal Created',
      message: `Your roster remains unchanged. ${uniqueMembers.length} participants must agree before it is applied.`,
      timestamp,
      read: true,
      type: 'swap-request',
      actionView: 'swaps',
      metadata: { conversationId: groupChatId }
    };
    setActiveToast(userToast);
    setNotifications(prev => [...createdNotifs, ...prev]);

    return requestId;
  };

  const handleSubmitPlan = (plan: SwapPlan, reason: string) => {
    try {
      createPendingSwapRequest(plan, reason);
    } catch (error) {
      const toast: UserNotification = {
        id: `toast-invalid-plan-${Date.now()}`,
        userId: currentEmployee.id,
        title: 'Exchange Not Created',
        message: error instanceof Error ? error.message : 'The proposed exchange is invalid.',
        timestamp: new Date().toISOString(),
        read: true,
        type: 'system',
        actionView: 'swaps'
      };
      setActiveToast(toast);
    }
  };

  // Direct Timing Change Handler
  const handleDirectTimingChange = (dayIndex: number, newShift: ShiftCategory, newTiming: string, reason: string) => {
    const me = currentEmployee;
    const prevShift = me.schedule[dayIndex];
    const prevTiming = me.timings[dayIndex];
    const dateStr = days[dayIndex]?.date || `Day ${dayIndex + 1}`;

    const updated = employees.map(emp => {
      if (emp.id === me.id) {
        const nextSchedule = [...emp.schedule];
        const nextTimings = [...emp.timings];
        const nextEH = [...emp.extraHours];
        nextSchedule[dayIndex] = newShift;
        nextTimings[dayIndex] = newTiming;
        // Quietly calculate overnight extra hours without mentioning in UI
        nextEH[dayIndex] = calculateExtraHoursForShift(newShift, newTiming, emp.extraHours[dayIndex]);
        return {
          ...emp,
          schedule: nextSchedule,
          timings: nextTimings,
          extraHours: nextEH
        };
      }
      return emp;
    });

    setEmployees(updated);

    // 1. Employee Confirmation
    const userNotif: UserNotification = {
      id: `notif-timing-${Date.now()}`,
      userId: me.id,
      title: 'Shift Timing Updated',
      message: `Your shift on ${dateStr} changed from ${prevShift} (${prevTiming}) to ${newShift} (${newTiming}).`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'roster-updated',
      actionView: 'roster',
      metadata: {
        date: dateStr,
        previousShift: prevShift,
        newShift
      }
    };

    // 2. REQUIREMENT: Admins should receive notifications for all roster modifications
    const adminAlert: UserNotification = {
      id: `admin-alert-timing-${Date.now()}`,
      userId: 'ADMIN',
      title: 'Admin Alert: Shift Timing Modified',
      message: `${me.name} (${me.id}) modified their shift on ${dateStr} to ${newShift} (${newTiming}). Reason: "${reason}".`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'admin-alert',
      actionView: 'history',
      metadata: {
        employeeId: me.id,
        employeeName: me.name,
        date: dateStr,
        previousShift: prevShift,
        newShift
      }
    };

    setActiveToast(userNotif);
    setNotifications(prev => [userNotif, adminAlert, ...prev]);

    logRosterChange({
      changedBy: me.name,
      changeType: 'Timing Change',
      employeeId: me.id,
      employeeName: me.name,
      date: dateStr,
      previousShift: prevShift,
      newShift,
      previousTiming: prevTiming,
      newTiming,
      reason
    });
    setAuditLogs(loadAuditLogs());
  };

  // Any peer-to-peer shift swap requires both employees to agree before the roster changes.
  const handleSwapColleagueShift = (dayIndex: number, targetColleague: Employee, reason: string) => {
    const me = currentEmployee;
    if (targetColleague.id === me.id) return;
    const dateStr = days[dayIndex]?.date || `Day ${dayIndex + 1}`;
    const myShift = me.schedule[dayIndex];
    const myTiming = me.timings[dayIndex] || SHIFT_DEFINITIONS[myShift]?.time || 'Duty';
    const theirShift = targetColleague.schedule[dayIndex];
    const theirTiming = targetColleague.timings[dayIndex] || SHIFT_DEFINITIONS[theirShift]?.time || 'Duty';

    if (myShift === 'OFF' || theirShift === 'OFF') {
      // OFF ↔ duty is represented as a normal day-off coverage proposal.
      const plan: SwapPlan = {
        id: `plan-cover-${Date.now()}`,
        members: [me.id, targetColleague.id],
        type: 'direct-2',
        transfers: myShift === 'OFF' ? [
          { fromEmployeeId: targetColleague.id, toEmployeeId: me.id, dateIndex: dayIndex, date: dateStr, fromShift: theirShift, fromTiming: theirTiming, toShift: 'OFF', toTiming: 'Rest Day' }
        ] : [
          { fromEmployeeId: me.id, toEmployeeId: targetColleague.id, dateIndex: dayIndex, date: dateStr, fromShift: myShift, fromTiming: myTiming, toShift: 'OFF', toTiming: 'Rest Day' }
        ],
        description: myShift === 'OFF'
          ? `${targetColleague.name.split(' ')[0]} offers their ${theirShift} shift and you are currently OFF.`
          : `${targetColleague.name.split(' ')[0]} covers your ${myShift} shift, granting you the day off.`,
        score: 92
      };
      createPendingSwapRequest(plan, reason || `Day-off coverage on ${dateStr}`);
      return;
    }

    const myEligibility = isEligibleForShift(me, theirShift, theirTiming);
    const theirEligibility = isEligibleForShift(targetColleague, myShift, myTiming);
    if (!myEligibility || !theirEligibility) return;

    const plan: SwapPlan = {
      id: `plan-timing-${Date.now()}`,
      members: [me.id, targetColleague.id],
      type: 'timing-change',
      transfers: [
        { fromEmployeeId: me.id, toEmployeeId: targetColleague.id, dateIndex: dayIndex, date: dateStr, fromShift: myShift, fromTiming: myTiming, toShift: theirShift, toTiming: theirTiming },
        { fromEmployeeId: targetColleague.id, toEmployeeId: me.id, dateIndex: dayIndex, date: dateStr, fromShift: theirShift, fromTiming: theirTiming, toShift: myShift, toTiming: myTiming }
      ],
      description: `2-person timing exchange: ${me.name.split(' ')[0]} takes ${targetColleague.name.split(' ')[0]}'s ${theirShift}; ${targetColleague.name.split(' ')[0]} takes ${myShift}.`,
      score: 98
    };
    createPendingSwapRequest(plan, reason || `Shift exchange with ${targetColleague.name}`);
  };

  // Adjust EH (Extra Hours) Handler
  const handleAdjustEH = (dayIndex: number, extraHours: number, reason: string) => {
    const me = currentEmployee;
    const prevEH = me.extraHours[dayIndex] || 0;
    const dateStr = days[dayIndex]?.date || `Day ${dayIndex + 1}`;
    const diff = extraHours - prevEH;

    const updated = employees.map(emp => {
      if (emp.id === me.id) {
        const nextEH = [...emp.extraHours];
        nextEH[dayIndex] = extraHours;
        return {
          ...emp,
          extraHours: nextEH
        };
      }
      return emp;
    });

    setEmployees(updated);

    // 1. User Notification
    const userNotif: UserNotification = {
      id: `notif-eh-${Date.now()}`,
      userId: me.id,
      title: 'Extra Hours (EH) Adjusted',
      message: `Your paid Extra Hours on ${dateStr} were set to ${extraHours}h (${diff >= 0 ? '+' : ''}${diff}h).`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'eh-alert',
      actionView: 'roster',
      metadata: {
        date: dateStr,
        extraHoursDiff: diff
      }
    };

    // 2. REQUIREMENT: Admins should receive notifications for all roster modifications
    const adminAlert: UserNotification = {
      id: `admin-alert-eh-${Date.now()}`,
      userId: 'ADMIN',
      title: 'Admin Alert: Extra Hours (EH) Modification',
      message: `${me.name} (${me.id}) adjusted paid Extra Hours on ${dateStr} by ${diff >= 0 ? '+' : ''}${diff}h (New total: ${extraHours}h EH). Reason: "${reason}".`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'admin-alert',
      actionView: 'history',
      metadata: {
        employeeId: me.id,
        employeeName: me.name,
        date: dateStr,
        extraHoursDiff: diff
      }
    };

    setActiveToast(userNotif);
    setNotifications(prev => [userNotif, adminAlert, ...prev]);

    logRosterChange({
      changedBy: me.name,
      changeType: 'Extra Hours (EH)',
      employeeId: me.id,
      employeeName: me.name,
      date: dateStr,
      previousShift: `${prevEH > 0 ? `+${prevEH}h EH` : '0h EH'}`,
      newShift: `${extraHours > 0 ? `+${extraHours}h EH` : '0h EH'}`,
      extraHoursDiff: diff,
      reason
    });
    setAuditLogs(loadAuditLogs());
  };

  // Apply an approved plan atomically. The function prepares the complete next roster first;
  // if any validation fails, the roster is left completely unchanged.
  const applyTransfers = (transfers: any[], reason: string): boolean => {
    if (!Array.isArray(transfers) || transfers.length === 0) return false;

    const nextEmployees = structuredClone(employees) as Employee[];
    const touched = new Set<string>();

    for (const t of transfers) {
      const fromEmp = nextEmployees.find(e => e.id === t.fromEmployeeId);
      const toEmp = nextEmployees.find(e => e.id === t.toEmployeeId);
      if (!fromEmp || !toEmp || fromEmp.id === toEmp.id) return false;
      if (t.dateIndex < 0 || t.dateIndex >= days.length) return false;

      const key = `${t.dateIndex}:${t.fromEmployeeId}:${t.toEmployeeId}`;
      if (touched.has(key)) return false;
      touched.add(key);

      const currentFromShift = fromEmp.schedule[t.dateIndex];
      const currentFromTiming = fromEmp.timings[t.dateIndex];
      const currentToShift = toEmp.schedule[t.dateIndex];
      const currentToTiming = toEmp.timings[t.dateIndex];

      if (currentFromShift !== t.fromShift) return false;
      if (t.fromTiming && currentFromTiming !== t.fromTiming) return false;
      if (t.toShift === 'OFF' && currentToShift !== 'OFF') return false;
      if (t.toShift !== 'OFF' && currentToShift !== t.toShift) return false;
      if (t.toShift !== 'OFF' && !isEligibleForShift(toEmp, t.fromShift, t.fromTiming)) return false;
      if (t.toShift === 'OFF' && !isEligibleForShift(toEmp, t.fromShift, t.fromTiming)) return false;
    }

    // Apply the whole proposal to a clone before touching React state.
    for (const t of transfers) {
      const fromEmp = nextEmployees.find(e => e.id === t.fromEmployeeId)!;
      const toEmp = nextEmployees.find(e => e.id === t.toEmployeeId)!;
      fromEmp.schedule[t.dateIndex] = t.toShift;
      fromEmp.timings[t.dateIndex] = t.toTiming;
      toEmp.schedule[t.dateIndex] = t.fromShift;
      toEmp.timings[t.dateIndex] = t.fromTiming;
    }

    // Final integrity check: every transfer must be represented exactly as proposed.
    for (const t of transfers) {
      const fromEmp = nextEmployees.find(e => e.id === t.fromEmployeeId)!;
      const toEmp = nextEmployees.find(e => e.id === t.toEmployeeId)!;
      if (fromEmp.schedule[t.dateIndex] !== t.toShift || toEmp.schedule[t.dateIndex] !== t.fromShift) return false;
      if (fromEmp.timings[t.dateIndex] !== t.toTiming || toEmp.timings[t.dateIndex] !== t.fromTiming) return false;
    }

    setEmployees(nextEmployees);
    transfers.forEach(t => {
      const changedEmployee = nextEmployees.find(e => e.id === t.fromEmployeeId);
      logRosterChange({
        changedBy: currentEmployee.name,
        changeType: 'Shift Swap',
        employeeId: t.fromEmployeeId,
        employeeName: changedEmployee?.name || t.fromEmployeeId,
        date: t.date,
        previousShift: t.fromShift,
        newShift: t.toShift,
        previousTiming: t.fromTiming,
        newTiming: t.toTiming,
        reason
      });
    });
    setAuditLogs(loadAuditLogs());
    return true;
  };

  // Shift Market handlers
  const handleCreateMarketPost = (newPostData: Omit<MarketPost, 'id' | 'createdAt' | 'status'>) => {
    if (newPostData.type === 'eh-offer') {
      const owner = employees.find(e => e.id === newPostData.authorId);
      if (!owner || (owner.extraHours[newPostData.targetDateIndex] || 0) < 5) {
        setActiveToast({ id: `toast-eh-post-${Date.now()}`, userId: currentEmployee.id, title: 'EH Offer Not Created', message: 'Only an existing EH day can be offered in the EH marketplace.', timestamp: new Date().toISOString(), read: true, type: 'eh-alert', actionView: 'market' });
        return;
      }
    }

    const newPost: MarketPost = {
      ...newPostData,
      id: `market-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      status: 'open'
    };

    setMarketPosts(prev => [newPost, ...prev]);

    // Admin alert
    const adminAlert: UserNotification = {
      id: `admin-market-${Date.now()}`,
      userId: 'ADMIN',
      title: 'Admin Alert: New Shift Market Listing',
      message: `${newPost.authorName} (${newPost.authorId}) posted a ${newPost.type === 'desire-day-off' ? 'Day Off request' : newPost.type === 'eh-offer' ? 'EH offer' : 'Working Day request'} on ${newPost.targetDate}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'admin-alert',
      actionView: 'market'
    };

    const toast: UserNotification = {
      id: `toast-market-${Date.now()}`,
      userId: newPost.authorId,
      title: 'Listing Published',
      message: 'Your shift market request is live on the community board.',
      timestamp: new Date().toISOString(),
      read: true,
      type: 'system',
      actionView: 'market'
    };

    setActiveToast(toast);
    setNotifications(prev => [adminAlert, ...prev]);
  };

  const buildPlanFromMarketMatch = (post: MarketPost, match: MarketMatchOption): SwapPlan | null => {
    const poster = employees.find(e => e.id === post.authorId);
    const viewer = currentEmployee;
    if (!poster || viewer.id === poster.id) return null;

    if (post.type === 'desire-day-off') {
      const target = post.targetDateIndex;
      const posterShift = poster.schedule[target];
      const posterTiming = poster.timings[target] || SHIFT_DEFINITIONS[posterShift]?.time || 'Duty';

      // Viewer is already OFF on the requested date: viewer takes the poster's duty.
      if (viewer.schedule[target] === 'OFF' && posterShift !== 'OFF') {
        return {
          id: `market-direct-${post.id}-${viewer.id}`,
          members: [poster.id, viewer.id],
          type: 'direct-2',
          transfers: [{ fromEmployeeId: poster.id, toEmployeeId: viewer.id, dateIndex: target, date: post.targetDate, fromShift: posterShift, fromTiming: posterTiming, toShift: 'OFF', toTiming: 'Rest Day' }],
          description: `${viewer.name.split(' ')[0]} takes ${poster.name.split(' ')[0]}'s ${posterShift} shift on ${post.targetDate}, giving ${poster.name.split(' ')[0]} the requested day off.`,
          score: 96
        };
      }

      // Two-way cross-day trade.
      if (match.returnDateIndex !== undefined) {
        const returnIdx = match.returnDateIndex;
        const viewerShift = viewer.schedule[returnIdx];
        const viewerTiming = viewer.timings[returnIdx] || SHIFT_DEFINITIONS[viewerShift]?.time || 'Duty';
        const posterReturnShift = poster.schedule[returnIdx];
        const posterReturnTiming = poster.timings[returnIdx] || SHIFT_DEFINITIONS[posterReturnShift]?.time || 'Rest Day';
        if (viewerShift !== 'OFF' && posterReturnShift === 'OFF') {
          return {
            id: `market-cross-${post.id}-${viewer.id}-${returnIdx}`,
            members: [poster.id, viewer.id],
            type: 'direct-2',
            transfers: [
              { fromEmployeeId: poster.id, toEmployeeId: viewer.id, dateIndex: target, date: post.targetDate, fromShift: posterShift, fromTiming: posterTiming, toShift: 'OFF', toTiming: 'Rest Day' },
              { fromEmployeeId: viewer.id, toEmployeeId: poster.id, dateIndex: returnIdx, date: days[returnIdx].date, fromShift: viewerShift, fromTiming: viewerTiming, toShift: 'OFF', toTiming: 'Rest Day' }
            ],
            description: `Two-day exchange: ${viewer.name.split(' ')[0]} covers ${poster.name.split(' ')[0]} on ${post.targetDate}; ${poster.name.split(' ')[0]} covers ${viewer.name.split(' ')[0]} on ${days[returnIdx].date}.`,
            score: 94
          };
        }
      }
    }

    // Same-day timing/working shift exchange.
    const target = post.targetDateIndex;
    const viewerShift = viewer.schedule[target];
    const viewerTiming = viewer.timings[target] || SHIFT_DEFINITIONS[viewerShift]?.time || 'Duty';
    const posterShift = poster.schedule[target];
    const posterTiming = poster.timings[target] || SHIFT_DEFINITIONS[posterShift]?.time || 'Duty';
    if (viewerShift !== 'OFF' && posterShift !== 'OFF' && viewerShift !== posterShift &&
        checkShiftEligibility(viewer, posterShift, posterTiming).eligible &&
        checkShiftEligibility(poster, viewerShift, viewerTiming).eligible) {
      return {
        id: `market-timing-${post.id}-${viewer.id}`,
        members: [poster.id, viewer.id],
        type: 'timing-change',
        transfers: [
          { fromEmployeeId: viewer.id, toEmployeeId: poster.id, dateIndex: target, date: post.targetDate, fromShift: viewerShift, fromTiming: viewerTiming, toShift: posterShift, toTiming: posterTiming },
          { fromEmployeeId: poster.id, toEmployeeId: viewer.id, dateIndex: target, date: post.targetDate, fromShift: posterShift, fromTiming: posterTiming, toShift: viewerShift, toTiming: viewerTiming }
        ],
        description: `Same-day timing exchange: ${viewer.name.split(' ')[0]} takes ${poster.name.split(' ')[0]}'s ${posterShift}; ${poster.name.split(' ')[0]} takes ${viewer.name.split(' ')[0]}'s ${viewerShift}.`,
        score: 93
      };
    }

    if (viewerShift === 'OFF' && posterShift !== 'OFF' &&
        checkShiftEligibility(viewer, posterShift, posterTiming).eligible) {
      return {
        id: `market-cover-${post.id}-${viewer.id}`,
        members: [poster.id, viewer.id],
        type: 'direct-2',
        transfers: [{ fromEmployeeId: poster.id, toEmployeeId: viewer.id, dateIndex: target, date: post.targetDate, fromShift: posterShift, fromTiming: posterTiming, toShift: 'OFF', toTiming: 'Rest Day' }],
        description: `${viewer.name.split(' ')[0]} takes ${poster.name.split(' ')[0]}'s ${posterShift} on ${post.targetDate}; the posted request becomes covered.`,
        score: 92
      };
    }
    return null;
  };

  const handleMatchMarketPost = (postId: string, matchOption: MarketMatchOption) => {
    const post = marketPosts.find(p => p.id === postId);
    if (!post || post.status !== 'open') return;
    let plan = matchOption.plan || buildPlanFromMarketMatch(post, matchOption);

    // For a multi-person marketplace day-off request, discover a valid 2–5 person closed chain.
    if (!plan && post.type === 'desire-day-off') {
      plan = generateMarketplaceDayOffChains(post, marketPosts, employees, days, 5)
        .find(candidate => candidate.members.includes(currentEmployee.id)) || null;
    }

    if (!plan || !plan.members.includes(currentEmployee.id)) {
      setActiveToast({
        id: `toast-market-no-plan-${Date.now()}`,
        userId: currentEmployee.id,
        title: 'No Valid Exchange Plan',
        message: 'The roster changed or the proposed path is no longer valid. No roster change was made.',
        timestamp: new Date().toISOString(),
        read: true,
        type: 'system',
        actionView: 'market'
      });
      return;
    }
    try {
      createPendingSwapRequest(plan, `Marketplace exchange: ${matchOption.pathDescription}`, postId);
    } catch (error) {
      setActiveToast({
        id: `toast-market-error-${Date.now()}`,
        userId: currentEmployee.id,
        title: 'Match Not Created',
        message: error instanceof Error ? error.message : 'Unable to create this exchange proposal.',
        timestamp: new Date().toISOString(),
        read: true,
        type: 'system',
        actionView: 'market'
      });
    }
  };

  const handleClaimEHPost = (postId: string) => {
    const post = marketPosts.find(p => p.id === postId);
    if (!post || post.type !== 'eh-offer' || post.status !== 'open') return;
    if (post.authorId === currentEmployee.id) return;

    const dayIndex = post.targetDateIndex;
    if (currentEmployee.schedule[dayIndex] !== 'OFF') {
      setActiveToast({
        id: `toast-eh-ineligible-${Date.now()}`,
        userId: currentEmployee.id,
        title: 'EH Claim Not Allowed',
        message: `You already have a duty on ${post.targetDate}. Only an employee who is OFF that day can claim this EH.`,
        timestamp: new Date().toISOString(),
        read: true,
        type: 'eh-alert',
        actionView: 'market'
      });
      return;
    }

    const owner = employees.find(e => e.id === post.authorId);
    if (!owner || (owner.extraHours[dayIndex] || 0) < 5) return;

    // EH is a separate 5-hour duty worth 2,000 TK; it does not use the normal exchange chain.
    const updatedEmployees = employees.map(emp => {
      if (emp.id !== currentEmployee.id) return emp;
      const nextSchedule = [...emp.schedule];
      const nextTimings = [...emp.timings];
      const nextEH = [...emp.extraHours];
      nextSchedule[dayIndex] = 'Day';
      nextTimings[dayIndex] = '11:00 – 16:00';
      nextEH[dayIndex] = 5;
      return { ...emp, schedule: nextSchedule, timings: nextTimings, extraHours: nextEH };
    });
    setEmployees(updatedEmployees);
    setMarketPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedExchangeSummary: `${currentEmployee.name} claimed ${owner.name}'s EH day for ${post.targetDate} — 2,000 TK`,
      participantIds: [owner.id, currentEmployee.id],
      linkedExchangeId: `eh-${postId}`
    } : p));

    const timestamp = new Date().toISOString();
    const ownerNotif: UserNotification = {
      id: `notif-eh-owner-${postId}`,
      userId: owner.id,
      title: 'EH Day Claimed',
      message: `${currentEmployee.name} claimed your EH day on ${post.targetDate}. The EH duty is now assigned to them for 2,000 TK.`,
      timestamp,
      read: false,
      type: 'eh-alert',
      actionView: 'market',
      metadata: { date: post.targetDate }
    };
    const claimantNotif: UserNotification = {
      id: `notif-eh-claim-${postId}`,
      userId: currentEmployee.id,
      title: 'EH Claim Approved',
      message: `Your EH claim for ${post.targetDate} is confirmed. You will work the EH duty and earn 2,000 TK.`,
      timestamp,
      read: false,
      type: 'eh-alert',
      actionView: 'roster',
      metadata: { date: post.targetDate }
    };
    setNotifications(prev => [ownerNotif, claimantNotif, ...prev]);
    setActiveToast(claimantNotif);

    logRosterChange({
      changedBy: currentEmployee.name,
      changeType: 'Extra Hours (EH)',
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      date: post.targetDate,
      previousShift: 'OFF',
      newShift: 'EH Day',
      previousTiming: 'Rest Day',
      newTiming: '11:00 – 16:00',
      extraHoursDiff: 5,
      reason: `Claimed EH marketplace offer from ${owner.name}; reward 2,000 TK.`
    });
    setAuditLogs(loadAuditLogs());
  };

  const handleClaimDutyPost = (postId: string) => {
    const post = marketPosts.find(p => p.id === postId);
    if (!post || post.type !== 'sell-duty' || post.status !== 'open') return;
    if (post.authorId === currentEmployee.id) return;

    const dayIndex = post.targetDateIndex;
    if (currentEmployee.schedule[dayIndex] !== 'OFF') {
      setActiveToast({
        id: `toast-duty-ineligible-${Date.now()}`,
        userId: currentEmployee.id,
        title: 'Duty Claim Not Allowed',
        message: `You already have a duty scheduled on ${post.targetDate}. You can only claim a full duty on your OFF day.`,
        timestamp: new Date().toISOString(),
        read: true,
        type: 'system',
        actionView: 'market'
      });
      return;
    }

    const seller = employees.find(e => e.id === post.authorId);
    if (!seller) return;

    const dutyShift = post.currentShift || seller.schedule[dayIndex] || 'Day';
    const dutyTiming = post.currentTiming || seller.timings[dayIndex] || '07:00 – 15:30';
    const cashReward = post.dutyReward || 2500;

    // Seller gets day OFF; Claimant takes seller's shift and receives cash reward
    const updatedEmployees = employees.map(emp => {
      if (emp.id === seller.id) {
        const nextSchedule = [...emp.schedule];
        const nextTimings = [...emp.timings];
        nextSchedule[dayIndex] = 'OFF';
        nextTimings[dayIndex] = 'Rest Day';
        return { ...emp, schedule: nextSchedule, timings: nextTimings };
      }
      if (emp.id === currentEmployee.id) {
        const nextSchedule = [...emp.schedule];
        const nextTimings = [...emp.timings];
        nextSchedule[dayIndex] = dutyShift;
        nextTimings[dayIndex] = dutyTiming;
        return { ...emp, schedule: nextSchedule, timings: nextTimings };
      }
      return emp;
    });
    setEmployees(updatedEmployees);

    setMarketPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedExchangeSummary: `${currentEmployee.name} claimed full duty from ${seller.name} for ${post.targetDate} (${dutyShift} Shift) — ${cashReward.toLocaleString()} TK`,
      participantIds: [seller.id, currentEmployee.id],
      linkedExchangeId: `duty-${postId}`
    } : p));

    const timestamp = new Date().toISOString();
    const sellerNotif: UserNotification = {
      id: `notif-duty-seller-${postId}`,
      userId: seller.id,
      title: 'Full Duty Taken (Sold)',
      message: `${currentEmployee.name} agreed to take your full duty on ${post.targetDate} (${dutyShift} shift). You now have the day OFF. Cash compensation: ${cashReward.toLocaleString()} TK.`,
      timestamp,
      read: false,
      type: 'swap-approved',
      actionView: 'roster',
      metadata: { date: post.targetDate }
    };
    const claimantNotif: UserNotification = {
      id: `notif-duty-claimant-${postId}`,
      userId: currentEmployee.id,
      title: 'Full Duty Assignment Confirmed',
      message: `You took ${seller.name}'s duty on ${post.targetDate} (${dutyShift}, ${dutyTiming}). Cash earned: ${cashReward.toLocaleString()} TK.`,
      timestamp,
      read: false,
      type: 'swap-approved',
      actionView: 'roster',
      metadata: { date: post.targetDate }
    };
    setNotifications(prev => [sellerNotif, claimantNotif, ...prev]);
    setActiveToast(claimantNotif);

    logRosterChange({
      changedBy: currentEmployee.name,
      changeType: 'Sell Duty (Paid)',
      employeeId: seller.id,
      employeeName: seller.name,
      date: post.targetDate,
      previousShift: dutyShift,
      newShift: 'OFF',
      previousTiming: dutyTiming,
      newTiming: 'Rest Day',
      reason: `Sold full-time duty to ${currentEmployee.name}; compensation ${cashReward.toLocaleString()} TK.`
    });

    logRosterChange({
      changedBy: currentEmployee.name,
      changeType: 'Sell Duty (Paid)',
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      date: post.targetDate,
      previousShift: 'OFF',
      newShift: dutyShift,
      previousTiming: 'Rest Day',
      newTiming: dutyTiming,
      reason: `Claimed full-time duty from ${seller.name}; earned ${cashReward.toLocaleString()} TK.`
    });

    setAuditLogs(loadAuditLogs());
  };

  const handleCloseMarketPost = (postId: string) => {
    setMarketPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'closed' } : p));
  };

  // Record participant consent. Only unanimous participant consent can commit a roster exchange.
  const handleApproveRequest = (requestId: string) => {
    const req = swapRequests.find(r => r.id === requestId);
    if (!req) return;
    const me = currentEmployee;
    if (!req.participantIds.includes(me.id)) return;
    if (req.state !== 'Pending') return;

    const nextApproved = Array.from(new Set([...req.approvedByIds, me.id]));
    const everyoneAgreed = req.participantIds.every(id => nextApproved.includes(id));

    if (!everyoneAgreed) {
      setSwapRequests(prev => prev.map(r => r.id === requestId ? { ...r, approvedByIds: nextApproved, state: 'Pending' } : r));
      setNotifications(prev => [
        ...prev,
        {
          id: `notif-consent-${Date.now()}`,
          userId: me.id,
          title: 'Agreement Recorded',
          message: `Your agreement is recorded. ${nextApproved.length} of ${req.participantIds.length} participants have agreed.`,
          timestamp: new Date().toISOString(),
          read: true,
          type: 'swap-request',
          actionView: 'swaps',
          metadata: { date: req.targetDate, conversationId: req.groupChatId }
        }
      ]
      );
      return;
    }

    if (!req.plan) return;
    const applied = applyTransfers(req.plan.transfers, req.reason || 'Unanimously approved exchange');
    if (!applied) {
      setSwapRequests(prev => prev.map(r => r.id === requestId ? { ...r, state: 'Pending' } : r));
      setActiveToast({
        id: `toast-exchange-conflict-${Date.now()}`,
        userId: me.id,
        title: 'Exchange Not Applied',
        message: 'The roster changed before approval, so this exchange was not applied. No partial shift change was made.',
        timestamp: new Date().toISOString(),
        read: true,
        type: 'swap-request',
        actionView: 'swaps',
        metadata: { date: req.targetDate, conversationId: req.groupChatId }
      });
      return;
    }
    const approvedAt = new Date().toISOString();
    setSwapRequests(prev => prev.map(r => r.id === requestId ? { ...r, approvedByIds: nextApproved, state: 'Approved' } : r));
    setMarketPosts(prev => prev.map(post => post.linkedRequestId === requestId ? {
      ...post,
      status: 'approved',
      approvedAt,
      approvedExchangeSummary: req.plan?.description,
      participantIds: req.participantIds,
      linkedExchangeId: requestId
    } : post));

    const participantNotifs: UserNotification[] = req.participantIds.map(id => ({
      id: `notif-approved-${requestId}-${id}`,
      userId: id,
      title: 'Exchange Approved by Everyone',
      message: `All ${req.participantIds.length} participants agreed. The roster exchange is now active.`,
      timestamp: approvedAt,
      read: false,
      type: 'swap-approved',
      actionView: 'roster',
      metadata: { date: req.targetDate, conversationId: req.groupChatId }
    }));
    const adminAlert: UserNotification = {
      id: `admin-alert-approved-${requestId}`,
      userId: 'ADMIN',
      title: 'Unanimous Roster Exchange Approved',
      message: `${req.participants.join(', ')} unanimously approved an exchange for ${req.targetDate}.`,
      timestamp: approvedAt,
      read: false,
      type: 'admin-alert',
      actionView: 'history',
      metadata: { date: req.targetDate, conversationId: req.groupChatId }
    };
    setNotifications(prev => [...participantNotifs, adminAlert, ...prev]);
    setActiveToast({
      id: `toast-approved-${requestId}`,
      userId: me.id,
      title: 'Exchange Approved',
      message: 'Everyone agreed. The complete roster change has been applied atomically.',
      timestamp: approvedAt,
      read: true,
      type: 'swap-approved',
      actionView: 'roster'
    });
  };

  // Decline swap request
  const handleDeclineRequest = (requestId: string) => {
    const req = swapRequests.find(r => r.id === requestId);
    setSwapRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, state: 'Declined' } : r
    ));

    if (req) {
      // Alert participants that trade was declined
      const declineNotifs: UserNotification[] = req.participantIds.map(id => ({
        id: `notif-declined-${Date.now()}-${id}`,
        userId: id,
        title: 'Swap Proposal Declined',
        message: `The swap proposal for ${req.targetDate} was declined by ${currentEmployee.name}.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'swap-request',
        actionView: 'swaps'
      }));
      setNotifications(prev => [...declineNotifs, ...prev]);
    }
  };

  // Send message
  const handleSendMessage = (recipientId: string, text: string, shiftAttachment?: any) => {
    const timestamp = new Date().toISOString();
    const groupReq = recipientId.startsWith('EXCHANGE:') ? swapRequests.find(r => r.groupChatId === recipientId) : undefined;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: recipientId === 'TEAM_LOUNGE' ? 'TEAM_LOUNGE' : groupReq ? recipientId : [currentEmployee.id, recipientId].sort().join('_'),
      senderId: currentEmployee.id,
      senderName: currentEmployee.name,
      senderInitials: currentEmployee.initials,
      recipientId,
      text,
      timestamp,
      groupName: groupReq ? `${groupReq.participantIds.length}-Person Exchange` : undefined,
      groupParticipantIds: groupReq?.participantIds,
      shiftAttachment
    };

    setMessages(prev => [...prev, newMsg]);

    if (groupReq) {
      const groupNotifs = groupReq.participantIds.filter(id => id !== currentEmployee.id).map(id => ({
        id: `notif-group-msg-${Date.now()}-${id}`,
        userId: id,
        title: `Message in ${groupReq.participantIds.length}-Person Exchange`,
        message: `${currentEmployee.name}: ${text.length > 70 ? `${text.slice(0, 70)}...` : text}`,
        timestamp,
        read: false,
        type: 'message' as const,
        actionView: 'messages',
        metadata: { conversationId: recipientId }
      }));
      setNotifications(prev => [...groupNotifs, ...prev]);
      return;
    }

    // Notifications according to destination
    if (recipientId === 'TEAM_LOUNGE') {
      // Broadcast notification to colleagues (excluding me)
      const broadcastNotifs: UserNotification[] = employees
        .filter(e => e.id !== currentEmployee.id)
        .slice(0, 3) // Sample alert for active peers
        .map(e => ({
          id: `notif-team-${Date.now()}-${e.id}`,
          userId: e.id,
          title: `Roster Lounge: ${currentEmployee.name}`,
          message: text.length > 60 ? `${text.slice(0, 60)}...` : text,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'message',
          actionView: 'messages'
        }));
      setNotifications(prev => [...broadcastNotifs, ...prev]);
    } else if (recipientId === 'ADMIN_DESK') {
      // Notify Admin
      const adminMsgNotif: UserNotification = {
        id: `notif-admin-msg-${Date.now()}`,
        userId: 'ADMIN',
        title: `Admin Inbox: Message from ${currentEmployee.name}`,
        message: text.length > 70 ? `${text.slice(0, 70)}...` : text,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'message',
        actionView: 'messages',
        metadata: {
          employeeId: currentEmployee.id,
          employeeName: currentEmployee.name
        }
      };
      setNotifications(prev => [adminMsgNotif, ...prev]);
    } else {
      // Direct peer message
      const notif: UserNotification = {
        id: `notif-msg-${Date.now()}`,
        userId: recipientId,
        title: `New Message from ${currentEmployee.name}`,
        message: text.length > 60 ? `${text.slice(0, 60)}...` : text,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'message',
        actionView: 'messages'
      };
      setNotifications(prev => [notif, ...prev]);
    }

    // Interactive Toast for sender confirmation
    const sentToast: UserNotification = {
      id: `toast-sent-${Date.now()}`,
      userId: currentEmployee.id,
      title: 'Message Sent',
      message: `Your shift coordination message was delivered.`,
      timestamp: new Date().toISOString(),
      read: true,
      type: 'message',
      actionView: 'messages'
    };
    setActiveToast(sentToast);
  };

  // Reset demo
  const handleResetDemo = () => {
    resetAllData();
    setEmployees(loadEmployees());
    setDays(loadDays());
    setSwapRequests(loadRequests());
    setAuditLogs(loadAuditLogs());
    setMessages(loadMessages());
    setNotifications(loadNotifications());
    setMarketPosts(loadMarketPosts());
  };

  // 1. If no organization selected, render Home Page with SCB option
  if (!selectedOrg) {
    return (
      <OrgSelectLandingView
        onSelectOrg={(org) => setSelectedOrg(org)}
      />
    );
  }

  // 2. If not logged in, render clean LoginView
  if (!session) {
    return (
      <LoginView
        employees={employees}
        onLoginEmployee={handleLoginEmployee}
        onLoginAdmin={handleLoginAdmin}
        onBackToOrgSelect={() => setSelectedOrg(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* Responsive Sidebar */}
      <Sidebar
        activeView={activeView}
        userRole={userRole}
        currentEmployee={currentEmployee}
        pendingRequestsCount={pendingRequestsCount}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotifsCount={unreadNotifsCount}
        totalChangesCount={auditLogs.length}
        openMarketPostsCount={openMarketPostsCount}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
        onNavigate={(view) => setActiveView(view)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentEmployee={currentEmployee}
          userRole={userRole}
          unreadNotifsCount={unreadNotifsCount}
          unreadMessagesCount={unreadMessagesCount}
          notifications={relevantNotifs}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigate={(view) => setActiveView(view)}
          onLogout={handleLogout}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onToggleRole={handleToggleRole}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeView === 'board' && (
            <PersonalBoard
              employee={currentEmployee}
              days={days}
              swapRequests={swapRequests}
              messages={messages}
              auditLogs={auditLogs}
              notices={notices}
              onOpenSwapModal={handleOpenSwapModal}
              onNavigate={(view) => setActiveView(view)}
            />
          )}

          {activeView === 'roster' && (
            <RosterView
              employee={currentEmployee}
              days={days}
              onOpenSwapModal={handleOpenSwapModal}
            />
          )}

          {activeView === 'market' && (
            <MarketView
              posts={marketPosts}
              marketPosts={marketPosts}
              currentEmployee={currentEmployee}
              allEmployees={employees}
              days={days}
              onCreatePost={handleCreateMarketPost}
              onMatchPost={handleMatchMarketPost}
              onClosePost={handleCloseMarketPost}
              onClaimEHPost={handleClaimEHPost}
              onClaimDutyPost={handleClaimDutyPost}
              onOpenChatWith={(_empId) => setActiveView('messages')}
              onNavigate={(view) => setActiveView(view)}
            />
          )}

          {activeView === 'swaps' && (
            <SwapDeskView
              requests={swapRequests}
              currentEmployee={currentEmployee}
              allEmployees={employees}
              userRole={userRole}
              onApproveRequest={handleApproveRequest}
              onDeclineRequest={handleDeclineRequest}
              onOpenNewSwap={() => handleOpenSwapModal(0, 'timing-change')}
              onOpenGroupChat={(requestId) => { const req = swapRequests.find(r => r.id === requestId); if (req?.groupChatId) { setActiveChatId(req.groupChatId); setActiveView('messages'); } }}
            />
          )}

          {activeView === 'messages' && (
            <MessagesView
              currentEmployee={currentEmployee}
              allEmployees={employees}
              messages={messages}
              days={days}
              onSendMessage={handleSendMessage}
              exchangeRequests={swapRequests}
              initialConversationId={activeChatId}
              onOpenSwapModal={handleOpenSwapModal}
              onSwitchUser={(newId) => setSession({ userId: newId, role: userRole })}
              onApproveRequest={handleApproveRequest}
              onDeclineRequest={handleDeclineRequest}
            />
          )}

          {activeView === 'notifications' && (
            <NotificationCenter
              notifications={notifications}
              currentEmployee={currentEmployee}
              userRole={userRole}
              onMarkAllAsRead={handleMarkNotificationsRead}
              onClearAll={handleClearAllNotifications}
              onMarkOneAsRead={handleMarkOneNotificationRead}
              onDeleteOne={handleDeleteOneNotification}
              onNavigate={(view) => setActiveView(view)}
            />
          )}

          {activeView === 'history' && (
            <AuditLogView
              auditLogs={auditLogs}
              currentEmployee={currentEmployee}
              userRole={userRole}
            />
          )}

          {activeView === 'team' && (
            <TeamAvailability
              employees={employees}
              days={days}
            />
          )}

          {activeView === 'admin' && (
            <AdminPortal
              employees={employees}
              days={days}
              auditLogs={auditLogs}
              userSessions={userSessions}
              notices={notices}
              onUpdateNotices={setNotices}
              onSendAdminMessage={handleSendAdminMessage}
              onUpdateEmployees={setEmployees}
              onUpdateDays={setDays}
              onResetDemo={handleResetDemo}
              onLogChange={(params) => {
                logRosterChange(params);
                setAuditLogs(loadAuditLogs());

                // Alert staff about admin modification
                const rosterNotif: UserNotification = {
                  id: `admin-mutation-notif-${Date.now()}`,
                  userId: params.employeeId === 'ALL' ? 'ALL' : params.employeeId,
                  title: 'Official Roster Modification',
                  message: `Roster on ${params.date} updated by ${params.changedBy}: ${params.previousShift} → ${params.newShift}. Reason: ${params.reason || 'Admin optimization'}`,
                  timestamp: new Date().toISOString(),
                  read: false,
                  type: 'roster-updated',
                  actionView: 'roster'
                };
                setNotifications(prev => [rosterNotif, ...prev]);
                setActiveToast(rosterNotif);
              }}
            />
          )}
        </main>
      </div>

      {/* Interactive Swap & Timing Change Modal */}
      <SwapModal
        isOpen={swapModalConfig.isOpen}
        onClose={() => setSwapModalConfig(prev => ({ ...prev, isOpen: false }))}
        initialDayIndex={swapModalConfig.dayIndex}
        initialTab={swapModalConfig.tab}
        currentEmployee={currentEmployee}
        allEmployees={employees}
        days={days}
        onSubmitPlan={handleSubmitPlan}
        onDirectTimingChange={handleDirectTimingChange}
        onSwapColleagueShift={handleSwapColleagueShift}
        onAdjustEH={handleAdjustEH}
        onCreateMarketPost={handleCreateMarketPost}
      />

      {/* Floating Live Real-Time Toast Notification */}
      <NotificationToast
        notification={activeToast}
        onDismiss={() => setActiveToast(null)}
        onNavigate={(view) => setActiveView(view)}
      />
    </div>
  );
}
