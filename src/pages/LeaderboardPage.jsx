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
        bg: 'bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30 border-l-4 border-l-amber-500 border-t border-r border-b border-amber-200/90 shadow-xs',
        badge: '🥇',
        badgeClass: 'text-2xl',
        color: 'text-amber-600',
      };
    if (i === 1)
      return {
        bg: 'bg-gradient-to-r from-slate-100/80 via-white to-slate-50 border-l-4 border-l-slate-400 border-t border-r border-b border-slate-300 shadow-xs',
        badge: '🥈',
        badgeClass: 'text-2xl',
        color: 'text-slate-500',
      };
    if (i === 2)
      return {
        bg: 'bg-gradient-to-r from-orange-50/80 via-white to-orange-50/30 border-l-4 border-l-amber-700 border-t border-r border-b border-orange-200/90 shadow-xs',
        badge: '🥉',
        badgeClass: 'text-2xl',
        color: 'text-amber-700',
      };
    return {
      bg: 'bg-white/90 backdrop-blur-xs border-l-4 border-l-slate-300 border-t border-r border-b border-slate-200/90 hover:border-l-slate-500 hover:bg-white shadow-xs',
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

      {/* Header — Straight sharp panels & borders matching home page */}
      <header className="relative z-10 flex flex-wrap items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 border-b-2 border-slate-300 bg-white/95 backdrop-blur-md shadow-xs gap-2">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/hub')}
            className="text-slate-700 hover:text-slate-900 p-1.5 rounded-none border border-slate-300 bg-white shadow-xs hover:border-slate-800 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer active:scale-95"
            title="Return to Training Hub"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 sm:h-5 bg-[#E60012]" />
            <h1 className="font-heading text-xs sm:text-base font-black text-slate-900 tracking-tight leading-none uppercase">
              LEADERBOARD
            </h1>
          </div>
        </div>

        {/* Center: Game 1 vs Game 2 Buttons (Sharp straight panels) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-none border border-slate-300 shadow-inner">
          <button
            onClick={() => setActiveGame('game1')}
            className={`px-3 sm:px-4 py-1.5 rounded-none font-heading text-[11px] sm:text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              activeGame === 'game1'
                ? 'bg-[#E60012] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            Game 1: Bearing Runner
          </button>
          <button
            onClick={() => setActiveGame('game2')}
            className={`px-3 sm:px-4 py-1.5 rounded-none font-heading text-[11px] sm:text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              activeGame === 'game2'
                ? 'bg-[#E60012] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            Game 2: Plant Arena
          </button>
        </div>

        {/* Right: Guest Mode Toggle, Plant/Dept Filter, & Refresh Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Guest Mode Separate Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-none border border-slate-300 text-[10px] sm:text-xs">
            <button
              onClick={() => setUserTypeFilter('employees')}
              className={`px-2.5 sm:px-3 py-1 rounded-none font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
                userTypeFilter === 'employees'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
              }`}
              title="Official employee rankings"
            >
              Employees
            </button>
            <button
              onClick={() => setUserTypeFilter('guests')}
              className={`px-2.5 sm:px-3 py-1 rounded-none font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
                userTypeFilter === 'guests'
                  ? 'bg-amber-500 text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
              }`}
              title="Guest runs"
            >
              Guests
            </button>
          </div>

          {/* Plant / Dept Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-none border border-slate-300 text-[10px] sm:text-xs">
            <button
              onClick={() => setDeptFilter('all')}
              className={`px-2.5 sm:px-3 py-1 rounded-none font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
                deptFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
              }`}
            >
              All Plant
            </button>
            <button
              onClick={() => setDeptFilter('dept')}
              className={`px-2.5 sm:px-3 py-1 rounded-none font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
                deptFilter === 'dept'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
              }`}
            >
              My Dept
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchScores(true)}
            disabled={isRefreshing || isLoading}
            className="text-slate-700 hover:text-slate-900 p-1.5 rounded-none border border-slate-300 bg-white shadow-xs hover:border-slate-800 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
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
            <p className="text-xs sm:text-sm font-heading font-bold text-slate-600 uppercase tracking-wider">Syncing rankings...</p>
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto p-6 rounded-none bg-white/95 border-2 border-slate-300 shadow-sm">
            <span className="text-5xl mb-3">🏆</span>
            <p className="font-heading font-black text-slate-900 text-xl tracking-tight uppercase">
              {userTypeFilter === 'guests' ? 'No Guest Runs Yet' : 'No Employee Scores Yet'}
            </p>
            <p className="text-xs font-medium text-slate-600 mt-1.5">
              {activeGame === 'game1'
                ? 'Be the first to complete the Bearing Runner and establish the plant record!'
                : 'Be the first to repair the line in Plant Arena!'}
            </p>
            <button
              onClick={() => navigate(activeGame === 'game1' ? '/game/bearing-runner' : '/game/plant-arena')}
              className="mt-4 py-2.5 px-6 rounded-none font-heading font-black text-xs text-white bg-[#E60012] hover:bg-[#c90010] active:scale-98 transition-all shadow-md shadow-red-600/20 uppercase tracking-widest cursor-pointer"
            >
              {activeGame === 'game1' ? 'Launch Bearing Runner →' : 'Launch Plant Arena →'}
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {filteredScores.map((entry, i) => {
              const rank = getRankStyle(i);
              const isSelf = entry.employeeId === employeeId;

              return (
                <div
                  key={`${entry.employeeId}-${i}`}
                  className={`flex items-center gap-3 sm:gap-4 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-none transition-all ${rank.bg} ${
                    isSelf ? 'ring-2 ring-emerald-600 border-l-emerald-600 bg-emerald-50/40' : ''
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
                        <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1 py-0.5 rounded-none uppercase">
                          YOU
                        </span>
                      )}
                      {entry.isGuest && (
                        <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded-none uppercase">
                          GUEST
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate uppercase tracking-wide">
                      {deptMap[entry.department] || entry.department || 'NSK Chennai'}
                    </p>
                  </div>

                  {/* Both Game 1 and Game 2 Scores for this player (Sharp Straight Panels, Green Color) */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Game 1 Box */}
                    <div
                      className={`px-2.5 sm:px-3 py-1 rounded-none border text-right transition-all min-w-[72px] sm:min-w-[84px] ${
                        activeGame === 'game1'
                          ? 'bg-emerald-50/90 border-2 border-emerald-600 shadow-xs'
                          : 'bg-slate-100/70 border border-slate-300 opacity-60'
                      }`}
                    >
                      <span className={`text-[8px] sm:text-[9px] font-heading font-black uppercase tracking-wider block ${
                        activeGame === 'game1' ? 'text-emerald-800' : 'text-slate-600'
                      }`}>
                        Game 1
                      </span>
                      {entry.game1?.played ? (
                        <div className="flex items-baseline justify-end gap-0.5">
                          <span className="font-heading font-black text-xs sm:text-sm text-slate-900 tabular-nums">
                            {entry.game1.correctCount}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">/10</span>
                        </div>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">--</span>
                      )}
                    </div>

                    {/* Game 2 Box */}
                    <div
                      className={`px-2.5 sm:px-3 py-1 rounded-none border text-right transition-all min-w-[72px] sm:min-w-[84px] ${
                        activeGame === 'game2'
                          ? 'bg-emerald-50/90 border-2 border-emerald-600 shadow-xs'
                          : 'bg-slate-100/70 border border-slate-300 opacity-60'
                      }`}
                    >
                      <span className={`text-[8px] sm:text-[9px] font-heading font-black uppercase tracking-wider block ${
                        activeGame === 'game2' ? 'text-emerald-800' : 'text-slate-600'
                      }`}>
                        Game 2
                      </span>
                      {entry.game2?.played ? (
                        <div className="flex items-baseline justify-end gap-0.5">
                          <span className="font-heading font-black text-xs sm:text-sm text-slate-900 tabular-nums">
                            {entry.game2.repairs}
                          </span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-slate-500">
                            rep
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">
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
