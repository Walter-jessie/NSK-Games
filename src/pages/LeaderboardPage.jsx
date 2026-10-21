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
  const [filter, setFilter] = useState('all'); // 'all' | 'dept'
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchScores = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getLeaderboard(50);
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

  const filteredScores =
    filter === 'dept' ? scores.filter((s) => s.department === department) : scores;

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
      badgeClass: 'font-mono font-black text-base text-slate-500',
      color: 'text-slate-600',
    };
  };

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden bg-[#f8fafc] text-slate-800 select-none font-body">
      {/* ── Blurred CAD Blueprint Background Watermark ── */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-25 filter blur-[4px]"
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
        <g style={{ transformOrigin: '15px 25px' }}>
          <line x1="12" y1="25" x2="18" y2="25" stroke="#94a3b8" strokeWidth="0.3" />
          <line x1="15" y1="22" x2="15" y2="28" stroke="#94a3b8" strokeWidth="0.3" />
        </g>
        <g style={{ transformOrigin: '85px 75px' }}>
          <line x1="82" y1="75" x2="88" y2="75" stroke="#94a3b8" strokeWidth="0.3" />
          <line x1="85" y1="72" x2="85" y2="78" stroke="#94a3b8" strokeWidth="0.3" />
        </g>
      </svg>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 bg-white/85 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3.5">
          <button
            onClick={() => navigate('/hub')}
            className="text-slate-600 hover:text-slate-900 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white shadow-xs hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer"
            title="Return to Training Hub"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1.5 h-4 sm:h-6 bg-[#E60012] rounded-full" />
            <div>
              <h1 className="font-heading text-sm sm:text-lg md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                PLANT LEADERBOARD
              </h1>
            </div>
          </div>
        </div>

        {/* Filter Toggle & Refresh Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => fetchScores(true)}
            disabled={isRefreshing || isLoading}
            className="text-slate-600 hover:text-slate-900 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200 bg-white shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            title="Refresh rankings"
          >
            <svg
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin text-[#E60012]' : ''}`}
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

          <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 text-xs sm:text-sm">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg font-heading font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Plant
            </button>
            <button
              onClick={() => setFilter('dept')}
              className={`px-3.5 py-1.5 rounded-lg font-heading font-bold transition-all cursor-pointer ${
                filter === 'dept'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Dept
            </button>
          </div>

          {/* NSK Branding */}
          <span className="font-heading font-black text-2xl tracking-tighter text-[#E60012] ml-2 hidden sm:inline-block">
            NSK
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <svg className="animate-spin h-9 w-9 text-[#E60012] mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-heading font-bold text-slate-600">Syncing plant rankings...</p>
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto p-8 rounded-2xl bg-white/90 border border-slate-200 shadow-sm">
            <span className="text-6xl mb-4">🏆</span>
            <p className="font-heading font-black text-slate-900 text-2xl tracking-tight">No Scores Yet</p>
            <p className="text-sm font-medium text-slate-600 mt-2">
              Be the first trainee to complete the Bearing Challenge and establish the plant record!
            </p>
            <button
              onClick={() => navigate('/game/bearing-runner')}
              className="mt-6 py-3 px-6 rounded-xl font-heading font-black text-sm text-white bg-[#E60012] hover:bg-[#c90010] active:scale-98 transition-all shadow-md shadow-red-600/20 cursor-pointer"
            >
              Launch Bearing Runner →
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {filteredScores.map((entry, i) => {
              const rank = getRankStyle(i);
              const isSelf = entry.employeeId === employeeId;
              const correctAnswers =
                entry.correctCount !== undefined
                  ? entry.correctCount
                  : entry.accuracy !== undefined
                  ? Math.round((Number(entry.accuracy) / 100) * 10)
                  : 0;

              return (
                <div
                  key={`${entry.employeeId}-${i}`}
                  className={`flex items-center gap-4 px-4 sm:px-5 py-3.5 rounded-2xl border transition-all ${rank.bg} ${
                    isSelf ? 'ring-2 ring-[#E60012] border-[#E60012]/40 bg-red-50/70' : ''
                  }`}
                >
                  <span className={`w-9 text-center font-heading font-black flex items-center justify-center ${rank.badgeClass} ${rank.color}`}>
                    {rank.badge}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-heading font-black tracking-tight text-slate-900 truncate flex items-center gap-2">
                      <span>{entry.employeeId}</span>
                      {isSelf && (
                        <span className="text-[10px] font-mono font-bold text-[#E60012] bg-red-100 border border-red-300 px-1.5 py-0.5 rounded uppercase">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate mt-0.5">
                      {deptMap[entry.department] || entry.department || 'NSK Chennai'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="font-heading font-black text-lg sm:text-2xl text-slate-900 tabular-nums">
                        {correctAnswers}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-500">/ 10</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-heading font-bold text-emerald-700 uppercase tracking-wider block">
                      Correct Answers
                    </span>
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

