export type Gender = 'male' | 'female';

export type ShiftCategory = 
  | 'Morning' 
  | 'Day' 
  | 'Evening' 
  | 'Night' 
  | 'Overnight' 
  | 'OFF' 
  | 'Maternity Leave' 
  | 'Parental Leave' 
  | 'Annual Leave' 
  | 'Sick Leave';

export interface ShiftInfo {
  category: ShiftCategory;
  time: string;
  startTime: string; // "07:00"
  endTime: string;   // "15:30"
  maleOnly: boolean;
  isLeave?: boolean;
  isProtected?: boolean; // Maternity / Parental leave cannot be exchanged!
  colorBg: string;
  colorText: string;
  colorBorder?: string;
  icon: string;
}

export interface DaySchedule {
  date: string;       // "2026-09-14"
  dayName: string;    // "Mon"
  dayNumber: string;  // "14"
  month: string;      // "Sep"
}

export interface Employee {
  id: string;         // e.g. "EMP-41055"
  name: string;       // e.g. "Emdadul Haque"
  gender: Gender;
  initials: string;   // e.g. "EH"
  role: string;       // e.g. "Customer Care Specialist"
  department: string; // e.g. "Inbound Card Services"
  phone?: string;
  email?: string;
  schedule: ShiftCategory[]; // Array of categories for the 7 days
  timings: string[];         // Specific time strings, e.g. "16:00 – 24:00"
  extraHours: number[];      // Extra Hours (EH) per day, e.g. [0, 2, 0, 0, 4, 0, 0]
  protectedLeaves?: (string | null)[]; // Leave reason if non-exchangeable
}

export interface SwapTransfer {
  fromEmployeeId: string;
  toEmployeeId: string;
  dateIndex: number;
  date: string;
  fromShift: ShiftCategory;
  fromTiming: string;
  toShift: ShiftCategory;
  toTiming: string;
  isEH?: boolean;
}

export interface SwapPlan {
  id: string;
  members: string[]; // employee IDs
  type: 'direct-2' | 'circular-3' | 'circular-4' | 'circular-5' | 'market-chain' | 'timing-change' | 'eh-exchange';
  transfers: SwapTransfer[];
  /** Final schedule instructions for multi-person chains. These are applied atomically only after every participant agrees. */
  assignments?: ShiftAssignment[];
  description: string;
  score: number;
}

export type SwapRequestState = 'Pending' | 'Approved' | 'Declined' | 'Completed';

export interface ShiftAssignment {
  employeeId: string;
  dateIndex: number;
  date: string;
  shift: ShiftCategory;
  timing: string;
  sourceEmployeeId: string;
  sourceEmployeeName: string;
  sourceDateIndex: number;
  sourceDate: string;
}

export interface SwapRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  type: 'day-off' | 'timing-change' | 'eh-claim' | 'admin-override';
  targetDateIndex: number;
  targetDate: string;
  currentShift: ShiftCategory;
  currentTiming: string;
  requestedShift?: ShiftCategory;
  requestedTiming?: string;
  participants: string[]; // Employee names
  participantIds: string[];
  approvedByIds: string[];
  /** All participants must consent before a plan can be applied. */
  consentRequiredCount?: number;
  groupChatId?: string;
  plan?: SwapPlan;
  reason?: string;
  createdAt: string;
  state: SwapRequestState;
}

export interface RosterChangeLog {
  id: string;
  timestamp: string; // ISO string
  changedBy: string; // e.g. "Emdadul Haque" or "Admin Moderator"
  changeType: 'Shift Swap' | 'Timing Change' | 'Extra Hours (EH)' | 'Day Off Exchange' | 'Admin Direct Edit' | 'File Roster Upload' | 'Market Match' | 'Sell Duty (Paid)';
  employeeId: string;
  employeeName: string;
  date: string;
  previousShift: string;
  newShift: string;
  previousTiming?: string;
  newTiming?: string;
  extraHoursDiff?: number;
  reason?: string;
  status: 'Applied' | 'Reverted';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  recipientId: string;
  text: string;
  timestamp: string;
  groupName?: string;
  groupParticipantIds?: string[];
  shiftAttachment?: {
    date: string;
    shift: ShiftCategory;
    timing: string;
    note?: string;
  };
}

export interface Conversation {
  id: string;
  participantIds: [string, string];
  otherParticipant: {
    id: string;
    name: string;
    gender: Gender;
    initials: string;
    role: string;
  };
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'swap-request' | 'swap-approved' | 'roster-updated' | 'message' | 'eh-alert' | 'admin-alert' | 'market-match' | 'system';
  actionView?: string;
  metadata?: {
    employeeId?: string;
    employeeName?: string;
    date?: string;
    previousShift?: string;
    newShift?: string;
    extraHoursDiff?: number;
    conversationId?: string;
    senderId?: string;
    postId?: string;
  };
}

export interface MarketPost {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorGender: Gender;
  authorRole: string;
  type: 'desire-day-off' | 'desire-work-shift' | 'eh-offer' | 'sell-duty';
  targetDate: string;
  targetDateIndex: number;
  currentShift: ShiftCategory;
  currentTiming: string;
  desiredShift: ShiftCategory | 'OFF';
  desiredTiming?: string;
  willingToOffer: string;
  offeredDateIndex?: number;
  offeredDate?: string;
  offeredShift?: ShiftCategory;
  offeredTiming?: string;
  note: string;
  createdAt: string;
  status: 'open' | 'pending' | 'approved' | 'matched' | 'closed';
  matchedWithId?: string;
  matchedWithName?: string;
  linkedRequestId?: string;
  approvedAt?: string;
  approvedExchangeSummary?: string;
  participantIds?: string[];
  ehReward?: number;
  dutyReward?: number;
  linkedExchangeId?: string;
}

export interface MarketMatchOption {
  postId: string;
  isEligible: boolean;
  ineligibilityReason?: string;
  matchType: 'direct-timing' | 'day-off-exchange' | 'cover-trade' | 'multi-step';
  summary: string;
  pathDescription: string;
  steps: {
    title: string;
    description: string;
    from: string;
    to: string;
    shiftGiven: string;
    shiftReceived: string;
  }[];
  userGivesShift: ShiftCategory;
  userGivesTiming: string;
  userReceivesShift: ShiftCategory;
  userReceivesTiming: string;
  targetDate: string;
  targetDateIndex: number;
  returnDate?: string;
  returnDateIndex?: number;
  feasibilityScore?: number; // 0-50
  attractivenessScore?: number; // 0-50
  totalScore?: number; // 0-100
  hierarchyRank?: number;
  matchHighlight?: string; // e.g., "🌟 Best Fit for Day Off" or "💰 Highest Extra Pay (2,000 TK)"
  plan?: SwapPlan;
}

export interface UserSessionLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  userInitials?: string;
  role?: 'employee' | 'admin';
  status: 'online' | 'offline';
  loginTime: string;
  logoutTime?: string;
  device?: string;
  deviceInfo?: string;
  ipLocation?: string;
  ipAddress?: string;
}

export interface NoticePost {
  id: string;
  title: string;
  content: string;
  priority: 'Urgent' | 'Important' | 'General' | 'high' | 'normal';
  createdAt?: string;
  date?: string;
  author?: string;
  authorName: string;
  acknowledgedBy?: string[];
  targetAudience?: string;
}
