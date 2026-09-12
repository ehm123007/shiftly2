import React from 'react';
import { Building2, ArrowRight, ShieldCheck, Sparkles, Clock, Users2, Layers, CheckCircle2 } from 'lucide-react';

interface OrgSelectLandingViewProps {
  onSelectOrg: (orgId: string) => void;
}

export const OrgSelectLandingView: React.FC<OrgSelectLandingViewProps> = ({ onSelectOrg }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:px-8 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-extrabold text-lg shadow-lg">
            SH
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Shiftly</h1>
            <p className="text-[11px] text-teal-400 font-medium tracking-wide uppercase">Multi-Enterprise Roster Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-300">
            <Layers className="h-3.5 w-3.5 text-teal-400" />
            <span>Multi-Tenant System</span>
          </span>
        </div>
      </header>

      {/* Central Hero & Organization Selection */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3.5 py-1 text-xs font-bold text-teal-300 border border-teal-500/20 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            Universal Workforce Scheduling
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Choose Your Company Workspace
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            Shiftly powers roster exchanges, circular trades, and Extra Duty (EH) compensation across enterprise contact centres. Select your organization to enter the login portal.
          </p>
        </div>

        {/* Company Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* OPTION 1: SCB (Standard Chartered Bank) */}
          <div 
            onClick={() => onSelectOrg('scb')}
            className="group relative rounded-3xl border-2 border-teal-500/40 hover:border-teal-400 bg-slate-900/90 p-8 transition-all duration-200 hover:shadow-2xl hover:shadow-teal-500/10 cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-5 right-5">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-0.5 text-[11px] font-bold">
                Active Organization
              </span>
            </div>

            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-slate-950 font-black text-2xl shadow-lg mb-6 group-hover:scale-105 transition-transform">
                SCB
              </div>

              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-white group-hover:text-teal-300 transition-colors">
                  SCB
                </h3>
                <span className="text-xs font-semibold text-slate-400">• Standard Chartered Bank</span>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mt-1">
                Contact Centre & Retail Operations
              </p>

              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Dedicated roster hub for SCB Bangladesh operations. Includes 24/7 day/night rotational cycles, female safety constraints (max 22:00), circular peer swaps, and Extra Duty (EH: 5h • 2,000 TK).
              </p>

              <div className="mt-5 space-y-2 border-t border-slate-800/80 pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
                  <span>Bank ID & Supervisor portal verification</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
                  <span>AI interest hierarchy matching & automated circular chains</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
                  <span>Admin Excel / PDF schedule parser</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                Enter SCB Portal
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-slate-950 group-hover:translate-x-1 transition-transform font-bold">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* OPTION 2: Other Enterprise Companies (Extensible Architecture) */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 flex flex-col justify-between relative opacity-85">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 font-bold text-xl mb-6">
                <Building2 className="h-7 w-7 text-slate-400" />
              </div>

              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-slate-200">
                  Other Companies
                </h3>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-400">
                  Coming Soon
                </span>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
                Multi-Tenant Enterprise Integration
              </p>

              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Shiftly is designed as an extensible platform for telecommunications, healthcare, airlines, and banking institutions requiring custom labor rule compliance and shift marketplaces.
              </p>

              <div className="mt-5 space-y-2 border-t border-slate-800/80 pt-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-600 flex-shrink-0" />
                  <span>Custom shifts & overtime rules per organization</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-slate-600 flex-shrink-0" />
                  <span>Isolated tenant employee rosters and audit logs</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Enterprise Onboarding Available</span>
              <span className="text-[11px] bg-slate-800 px-3 py-1 rounded-lg text-slate-400">Configured via Admin</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:px-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>Shiftly Multi-Enterprise Workforce Solutions • Standard Chartered Bank Module Active</div>
        <div className="flex items-center gap-4">
          <span>Enterprise Grade Security</span>
          <span>•</span>
          <span>Automated Compliance Engine</span>
        </div>
      </footer>
    </div>
  );
};
