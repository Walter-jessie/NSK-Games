import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../stores/gameStore';
import useAuthStore from '../stores/authStore';
import BearingModelViewer from '../components/3d/BearingModelViewer';
import homeBg from '../assets/home_bg.jpg';
import { BEARING_PARTS } from '../config/bearingParts';

export default function ScoreResultPage() {
  const navigate = useNavigate();
  const { results, resetGame } = useGameStore();
  const { employeeId, department } = useAuthStore();

  // Calculate score-free mechanical performance metrics
  const correctCount = useMemo(() => {
    return results ? results.filter((r) => r.isCorrect).length : 0;
  }, [results]);

  const percentage = Math.round((correctCount / 10) * 100);

  // Performance telemetry based on assembled parts (Speed & Vibration only, Runout removed)
  const telemetry = useMemo(() => {
    if (correctCount === 10) {
      return {
        grade: 'NSK MASTER GRADE',
        status: 'Zero-Defect Certified Assembly',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-300',
        rpm: 12000,
        rpmLabel: '12,000 RPM (Peak)',
        vibration: '0.15 mm/s',
        vibrationStatus: 'Ultra Silent',
        vibrationColor: 'text-emerald-700',
        gaugeColor: '#10b981',
      };
    } else if (correctCount >= 8) {
      return {
        grade: 'GRADE 1 · PRECISION',
        status: 'Production Certified Assembly',
        statusColor: 'text-blue-700 bg-blue-50 border-blue-300',
        rpm: Math.round(7500 + (correctCount - 8) * 1800),
        rpmLabel: `${(7500 + (correctCount - 8) * 1800).toLocaleString()} RPM`,
        vibration: '0.42 mm/s',
        vibrationStatus: 'Normal',
        vibrationColor: 'text-blue-700',
        gaugeColor: '#3b82f6',
      };
    } else if (correctCount >= 6) {
      return {
        grade: 'GRADE 2 · OPERATIONAL',
        status: 'Standard Factory Assembly',
        statusColor: 'text-cyan-800 bg-cyan-50 border-cyan-300',
        rpm: 4800,
        rpmLabel: '4,800 RPM',
        vibration: '1.20 mm/s',
        vibrationStatus: 'Moderate',
        vibrationColor: 'text-amber-600',
        gaugeColor: '#06b6d4',
      };
    } else if (correctCount >= 4) {
      return {
        grade: 'GRADE 3 · SUB-STANDARD',
        status: 'Elevated Friction & Wear',
        statusColor: 'text-amber-800 bg-amber-50 border-amber-300',
        rpm: 2100,
        rpmLabel: '2,100 RPM',
        vibration: '4.80 mm/s',
        vibrationStatus: 'High Noise',
        vibrationColor: 'text-amber-700',
        gaugeColor: '#f59e0b',
      };
    } else if (correctCount >= 1) {
      return {
        grade: 'GRADE 4 · DEFECTIVE',
        status: 'Critical Assembly Flaw',
        statusColor: 'text-rose-800 bg-rose-50 border-rose-300',
        rpm: 650,
        rpmLabel: '650 RPM',
        vibration: '12.5 mm/s',
        vibrationStatus: 'Critical',
        vibrationColor: 'text-rose-700',
        gaugeColor: '#ef4444',
      };
    } else {
      return {
        grade: 'CRITICAL FAILURE',
        status: 'Total Assembly Breakdown',
        statusColor: 'text-red-900 bg-red-50 border-red-300',
        rpm: 0,
        rpmLabel: '0 RPM (Jammed)',
        vibration: 'Jammed',
        vibrationStatus: 'Seizure',
        vibrationColor: 'text-red-700',
        gaugeColor: '#dc2626',
      };
    }
  }, [correctCount]);

  const handlePlayAgain = () => {
    resetGame();
    navigate('/game/bearing-runner');
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f8fafc] text-slate-800 select-none font-body flex flex-row">
      {/* ── CAD Blueprint Background Watermark (Matching Login / Home Page) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-20 anim-cad-watermark"
        style={{ backgroundImage: `url(${homeBg})` }}
      />

      {/* ── Technical Drafting Grid & Precision Crosshairs Overlay ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {/* Subtle grid lines */}
        <line x1="0" y1="20" x2="100" y2="20" stroke="#cbd5e1" strokeWidth="0.15" strokeDasharray="1,2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#cbd5e1" strokeWidth="0.15" strokeDasharray="1,2" />
        <line x1="0" y1="80" x2="100" y2="80" stroke="#cbd5e1" strokeWidth="0.15" strokeDasharray="1,2" />

        {/* Technical drafting crosshairs (+) */}
        <g style={{ transformOrigin: '25px 25px' }}>
          <line x1="22" y1="25" x2="28" y2="25" stroke="#94a3b8" strokeWidth="0.3" />
          <line x1="25" y1="22" x2="25" y2="28" stroke="#94a3b8" strokeWidth="0.3" />
        </g>
        <g style={{ transformOrigin: '85px 85px' }}>
          <line x1="82" y1="85" x2="88" y2="85" stroke="#94a3b8" strokeWidth="0.3" />
          <line x1="85" y1="82" x2="85" y2="88" stroke="#94a3b8" strokeWidth="0.3" />
        </g>
      </svg>

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT COLUMN (60% WIDTH): Interactive 3D Assembled Bearing Model (FULL VIEW)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative w-[60%] h-full flex flex-col p-2 sm:p-3 z-10 border-r border-slate-200 overflow-hidden">
        {/* Top Header Badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs">
          <div className="w-1.5 h-3.5 sm:h-4 bg-[#E60012] rounded-full" />
          <h1 className="font-heading font-black text-[11px] sm:text-xs lg:text-sm text-slate-900 tracking-tight leading-none">
            ASSEMBLED BEARING SIMULATION
          </h1>
        </div>

        {/* 360° Drag Inspection Hint */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-xs text-[9px] sm:text-[10px] font-semibold text-slate-600">
          <span>🔄</span>
          <span>Drag to rotate 360°</span>
        </div>

        {/* 3D WebGL Canvas Container - FULL HEIGHT, NO BOTTOM PANEL */}
        <div className="w-full h-full flex items-center justify-center">
          <BearingModelViewer correctCount={correctCount} className="w-full h-full" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT COLUMN (40% WIDTH): Correct Answers, Parts Gallery & Performance
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative w-[40%] h-full flex flex-col justify-between p-2 sm:p-3 z-10 overflow-y-auto">
        <div className="space-y-1.5 sm:space-y-2">
          {/* Header Row: Employee & Pure NSK Red Logo */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div>
              <p className="font-heading font-bold text-xs text-slate-900 truncate">
                {employeeId || 'NSK-OPERATOR'} · <span className="text-slate-600">{department || 'Manufacturing'}</span>
              </p>
            </div>
            <span className="font-heading font-black text-base sm:text-xl tracking-tighter text-[#E60012]">
              NSK
            </span>
          </div>

          {/* Section 1: Standard Procedures Mastered (Correct Answers out of 10) */}
          <div className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-600 uppercase tracking-wider block">
                CORRECT ANSWERS
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-heading font-black text-lg sm:text-xl text-slate-900 tabular-nums">
                  {correctCount}
                </span>
                <span className="text-xs font-bold text-slate-600">/ 10</span>
              </div>
              <p className="text-[8px] sm:text-[9px] text-slate-600 font-medium">
                {correctCount === 10
                  ? 'All 10 protocols answered correctly'
                  : `${correctCount} of 10 components earned`}
              </p>
            </div>

            {/* Circular Percentage Pill */}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 sm:border-3 flex flex-col items-center justify-center bg-slate-50 shrink-0"
              style={{ borderColor: telemetry.gaugeColor }}
            >
              <span className="font-heading font-black text-xs sm:text-sm text-slate-900 leading-none">
                {percentage}%
              </span>
              <span className="text-[6px] sm:text-[7px] font-bold text-slate-600 uppercase mt-0.5">BUILT</span>
            </div>
          </div>

          {/* Section 1.5: Unified Telemetry Panel (Efficiency, Speed & Vibration in ONE Panel to reduce space) */}
          <div className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
            {/* Speed & Vibration Row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Speed */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs">⚡</span>
                <div className="min-w-0">
                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase block leading-none mb-0.5">SPEED</span>
                  <p className="font-heading font-black text-xs text-slate-900 truncate tabular-nums leading-tight">
                    {telemetry.rpmLabel}
                  </p>
                </div>
              </div>

              {/* Vibration */}
              <div className="flex items-center gap-1.5 min-w-0 border-l border-slate-100 pl-2">
                <span className="text-xs">〰️</span>
                <div className="min-w-0">
                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase block leading-none mb-0.5">VIBRATION</span>
                  <p className={`font-heading font-black text-xs truncate tabular-nums leading-tight ${telemetry.vibrationColor}`}>
                    {telemetry.vibration} <span className="text-[8px] font-normal text-slate-500">({telemetry.vibrationStatus})</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            {/* Efficiency Row & Progress Bar */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[8px]">
                <span className="font-mono font-bold text-slate-500 uppercase">EFFICIENCY</span>
                <span className="font-mono font-bold text-slate-700">{percentage}% Precision · <strong className="text-slate-800 font-heading">{telemetry.grade}</strong></span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${percentage}%`,
                    background: correctCount >= 8
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : correctCount >= 5
                      ? 'linear-gradient(90deg, #3b82f6, #0284c7)'
                      : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: 10-Slot Collected Bearing Parts Gallery */}
          <div className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                PARTS COLLECTED ({correctCount}/10)
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-600">
                {10 - correctCount} Missing
              </span>
            </div>

            {/* 10 Parts Grid */}
            <div className="grid grid-cols-5 gap-1">
              {BEARING_PARTS.map((part, index) => {
                const isCollected = index < correctCount;
                return (
                  <div
                    key={part.name}
                    className={`p-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                      isCollected
                        ? 'bg-emerald-50/80 border-emerald-300 shadow-xs ring-1 ring-emerald-200'
                        : 'bg-slate-50/60 border-slate-200/80 opacity-55'
                    }`}
                  >
                    <span className="mb-1 flex items-center justify-center w-full max-w-[42px] aspect-square rounded-md bg-slate-800/90">
                      {part.image ? (
                        <img src={part.image} alt="" className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <span className="text-lg sm:text-xl leading-none">{part.icon}</span>
                      )}
                    </span>
                    <p className={`text-[8px] sm:text-[9px] font-heading font-bold leading-tight truncate w-full ${
                      isCollected ? 'text-slate-900' : 'text-slate-600'
                    }`}>
                      {part.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 4: Action Button */}
        <div className="pt-1 border-t border-slate-200 mt-1">
          <button
            type="button"
            onClick={() => navigate('/game/plant-arena')}
            className="w-full py-1.5 sm:py-2 px-3 rounded-xl font-heading font-black text-xs text-white bg-[#E60012] hover:bg-[#c90010] active:scale-98 transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>NEXT GAME</span>
            <span className="group-hover:translate-x-1 transition-transform">➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
