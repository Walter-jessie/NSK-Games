import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BearingModelViewer from '../components/3d/BearingModelViewer';
import useAuthStore from '../stores/authStore';

const TEST_MODES = [
  { id: 'inspect', label: '0 RPM (Static Inspection)', speed: 0 },
  { id: 'nominal', label: '1,800 RPM (Nominal Run)', speed: 0.018 },
  { id: 'high', label: '3,600 RPM (High-Speed Check)', speed: 0.038 },
];

export default function BearingCheckPage() {
  const navigate = useNavigate();
  const { employeeId, department } = useAuthStore();
  const [selectedMode, setSelectedMode] = useState('nominal');
  const [checklist, setChecklist] = useState({
    raceway: true,
    balls: true,
    clearance: true,
    lubrication: true,
  });
  const [showCert, setShowCert] = useState(false);

  const currentMode = TEST_MODES.find((m) => m.id === selectedMode) || TEST_MODES[1];

  const toggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allPassed = Object.values(checklist).every(Boolean);

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden bg-nsk-bg text-white">
      <div className="gear-bg" />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/10 bg-nsk-surface/70 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/hub')}
            className="text-nsk-text-secondary hover:text-white p-1 rounded-lg border border-white/10"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-heading text-xs sm:text-base font-bold flex items-center gap-1.5 sm:gap-2">
              <span className="text-red-500 font-mono text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30">LEVEL 2</span>
              <span>🔬 3D Bearing Inspection</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-nsk-text-secondary">
              Virtual Model Bench · NSK 6208 Deep Groove Chrome SUJ2
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-mono bg-nsk-success/20 text-nsk-success border border-nsk-success/30">
            HEALTH: 98%
          </span>
        </div>
      </header>

      {/* Main Workspace (Split Screen in Landscape) */}
      <div className="relative z-10 flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Left Side: 3D Bearing Viewport */}
        <div className="relative flex-1 h-[50%] sm:h-full flex items-center justify-center bg-gradient-to-b from-nsk-surface/20 to-transparent">
          {/* Interactive 3D Model */}
          <BearingModelViewer
            spinSpeed={currentMode.speed}
            isInteractive={true}
            autoRotate={true}
            className="w-full h-full"
          />

          {/* Interactive Hint Overlay */}
          <div className="absolute top-3 left-3 pointer-events-none bg-nsk-bg/80 border border-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs text-[10px] text-nsk-text-secondary flex items-center gap-1.5 shadow-md">
            <span>🔄</span> Drag with finger or mouse to inspect 360°
          </div>

          {/* Simulated Industrial Sensor Telemetry Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between gap-2 pointer-events-none">
            <div className="bg-nsk-bg/85 border border-white/10 px-2.5 py-1.5 rounded-lg backdrop-blur-xs shadow-md">
              <p className="text-[9px] text-nsk-text-secondary">TEMPERATURE</p>
              <p className="font-mono text-xs font-bold text-nsk-success">38.4°C (Normal)</p>
            </div>
            <div className="bg-nsk-bg/85 border border-white/10 px-2.5 py-1.5 rounded-lg backdrop-blur-xs shadow-md">
              <p className="text-[9px] text-nsk-text-secondary">VIBRATION RMS</p>
              <p className="font-mono text-xs font-bold text-nsk-primary-light">0.72 mm/s (ISO A)</p>
            </div>
            <div className="bg-nsk-bg/85 border border-white/10 px-2.5 py-1.5 rounded-lg backdrop-blur-xs shadow-md">
              <p className="text-[9px] text-nsk-text-secondary">DYNAMIC LOAD</p>
              <p className="font-mono text-xs font-bold text-amber-400">29.7 kN (Cr)</p>
            </div>
          </div>
        </div>

        {/* Right Side: Diagnostic Controls & Checklist Panel */}
        <div className="w-full md:w-80 h-[45%] md:h-full border-t md:border-t-0 md:border-l border-white/10 bg-nsk-surface/50 backdrop-blur-md flex flex-col p-3 overflow-y-auto space-y-3">
          {/* RPM Mode Switcher */}
          <div>
            <label className="text-[11px] font-heading font-semibold text-nsk-text-secondary block mb-1.5">
              Operating Speed Simulation
            </label>
            <div className="grid grid-cols-3 gap-1">
              {TEST_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`text-[10px] py-1.5 px-1 rounded-lg font-medium transition-all text-center border ${
                    selectedMode === mode.id
                      ? 'bg-nsk-primary text-white border-nsk-primary-light shadow-md shadow-nsk-primary/20'
                      : 'bg-white/5 border-white/10 text-nsk-text-secondary hover:text-white'
                  }`}
                >
                  {mode.id === 'inspect' ? 'Static 0 RPM' : mode.id === 'nominal' ? '1,800 RPM' : '3,600 RPM'}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Checklist */}
          <div className="glass-card p-3 border-white/10 space-y-2 flex-1">
            <h3 className="text-xs font-heading font-bold text-white flex items-center justify-between">
              <span>Quality Inspection Matrix</span>
              <span className="text-[10px] text-nsk-primary-light font-mono">
                {Object.values(checklist).filter(Boolean).length}/4 Verified
              </span>
            </h3>

            <div className="space-y-1.5">
              <label
                onClick={() => toggleCheck('raceway')}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={checklist.raceway}
                  onChange={() => {}}
                  className="rounded border-white/20 text-nsk-primary focus:ring-0"
                />
                <span className="text-[11px] text-nsk-text-secondary flex-1">
                  Raceway Superfinish & Honing (Ra &lt; 0.05µm)
                </span>
                <span className="text-nsk-success text-xs">✓</span>
              </label>

              <label
                onClick={() => toggleCheck('balls')}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={checklist.balls}
                  onChange={() => {}}
                  className="rounded border-white/20 text-nsk-primary focus:ring-0"
                />
                <span className="text-[11px] text-nsk-text-secondary flex-1">
                  8-Ball Sphericity Grade ISO 3290
                </span>
                <span className="text-nsk-success text-xs">✓</span>
              </label>

              <label
                onClick={() => toggleCheck('clearance')}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={checklist.clearance}
                  onChange={() => {}}
                  className="rounded border-white/20 text-nsk-primary focus:ring-0"
                />
                <span className="text-[11px] text-nsk-text-secondary flex-1">
                  Radial Internal Clearance C3 (15-33µm)
                </span>
                <span className="text-nsk-success text-xs">✓</span>
              </label>

              <label
                onClick={() => toggleCheck('lubrication')}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={checklist.lubrication}
                  onChange={() => {}}
                  className="rounded border-white/20 text-nsk-primary focus:ring-0"
                />
                <span className="text-[11px] text-nsk-text-secondary flex-1">
                  Polyalphaolefin Synthetic Grease 30% Fill
                </span>
                <span className="text-nsk-success text-xs">✓</span>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            disabled={!allPassed}
            onClick={() => setShowCert(true)}
            className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span>📜</span> Generate Inspection Sign-Off
          </button>
        </div>
      </div>

      {/* Certification Modal */}
      {showCert && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-scale-in">
          <div className="glass-card max-w-sm w-full p-5 text-center border-nsk-primary-light/40 space-y-4">
            <div className="w-12 h-12 rounded-full bg-nsk-success/20 border border-nsk-success text-nsk-success text-2xl flex items-center justify-center mx-auto">
              ✓
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 font-mono text-[10px] font-bold uppercase mb-1">
                Challenge Complete · All Levels Passed
              </div>
              <h2 className="font-heading text-base font-bold text-white">NSK Quality Sign-Off Approved</h2>
              <p className="text-xs text-nsk-text-secondary mt-1">
                Bearing NSK 6208 passed 100% digital dimensional and tribology inspection.
              </p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl text-left text-[11px] font-mono space-y-1 text-nsk-text-secondary border border-white/10">
              <p>Inspector: <span className="text-white font-bold">{employeeId}</span></p>
              <p>Department: <span className="text-white">{department}</span></p>
              <p>Date: <span className="text-white">{new Date().toLocaleDateString()}</span></p>
              <p>Status: <span className="text-nsk-success font-bold">READY FOR LINE MOUNTING</span></p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => navigate('/leaderboard')}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-heading font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5"
              >
                <span>🏆 View Leaderboard</span>
              </button>
              <button
                onClick={() => navigate('/hub')}
                className="btn-ghost w-full py-2 text-xs"
              >
                🏠 Return to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
