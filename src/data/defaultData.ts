import { Employee, ShiftCategory, ShiftInfo, DaySchedule, RosterChangeLog, ChatMessage, UserNotification, MarketPost, UserSessionLog, NoticePost } from '../types';

export const EH_DUTY_HOURS = 5; // Standard 5-hour Extra Duty day
export const EH_COMPENSATION_TK = 2000; // 2,000 TK per Extra Duty day

export const SHIFT_DEFINITIONS: Record<ShiftCategory, ShiftInfo> = {
  'Morning': {
    category: 'Morning',
    time: '07:00 – 15:30',
    startTime: '07:00',
    endTime: '15:30',
    maleOnly: false,
    colorBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    colorText: 'text-emerald-700',
    icon: 'Sun'
  },
  'Day': {
    category: 'Day',
    time: '10:00 – 18:30',
    startTime: '10:00',
    endTime: '18:30',
    maleOnly: false,
    colorBg: 'bg-sky-50 text-sky-900 border-sky-200',
    colorText: 'text-sky-700',
    icon: 'Clock'
  },
  'Evening': {
    category: 'Evening',
    time: '13:30 – 22:00',
    startTime: '13:30',
    endTime: '22:00',
    maleOnly: false,
    colorBg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    colorText: 'text-indigo-700',
    icon: 'Sunset'
  },
  'Night': {
    category: 'Night',
    time: '16:00 – 00:00',
    startTime: '16:00',
    endTime: '00:00',
    maleOnly: true, // Prohibited for females (ends after 22:00)
    colorBg: 'bg-amber-50 text-amber-950 border-amber-300',
    colorText: 'text-amber-800',
    icon: 'Moon'
  },
  'Overnight': {
    category: 'Overnight',
    time: '22:30 – 07:30',
    startTime: '22:30',
    endTime: '07:30',
    maleOnly: true, // Prohibited for females (ends after 22:00)
    colorBg: 'bg-purple-950 text-purple-100 border-purple-800',
    colorText: 'text-purple-300',
    icon: 'Sparkles'
  },
  'OFF': {
    category: 'OFF',
    time: 'Rest Day',
    startTime: '00:00',
    endTime: '00:00',
    maleOnly: false,
    colorBg: 'bg-slate-100 text-slate-600 border-slate-200',
    colorText: 'text-slate-500',
    icon: 'Minus'
  },
  'Maternity Leave': {
    category: 'Maternity Leave',
    time: 'Statutory Leave',
    startTime: '00:00',
    endTime: '00:00',
    maleOnly: false,
    isLeave: true,
    isProtected: true, // Non-exchangeable!
    colorBg: 'bg-rose-50 text-rose-900 border-rose-200',
    colorText: 'text-rose-700',
    icon: 'ShieldAlert'
  },
  'Parental Leave': {
    category: 'Parental Leave',
    time: 'Protected Leave',
    startTime: '00:00',
    endTime: '00:00',
    maleOnly: false,
    isLeave: true,
    isProtected: true, // Non-exchangeable!
    colorBg: 'bg-teal-50 text-teal-900 border-teal-200',
    colorText: 'text-teal-700',
    icon: 'HeartHandshake'
  },
  'Annual Leave': {
    category: 'Annual Leave',
    time: 'Approved PTO',
    startTime: '00:00',
    endTime: '00:00',
    maleOnly: false,
    isLeave: true,
    colorBg: 'bg-blue-50 text-blue-900 border-blue-200',
    colorText: 'text-blue-700',
    icon: 'Calendar'
  },
  'Sick Leave': {
    category: 'Sick Leave',
    time: 'Medical Rest',
    startTime: '00:00',
    endTime: '00:00',
    maleOnly: false,
    isLeave: true,
    colorBg: 'bg-orange-50 text-orange-900 border-orange-200',
    colorText: 'text-orange-700',
    icon: 'Cross'
  }
};

export const DEFAULT_DAYS: DaySchedule[] = [
  { date: '2026-09-14', dayName: 'Mon', dayNumber: '14', month: 'Sep' },
  { date: '2026-09-15', dayName: 'Tue', dayNumber: '15', month: 'Sep' },
  { date: '2026-09-16', dayName: 'Wed', dayNumber: '16', month: 'Sep' },
  { date: '2026-09-17', dayName: 'Thu', dayNumber: '17', month: 'Sep' },
  { date: '2026-09-18', dayName: 'Fri', dayNumber: '18', month: 'Sep' },
  { date: '2026-09-19', dayName: 'Sat', dayNumber: '19', month: 'Sep' },
  { date: '2026-09-20', dayName: 'Sun', dayNumber: '20', month: 'Sep' },
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-41055',
    name: 'Emdadul Haque',
    gender: 'male',
    initials: 'EH',
    role: 'Senior Operations Representative',
    department: 'Priority Client Services',
    phone: '+880 1873-380007',
    email: 'e.haque@shiftly.corp',
    schedule: ['Night', 'Night', 'Day', 'OFF', 'Night', 'Night', 'OFF'],
    timings: ['16:00 – 24:00', '16:00 – 24:00', '10:00 – 18:30', 'Rest Day', '16:00 – 24:00', '16:00 – 24:00', 'Rest Day'],
    extraHours: [2, 0, 0, 0, 3, 0, 0], // Extra hours paid overtime
    protectedLeaves: [null, null, null, null, null, null, null]
  },
  {
    id: 'EMP-41062',
    name: 'Farah Rahman',
    gender: 'female',
    initials: 'FR',
    role: 'Customer Operations Executive',
    department: 'Retail Cards & Dispute Help',
    phone: '+880 1711-224466',
    email: 'farah.rahman@shiftly.corp',
    schedule: ['Morning', 'OFF', 'Evening', 'Day', 'OFF', 'Evening', 'OFF'],
    timings: ['07:00 – 15:30', 'Rest Day', '13:30 – 22:00', '10:00 – 18:30', 'Rest Day', '13:30 – 22:00', 'Rest Day'],
    extraHours: [0, 0, 2, 0, 0, 0, 0],
    protectedLeaves: [null, null, null, null, null, null, null]
  },
  {
    id: 'EMP-39218',
    name: 'Saad Ahmed',
    gender: 'male',
    initials: 'SA',
    role: 'Customer Operations Specialist',
    department: 'Fraud Prevention & Risk Desk',
    phone: '+880 1819-335577',
    email: 'saad.ahmed@shiftly.corp',
    schedule: ['Morning', 'Day', 'OFF', 'Night', 'Night', 'OFF', 'Day'],
    timings: ['07:00 – 15:30', '10:00 – 18:30', 'Rest Day', '16:00 – 24:00', '16:00 – 24:00', 'Rest Day', '10:00 – 18:30'],
    extraHours: [0, 2, 0, 0, 2, 0, 0],
    protectedLeaves: [null, null, null, null, null, null, null]
  },
  {
    id: 'EMP-45077',
    name: 'Neela Chowdhury',
    gender: 'female',
    initials: 'NC',
    role: 'Senior Customer Service Lead',
    department: 'Digital Platform Support',
    phone: '+880 1912-998877',
    email: 'neela.chowdhury@shiftly.corp',
    schedule: ['Day', 'Morning', 'OFF', 'Morning', 'Day', 'Evening', 'Morning'],
    timings: ['10:00 – 18:30', '07:00 – 15:30', 'Rest Day', '07:00 – 15:30', '10:00 – 18:30', '13:30 – 22:00', '07:00 – 15:30'],
    extraHours: [0, 0, 0, 0, 0, 1.5, 0],
    protectedLeaves: [null, null, null, null, null, null, null]
  },
  {
    id: 'EMP-43819',
    name: 'Imran Hossain',
    gender: 'male',
    initials: 'IH',
    role: 'Operations Officer',
    department: 'Remittance & Global Desk',
    phone: '+880 1622-445566',
    email: 'imran.hossain@shiftly.corp',
    schedule: ['OFF', 'Day', 'Morning', 'Evening', 'Overnight', 'Morning', 'Day'],
    timings: ['Rest Day', '10:00 – 18:30', '07:00 – 15:30', '13:30 – 22:00', '22:30 – 07:30', '07:00 – 15:30', '10:00 – 18:30'],
    extraHours: [0, 0, 0, 0, 4, 0, 0],
    protectedLeaves: [null, null, null, null, null, null, null]
  },
  {
    id: 'EMP-42139',
    name: 'Kabir Hasan',
    gender: 'male',
    initials: 'KH',
    role: 'Tier-2 Technical Specialist',
    department: 'Merchant Services Unit',
    phone: '+880 1733-112233',
    email: 'kabir.hasan@shiftly.corp',
    schedule: ['Morning', 'Evening', 'OFF', 'Day', 'Morning', 'Night', 'Morning'],
    timings: ['07:00 – 15:30', '13:30 – 22:00', 'Rest Day', '10:00 – 18:30', '07:00 – 15:30', '16:00 – 24:00', '07:00 – 15:30'],
    extraHours: [0, 0, 0, 2, 0, 0, 0],
    protectedLeaves: [null, null, null, null, null, null, null]
  },
  {
    id: 'EMP-46026',
    name: 'Tania Islam',
    gender: 'female',
    initials: 'TI',
    role: 'Resolution Specialist',
    department: 'Client Escalation Care',
    phone: '+880 1844-556677',
    email: 'tania.islam@shiftly.corp',
    // Tania has Thursday as Maternity/Parental leave, which CANNOT be exchanged!
    schedule: ['Morning', 'OFF', 'Morning', 'Parental Leave', 'Evening', 'Day', 'Morning'],
    timings: ['07:00 – 15:30', 'Rest Day', '07:00 – 15:30', 'Protected Leave', '13:30 – 22:00', '10:00 – 18:30', '07:00 – 15:30'],
    extraHours: [0, 0, 0, 0, 0, 0, 0],
    protectedLeaves: [null, null, null, 'Parental Leave', null, null, null]
  },
  {
    id: 'EMP-47550',
    name: 'Rafi Sarker',
    gender: 'male',
    initials: 'RS',
    role: 'Operations Specialist',
    department: 'Customer Care & Escalations',
    phone: '+880 1955-889900',
    email: 'rafi.sarker@shiftly.corp',
    schedule: ['Morning', 'Morning', 'Day', 'Night', 'Morning', 'OFF', 'Day'],
    timings: ['07:00 – 15:30', '07:00 – 15:30', '10:00 – 18:30', '16:00 – 24:00', '07:00 – 15:30', 'Rest Day', '10:00 – 18:30'],
    extraHours: [1.5, 0, 0, 0, 0, 0, 0],
    protectedLeaves: [null, null, null, null, null, null, null]
  }
];

export const DEFAULT_AUDIT_LOGS: RosterChangeLog[] = [
  {
    id: 'log-01',
    timestamp: '2026-09-10T14:20:00Z',
    changedBy: 'Admin Moderator',
    changeType: 'File Roster Upload',
    employeeId: 'ALL',
    employeeName: 'All 8 Team Staff Members',
    date: '2026-09-14 to 2026-09-20',
    previousShift: 'Draft Roster',
    newShift: 'Published Official Roster',
    reason: 'Weekly workforce roster published for review',
    status: 'Applied'
  },
  {
    id: 'log-02',
    timestamp: '2026-09-11T09:15:00Z',
    changedBy: 'Emdadul Haque',
    changeType: 'Extra Hours (EH)',
    employeeId: 'EMP-41055',
    employeeName: 'Emdadul Haque',
    date: '2026-09-14',
    previousShift: 'Night (0h EH)',
    newShift: 'Night (EH Day)',
    extraHoursDiff: 2,
    reason: 'Approved peak volume surge coverage',
    status: 'Applied'
  }
];

// Real user-generated messages only. No unsolicited placeholder messages.
export const DEFAULT_MESSAGES: ChatMessage[] = [];

// Real user notifications only. No unsolicited fake notifications.
export const DEFAULT_NOTIFICATIONS: UserNotification[] = [];

// Community shift exchange market posts. Real posts only.
export const DEFAULT_MARKET_POSTS: MarketPost[] = [];

// Admin notice board announcements
export const DEFAULT_NOTICES: NoticePost[] = [
  {
    id: 'notice-1',
    title: 'Standard Chartered Bank — Operations Shift Compliance & EH Policy',
    content: 'Welcome to the workforce roster platform. Extra Duty (EH) represents 5 hours of extra duty with standard compensation of 2,000 TK. Shift swaps must adhere to 11-hour rest intervals and regulatory female timing guidelines (02:00–22:00 max).',
    priority: 'Important',
    createdAt: new Date().toISOString(),
    authorName: 'Admin'
  }
];

// Initial user session monitoring records for admin dashboard
export const DEFAULT_USER_SESSIONS: UserSessionLog[] = [
  {
    id: 'sess-admin',
    userId: 'ADMIN',
    userName: 'Operations Admin',
    userRole: 'System Administrator',
    userInitials: 'AD',
    status: 'online',
    loginTime: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 mins ago
    device: 'Desktop Workstation (Chrome 128 / Win11)',
    ipLocation: 'SCB Secure Corporate Gateway'
  },
  {
    id: 'sess-emp-1',
    userId: 'EMP-41055',
    userName: 'Emdadul Haque',
    userRole: 'Team Lead',
    userInitials: 'EH',
    status: 'online',
    loginTime: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
    device: 'SCB ThinClient-402',
    ipLocation: 'Main Operations Floor (Level 5)'
  },
  {
    id: 'sess-emp-2',
    userId: 'EMP-41062',
    userName: 'Farah Rahman',
    userRole: 'Customer Operations Executive',
    userInitials: 'FR',
    status: 'offline',
    loginTime: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    logoutTime: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // logged out 18 mins ago
    device: 'Mobile Safari / iOS 17.5',
    ipLocation: 'SCB Intranet WiFi'
  },
  {
    id: 'sess-emp-3',
    userId: 'EMP-39218',
    userName: 'Saad Ahmed',
    userRole: 'Customer Operations Specialist',
    userInitials: 'SA',
    status: 'offline',
    loginTime: new Date(Date.now() - 1000 * 60 * 260).toISOString(),
    logoutTime: new Date(Date.now() - 1000 * 60 * 55).toISOString(), // logged out 55 mins ago
    device: 'Desktop Workstation (Edge / Win11)',
    ipLocation: 'Gulshan Branch Operations Center'
  },
  {
    id: 'sess-emp-4',
    userId: 'EMP-45077',
    userName: 'Neela Chowdhury',
    userRole: 'Senior Customer Service Lead',
    userInitials: 'NC',
    status: 'online',
    loginTime: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 mins ago
    device: 'SCB ThinClient-118',
    ipLocation: 'Digital Banking Support Desk'
  }
];
