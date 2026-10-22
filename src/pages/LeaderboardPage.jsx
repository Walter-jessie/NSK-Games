import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { getLeaderboard } from '../services/supabaseService';
import { getDepartmentOptions } from '../config/departments';
import homeBg from '../assets/home_bg.jpg';

const deptMap = Object.fromEntries(getDepartmentOptions().map((d) => [d.id, d.label]));

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { employeeId, department } = useAuthStore();
  const [scores, setScores] = useState([]);
  const [activeGame, setActiveGame] = useState('game1'); // 'game1' | 'game2'
  const [deptFilter, setDeptFilter] = useState('all'); // 'all' | 'dept'
  const [userTypeFilter, setUserTypeFilter] = useState('employees'); // 'employees' | 'guests'
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchScores = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getLeaderboard();
      setScores(data);
    } catch (err) {
      console.warn('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  // 1. Filter out guests unless guest toggle is selected
  let filteredScores = scores.filter((p) => {
    if (userTypeFilter === 'employees') return !p.isGuest;
    return p.isGuest;
  });

  // 2. Department filter
  if (deptFilter === 'dept' && department) {
    filteredScores = filteredScores.filter((p) => p.department === department);
  }

  // 3. Sort according to active game
  filteredScores.sort((a, b) => {
    if (activeGame === 'game1') {
      const aCount = a.game1?.played ? a.game1.correctCount : -1;
      const bCount = b.game1?.played ? b.game1.correctCount : -1;
      if (bCount !== aCount) return bCount - aCount;
      return (b.game1?.score || 0) - (a.game1?.score || 0);
    } else {
      const aCount = a.game2?.played ? a.game2.repairs : -1;
      const bCount = b.game2?.played ? b.game2.repairs : -1;
      if (bCount !== aCount) return bCount - aCount;
      return (b.game2?.score || 0) - (a.game2?.score || 0);
    }
  });

  const getRankStyle = (i) => {
    if (i === 0)
      return {
        bg: 'bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border-amber-300/90 shadow-sm ring-1 ring-amber-300/40',
        badge: '🥇',
        badgeClass: 'text-2xl',
        color: 'text-amber-600',
      };
    if (i === 1)
      return {
        bg: 'bg-gradient-to-r from-slate-100 via-white to-slate-50 border-slate-300 shadow-sm ring-1 ring-slate-300/40',
        badge: '🥈',
        badgeClass: 'text-2xl',
        color: 'text-slate-500',
      };
    if (i === 2)
      return {
        bg: 'bg-gradient-to-r from-orange-50 via-white to-orange-50/50 border-orange-300 shadow-sm ring-1 ring-orange-300/40',
        badge: '🥉',
        badgeClass: 'text-2xl',
        color: 'text-amber-700',
      };
    return {
      bg: 'bg-white/85 backdrop-blur-xs border-slate-200/90 hover:border-slate-300 hover:bg-white shadow-xs',
      badge: `#${i + 1}`,
      badgeClass: 'font-mono font-black text-sm sm:text-base text-slate-500',
      color: 'text-slate-600',
    };
  };

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden bg-[#f8fafc] text-slate-800 select-none font-body">
      {/* ── Blurred CAD Blueprint Background Watermark ── */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-20 filter blur-[4px]"
        style={{ backgroundImage: `url(${homeBg})` }}
      />

      {/* ── Technical Drafting Grid & Precision Crosshairs Overlay ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <line x1="0" y1="20" x2="100" y2="20" stroke="#cbd5e1" strokeWidth="0.15" strokeDasharray="1,2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#cbd5e1" strokeWidth="0.15" strokeDasharray="1,2" />
        <line x1="0" y1="80" x2="100" y2="80" stroke="#cbd5e1" strokeWidth="0.15" strokeDasharray="1,2" />
      </svg>

      {/* Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-xs gap-2">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/hub')}
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg border border-slate-200 bg-white shadow-xs hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer"
            title="Return to Training Hub"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 sm:h-5 bg-[#E60012] rounded-full" />
            <h1 className="font-heading text-xs sm:text-base font-black text-slate-900 tracking-tight leading-none">
              LEADERBOARD
            </h1>
          </div>
        </div>

        {/* Center: Game 1 vs Game 2 Buttons */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 shadow-inner">
          <button
            onClick={() => setActiveGame('game1')}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg font-heading text-[11px] sm:text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeGame === 'game1'
                ? 'bg-[#E60012] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>🏃</span>
            <span>Game 1: Bearing Runner</span>
          </button>
          <button
            onClick={() => setActiveGame('game2')}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg font-heading text-[11px] sm:text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeGame === 'game2'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>🔧</span>
            <span>Game 2: Plant Arena</span>
          </button>
        </div>

        {/* Right: Guest Mode Toggle, Plant/Dept Filter, & Refresh Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Guest Mode Separate Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] sm:text-xs">
            <button
              onClick={() => setUserTypeFilter('employees')}
              className={`px-2 sm:px-2.5 py-1 rounded-md font-heading font-bold transition-all cursor-pointer ${
                userTypeFilter === 'employees'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Official employee rankings"
            >
              Employees
            </button>
            <button
              onClick={() => setUserTypeFilter('guests')}
              className={`px-2 sm:px-2.5 py-1 rounded-md font-heading font-bold transition-all cursor-pointer ${
                userTypeFilter === 'guests'
                  ? 'bg-amber-500 text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Guest runs"
            >
              Guests
            </button>
          </div>

          {/* Plant / Dept Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] sm:text-xs">
            <button
              onClick={() => setDeptFilter('all')}
              className={`px-2 sm:px-2.5 py-1 rounded-md font-heading font-bold transition-all cursor-pointer ${
                deptFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Plant
            </button>
            <button
              onClick={() => setDeptFilter('dept')}
              className={`px-2 sm:px-2.5 py-1 rounded-md font-heading font-bold transition-all cursor-pointer ${
                deptFilter === 'dept'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              My Dept
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchScores(true)}
            disabled={isRefreshing || isLoading}
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg border border-slate-200 bg-white shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            title="Refresh rankings"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#E60012]' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <svg className="animate-spin h-8 w-8 text-[#E60012] mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs sm:text-sm font-heading font-bold text-slate-600">Syncing rankings...</p>
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-sm">
            <span className="text-5xl mb-3">🏆</span>
            <p className="font-heading font-black text-slate-900 text-xl tracking-tight">
              {userTypeFilter === 'guests' ? 'No Guest Runs Yet' : 'No Employee Scores Yet'}
            </p>
            <p className="text-xs font-medium text-slate-600 mt-1.5">
              {activeGame === 'game1'
                ? 'Be the first to complete the Bearing Runner and establish the plant record!'
                : 'Be the first to repair the line in Plant Arena!'}
            </p>
            <button
              onClick={() => navigate(activeGame === 'game1' ? '/game/bearing-runner' : '/game/plant-arena')}
              className="mt-4 py-2.5 px-5 rounded-xl font-heading font-black text-xs text-white bg-[#E60012] hover:bg-[#c90010] active:scale-98 transition-all shadow-md shadow-red-600/20 cursor-pointer"
            >
              {activeGame === 'game1' ? 'Launch Bearing Runner →' : 'Launch Plant Arena →'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 max-w-3xl mx-auto">
            {filteredScores.map((entry, i) => {
              const rank = getRankStyle(i);
              const isSelf = entry.employeeId === employeeId;

              return (
                <div
                  key={`${entry.employeeId}-${i}`}
                  className={`flex items-center gap-3 sm:gap-4 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border transition-all ${rank.bg} ${
                    isSelf ? 'ring-2 ring-[#E60012] border-[#E60012]/40 bg-red-50/70' : ''
                  }`}
                >
                  {/* Rank */}
                  <span className={`w-8 text-center font-heading font-black flex items-center justify-center ${rank.badgeClass} ${rank.color}`}>
                    {rank.badge}
                  </span>

                  {/* Player details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-heading font-black tracking-tight text-slate-900 truncate flex items-center gap-1.5">
                      <span>{entry.employeeId}</span>
                      {isSelf && (
                        <span className="text-[9px] font-mono font-bold text-[#E60012] bg-red-100 border border-red-300 px-1 py-0.5 rounded uppercase">
                          YOU
                        </span>
                      )}
                      {entry.isGuest && (
                        <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded uppercase">
                          GUEST
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                      {deptMap[entry.department] || entry.department || 'NSK Chennai'}
                    </p>
                  </div>

                  {/* Both Game 1 and Game 2 Scores for this player */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Game 1 Box */}
                    <div
                      className={`px-2 sm:px-3 py-1 rounded-xl border text-right transition-all min-w-[76px] sm:min-w-[96px] ${
                        activeGame === 'game1'
                          ? 'bg-red-50/90 border-[#E60012]/50 shadow-xs ring-1 ring-red-300'
                          : 'bg-slate-100/70 border-slate-200 opacity-60'
                      }`}
                    >
                      <span className="text-[8px] sm:text-[9px] font-heading font-black uppercase tracking-wider block text-slate-500">
                        🏃 Game 1
                      </span>
                      {entry.game1?.played ? (
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="font-heading font-black text-xs sm:text-sm text-slate-900 tabular-nums">
                            {entry.game1.correctCount}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">/10</span>
                          <span className="text-[9px] sm:text-[10px] font-mono font-semibold text-emerald-700 hidden sm:inline">
                            ({entry.game1.score}p)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">--</span>
                      )}
                    </div>

                    {/* Game 2 Box */}
                    <div
                      className={`px-2 sm:px-3 py-1 rounded-xl border text-right transition-all min-w-[76px] sm:min-w-[96px] ${
                        activeGame === 'game2'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-700'
                          : 'bg-slate-100/70 border-slate-200 opacity-60'
                      }`}
                    >
                      <span className={`text-[8px] sm:text-[9px] font-heading font-black uppercase tracking-wider block ${
                        activeGame === 'game2' ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        🔧 Game 2
                      </span>
                      {entry.game2?.played ? (
                        <div className="flex items-baseline justify-end gap-1">
                          <span className={`font-heading font-black text-xs sm:text-sm tabular-nums ${
                            activeGame === 'game2' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {entry.game2.repairs}
                          </span>
                          <span className={`text-[8px] sm:text-[9px] font-bold ${
                            activeGame === 'game2' ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            rep
                          </span>
                          <span className={`text-[9px] sm:text-[10px] font-mono font-semibold hidden sm:inline ${
                            activeGame === 'game2' ? 'text-emerald-400' : 'text-emerald-700'
                          }`}>
                            ({entry.game2.score}p)
                          </span>
                        </div>
                      ) : (
                        <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                          activeGame === 'game2' ? 'text-slate-400' : 'text-slate-400'
                        }`}>
                          --
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
