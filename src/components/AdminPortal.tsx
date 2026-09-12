import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  SlidersHorizontal, 
  Plus, 
  Save, 
  RotateCcw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Edit3, 
  DollarSign, 
  Lock,
  History,
  Trash2,
  FolderArchive,
  Megaphone,
  Activity,
  Send,
  Bell,
  Check,
  Globe,
  Monitor
} from 'lucide-react';
import { Employee, DaySchedule, ShiftCategory, RosterChangeLog, UserSessionLog, NoticePost } from '../types';
import { SHIFT_DEFINITIONS, DEFAULT_NOTICES, DEFAULT_USER_SESSIONS } from '../data/defaultData';
import { parseRosterData, checkShiftEligibility, isShiftProtected } from '../utils/rosterEngine';

interface AdminPortalProps {
  employees: Employee[];
  days: DaySchedule[];
  auditLogs: RosterChangeLog[];
  userSessions?: UserSessionLog[];
  notices?: NoticePost[];
  onUpdateEmployees: (updated: Employee[]) => void;
  onUpdateDays: (updatedDays: DaySchedule[]) => void;
  onUpdateNotices?: (updatedNotices: NoticePost[]) => void;
  onSendAdminMessage?: (recipientId: string, text: string) => void;
  onResetDemo: () => void;
  onLogChange: (params: {
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
  }) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  employees,
  days,
  auditLogs,
  userSessions = DEFAULT_USER_SESSIONS,
  notices = DEFAULT_NOTICES,
  onUpdateEmployees,
  onUpdateDays,
  onUpdateNotices,
  onSendAdminMessage,
  onResetDemo,
  onLogChange
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'upload' | 'schedule-editor' | 'staff-manager' | 'notices' | 'sessions' | 'admin-messages'>('upload');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  // Notice Board form state
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePriority, setNoticePriority] = useState<'normal' | 'high'>('normal');
  const [noticeAudience, setNoticeAudience] = useState('All Staff');
  const [noticeFeedback, setNoticeFeedback] = useState('');

  // Admin Direct Message form state
  const [msgRecipientId, setMsgRecipientId] = useState('TEAM_LOUNGE');
  const [msgText, setMsgText] = useState('');
  const [msgFeedback, setMsgFeedback] = useState('');

  // Direct editing modal state
  const [editingCell, setEditingCell] = useState<{
    employeeId: string;
    dayIndex: number;
    currentShift: ShiftCategory;
    currentTiming: string;
    currentEH: number;
  } | null>(null);

  const [newShiftSelected, setNewShiftSelected] = useState<ShiftCategory>('Day');
  const [newEHAmount, setNewEHAmount] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('Administrative roster optimization');

  // Staff creation state
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [newStaffName, setNewStaffName] = useState<string>('');
  const [newStaffBankId, setNewStaffBankId] = useState<string>('');
  const [newStaffGender, setNewStaffGender] = useState<'male' | 'female'>('female');
  const [newStaffRole, setNewStaffRole] = useState<string>('Customer Care Executive');

  // File Upload Handler (.xlsx, .xls, .csv, .tsv, .ods, .pdf)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadStatus({ type: 'info', message: `Analyzing ${file.name}...` });

    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseRosterData(buffer, file.name);

      onUpdateEmployees(parsed.employees);
      if (parsed.days.length > 0) {
        onUpdateDays(parsed.days);
      }

      onLogChange({
        changedBy: 'Admin Moderator',
        changeType: 'File Roster Upload',
        employeeId: 'ALL',
        employeeName: `${parsed.employees.length} Team Staff Members`,
        date: `${parsed.days[0]?.date || 'Week'} to ${parsed.days[parsed.days.length - 1]?.date || 'Week'}`,
        previousShift: 'Previous Roster',
        newShift: `Uploaded ${file.name}`,
        reason: `Batch roster ingested from ${file.name}`
      });

      setUploadStatus({
        type: 'success',
        message: `Successfully loaded ${parsed.employees.length} employees and schedule dates from ${file.name}!`
      });
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: `Upload error: ${err.message || 'Unable to parse file. Please verify columns.'}`
      });
    } finally {
      setIsProcessingFile(false);
      event.target.value = '';
    }
  };

  // Direct Shift Cell Edit
  const handleSaveCellEdit = () => {
    if (!editingCell) return;
    const targetEmployee = employees.find(e => e.id === editingCell.employeeId);
    if (!targetEmployee) return;

    const previousShift = targetEmployee.schedule[editingCell.dayIndex];
    const previousEH = targetEmployee.extraHours[editingCell.dayIndex] || 0;
    const def = SHIFT_DEFINITIONS[newShiftSelected];
    const dateLabel = days[editingCell.dayIndex]?.date || `Day ${editingCell.dayIndex + 1}`;

    const updatedEmployees = employees.map(emp => {
      if (emp.id === targetEmployee.id) {
        const nextSchedule = [...emp.schedule];
        const nextTimings = [...emp.timings];
        const nextEH = [...emp.extraHours];

        nextSchedule[editingCell.dayIndex] = newShiftSelected;
        nextTimings[editingCell.dayIndex] = def.time;
        nextEH[editingCell.dayIndex] = newEHAmount;

        return {
          ...emp,
          schedule: nextSchedule,
          timings: nextTimings,
          extraHours: nextEH
        };
      }
      return emp;
    });

    onUpdateEmployees(updatedEmployees);

    onLogChange({
      changedBy: 'Admin Moderator',
      changeType: 'Admin Direct Edit',
      employeeId: targetEmployee.id,
      employeeName: targetEmployee.name,
      date: dateLabel,
      previousShift: `${previousShift} (${previousEH >= 5 ? 'EH Day' : 'Regular'})`,
      newShift: `${newShiftSelected} (${newEHAmount >= 5 ? 'EH Day' : 'Regular'})`,
      previousTiming: editingCell.currentTiming,
      newTiming: def.time,
      extraHoursDiff: newEHAmount - previousEH,
      reason: editReason
    });

    setEditingCell(null);
  };

  // Add new employee
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffBankId.trim()) return;

    const id = newStaffBankId.trim().toUpperCase();
    const formattedId = id.startsWith('EMP-') ? id : (id.startsWith('SCB-') ? id.replace('SCB-', 'EMP-') : `EMP-${id.replace(/^#/, '')}`);

    const initials = newStaffName
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newEmp: Employee = {
      id: formattedId,
      name: newStaffName.trim(),
      gender: newStaffGender,
      initials,
      role: newStaffRole,
      department: 'Operations & Service Delivery',
      schedule: ['Morning', 'Day', 'Evening', 'OFF', 'Day', 'Morning', 'OFF'],
      timings: ['07:00 – 15:30', '10:00 – 18:30', '13:30 – 22:00', 'Rest Day', '10:00 – 18:30', '07:00 – 15:30', 'Rest Day'],
      extraHours: [0, 0, 0, 0, 0, 0, 0]
    };

    onUpdateEmployees([...employees, newEmp]);
    setShowAddStaffModal(false);
    setNewStaffName('');
    setNewStaffBankId('');
  };

  // Delete employee
  const handleDeleteEmployee = (id: string, name: string) => {
    if (confirm(`Remove ${name} (${id}) from active roster?`)) {
      onUpdateEmployees(employees.filter(e => e.id !== id));
    }
  };

  // Export full CSV
  const handleExportFullRoster = () => {
    let csv = "Employee_ID,Name,Gender,Role,Date,Shift,Timing,Extra_Hours_EH\n";
    employees.forEach(emp => {
      days.forEach((day, idx) => {
        csv += `"${emp.id}","${emp.name}","${emp.gender}","${emp.role}","${day.date}","${emp.schedule[idx]}","${emp.timings[idx]}",${emp.extraHours[idx] || 0}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Workforce_Master_Roster_${days[0]?.date || 'Export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download template
  const handleDownloadTemplate = () => {
    let csv = "Employee_ID,Employee_Name,Gender,Role,Mon_14_Sep,Tue_15_Sep,Wed_16_Sep,Thu_17_Sep,Fri_18_Sep,Sat_19_Sep,Sun_20_Sep\n";
    csv += 'EMP-41055,Emdadul Haque,male,Senior Operations Representative,Night EH,Night,Day,OFF,Night EH,Night,OFF\n';
    csv += 'EMP-41062,Farah Rahman,female,Customer Operations Executive,Morning,OFF,Evening EH,Day,OFF,Evening,OFF\n';
    csv += 'EMP-39218,Saad Ahmed,male,Customer Operations Specialist,Morning,Day EH,OFF,Night,Night EH,OFF,Day\n';
    csv += 'EMP-45077,Neela Chowdhury,female,Senior Customer Service Lead,Day,Morning,OFF,Morning,Day,Evening EH,Morning\n';
    csv += 'EMP-43819,Imran Hossain,male,Operations Officer,OFF,Day,Morning,Evening,Overnight EH,Morning,Day\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Roster_Upload_Template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Supervisor Portal</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
              Full Governance Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Roster Control & Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Upload Excel / PDF rosters, directly modify shifts & Extra Hours (EH), manage staff, and audit changes.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/shiftly-workforce-code.zip"
            download="shiftly-workforce-code.zip"
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs"
            title="Download complete source code and project files in a ZIP archive"
          >
            <FolderArchive className="h-3.5 w-3.5" />
            <span>Download Project ZIP</span>
          </a>

          <button
            onClick={handleExportFullRoster}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-3.5 py-2 text-xs font-bold transition-all shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Roster CSV</span>
          </button>

          <button
            onClick={onResetDemo}
            className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold transition-all shadow-xs"
            title="Reset to default workforce roster"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Roster Changes Overview Banner (Requirement 6) */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400 text-slate-950 font-extrabold text-lg flex-shrink-0">
            <History className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                Audited Roster Modifications
              </span>
              <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                Live Log
              </span>
            </div>
            <p className="text-xl font-bold text-white tracking-tight">
              {auditLogs.length} Total Roster Changes Stored
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-300 max-w-sm">
          Every shift modification, timing trade, and Extra Hours (EH) change is archived with timestamp and employee ID.
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1">
        <button
          onClick={() => setActiveAdminTab('upload')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
            activeAdminTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UploadCloud className="h-4 w-4 text-teal-600" />
          <span>Upload File (Excel/PDF)</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('schedule-editor')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
            activeAdminTab === 'schedule-editor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
          <span>Master Editor</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('staff-manager')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
            activeAdminTab === 'staff-manager' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4 text-amber-600" />
          <span>Staff ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('notices')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
            activeAdminTab === 'notices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Megaphone className="h-4 w-4 text-rose-600" />
          <span>Notices ({notices.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('sessions')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
            activeAdminTab === 'sessions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="h-4 w-4 text-emerald-600" />
          <span>User Sessions</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('admin-messages')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
            activeAdminTab === 'admin-messages' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="h-4 w-4 text-sky-600" />
          <span>Message as Admin</span>
        </button>
      </div>

      {/* TAB 1: Roster Upload Center */}
      {activeAdminTab === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ingest Weekly Roster File</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload your schedule from Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>), Spreadsheets (<strong>.csv</strong>, <strong>.tsv</strong>, <strong>.ods</strong>), or <strong>PDF documents</strong>.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-semibold transition-all"
                title="Download standard CSV/Excel template"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Download Template</span>
              </button>
            </div>

            {/* Drop Zone */}
            <label className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-teal-500 hover:bg-slate-50/70 transition-all cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.ods,.txt,.pdf"
                onChange={handleFileUpload}
                disabled={isProcessingFile}
                className="sr-only"
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-3">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                {isProcessingFile ? 'Parsing Roster File...' : 'Choose Excel, PDF, or Spreadsheet file'}
              </span>
              <span className="text-xs text-slate-500 mt-1">Supports Excel (.xlsx, .xls), PDF (.pdf), CSV, TSV, and ODS formats</span>
              <div className="flex items-center gap-2 mt-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Excel (.xlsx)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">PDF (.pdf)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">Spreadsheet (.csv / .tsv)</span>
              </div>
            </label>

            {uploadStatus && (
              <div className={`rounded-xl p-4 text-xs font-semibold flex items-center gap-2.5 ${
                uploadStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : uploadStatus.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}>
                {uploadStatus.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />}
                {uploadStatus.type === 'error' && <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />}
                <span>{uploadStatus.message}</span>
              </div>
            )}
          </div>

          {/* Guidelines Sidebar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Recognized Shift Formats</h4>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="block text-slate-800 font-bold">Standard Shifts:</strong>
                Morning, Day, Evening, Night, Overnight, OFF.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="block text-slate-800 font-bold">Time Stamps:</strong>
                e.g. <code>07:00 - 15:30</code>, <code>16:00 - 24:00</code>.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="block text-slate-800 font-bold">Extra Hours (EH):</strong>
                Use a full 5-hour <code>EH Day</code>; partial extra hours are not treated as EH.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="block text-slate-800 font-bold">Regulatory Check:</strong>
                Female staff will be shielded from assignments ending after 22:00.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Direct Master Roster Editor */}
      {activeAdminTab === 'schedule-editor' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Direct Master Roster Matrix</h3>
              <p className="text-xs text-slate-500">Click any shift cell to instantly adjust shift hours, timing, or Extra Hours (EH).</p>
            </div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              Interactive Grid Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="p-3 font-bold sticky left-0 bg-slate-50 z-10 w-48 border-r border-slate-200">
                    Agent Name & ID
                  </th>
                  {days.map(d => (
                    <th key={d.date} className="p-3 font-bold min-w-[125px] text-center border-r border-slate-200 last:border-r-0">
                      <span className="block text-[10px] uppercase text-slate-400">{d.dayName}</span>
                      <span className="text-xs text-slate-800 font-bold">{d.dayNumber} {d.month}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50">
                    <td className="p-3 sticky left-0 bg-white z-10 font-medium border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-[10px]">
                          {emp.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate leading-tight text-xs">{emp.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{emp.id} ({emp.gender})</span>
                        </div>
                      </div>
                    </td>

                    {days.map((d, dIdx) => {
                      const shift = emp.schedule[dIdx] || 'OFF';
                      const timing = emp.timings[dIdx];
                      const eh = emp.extraHours[dIdx] || 0;
                      const def = SHIFT_DEFINITIONS[shift] || SHIFT_DEFINITIONS.OFF;
                      const isOff = shift === 'OFF';
                      const isProt = isShiftProtected(shift);

                      return (
                        <td
                          key={d.date}
                          onClick={() => {
                            setEditingCell({
                              employeeId: emp.id,
                              dayIndex: dIdx,
                              currentShift: shift,
                              currentTiming: timing,
                              currentEH: eh
                            });
                            setNewShiftSelected(shift);
                            setNewEHAmount(eh);
                          }}
                          className="p-2 border-r border-slate-100 last:border-r-0 text-center cursor-pointer hover:bg-teal-50/40 transition-colors"
                        >
                          <div className={`p-2 rounded-xl text-[11px] border transition-all ${
                            isOff ? 'bg-slate-50 border-slate-200 text-slate-400' : `${def.colorBg} border`
                          }`}>
                            <div className="font-bold truncate">{shift}</div>
                            <div className="text-[9px] font-mono text-slate-500 truncate">{timing}</div>
                            {eh > 0 && (
                              <span className="inline-block mt-1 bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1 rounded">
                                EH Day
                              </span>
                            )}
                            {isProt && (
                              <span className="inline-block mt-1 text-[9px] text-rose-700 font-bold">
                                Protected
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Staff Manager */}
      {activeAdminTab === 'staff-manager' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Staff Directory</h3>
              <p className="text-xs text-slate-500">Add or manage employee profiles, Employee IDs, and regulatory gender classification.</p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Employee</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {employees.map(emp => (
              <div key={emp.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-teal-400 font-bold text-xs">
                      {emp.initials}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      emp.gender === 'female' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {emp.gender}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mt-3">{emp.name}</h4>
                  <p className="font-mono text-xs text-slate-500">{emp.id}</p>
                  <p className="text-xs text-slate-600 mt-1">{emp.role}</p>

                  <div className="mt-3 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">Policy: </span>
                    {emp.gender === 'female' ? 'Max 22:00 (Night restricted)' : 'All 24/7 Shifts'}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Official Notice Board */}
      {activeAdminTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post New Notice Form */}
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs h-fit space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900">Publish Official Notice</h3>
            </div>
            <p className="text-xs text-slate-500">
              Broadcast critical policy updates, Extra Hours (EH) announcements, and operational guidelines to staff.
            </p>

            {noticeFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{noticeFeedback}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!noticeTitle.trim() || !noticeContent.trim()) return;
                const newNotice: NoticePost = {
                  id: `notice-${Date.now()}`,
                  title: noticeTitle.trim(),
                  content: noticeContent.trim(),
                  priority: noticePriority === 'high' ? 'Urgent' : 'General',
                  createdAt: new Date().toISOString(),
                  date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                  author: 'Admin Roster Desk',
                  authorName: 'Admin',
                  targetAudience: noticeAudience
                };
                const updated = [newNotice, ...notices];
                onUpdateNotices?.(updated);
                setNoticeTitle('');
                setNoticeContent('');
                setNoticeFeedback('Notice published successfully!');
                setTimeout(() => setNoticeFeedback(''), 4000);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Headline:</label>
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Extra Duty Guidelines (5h • 2,000 TK)"
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience:</label>
                <select
                  value={noticeAudience}
                  onChange={(e) => setNoticeAudience(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white text-slate-900"
                >
                  <option value="All Staff">All Workforce Personnel</option>
                  <option value="Customer Care & Operations">Customer Care & Operations</option>
                  <option value="Female Workforce (Safety Protocol)">Female Workforce (Safety Protocol)</option>
                  <option value="Overnight & Night Duty Team">Overnight & Night Duty Team</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNoticePriority('normal')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      noticePriority === 'normal' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    General Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticePriority('high')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      noticePriority === 'high' ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    High Priority
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Body / Directives:</label>
                <textarea
                  rows={4}
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Enter detailed directives, compensation rules, or policy reminders..."
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 text-xs font-bold transition-all shadow-xs"
              >
                Post Live Notice
              </button>
            </form>
          </div>

          {/* Active Notices Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Active Notice Board ({notices.length})</h3>
              <span className="text-xs text-slate-500 font-medium">Broadcast to all logged-in personnel</span>
            </div>

            {notices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
                No active notices posted yet. Use the form to publish your first announcement.
              </div>
            ) : (
              notices.map(notice => {
                const isHigh = notice.priority === 'high' || notice.priority === 'Urgent';
                return (
                  <div
                    key={notice.id}
                    className={`rounded-2xl border p-5 bg-white shadow-xs transition-all ${
                      isHigh
                        ? 'border-rose-300 ring-1 ring-rose-200/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          isHigh
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {isHigh ? 'High Priority' : 'General Notice'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 font-mono">
                          {notice.date || (notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : 'Active')}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          Audience: {notice.targetAudience || 'All Staff'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          const updated = notices.filter(n => n.id !== notice.id);
                          onUpdateNotices?.(updated);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                      >
                        Delete
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2">{notice.title}</h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">{notice.content}</p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Issued by: <strong className="text-slate-700">{notice.author || notice.authorName || 'Admin'}</strong></span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Live on Notice Wall
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Live User Sessions */}
      {activeAdminTab === 'sessions' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Live User Sessions & Access Audit</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time visibility into employee login sessions, active status, logout timestamps, and connected workstations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                {userSessions.filter(s => s.status === 'online').length} Users Currently Online
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Login Timestamp</th>
                  <th className="py-3 px-3">Logout / Last Active</th>
                  <th className="py-3 px-3">Device / Terminal</th>
                  <th className="py-3 px-3">Network IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userSessions.map(session => (
                  <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{session.userName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{session.userId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (session.role === 'admin' || session.userRole === 'admin') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {(session.role === 'admin' || session.userRole === 'admin') ? 'Admin' : 'Employee'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {session.status === 'online' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                      {session.loginTime}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {session.logoutTime ? (
                        session.logoutTime
                      ) : (
                        <span className="text-emerald-600 font-bold">Active Session</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3 text-slate-400" />
                        <span>{session.deviceInfo || session.device || 'Workstation'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">
                      {session.ipAddress || session.ipLocation || '10.24.x.x'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Admin-to-User Messaging */}
      {activeAdminTab === 'admin-messages' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Message Staff as "Admin"</h3>
              <p className="text-xs text-slate-500">
                Send official communications where the recipient sees the sender identity strictly as <strong>"Admin"</strong>.
              </p>
            </div>
          </div>

          {msgFeedback && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
              <Check className="h-4 w-4 text-sky-600 flex-shrink-0" />
              <span>{msgFeedback}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!msgText.trim()) return;
              onSendAdminMessage?.(msgRecipientId, msgText.trim());
              setMsgText('');
              setMsgFeedback(`Message dispatched from "Admin" to ${msgRecipientId === 'TEAM_LOUNGE' ? 'All Staff Broadcast Lounge' : msgRecipientId}!`);
              setTimeout(() => setMsgFeedback(''), 4000);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Recipient:</label>
              <select
                value={msgRecipientId}
                onChange={(e) => setMsgRecipientId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white text-slate-900"
              >
                <option value="TEAM_LOUNGE">📢 Broadcast to All Staff (Team Lounge)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id}) — {emp.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sender Identity:</label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Admin (Workforce Management & Governance)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Message Body:</label>
              <textarea
                rows={5}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Type official notification, roster adjustment alert, or shift instruction..."
                required
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 text-white py-2.5 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span>Dispatch Message to Inbox</span>
            </button>
          </form>
        </div>
      )}

      {/* Modal: Direct Cell Edit */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Direct Shift Editor</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Editing shift for <strong>{employees.find(e => e.id === editingCell.employeeId)?.name}</strong> on {days[editingCell.dayIndex]?.dayName}, {days[editingCell.dayIndex]?.dayNumber} {days[editingCell.dayIndex]?.month}.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Shift Category:</label>
                <select
                  value={newShiftSelected}
                  onChange={(e) => setNewShiftSelected(e.target.value as ShiftCategory)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-medium bg-white"
                >
                  <option value="Morning">Morning (07:00 – 15:30)</option>
                  <option value="Day">Day (10:00 – 18:30)</option>
                  <option value="Evening">Evening (13:30 – 22:00)</option>
                  <option value="Night">Night (16:00 – 00:00)</option>
                  <option value="Overnight">Overnight (22:30 – 07:30)</option>
                  <option value="OFF">Rest Day (OFF)</option>
                  <option value="Maternity Leave">Maternity Leave (Protected)</option>
                  <option value="Parental Leave">Parental Leave (Protected)</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Paid Extra Hours (EH):</label>
                <div className="flex gap-2">
                  {[0, 5].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setNewEHAmount(h)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                        newEHAmount === h ? 'bg-amber-500 text-slate-950 border-amber-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {h === 0 ? 'No EH' : 'EH Day · 5h'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Administrative Note / Justification:</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  placeholder="e.g. Schedule rebalance or customer surge coverage"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCellEdit}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Apply & Record Modification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Employee */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Add New Staff Member</h3>
            <p className="text-xs text-slate-500 mt-0.5">Register a new employee in the active roster database.</p>

            <form onSubmit={handleAddEmployee} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee Full Name:</label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Nasreen Akter"
                  required
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID:</label>
                <input
                  type="text"
                  value={newStaffBankId}
                  onChange={(e) => setNewStaffBankId(e.target.value)}
                  placeholder="e.g. EMP-48190"
                  required
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender (Night Safety Enforced):</label>
                <select
                  value={newStaffGender}
                  onChange={(e) => setNewStaffGender(e.target.value as 'male' | 'female')}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="female">Female (Max 22:00 constraint)</option>
                  <option value="male">Male (24/7 Day/Night/Overnight)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Department:</label>
                <input
                  type="text"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  placeholder="e.g. Customer Care Executive"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
