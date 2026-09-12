import React, { useState } from 'react';
import { Shield, KeyRound, ArrowRight, UserCheck, Lock, Building, CheckCircle } from 'lucide-react';
import { Employee } from '../types';

interface LoginViewProps {
  employees: Employee[];
  onLoginEmployee: (employeeId: string) => void;
  onLoginAdmin: (adminUser: string, adminPass: string) => boolean;
  onBackToOrgSelect?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  employees,
  onLoginEmployee,
  onLoginAdmin,
  onBackToOrgSelect
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [bankIdQuery, setBankIdQuery] = useState('');
  const [passwordPlaceholder, setPasswordPlaceholder] = useState('');
  
  // Admin form
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [userError, setUserError] = useState('');

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    const query = bankIdQuery.trim().toLowerCase();
    if (!query) {
      setUserError('Please enter your Employee ID or Name');
      return;
    }

    const digitsOnly = query.replace(/\D/g, '');
    const matched = employees.find(emp => {
      const empDigits = emp.id.replace(/\D/g, '');
      return (
        emp.id.toLowerCase() === query ||
        (digitsOnly.length > 2 && empDigits.includes(digitsOnly)) ||
        emp.name.toLowerCase().includes(query)
      );
    });

    if (matched) {
      onLoginEmployee(matched.id);
    } else {
      setUserError('No employee found with this Employee ID or Name. Please try again.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const success = onLoginAdmin(adminUser.trim(), adminPass.trim());
    if (!success) {
      setAdminError('Invalid administrative credentials. Access denied.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 selection:bg-teal-500 selection:text-white">
      {/* Left Visual Panel */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 border-b md:border-b-0 md:border-r border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-slate-950 font-extrabold text-lg shadow-lg">
              SH
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Shiftly</h1>
              <p className="text-xs text-teal-400 font-medium tracking-wide uppercase">Workforce Roster Platform</p>
            </div>
          </div>

          <div className="mt-12 sm:mt-20 max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300 border border-teal-500/20 mb-4">
              Enterprise Workforce Coordination
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Fair, compliant shifts in one calm place.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
              Coordinate shift swaps, request timing changes, manage paid Extra Hours (EH), and uphold bank labor regulations automatically.
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-10 sm:mt-16 pt-8 border-t border-slate-800/80 space-y-3 max-w-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-300">
              <strong className="text-white">Bank ID Login:</strong> Access your personal schedule and swap options instantly.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-300">
              <strong className="text-white">Policy Protection:</strong> Female shift limit (02:00–22:00 max) and non-exchangeable parental leave are strictly honored.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-300">
              <strong className="text-white">Circular Rotations & EH:</strong> 2, 3, and 4-person chains preserve queue staffing while facilitating paid extra work.
            </p>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-900/90">
        <div className="w-full max-w-md">
          {/* Organization Indicator & Switch Option */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-400 text-slate-950 font-black text-xs">
                SCB
              </span>
              <div>
                <span className="text-xs font-bold text-white block leading-tight">Standard Chartered Bank</span>
                <span className="text-[10px] text-slate-400">Retail & Operations Portal</span>
              </div>
            </div>
            {onBackToOrgSelect && (
              <button
                type="button"
                onClick={onBackToOrgSelect}
                className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 hover:underline flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700"
              >
                ← Switch Company
              </button>
            )}
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-800 p-1 mb-8 border border-slate-700/60">
            <button
              type="button"
              onClick={() => { setActiveTab('user'); setUserError(''); setAdminError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'user'
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Employee Access</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('admin'); setUserError(''); setAdminError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* User Form */}
          {activeTab === 'user' ? (
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
              <div className="mb-6">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Employee Sign In</span>
                <h3 className="text-2xl font-bold text-white tracking-tight mt-1">Welcome back</h3>
                <p className="text-xs text-slate-400 mt-1">Enter your Bank ID or Name to access your roster</p>
              </div>

              {userError && (
                <div className="mb-4 rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">
                  {userError}
                </div>
              )}

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Employee ID or Name
                  </label>
                  <input
                    type="text"
                    value={bankIdQuery}
                    onChange={(e) => setBankIdQuery(e.target.value)}
                    placeholder="e.g. EMP-41055 or 41062 or Farah"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-400">
                      Password (Optional)
                    </label>
                    <span className="text-[10px] text-slate-500">Feature configured soon</span>
                  </div>
                  <input
                    type="password"
                    value={passwordPlaceholder}
                    onChange={(e) => setPasswordPlaceholder(e.target.value)}
                    placeholder="Enter password if enabled"
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-400 placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-teal-300 transition-all shadow-lg hover:shadow-teal-400/20 active:scale-[0.99] mt-2"
                >
                  <span>Continue to Roster</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Quick test profiles */}
              <div className="mt-8 pt-6 border-t border-slate-700/60">
                <p className="text-[11px] font-semibold text-slate-400 mb-2">Quick Sign-In by Profile:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {employees.slice(0, 4).map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => onLoginEmployee(emp.id)}
                      className="text-left rounded-lg bg-slate-800 hover:bg-slate-700/80 p-2 text-xs transition-colors border border-slate-700/50"
                    >
                      <span className="block font-semibold text-white truncate text-[11px]">{emp.name}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{emp.id} ({emp.gender})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Admin Form - Strictly no credentials shown on screen */
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
              <div className="mb-6">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Supervisor & Moderator</span>
                <h3 className="text-2xl font-bold text-white tracking-tight mt-1">Admin Portal</h3>
                <p className="text-xs text-slate-400 mt-1">Administrative credentials required to manage roster schedules</p>
              </div>

              {adminError && (
                <div className="mb-4 rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">
                  {adminError}
                </div>
              )}

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Admin User ID
                  </label>
                  <input
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Enter admin ID"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 transition-all shadow-lg hover:shadow-amber-400/20 active:scale-[0.99] mt-2"
                >
                  <span>Authenticate Admin</span>
                  <Lock className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
                <p className="text-[11px] text-slate-400">
                  Authorized personnel only. All administrative updates are cryptographically tracked in the 30-day roster change log.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
