import React, { useState, useMemo } from 'react';
import { 
  Store, 
  Calendar, 
  Clock, 
  ArrowRight, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Plus, 
  X, 
  MessageSquare, 
  Search, 
  Briefcase, 
  Sparkles,
  UserCheck,
  Check,
  HelpCircle,
  CalendarOff,
  ChevronRight,
  DollarSign,
  Clock3
} from 'lucide-react';
import { MarketPost, Employee, DaySchedule, MarketMatchOption, ShiftCategory } from '../types';
import { SHIFT_DEFINITIONS } from '../data/defaultData';
import { findMarketMatchPath, checkShiftEligibility, findRankedMarketMatches, RankedMarketMatch } from '../utils/rosterEngine';

interface MarketViewProps {
  posts?: MarketPost[];
  marketPosts?: MarketPost[];
  currentEmployee: Employee;
  allEmployees: Employee[];
  days: DaySchedule[];
  onCreatePost: (newPost: Omit<MarketPost, 'id' | 'createdAt' | 'status'>) => void;
  onMatchPost: (postId: string, matchOption: MarketMatchOption) => void;
  onClosePost: (postId: string) => void;
  onClaimEHPost?: (postId: string) => void;
  onClaimDutyPost?: (postId: string) => void;
  onOpenChatWith?: (employeeId: string) => void;
  onNavigate?: (view: string) => void;
}

export const MarketView: React.FC<MarketViewProps> = ({
  posts: rawPosts,
  marketPosts,
  currentEmployee,
  allEmployees,
  days,
  onCreatePost,
  onMatchPost,
  onClosePost,
  onClaimEHPost,
  onClaimDutyPost,
  onOpenChatWith,
  onNavigate
}) => {
  const posts = rawPosts || marketPosts || [];
  const [filterTab, setFilterTab] = useState<'all' | 'matches' | 'day-off' | 'work-shift' | 'eh' | 'duty-sale' | 'my-posts'>('all');
  const [userInterest, setUserInterest] = useState<'all' | 'day-off' | 'extra-work'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedPathId, setExpandedPathId] = useState<string | null>(null);

  // Form state for creating a post
  const [postType, setPostType] = useState<'desire-day-off' | 'desire-work-shift' | 'eh-offer' | 'sell-duty'>('desire-day-off');
  const [targetDateIndex, setTargetDateIndex] = useState<number>(0);
  const [desiredShift, setDesiredShift] = useState<ShiftCategory | 'OFF'>('OFF');
  const [willingOffer, setWillingOffer] = useState<string>('Will trade another shift or cover rest day');
  const [note, setNote] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Evaluate matches & hierarchical rankings based on user interest
  const rankedResults = useMemo(() => {
    return findRankedMarketMatches(posts, currentEmployee, allEmployees, days, userInterest);
  }, [posts, currentEmployee, allEmployees, days, userInterest]);

  const rankedMap = useMemo(() => {
    const map = new Map<string, RankedMarketMatch>();
    rankedResults.forEach(item => {
      map.set(item.post.id, item);
    });
    return map;
  }, [rankedResults]);

  const matchesMap = useMemo(() => {
    const map = new Map<string, MarketMatchOption | null>();
    posts.forEach(post => {
      if (post.status === 'open' && post.authorId !== currentEmployee.id) {
        const item = rankedMap.get(post.id);
        map.set(post.id, item?.match || findMarketMatchPath(post, currentEmployee, allEmployees, days, posts));
      }
    });
    return map;
  }, [posts, currentEmployee, allEmployees, days, rankedMap]);

  // Counts
  const openPosts = posts.filter(p => p.status === 'open');
  const myPosts = posts.filter(p => p.authorId === currentEmployee.id);
  const compatibleMatches = openPosts.filter(p => {
    const match = matchesMap.get(p.id);
    return match && match.isEligible;
  });
  const dayOffPosts = openPosts.filter(p => p.type === 'desire-day-off');
  const workShiftPosts = openPosts.filter(p => p.type === 'desire-work-shift');
  const ehPosts = openPosts.filter(p => p.type === 'eh-offer');
  const dutySalePosts = openPosts.filter(p => p.type === 'sell-duty');
  const approvedPosts = posts.filter(p => p.status === 'approved' && p.approvedExchangeSummary && p.type !== 'eh-offer');

  // Filtered posts, sorted strictly according to user interest hierarchy (highest score first)
  const filteredPosts = useMemo(() => {
    const list = posts.filter(p => {
      if (p.type === 'eh-offer') return false;
      if (p.type === 'sell-duty') return false;
      // Tab filter
      if (filterTab === 'matches') {
        const match = matchesMap.get(p.id);
        if (!match || !match.isEligible) return false;
      } else if (filterTab === 'day-off') {
        if (p.type !== 'desire-day-off') return false;
      } else if (filterTab === 'work-shift') {
        if (p.type !== 'desire-work-shift') return false;
      } else if (filterTab === 'my-posts') {
        if (p.authorId !== currentEmployee.id) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAuthor = p.authorName.toLowerCase().includes(q) || p.authorId.toLowerCase().includes(q);
        const matchesNote = p.note.toLowerCase().includes(q);
        const matchesShift = p.currentShift.toLowerCase().includes(q) || p.desiredShift.toLowerCase().includes(q);
        const matchesDate = p.targetDate.toLowerCase().includes(q);
        return matchesAuthor || matchesNote || matchesShift || matchesDate;
      }

      return true;
    });

    // Sort by hierarchical ranking score: most feasible and attractable for the user appears first
    return list.sort((a, b) => {
      // User's own posts go to bottom of match discovery
      if (a.authorId === currentEmployee.id && b.authorId !== currentEmployee.id) return 1;
      if (b.authorId === currentEmployee.id && a.authorId !== currentEmployee.id) return -1;

      const scoreA = rankedMap.get(a.id)?.score ?? 0;
      const scoreB = rankedMap.get(b.id)?.score ?? 0;
      return scoreB - scoreA;
    });
  }, [posts, filterTab, searchQuery, matchesMap, currentEmployee.id, rankedMap]);

  // Handle post creation submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetDay = days[targetDateIndex];
    if (!targetDay) {
      setFormError('Please select a valid schedule day.');
      return;
    }

    const currentShift = currentEmployee.schedule[targetDateIndex] || 'OFF';
    const currentTiming = currentEmployee.timings[targetDateIndex] || 'Rest Day';

    if (postType === 'eh-offer') {
      if ((currentEmployee.extraHours[targetDateIndex] || 0) < 5) {
        setFormError('Only an existing EH day can be offered. The selected date is not marked as an EH day.');
        return;
      }
    }

    if (postType === 'sell-duty') {
      if (currentShift === 'OFF') {
        setFormError('You cannot sell full time duty on a day you are already scheduled OFF.');
        return;
      }
    }

    // Verify female constraint for requested shift if female
    if (postType !== 'eh-offer' && postType !== 'sell-duty' && desiredShift !== 'OFF') {
      const eligibility = checkShiftEligibility(currentEmployee, desiredShift);
      if (!eligibility.eligible) {
        setFormError(`Cannot request ${desiredShift}: ${eligibility.reason}`);
        return;
      }
    }

    onCreatePost({
      authorId: currentEmployee.id,
      authorName: currentEmployee.name,
      authorInitials: currentEmployee.initials,
      authorGender: currentEmployee.gender,
      authorRole: currentEmployee.role,
      type: postType,
      targetDate: targetDay.date,
      targetDateIndex,
      currentShift,
      currentTiming,
      desiredShift: postType === 'sell-duty' ? 'OFF' : desiredShift,
      desiredTiming: postType === 'eh-offer' ? 'EH Day' : postType === 'sell-duty' ? 'Rest Day' : (desiredShift !== 'OFF' ? SHIFT_DEFINITIONS[desiredShift]?.time : undefined),
      willingToOffer: postType === 'eh-offer' ? 'EH opportunity — 2,000 TK' : postType === 'sell-duty' ? 'Full time duty — 2,500 TK' : (willingOffer || 'Flexible shift coverage'),
      note: note || (postType === 'desire-day-off' ? 'Seeking rest day on this date' : postType === 'eh-offer' ? 'Selling an existing EH day' : postType === 'sell-duty' ? 'Selling full time duty for 2,500 TK' : 'Available for duty coverage'),
      ehReward: postType === 'eh-offer' ? 2000 : undefined,
      dutyReward: postType === 'sell-duty' ? 2500 : undefined
    });

    setIsCreateModalOpen(false);
    setNote('');
  };

  const handleOpenCreateModal = (type: 'desire-day-off' | 'desire-work-shift' | 'eh-offer' | 'sell-duty') => {
    setPostType(type);
    setDesiredShift(type === 'desire-day-off' || type === 'sell-duty' ? 'OFF' : 'Day');
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/60">
                <Store className="h-3.5 w-3.5" />
                Shift Market
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Live Peer Roster Exchange
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Roster Exchange Market
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Post your desirable day offs or desirable working days to the community board. The matching engine maps out the exact trade path and shift you can offer to complete the exchange.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:self-start">
            <button
              onClick={() => handleOpenCreateModal('desire-day-off')}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
            >
              <CalendarOff className="h-4 w-4 text-teal-400" />
              <span>Post Day Off</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal('sell-duty')}
              className="flex items-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 px-4 py-2.5 text-xs font-bold text-orange-950 transition-all shadow-xs"
            >
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span>Sell Duty (2,500 TK)</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal('eh-offer')}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 text-xs font-bold text-amber-900 transition-all shadow-xs"
            >
              <DollarSign className="h-4 w-4" />
              <span>Sell EH (2,000 TK)</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal('desire-work-shift')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 transition-all shadow-xs"
            >
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <span>Post Working Day</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Open Listings</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">{openPosts.length}</span>
              <span className="text-[10px] text-slate-500 font-medium">available</span>
            </div>
          </div>

          <div className={`rounded-xl p-3 border transition-colors ${
            compatibleMatches.length > 0
              ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/30'
              : 'bg-slate-50 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800 block">Matches for You</span>
              {compatibleMatches.length > 0 && (
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-emerald-700">{compatibleMatches.length}</span>
              <span className="text-[10px] text-emerald-600 font-medium">ready to swap</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Desirable Day Offs</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">{dayOffPosts.length}</span>
              <span className="text-[10px] text-slate-500 font-medium">seeking cover</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Duty Sales (2,500 TK)</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-orange-700">{dutySalePosts.length}</span>
              <span className="text-[10px] text-slate-500 font-medium">paid duty</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Desirable Work Days</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">{workShiftPosts.length}</span>
              <span className="text-[10px] text-slate-500 font-medium">seeking shifts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Listings ({posts.length})
          </button>

          <button
            onClick={() => setFilterTab('matches')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              filterTab === 'matches'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Compatible for Me ({compatibleMatches.length})</span>
          </button>

          <button
            onClick={() => setFilterTab('day-off')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              filterTab === 'day-off'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Day Offs ({dayOffPosts.length})
          </button>

          <button
            onClick={() => setFilterTab('duty-sale')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              filterTab === 'duty-sale' ? 'bg-orange-600 text-white shadow-xs' : 'text-orange-700 hover:text-orange-900 hover:bg-orange-50'
            }`}
          >
            Duty Sales (2,500 TK) ({dutySalePosts.length})
          </button>

          <button
            onClick={() => setFilterTab('work-shift')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              filterTab === 'work-shift'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Working Days ({workShiftPosts.length})
          </button>

          <button
            onClick={() => setFilterTab('eh')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              filterTab === 'eh' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:text-amber-900 hover:bg-amber-50'
            }`}
          >
            EH Offers ({ehPosts.length})
          </button>

          <button
            onClick={() => setFilterTab('my-posts')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              filterTab === 'my-posts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Posts ({myPosts.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by colleague, date, or shift..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* User Interest Hierarchy Controller */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-emerald-50/80 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900">Interest-Based Matchup Hierarchy</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                Strict Hierarchy Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              The matchup most feasible and attractive to your goal displays <strong>first (#1)</strong>, with remaining offers organized step-by-step.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-white/90 p-1 rounded-xl border border-slate-200 text-xs self-start lg:self-auto overflow-x-auto">
            <button
              onClick={() => setUserInterest('day-off')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                userInterest === 'day-off'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarOff className="h-3.5 w-3.5" />
              <span>I Want a Day Off</span>
            </button>

            <button
              onClick={() => setUserInterest('extra-work')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                userInterest === 'extra-work'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>I Want to Work Extra Day (EH • 2,000 TK)</span>
            </button>

            <button
              onClick={() => setUserInterest('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                userInterest === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Matchups
            </button>
          </div>
        </div>
      </div>

      {/* Market Post Listings */}
      {filterTab !== 'eh' && filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Store className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Listings Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterTab === 'matches'
              ? 'No open posts currently have a matching trade path with your schedule. Check back soon or post your desired schedule above.'
              : 'There are no active market postings matching your search or filter.'}
          </p>
          <button
            onClick={() => handleOpenCreateModal('desire-day-off')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Create First Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPosts.map(post => {
            const isMine = post.authorId === currentEmployee.id;
            const matchOption = matchesMap.get(post.id);
            const rankedInfo = rankedMap.get(post.id);
            const isMatched = post.status === 'matched';
            const isExpanded = expandedPathId === post.id;
            const targetDay = days[post.targetDateIndex] || days[0];

            return (
              <div
                key={post.id}
                className={`rounded-2xl border transition-all ${
                  isMatched
                    ? 'border-slate-200 bg-slate-50/70 opacity-80'
                    : matchOption && matchOption.isEligible
                    ? 'border-emerald-300 bg-white shadow-xs hover:border-emerald-400 ring-1 ring-emerald-500/10'
                    : 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="p-5 sm:p-6">
                  {/* Top Row: Author Info & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white font-mono shadow-xs">
                        {post.authorInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{post.authorName}</h3>
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">{post.authorId}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            post.authorGender === 'female'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : 'bg-sky-50 text-sky-700 border border-sky-200/60'
                          }`}>
                            {post.authorGender === 'female' ? 'Female' : 'Male'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{post.authorRole}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isMatched ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
                          <Check className="h-3.5 w-3.5 text-slate-600" />
                          Matched with {post.matchedWithName || 'Colleague'}
                        </span>
                      ) : isMine ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                            Your Active Listing
                          </span>
                          <button
                            onClick={() => onClosePost(post.id)}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50"
                          >
                            Close
                          </button>
                        </div>
                      ) : matchOption && matchOption.isEligible ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {rankedInfo && rankedInfo.rankIndex > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full shadow-xs">
                              🌟 Rank #{rankedInfo.rankIndex}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            {rankedInfo?.highlightBadge || 'Direct Match Ready'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {rankedInfo && rankedInfo.rankIndex > 0 && (
                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              Rank #{rankedInfo.rankIndex}
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            Open Request
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Grid: Request Content */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                    {/* Column 1: Date & Intent */}
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Request Goal
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {post.type === 'desire-day-off' ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100/70 px-2.5 py-1 rounded-lg">
                            <CalendarOff className="h-3.5 w-3.5" />
                            <span>Desires Day Off (Rest)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>Desires Working Day</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2.5">
                        <span className="text-[10px] text-slate-400 font-medium block">Target Date:</span>
                        <p className="text-xs font-bold text-slate-900 font-mono">
                          {targetDay.dayName}, {targetDay.dayNumber} {targetDay.month} ({targetDay.date})
                        </p>
                      </div>
                    </div>

                    {/* Column 2: Shift Transition Details */}
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Current vs Desired
                      </span>
                      <div className="space-y-1.5 mt-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Currently Has:</span>
                          <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                            {post.currentShift} ({post.currentTiming})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Desires to Get:</span>
                          <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono text-[11px]">
                            {post.desiredShift === 'OFF' ? 'Rest Day (OFF)' : post.desiredShift}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Willing to Offer */}
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Willing to Offer in Exchange
                      </span>
                      <p className="text-xs font-medium text-slate-700 mt-1 leading-snug">
                        {post.willingToOffer}
                      </p>
                      {post.note && (
                        <p className="text-[11px] text-slate-500 italic mt-2 border-t border-slate-200 pt-1.5">
                          "{post.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Path & Match Resolution Section */}
                  {!isMine && !isMatched && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      {matchOption && matchOption.isEligible ? (
                        <div className="rounded-xl bg-emerald-50/90 border border-emerald-300 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0 mt-0.5">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-emerald-950">
                                  Proposed Match: {matchOption.summary}
                                </h4>
                                <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                                  {matchOption.pathDescription}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => setExpandedPathId(isExpanded ? null : post.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-lg transition-colors"
                              >
                                {isExpanded ? 'Hide Path Steps' : 'View Transfer Path'}
                              </button>
                              <button
                                onClick={() => onMatchPost(post.id, matchOption)}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                                <span>Accept Match & Trade</span>
                              </button>
                            </div>
                          </div>

                          {/* Detailed Path Steps (shown when expanded) */}
                          {isExpanded && matchOption.steps.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-emerald-200/80 space-y-2.5 animate-in fade-in duration-150">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
                                Step-by-Step Exchange Path:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {matchOption.steps.map((step, idx) => (
                                  <div key={idx} className="rounded-lg bg-white p-3 border border-emerald-200 text-xs shadow-2xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-emerald-900">{step.title}</span>
                                      <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        Step {idx + 1}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 leading-snug">{step.description}</p>
                                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-slate-500">You: {step.shiftGiven}</span>
                                      <ArrowRight className="h-3 w-3 text-slate-400" />
                                      <span className="text-emerald-700 font-bold">{step.shiftReceived}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : matchOption && !matchOption.isEligible ? (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <strong className="block font-bold">Policy & Labor Constraint:</strong>
                            <p className="mt-0.5">{matchOption.ineligibilityReason || matchOption.pathDescription}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (onOpenChatWith) onOpenChatWith(post.authorId);
                              else if (onNavigate) onNavigate('messages');
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Discuss</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span>
                              Your schedule on {targetDay.dayName}: <strong className="text-slate-800">{currentEmployee.schedule[post.targetDateIndex]} ({currentEmployee.timings[post.targetDateIndex]})</strong>
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              if (onOpenChatWith) onOpenChatWith(post.authorId);
                              else if (onNavigate) onNavigate('messages');
                            }}
                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Chat with {post.authorName.split(' ')[0]}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filterTab === 'eh' && ehPosts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3">
            <Clock3 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No EH Offers Found</h3>
          <p className="text-xs text-slate-500 mt-1">Eligible employees will see an EH offer here when someone posts a 5-hour EH day.</p>
        </div>
      )}

      {approvedPosts.length > 0 && (
        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-emerald-200/80">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-950">Recently Approved Exchanges</h2>
                <p className="text-[11px] text-emerald-800">Public record of completed, mutually-agreed shift rotations</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300">
              {approvedPosts.length} Closed Trades
            </span>
          </div>

          <div className="space-y-3">
            {approvedPosts.slice(0, 8).map(post => {
              const participantNames = (post.participantIds || [post.authorId])
                .map(id => allEmployees.find(e => e.id === id)?.name || id);
              const participantCount = participantNames.length;

              return (
                <div key={post.id} className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs hover:border-emerald-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✅ {participantCount}-Person Agreement
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {participantNames.join(' ↔ ')}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500">
                      Approved {post.approvedAt ? new Date(post.approvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                  </div>

                  <div className="mt-2.5 text-xs text-slate-700 leading-relaxed">
                    <div className="font-semibold text-slate-900 mb-1">Exchange Details:</div>
                    <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700 font-mono text-[11px]">
                      {post.approvedExchangeSummary}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Target Date: <strong className="text-slate-800 font-mono">{post.targetDate}</strong></span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>100% Unanimous Consensus</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filterTab === 'eh' && (
        <div className="space-y-3">
          {ehPosts.filter(p => p.authorId !== currentEmployee.id).map(post => {
            const eligible = currentEmployee.schedule[post.targetDateIndex] === 'OFF';
            const day = days[post.targetDateIndex] || days[0];
            return (
              <div key={post.id} className="rounded-2xl border border-amber-200 bg-white p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div><div className="text-sm font-extrabold text-slate-900">EH Day • {day.dayName}, {day.dayNumber} {day.month}</div><div className="text-xs text-slate-500 mt-0.5">Offered by {post.authorName} • 2,000 TK</div></div>
                  <button disabled={!eligible || !onClaimEHPost} onClick={() => onClaimEHPost?.(post.id)} className={`px-4 py-2 rounded-xl text-xs font-bold ${eligible ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>{eligible ? 'Claim EH • 2,000 TK' : 'Not Eligible — You Work This Day'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filterTab === 'duty-sale' && (
        <div className="space-y-3">
          {dutySalePosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600 mb-3">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Full-Time Duty Sales Found</h3>
              <p className="text-xs text-slate-500 mt-1">Colleagues who want a day off can offer their full time duty here for 2,500 TK.</p>
            </div>
          ) : (
            dutySalePosts.filter(p => p.authorId !== currentEmployee.id).map(post => {
              const eligible = currentEmployee.schedule[post.targetDateIndex] === 'OFF';
              const day = days[post.targetDateIndex] || days[0];
              const shiftEligibility = checkShiftEligibility(currentEmployee, post.currentShift, post.currentTiming);
              const canTakeDuty = eligible && shiftEligibility.eligible;

              return (
                <div key={post.id} className="rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-xs hover:border-orange-300 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-950 border border-orange-300">
                          Full Time Duty Offer • 2,500 TK
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {day.dayName}, {day.dayNumber} {day.month}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1">
                        Work {post.currentShift} Shift ({post.currentTiming}) for {post.authorName}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {post.note || 'Full-time shift cover request'} • Earn <strong>2,500 TK</strong> direct compensation
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={!canTakeDuty || !onClaimDutyPost}
                        onClick={() => onClaimDutyPost?.(post.id)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 ${
                          canTakeDuty
                            ? 'bg-orange-600 text-white hover:bg-orange-500 ring-2 ring-orange-400/50'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <DollarSign className="h-4 w-4" />
                        <span>{canTakeDuty ? 'Take Duty & Earn 2,500 TK' : !eligible ? 'Not Eligible (You already work this day)' : 'Policy Restriction'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Create Market Post */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Community Exchange</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Post to Roster Market
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Broadcast your desirable day off or working shift. Colleagues can review and match your post directly.
              </p>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Step 1: Select Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. What is your goal?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPostType('desire-day-off');
                      setDesiredShift('OFF');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      postType === 'desire-day-off'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 text-indigo-950'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <CalendarOff className="h-4 w-4 text-indigo-600" />
                      <span>I Want a Day Off</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Exchange duty for Rest Day (OFF)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPostType('sell-duty');
                      setDesiredShift('OFF');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      postType === 'sell-duty' ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600 text-orange-950' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs"><DollarSign className="h-4 w-4 text-orange-600" /><span>Sell Full Time Duty (2,500 TK)</span></div>
                    <p className="text-[10px] text-slate-500 mt-1">Offer your full-time shift for 2,500 TK cash</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPostType('eh-offer');
                      setDesiredShift('Day');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      postType === 'eh-offer' ? 'border-amber-600 bg-amber-50 ring-1 ring-amber-600 text-amber-950' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs"><DollarSign className="h-4 w-4 text-amber-600" /><span>Sell EH Day (2,000 TK)</span></div>
                    <p className="text-[10px] text-slate-500 mt-1">Offer an existing EH day for 2,000 TK</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPostType('desire-work-shift');
                      setDesiredShift('Day');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      postType === 'desire-work-shift'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 text-indigo-950'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Briefcase className="h-4 w-4 text-indigo-600" />
                      <span>I Want a Working Day</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Pick up an active shift or swap to duty
                    </p>
                  </button>
                </div>
              </div>

              {/* Step 2: Select Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Select Target Date:
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((d, idx) => {
                    const myShift = currentEmployee.schedule[idx];
                    const isSelected = targetDateIndex === idx;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setTargetDateIndex(idx)}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="block text-[10px] font-semibold">{d.dayName}</span>
                        <span className="block text-sm font-extrabold font-mono leading-none my-0.5">{d.dayNumber}</span>
                        <span className={`block text-[9px] font-bold truncate ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}>
                          {myShift}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  Currently scheduled on this day:{' '}
                  <strong className="text-slate-900 font-mono">
                    {currentEmployee.schedule[targetDateIndex]} ({currentEmployee.timings[targetDateIndex]})
                  </strong>
                </div>
              </div>

              {postType === 'sell-duty' && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-950">
                  <strong>Full Time Duty Sale Rule:</strong> You offer your regular working shift to another employee who is currently OFF. When they claim it, they work your shift and receive <strong>2,500 TK</strong>, while your schedule changes to OFF (Rest Day).
                </div>
              )}

              {postType === 'eh-offer' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                  <strong>EH offer rule:</strong> the selected date must already be your EH day. Another employee can claim it only when they are OFF on that date. They receive 2,000 TK for the EH duty.
                </div>
              )}

              {/* Step 3: Select Desired Shift */}
              {postType === 'desire-work-shift' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. Desired Shift to Work:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['Morning', 'Day', 'Evening', 'Night', 'Overnight'] as ShiftCategory[]).map(cat => {
                      const def = SHIFT_DEFINITIONS[cat];
                      const check = checkShiftEligibility(currentEmployee, cat);
                      const isSelected = desiredShift === cat;

                      return (
                        <button
                          key={cat}
                          type="button"
                          disabled={!check.eligible}
                          onClick={() => setDesiredShift(cat)}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            !check.eligible
                              ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : isSelected
                              ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{cat}</span>
                            {!check.eligible && (
                              <span className="text-[9px] text-rose-600 font-bold">Policy Limit</span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{def.time}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: What you are willing to offer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What are you willing to offer in return?
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Will cover weekend shift',
                    'Trade for any Morning shift',
                    'Willing to take Evening shift',
                    'Available for Rest Day coverage',
                    'Flexible on swap dates'
                  ].map(quick => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setWillingOffer(quick)}
                      className="text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-slate-700 font-medium"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={willingOffer}
                  onChange={(e) => setWillingOffer(e.target.value)}
                  placeholder="e.g. Will take your Sunday duty or trade any daytime shift"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Step 5: Personal Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Medical appointment, family gathering..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shadow-xs"
                >
                  Publish Listing to Market
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
