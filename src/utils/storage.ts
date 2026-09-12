import { Employee, DaySchedule, SwapRequest, RosterChangeLog, ChatMessage, UserNotification, MarketPost, UserSessionLog, NoticePost } from '../types';
import { DEFAULT_EMPLOYEES, DEFAULT_DAYS, DEFAULT_AUDIT_LOGS, DEFAULT_MESSAGES, DEFAULT_NOTIFICATIONS, DEFAULT_MARKET_POSTS, DEFAULT_USER_SESSIONS, DEFAULT_NOTICES } from '../data/defaultData';

const KEYS = {
  EMPLOYEES: 'shiftly_workforce_employees_v4',
  DAYS: 'shiftly_workforce_days_v4',
  REQUESTS: 'shiftly_workforce_requests_v4',
  AUDIT_LOGS: 'shiftly_workforce_audit_logs_v4',
  MESSAGES: 'shiftly_workforce_messages_v4',
  NOTIFICATIONS: 'shiftly_workforce_notifications_v4',
  MARKET_POSTS: 'shiftly_workforce_market_posts_v4',
  USER_SESSIONS: 'shiftly_workforce_sessions_log_v4',
  NOTICES: 'shiftly_workforce_notices_v4',
  SELECTED_ORG: 'shiftly_workforce_selected_org_v4',
  SESSION: 'shiftly_workforce_auth_session_v4'
};

// Clear legacy branded storage keys if present
try {
  const legacyPrefixes = ['shiftly_scb_'];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && legacyPrefixes.some(p => k.startsWith(p))) {
      localStorage.removeItem(k);
    }
  }
} catch {
  // Ignore in restricted environments
}

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage:`, e);
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to set ${key} in localStorage:`, e);
  }
}

export function loadEmployees(): Employee[] {
  return getStorage(KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
}

export function saveEmployees(employees: Employee[]): void {
  setStorage(KEYS.EMPLOYEES, employees);
}

export function loadDays(): DaySchedule[] {
  return getStorage(KEYS.DAYS, DEFAULT_DAYS);
}

export function saveDays(days: DaySchedule[]): void {
  setStorage(KEYS.DAYS, days);
}

export function loadRequests(): SwapRequest[] {
  return getStorage(KEYS.REQUESTS, []);
}

export function saveRequests(requests: SwapRequest[]): void {
  setStorage(KEYS.REQUESTS, requests);
}

export function loadAuditLogs(): RosterChangeLog[] {
  return getStorage(KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);
}

export function saveAuditLogs(logs: RosterChangeLog[]): void {
  setStorage(KEYS.AUDIT_LOGS, logs);
}

export function loadMessages(): ChatMessage[] {
  return getStorage(KEYS.MESSAGES, DEFAULT_MESSAGES);
}

export function saveMessages(messages: ChatMessage[]): void {
  setStorage(KEYS.MESSAGES, messages);
}

export function loadNotifications(): UserNotification[] {
  return getStorage(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
}

export function saveNotifications(notifs: UserNotification[]): void {
  setStorage(KEYS.NOTIFICATIONS, notifs);
}

export function loadMarketPosts(): MarketPost[] {
  return getStorage<MarketPost[]>(KEYS.MARKET_POSTS, []);
}

export function saveMarketPosts(posts: MarketPost[]): void {
  setStorage(KEYS.MARKET_POSTS, posts);
}

export function loadUserSessions(): UserSessionLog[] {
  return getStorage<UserSessionLog[]>(KEYS.USER_SESSIONS, DEFAULT_USER_SESSIONS);
}

export function saveUserSessions(sessions: UserSessionLog[]): void {
  setStorage(KEYS.USER_SESSIONS, sessions);
}

export function loadNotices(): NoticePost[] {
  return getStorage<NoticePost[]>(KEYS.NOTICES, DEFAULT_NOTICES);
}

export function saveNotices(notices: NoticePost[]): void {
  setStorage(KEYS.NOTICES, notices);
}

export function loadSelectedOrg(): string | null {
  return getStorage<string | null>(KEYS.SELECTED_ORG, null);
}

export function saveSelectedOrg(org: string | null): void {
  if (org) {
    setStorage(KEYS.SELECTED_ORG, org);
  } else {
    localStorage.removeItem(KEYS.SELECTED_ORG);
  }
}

export interface SessionInfo {
  userId: string;
  role: 'employee' | 'admin';
}

export function loadSession(): SessionInfo | null {
  const session = getStorage<SessionInfo | null>(KEYS.SESSION, null);
  if (session && session.userId && session.userId.startsWith('SCB-')) {
    session.userId = session.userId.replace('SCB-', 'EMP-');
  }
  return session;
}

export function saveSession(session: SessionInfo | null): void {
  if (session) {
    setStorage(KEYS.SESSION, session);
  } else {
    localStorage.removeItem(KEYS.SESSION);
  }
}

/**
 * Logs a roster change, adds to audit history, and creates an alert for the Admin.
 */
export function logRosterChange(params: {
  changedBy: string;
  changeType: RosterChangeLog['changeType'];
  employeeId: string;
  employeeName: string;
  date: string;
  previousShift: string;
  newShift: string;
  previousTiming?: string;
  newTiming?: string;
  extraHoursDiff?: number;
  reason?: string;
}): RosterChangeLog {
  const currentLogs = loadAuditLogs();
  const newLog: RosterChangeLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    changedBy: params.changedBy,
    changeType: params.changeType,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    date: params.date,
    previousShift: params.previousShift,
    newShift: params.newShift,
    previousTiming: params.previousTiming,
    newTiming: params.newTiming,
    extraHoursDiff: params.extraHoursDiff,
    reason: params.reason || 'Roster swap or timing update',
    status: 'Applied'
  };

  const updatedLogs = [newLog, ...currentLogs];
  saveAuditLogs(updatedLogs);

  // Notify Admin
  const notifs = loadNotifications();
  const adminNotif: UserNotification = {
    id: `notif-admin-${Date.now()}`,
    userId: 'ADMIN',
    title: `Roster Updated: ${params.employeeName}`,
    message: `${params.changedBy} made a ${params.changeType} for ${params.employeeName} on ${params.date} (${params.previousShift} → ${params.newShift}).`,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'roster-updated',
    actionView: 'admin'
  };

  // Also notify the affected employee if changed by someone else
  if (params.changedBy !== params.employeeName) {
    const empNotif: UserNotification = {
      id: `notif-emp-${Date.now()}`,
      userId: params.employeeId,
      title: 'Your Shift Was Updated',
      message: `${params.changedBy} updated your shift on ${params.date} to ${params.newShift}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'roster-updated',
      actionView: 'roster'
    };
    notifs.unshift(empNotif);
  }

  notifs.unshift(adminNotif);
  saveNotifications(notifs);

  return newLog;
}

export function resetAllData(): void {
  localStorage.removeItem(KEYS.EMPLOYEES);
  localStorage.removeItem(KEYS.DAYS);
  localStorage.removeItem(KEYS.REQUESTS);
  localStorage.removeItem(KEYS.AUDIT_LOGS);
  localStorage.removeItem(KEYS.MESSAGES);
  localStorage.removeItem(KEYS.NOTIFICATIONS);
  localStorage.removeItem(KEYS.MARKET_POSTS);
  localStorage.removeItem(KEYS.USER_SESSIONS);
  localStorage.removeItem(KEYS.NOTICES);
  saveEmployees(DEFAULT_EMPLOYEES);
  saveDays(DEFAULT_DAYS);
  saveAuditLogs(DEFAULT_AUDIT_LOGS);
  saveMessages([]);
  saveNotifications([]);
  saveMarketPosts([]);
  saveUserSessions(DEFAULT_USER_SESSIONS);
  saveNotices(DEFAULT_NOTICES);
}
