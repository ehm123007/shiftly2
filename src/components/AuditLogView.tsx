import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet,
  DollarSign
} from 'lucide-react';
import { RosterChangeLog, Employee } from '../types';

interface AuditLogViewProps {
  auditLogs: RosterChangeLog[];
  currentEmployee: Employee;
  userRole: 'employee' | 'admin';
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  currentEmployee,
  userRole
}) => {
  const [activeScope, setActiveScope] = useState<'mine' | 'all'>(userRole === 'admin' ? 'all' : 'mine');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Scope filter:
      if (activeScope === 'mine') {
        const isMine = log.employeeId === currentEmployee.id || log.changedBy === currentEmployee.name;
        if (!isMine) return false;
      }

      // Type filter:
      if (typeFilter !== 'all' && log.changeType !== typeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = log.employeeName.toLowerCase().includes(q);
        const matchId = log.employeeId.toLowerCase().includes(q);
        const matchDate = log.date.toLowerCase().includes(q);
        const matchBy = log.changedBy.toLowerCase().includes(q);
        const matchReason = (log.reason || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDate && !matchBy && !matchReason) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, activeScope, currentEmployee, typeFilter, searchQuery]);

  const exportAuditCSV = () => {
    let csv = "ID,Timestamp,ChangedBy,ChangeType,EmployeeID,EmployeeName,Date,PreviousShift,NewShift,ExtraHoursDiff,Reason,Status\n";
    filteredLogs.forEach(l => {
      csv += `"${l.id}","${l.timestamp}","${l.changedBy}","${l.changeType}","${l.employeeId}","${l.employeeName}","${l.date}","${l.previousShift}","${l.newShift}","${l.extraHoursDiff || 0}","${(l.reason || '').replace(/"/g, '""')}","${l.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Roster_Change_Audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Traceability & Audit</span>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
              30-Day Window Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Roster Change Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Every shift swap, timing change, Extra Hours (EH) adjustment, and admin override is permanently stored.
          </p>
        </div>

        {/* Total Roster Changes Counter Banner */}
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900 text-white p-4 shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-slate-950 font-extrabold">
            <History className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
              Total Roster Changes Stored
            </span>
            <p className="text-xl font-extrabold tracking-tight">{auditLogs.length} Modifications</p>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Scope selector */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setActiveScope('mine')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeScope === 'mine' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            My Activity (Last 30 Days)
          </button>
          <button
            onClick={() => setActiveScope('all')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeScope === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Team Changes ({auditLogs.length})
          </button>
        </div>

        {/* Search & Type filter */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, Bank ID, or date…"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none bg-white"
          >
            <option value="all">All Change Types</option>
            <option value="Shift Swap">Shift Swap</option>
            <option value="Timing Change">Timing Change</option>
            <option value="Extra Hours (EH)">Extra Hours (EH)</option>
            <option value="Admin Direct Edit">Admin Direct Edit</option>
            <option value="File Roster Upload">File Roster Upload</option>
          </select>

          <button
            onClick={exportAuditCSV}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 text-xs font-bold transition-colors"
            title="Download audit records as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-4 font-bold">Employee</th>
                <th className="py-3 px-4 font-bold">Shift Date</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Previous → New Shift</th>
                <th className="py-3 px-4 font-bold">Initiated By</th>
                <th className="py-3 px-4 font-bold">Reason / Context</th>
                <th className="py-3 px-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No roster change logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {log.employeeName}
                      <span className="block text-[10px] text-slate-400 font-mono">{log.employeeId}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                      {log.date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        log.changeType === 'Timing Change'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : log.changeType === 'Shift Swap'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : log.changeType === 'Extra Hours (EH)'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {log.changeType}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="text-slate-400 line-through">{log.previousShift}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="font-bold text-slate-900">{log.newShift}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {log.changedBy}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500 italic">
                      "{log.reason || 'Standard roster update'}"
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{log.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
