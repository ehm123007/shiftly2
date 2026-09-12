import React from 'react';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Users, 
  PlusCircle,
  AlertCircle,
  Lock,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { SwapRequest, Employee } from '../types';

interface SwapDeskViewProps {
  requests: SwapRequest[];
  currentEmployee: Employee;
  allEmployees: Employee[];
  userRole: 'employee' | 'admin';
  onApproveRequest: (requestId: string) => void;
  onDeclineRequest: (requestId: string) => void;
  onOpenNewSwap: () => void;
  onOpenGroupChat?: (requestId: string) => void;
}

export const SwapDeskView: React.FC<SwapDeskViewProps> = ({
  requests,
  currentEmployee,
  allEmployees,
  userRole,
  onApproveRequest,
  onDeclineRequest,
  onOpenNewSwap,
  onOpenGroupChat
}) => {
  // Filter relevant requests: User is in participants or user is Admin
  const relevantRequests = requests.filter(r => 
    userRole === 'admin' || r.participantIds.includes(currentEmployee.id)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mutual Approvals</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700">
              {relevantRequests.length} Total Requests
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Swap Desk & Trade Approvals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review proposed shift swaps. Roster remains locked and 100% unchanged until every participant has explicitly agreed.
          </p>
        </div>

        <button
          onClick={onOpenNewSwap}
          className="flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors shadow-xs"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Propose New Swap</span>
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {relevantRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <ArrowLeftRight className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No active swap proposals</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You currently have no pending shift exchanges requiring your confirmation.
            </p>
            <button
              onClick={onOpenNewSwap}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Explore Swap Options →
            </button>
          </div>
        ) : (
          relevantRequests.map(req => {
            const hasApproved = req.approvedByIds.includes(currentEmployee.id);
            const isCompleted = req.state === 'Completed' || req.state === 'Approved';
            const isDeclined = req.state === 'Declined';
            const isPending = !isCompleted && !isDeclined;
            const participantStaff = req.participantIds.map(id => allEmployees.find(e => e.id === id)).filter(Boolean) as Employee[];

            return (
              <div
                key={req.id}
                className={`rounded-2xl border p-5 shadow-xs transition-all ${
                  isCompleted
                    ? 'bg-slate-50/60 border-emerald-200'
                    : isDeclined
                    ? 'bg-rose-50/40 border-rose-200'
                    : 'bg-white border-slate-200 hover:border-slate-300 ring-1 ring-slate-100'
                }`}
              >
                {/* Header row with badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                        <span>✅ All Accepted & Applied</span>
                      </span>
                    ) : isDeclined ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="h-3 w-3 text-rose-700" />
                        <span>❌ Rejected</span>
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="h-3 w-3 text-amber-700" />
                          <span>⏳ Pending Consensus ({req.approvedByIds.length}/{req.participantIds.length})</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                          <Lock className="h-3 w-3 text-slate-500" />
                          <span>🔒 Roster Locked</span>
                        </span>
                      </>
                    )}

                    <span className="text-xs font-bold text-slate-700 ml-1">
                      {req.participantIds.length}-Person Swap • Initiated by {req.requesterName}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Body Details */}
                <div className="py-3">
                  {/* Involved colleagues with agreement pills */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-800">Participants & Voting Status:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {participantStaff.map(p => {
                        const approved = req.approvedByIds.includes(p.id);
                        return (
                          <span
                            key={p.id}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                              isDeclined
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : approved
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                                : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                            }`}
                          >
                            <span>{p.name}</span>
                            {isDeclined ? (
                              <span className="text-[10px] font-bold text-rose-700">❌ Declined</span>
                            ) : approved ? (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>✅ Accepted</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>⏳ Pending</span>
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Plan description */}
                  {req.plan && (
                    <>
                      <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-900 block mb-1">Rotation Overview:</span>
                        <p>{req.plan.description}</p>
                      </div>

                      {/* Step-by-Step Path Breakdown */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                          Step-by-Step Exchange Path & Duties:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {req.plan.transfers.map((t, idx) => {
                            const fromStaff = participantStaff.find(p => p.id === t.fromEmployeeId);
                            const toStaff = participantStaff.find(p => p.id === t.toEmployeeId);
                            const fromName = fromStaff?.name || t.fromEmployeeId;
                            const toName = toStaff?.name || t.toEmployeeId;
                            const isRequesterStep = t.fromEmployeeId === req.requesterId;

                            return (
                              <div 
                                key={`${req.id}-${idx}`} 
                                className={`rounded-xl border p-3 text-xs ${
                                  isRequesterStep 
                                    ? 'bg-teal-50/50 border-teal-200 ring-1 ring-teal-100' 
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Step {idx + 1}
                                  </span>
                                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {t.date}
                                  </span>
                                </div>

                                <div className="font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                                  <span className="text-teal-700 font-extrabold">{toName.split(' ')[0]}</span>
                                  <span className="text-slate-400 font-normal">replaces</span>
                                  <span className="text-slate-700">{fromName.split(' ')[0]}</span>
                                </div>

                                <div className="mt-1.5 text-[11px] text-slate-600 space-y-0.5 font-mono">
                                  <div>Works: <strong>{t.fromShift}</strong> ({t.fromTiming || 'Standard'})</div>
                                  <div className="text-emerald-700 font-bold">
                                    Result: {fromName.split(' ')[0]} → {t.toShift}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {req.reason && (
                    <p className="text-[11px] text-slate-500 italic mt-2.5">
                      <strong>Note from requester:</strong> "{req.reason}"
                    </p>
                  )}
                </div>

                {/* Actions & Decision Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-slate-500">
                    {isCompleted ? (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>All {req.participantIds.length} agreed • Official Roster Mutated</span>
                      </span>
                    ) : isDeclined ? (
                      <span className="font-bold text-rose-700 flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span>Proposal rejected • Roster left untouched</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Lock className="h-3.5 w-3.5 text-amber-600" />
                        <span>Waiting for remaining consensus ({req.approvedByIds.length}/{req.participantIds.length})</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {req.groupChatId && onOpenGroupChat && (
                      <button
                        onClick={() => onOpenGroupChat(req.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Group Chat</span>
                      </button>
                    )}

                    {isPending && (
                      userRole === 'admin' ? (
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                          Admin Review Only (Participants must vote)
                        </span>
                      ) : hasApproved ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>You Agreed (Awaiting Peers)</span>
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => onDeclineRequest(req.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => onApproveRequest(req.id)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                            <span>Confirm & Agree to Swap</span>
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
