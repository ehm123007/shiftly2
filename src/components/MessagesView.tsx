import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  MessageSquare, 
  User, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  CheckCheck,
  Search, 
  Users, 
  Radio, 
  Shield, 
  ArrowLeftRight, 
  Sparkles, 
  X, 
  Share2,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Employee, ChatMessage, DaySchedule, ShiftCategory, SwapRequest } from '../types';

interface MessagesViewProps {
  currentEmployee: Employee;
  allEmployees: Employee[];
  messages: ChatMessage[];
  days: DaySchedule[];
  onSendMessage: (recipientId: string, text: string, shiftAttachment?: any) => void;
  exchangeRequests?: SwapRequest[];
  initialConversationId?: string | null;
  onOpenSwapModal?: (dayIndex: number, defaultTab?: 'day-off' | 'timing-change' | 'eh-claim') => void;
  onSwitchUser?: (employeeId: string) => void;
  onApproveRequest?: (requestId: string) => void;
  onDeclineRequest?: (requestId: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentEmployee,
  allEmployees,
  messages,
  days,
  onSendMessage,
  onOpenSwapModal,
  onSwitchUser,
  onApproveRequest,
  onDeclineRequest,
  exchangeRequests = [],
  initialConversationId = null
}) => {
  // Channel categories:
  // 1. TEAM_LOUNGE (All staff broadcast)
  // 2. ADMIN_DESK (Direct to supervisor/admin)
  // 3. Individual peers
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(initialConversationId || 'TEAM_LOUNGE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'channels' | 'peers'>('all');
  const [inputText, setInputText] = useState<string>('');
  const [showShiftAttachmentPicker, setShowShiftAttachmentPicker] = useState<boolean>(false);

  useEffect(() => {
    if (initialConversationId) setSelectedRecipientId(initialConversationId);
  }, [initialConversationId]);
  const [attachDayIndex, setAttachDayIndex] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const peers = allEmployees.filter(e => e.id !== currentEmployee.id);

  // Channels list definition
  const exchangeChannels = exchangeRequests
    .filter(r => r.groupChatId && r.participantIds.includes(currentEmployee.id))
    .map(r => ({
      id: r.groupChatId as string,
      name: `${r.participantIds.length}-Person Exchange`,
      description: r.plan?.description || 'Roster exchange coordination',
      isChannel: true,
      icon: ArrowLeftRight,
      badge: r.state === 'Approved' ? 'Approved' : 'Pending'
    }));

  const specialChannels = [
    {
      id: 'TEAM_LOUNGE',
      name: 'Workforce Roster Lounge',
      description: 'Team Broadcast • Open shifts, cover requests & swaps',
      isChannel: true,
      icon: Users,
      badge: 'Public'
    },
    {
      id: 'ADMIN_DESK',
      name: 'Supervisor & Admin Roster Desk',
      description: 'Official roster adjustments, exceptions & inquiries',
      isChannel: true,
      icon: Shield,
      badge: 'Official'
    }
  ];

  // Determine active conversation info
  const isSpecialChannel = specialChannels.some(c => c.id === selectedRecipientId);
  const activeSpecialChannel = specialChannels.find(c => c.id === selectedRecipientId);
  const activePeer = allEmployees.find(e => e.id === selectedRecipientId);
  const activeExchange = exchangeChannels.find(c => c.id === selectedRecipientId);

  // Filter messages for current thread:
  // If special channel (e.g. TEAM_LOUNGE): all messages with recipientId === 'TEAM_LOUNGE'
  // If ADMIN_DESK: messages between current user and ADMIN_DESK
  // If peer: messages between current user and that peer
  const threadMessages = messages.filter(m => {
    if (activeExchange) return m.recipientId === selectedRecipientId || m.conversationId === selectedRecipientId;
    if (selectedRecipientId === 'TEAM_LOUNGE') {
      return m.recipientId === 'TEAM_LOUNGE';
    }
    if (selectedRecipientId === 'ADMIN_DESK') {
      return (m.recipientId === 'ADMIN_DESK' && m.senderId === currentEmployee.id) ||
             (m.senderId === 'ADMIN_DESK' && m.recipientId === currentEmployee.id);
    }
    return (m.senderId === currentEmployee.id && m.recipientId === selectedRecipientId) ||
           (m.senderId === selectedRecipientId && m.recipientId === currentEmployee.id);
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text && !showShiftAttachmentPicker) return;

    let attachment = undefined;
    if (showShiftAttachmentPicker) {
      const day = days[attachDayIndex];
      const shift = currentEmployee.schedule[attachDayIndex];
      const timing = currentEmployee.timings[attachDayIndex];
      attachment = {
        date: `${day.dayName}, ${day.dayNumber} ${day.month}`,
        dateIndex: attachDayIndex,
        shift,
        timing,
        note: text || 'Shift coordination request'
      };
    }

    onSendMessage(selectedRecipientId, text || 'Discussing roster shift', attachment);
    setInputText('');
    setShowShiftAttachmentPicker(false);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  // Filter peers by search query
  const filteredPeers = peers.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
  });

  // Calculate unread / message counts
  const getUnreadCount = (id: string) => {
    if (id === 'TEAM_LOUNGE') {
      return messages.filter(m => m.recipientId === 'TEAM_LOUNGE' && m.senderId !== currentEmployee.id).length;
    }
    return messages.filter(m => m.senderId === id && m.recipientId === currentEmployee.id).length;
  };

  // Look up full swap request object if in an exchange channel
  const activeExchangeRequest = exchangeRequests.find(r => r.groupChatId === selectedRecipientId);
  const isExchangeApproved = activeExchangeRequest?.state === 'Approved';
  const isExchangeDeclined = activeExchangeRequest?.state === 'Declined';
  const hasUserAgreed = activeExchangeRequest ? activeExchangeRequest.approvedByIds.includes(currentEmployee.id) : false;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden h-[calc(100vh-140px)] min-h-[580px] flex flex-col md:flex-row animate-in fade-in duration-200">
      {/* Left Sidebar: Channels & Peer List */}
      <div className="w-full md:w-80 lg:w-88 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 flex flex-col">
        {/* Search & Header */}
        <div className="p-4 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <span>Roster Coordination</span>
            </h2>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              Live Chat
            </span>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coworkers or Bank ID…"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-[11px] font-bold">
            <button
              onClick={() => setChannelFilter('all')}
              className={`flex-1 py-1 rounded-md transition-all ${channelFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
            >
              All
            </button>
            <button
              onClick={() => setChannelFilter('channels')}
              className={`flex-1 py-1 rounded-md transition-all ${channelFilter === 'channels' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
            >
              Channels
            </button>
            <button
              onClick={() => setChannelFilter('peers')}
              className={`flex-1 py-1 rounded-md transition-all ${channelFilter === 'peers' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
            >
              Peers ({peers.length})
            </button>
          </div>
        </div>

        {/* List of Channels and Direct Colleagues */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {/* Section: Special Broadcast Channels */}
          {channelFilter !== 'peers' && exchangeChannels.length > 0 && (
            <div className="p-2 space-y-1 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Exchange Groups
              </span>
              {exchangeChannels.map(channel => {
                const isSelected = channel.id === selectedRecipientId;
                return (
                  <button key={channel.id} onClick={() => setSelectedRecipientId(channel.id)} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-800'}`}>
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}><ArrowLeftRight className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between"><span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>{channel.name}</span><span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">{channel.badge}</span></div>
                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>{channel.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {channelFilter !== 'peers' && (
            <div className="p-2 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Broadcast & Admin Channels
              </span>

              {specialChannels.map(channel => {
                const isSelected = channel.id === selectedRecipientId;
                const Icon = channel.icon;

                return (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedRecipientId(channel.id)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'hover:bg-slate-200/60 text-slate-800'
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {channel.name}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {channel.badge}
                        </span>
                      </div>
                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {channel.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Section: Individual Colleagues */}
          {channelFilter !== 'channels' && (
            <div className="p-2 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Team Colleagues ({filteredPeers.length})
              </span>

              {filteredPeers.map(peer => {
                const isSelected = peer.id === selectedRecipientId;
                const lastMsg = messages
                  .filter(m => (m.senderId === peer.id && m.recipientId === currentEmployee.id) || (m.senderId === currentEmployee.id && m.recipientId === peer.id))
                  .pop();

                return (
                  <button
                    key={peer.id}
                    onClick={() => setSelectedRecipientId(peer.id)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'hover:bg-slate-200/60 text-slate-800'
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                      isSelected ? 'bg-teal-400 text-slate-950' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {peer.initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {peer.name}
                        </span>
                        <span className={`text-[9px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                          {peer.gender}
                        </span>
                      </div>
                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {lastMsg ? lastMsg.text : `${peer.role.split(' ')[0]} • Click to chat`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User perspective switcher for multi-account testing */}
        {onSwitchUser && (
          <div className="p-3 border-t border-slate-200 bg-white text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Active User Perspective:
            </span>
            <select
              value={currentEmployee.id}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="w-full text-xs font-bold rounded-lg border border-slate-200 p-1.5 bg-slate-50 text-slate-800 focus:outline-none"
            >
              {allEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right Main Chat Thread */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Thread Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            {isSpecialChannel ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm flex-shrink-0">
                {activeSpecialChannel?.id === 'ADMIN_DESK' ? <Shield className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              </div>
            ) : activeExchange ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm flex-shrink-0">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-teal-400 font-bold text-xs flex-shrink-0">
                {activePeer?.initials}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 truncate">
                {activeExchange ? activeExchange.name : isSpecialChannel ? activeSpecialChannel?.name : activePeer?.name}
              </h3>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                {activeExchange ? (
                  <span>All participants • exchange coordination channel</span>
                ) : isSpecialChannel ? (
                  <span>{activeSpecialChannel?.description}</span>
                ) : (
                  <>
                    <span className="font-mono">{activePeer?.id}</span>
                    <span>•</span>
                    <span>{activePeer?.department}</span>
                    <span>•</span>
                    <span className="capitalize">{activePeer?.gender}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced
            </span>
          </div>
        </div>

        {/* Pinned Exchange Proposal Card in Active Exchange Channel */}
        {activeExchangeRequest && (
          <div className={`p-4 border-b border-slate-200 ${isExchangeApproved ? 'bg-emerald-50/60' : isExchangeDeclined ? 'bg-rose-50/50' : 'bg-slate-50/90'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  {activeExchangeRequest.participantIds.length}-Person Proposal
                </span>
                {isExchangeApproved ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                    <span>ALL MEMBERS AGREED → EXCHANGE APPROVED & ACTIVE</span>
                  </span>
                ) : isExchangeDeclined ? (
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                    ❌ Exchange Proposal Declined
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-700" />
                    <span>Pending Consensus ({activeExchangeRequest.approvedByIds.length}/{activeExchangeRequest.participantIds.length}) • Roster Locked</span>
                  </span>
                )}
              </div>

              {/* Action Buttons right within the chat */}
              {!isExchangeApproved && !isExchangeDeclined && onApproveRequest && onDeclineRequest && (
                <div className="flex items-center gap-2">
                  {hasUserAgreed ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>You Agreed</span>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => onDeclineRequest(activeExchangeRequest.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => onApproveRequest(activeExchangeRequest.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3 text-teal-400" />
                        <span>Confirm & Agree</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Voting pills */}
            <div className="flex items-center gap-1.5 flex-wrap my-2">
              <span className="text-[10px] font-bold text-slate-500 mr-1">Status:</span>
              {activeExchangeRequest.participantIds.map(id => {
                const emp = allEmployees.find(e => e.id === id);
                const agreed = activeExchangeRequest.approvedByIds.includes(id);
                return (
                  <span
                    key={id}
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                      agreed ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{emp?.name.split(' ')[0] || id}</span>
                    {agreed ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> : <Clock className="h-2.5 w-2.5 text-amber-500" />}
                  </span>
                );
              })}
            </div>

            {/* Step list summary */}
            {activeExchangeRequest.plan && (
              <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mt-1.5">
                <span className="font-bold text-slate-800 block mb-0.5">Rotation Route:</span>
                <div>{activeExchangeRequest.plan.description}</div>
              </div>
            )}
          </div>
        )}

        {/* Message Thread Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
          {threadMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">
                {isSpecialChannel ? `Welcome to ${activeSpecialChannel?.name}` : `Start coordination with ${activePeer?.name}`}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Attach upcoming shifts from your schedule, propose shift timing trades, or discuss Extra Hours (EH).
              </p>

              {/* Quick Coordination Action Chips */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-4 max-w-md">
                <button
                  onClick={() => handleQuickPrompt("Hi! Could we swap shifts on Wednesday?")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50 shadow-2xs"
                >
                  "Hi! Could we swap shifts on Wednesday?"
                </button>
                <button
                  onClick={() => handleQuickPrompt("Are you interested in taking paid Extra Hours (EH)?")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50 shadow-2xs"
                >
                  "Are you interested in taking paid Extra Hours (EH)?"
                </button>
                <button
                  onClick={() => handleQuickPrompt("Can you cover my evening shift this Friday?")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50 shadow-2xs"
                >
                  "Can you cover my evening shift this Friday?"
                </button>
                {selectedRecipientId === 'ADMIN_DESK' && (
                  <button
                    onClick={() => handleQuickPrompt("Supervisor desk: Requesting review of my schedule timing on Thursday.")}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-amber-800 hover:bg-amber-100 shadow-2xs"
                  >
                    "Requesting supervisor review of schedule timing"
                  </button>
                )}
              </div>
            </div>
          ) : (
            threadMessages.map(msg => {
              const isMine = msg.senderId === currentEmployee.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender Name in Broadcast Lounge or Direct Thread */}
                  {!isMine && (
                    <span className="text-[10px] font-bold text-slate-500 mb-1 px-1 flex items-center gap-1">
                      {msg.senderId === 'ADMIN_DESK' || msg.senderId === 'ADMIN' || msg.senderName.toLowerCase().includes('admin') ? (
                        <span className="text-amber-700 font-extrabold flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5" />
                          Admin
                        </span>
                      ) : (
                        `${msg.senderName} (${msg.senderInitials})`
                      )}
                    </span>
                  )}

                  <div
                    className={`max-w-md rounded-2xl p-3.5 shadow-2xs text-xs leading-relaxed ${
                      isMine
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Interactive Shift Attachment Card */}
                    {msg.shiftAttachment && (
                      <div className={`mt-2.5 rounded-xl p-3 border ${
                        isMine 
                          ? 'bg-slate-800/90 border-slate-700 text-slate-100' 
                          : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-teal-400">
                            Attached Shift for Coordination
                          </span>
                          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">
                            {msg.shiftAttachment.shift}
                          </span>
                        </div>

                        <p className="font-extrabold text-xs mt-1">{msg.shiftAttachment.date}</p>
                        <p className="font-mono text-[11px] text-slate-300 mt-0.5">
                          Timing: {msg.shiftAttachment.timing}
                        </p>

                        {/* Interactive Direct Action Buttons on Attachment */}
                        {!isMine && onOpenSwapModal && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenSwapModal(msg.shiftAttachment.dateIndex || 0, 'timing-change')}
                              className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-2xs transition-colors"
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                              <span>Propose Swap for this Shift</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickPrompt(`I can cover your ${msg.shiftAttachment.shift} shift on ${msg.shiftAttachment.date}!`)}
                              className="py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-[10px] transition-colors"
                            >
                              Offer to Cover
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex items-center justify-end gap-1 mt-1.5 text-[9px] ${
                      isMine ? 'text-slate-400' : 'text-slate-400'
                    }`}>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && <CheckCheck className="h-3 w-3 text-teal-400" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Shift Attachment Picker Panel */}
        {showShiftAttachmentPicker && (
          <div className="p-3 border-t border-slate-200 bg-indigo-50/70 text-xs animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>Select Shift from Your Schedule to Attach:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowShiftAttachmentPicker(false)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              {days.map((d, i) => {
                const shift = currentEmployee.schedule[i];
                const timing = currentEmployee.timings[i];
                const isSelected = attachDayIndex === i;

                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setAttachDayIndex(i)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs scale-[1.02]'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] font-extrabold uppercase">
                      {d.dayName} {d.dayNumber}
                    </span>
                    <span className="block text-xs font-bold truncate mt-0.5">
                      {shift}
                    </span>
                    <span className={`block text-[9px] font-mono truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {timing}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => setShowShiftAttachmentPicker(!showShiftAttachmentPicker)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              showShiftAttachmentPicker ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
            title="Attach a Shift to this conversation"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedRecipientId === 'TEAM_LOUNGE'
                ? "Broadcast to all staff (e.g. 'Can someone cover Saturday evening?')..."
                : selectedRecipientId === 'ADMIN_DESK'
                ? "Message supervisor/admin regarding roster timing..."
                : `Message ${activePeer?.name || 'colleague'} regarding shift planning…`
            }
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <button
            type="submit"
            className="flex h-10 px-4 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs transition-colors shadow-xs"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
