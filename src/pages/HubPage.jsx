import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useGameStore from '../stores/gameStore';
import { getDepartmentOptions } from '../config/departments';
import { getPlayerDepartmentProgress } from '../services/questionService';
import { getLeaderboard } from '../services/supabaseService';
import homeBg from '../assets/home_bg.jpg';

const deptMap = Object.fromEntries(getDepartmentOptions().map((d) => [d.id, d.label]));

const DIFFICULTY_LEVELS = [
  {
    id: 'easy',
    name: 'Easy',
    color: '#10B981',
  },
  {
    id: 'medium',
    name: 'Medium',
    color: '#F59E0B',
  },
  {
    id: 'hard',
    name: 'Hard',
    color: '#EF4444',
  },
];

export default function HubPage() {
  const { employeeId, department, logout } = useAuthStore();
  const { setDifficulty } = useGameStore();
  const navigate = useNavigate();

  const [topScores, setTopScores] = useState([]);
  const [progress, setProgress] = useState({ answered: 0, total: 10, percentage: 0 });
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [lockedToast, setLockedToast] = useState(false);

  const handleGame2Click = () => {
    setLockedToast(true);
    setTimeout(() => setLockedToast(false), 2500);
  };

  useEffect(() => {
    getLeaderboard(5).then(setTopScores).catch(console.error);
    const p = getPlayerDepartmentProgress(employeeId, department);
    setProgress(p);
  }, [department, employeeId]);

  const handleLaunchGame = (diffId) => {
    const diff = diffId || selectedDifficulty;
    setDifficulty(diff);
    setShowDifficultyModal(false);
    navigate(`/game/bearing-runner?difficulty=${diff}`);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#070b14] select-none font-body">
      {/* ── LEFT SIDE: Industrial Hero Image (Centered to Left Visible Region) ── */}
      <div className="absolute left-0 top-0 bottom-0 h-full w-full sm:w-[calc(40%+13.5vh)] overflow-hidden bg-[#070b14]">
        <img
          src="./images/login_hero.jpg"
          alt="NSK Plant Engineer with Precision Bearing"
          className="hub-engineer-hero-img"
        />
        {/* Soft edge darkening on the far left */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black/75 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* ── RIGHT SIDE: Clean Diagonal Panel (NSK Red Accent Slant + Mild CAD Bearing Blueprint) ── */}
      <div
        className="detroit-diagonal-container absolute right-0 top-0 bottom-0 h-full bg-[#f8fafc] text-slate-800 shadow-2xl z-20 overflow-hidden pointer-events-none"
      >
        {/* Mild CAD Bearing Blueprint Watermark (Milder Intensity with Ultra-Slow Breathing) */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-25 anim-cad-watermark"
          style={{
            backgroundImage: `url(${homeBg})`,
          }}
        />
        {/* Mild Gray Low-Poly Geometric Facets & Technical Accents (Slow Floating & Rotating Animation) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-10"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {/* Subtle mild gray facet 1 (bottom-right large triangle) */}
          <polygon className="anim-facet-slow-1" points="65,100 100,48 100,100" fill="#e2e8f0" />
          {/* Subtle mild gray facet 2 (bottom-right secondary triangle) */}
          <polygon className="anim-facet-slow-2" points="80,100 100,68 100,100" fill="#cbd5e1" />
          {/* Subtle mild gray facet 3 (mid bottom facet) */}
          <polygon className="anim-facet-slow-3" points="45,100 65,100 100,48 90,38" fill="#f1f5f9" />
          {/* Top-right corner mild facet */}
          <polygon className="anim-facet-slow-4" points="75,0 100,0 100,28" fill="#f1f5f9" />

          {/* Mild gray drafting crosshairs (+) 1 with ultra-slow rotation and float */}
          <g className="anim-crosshair-1" style={{ transformOrigin: '85px 24px' }}>
            <line x1="82" y1="24" x2="88" y2="24" stroke="#94a3b8" strokeWidth="0.35" />
            <line x1="85" y1="21" x2="85" y2="27" stroke="#94a3b8" strokeWidth="0.35" />
          </g>

          {/* Mild gray drafting crosshairs (+) 2 with ultra-slow rotation and float */}
          <g className="anim-crosshair-2" style={{ transformOrigin: '61px 72px' }}>
            <line x1="58" y1="72" x2="64" y2="72" stroke="#94a3b8" strokeWidth="0.35" />
            <line x1="61" y1="69" x2="61" y2="75" stroke="#94a3b8" strokeWidth="0.35" />
          </g>

          {/* Faint dashed diagonal guideline with subtle slow drift */}
          <line className="anim-guide-dash" x1="65" y1="100" x2="100" y2="48" stroke="#94a3b8" strokeWidth="0.25" strokeDasharray="1,2" />
        </svg>

        {/* NSK Red Accent Slanting Lines along the Diagonal Edge (Exact 12.9vh slope parallel to Game Panels) */}
        <svg
          className="nsk-diagonal-line absolute top-0 bottom-0 left-0 pointer-events-none z-30 overflow-visible"
          style={{ width: '12.9vh', height: '100%' }}
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {/* Soft ambient red glow edge */}
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke="#E60012"
            strokeWidth="3.5"
            opacity="0.3"
            vectorEffect="non-scaling-stroke"
          />
          {/* Main solid NSK red edge line */}
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke="#E60012"
            strokeWidth="1.5"
            opacity="0.95"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* ── TOP HEADER (Top Left User Chip, Center Dev Test Button, & Top Right NSK Logo) ── */}
      <header className="relative z-30 flex items-center justify-between px-4 pt-2.5 pointer-events-auto">
        {/* User Status Chip on Left */}
        <div className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full shadow-lg text-white">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E60012] to-[#b3000d] flex items-center justify-center text-white shadow-sm ring-1 ring-white/20 shrink-0">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold leading-none">{employeeId}</span>
            <span className="text-[9px] text-slate-300 leading-none mt-0.5 truncate max-w-[120px]">
              {deptMap[department] || department}
            </span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="ml-1.5 text-[10px] text-slate-300 hover:text-white px-2 py-0.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
            title="Sign Out"
          >
            Logout
          </button>
        </div>

        {/* Temporary Fast-Testing Dummy Button for Game 2 */}
        <button
          id="btn-fast-test-game2"
          onClick={() => navigate('/game/plant-arena')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-400/80 text-xs font-mono font-bold tracking-wider transition-all shadow-md active:scale-95 animate-pulse"
          title="Fast Testing: Click to jump directly to Game 2 (Plant Arena Repair)"
        >
          <span>🔬</span>
          <span>TEST GAME 2</span>
          <span className="text-[9px] bg-amber-400 text-slate-950 px-1 py-0.2 rounded font-black uppercase">
            DEV
          </span>
        </button>

        {/* Top-Right: Pure NSK Logo */}
        <div className="flex items-center gap-2">
          <img
            src="./nsk_logo.png"
            alt="NSK"
            className="h-[clamp(24px,5.8vh,68px)] w-auto object-contain drop-shadow-sm"
          />
        </div>
      </header>

      {/* ── LOCKED STAGE NOTICE TOAST ── */}
      {lockedToast && (
        <div className="absolute top-14 right-4 z-50 bg-slate-950/95 border-2 border-amber-500/80 text-amber-300 px-3.5 py-2 rounded-xl text-xs font-mono font-bold shadow-2xl shadow-black/80 flex items-center gap-2 animate-bounce">
          <span className="text-sm">🔒</span>
          <span>STAGE 2 LOCKED · Complete Stage 1 (Bearing Runner) first!</span>
        </div>
      )}

      {/* ── TWO SLANTED GAME PANELS (Centered in Middle of Screen) ── */}
      <main className="detroit-diagonal-container absolute right-0 top-0 bottom-0 h-full z-30 flex items-center justify-center pointer-events-none select-none pl-12 pt-2 pb-8 my-auto">
        <div className="flex items-center pointer-events-auto">
          {/* GAME 1: BEARING RUNNER (Active) */}
          <div
            id="panel-game1-runner"
            onClick={() => setShowDifficultyModal(true)}
            className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.04] active:scale-[0.98] z-10"
            style={{
              filter: 'drop-shadow(0 20px 35px rgba(0,0,0,0.4))',
            }}
            title="Game 1: Bearing Runner (Click to Play)"
          >
            {/* Slanted Parallelogram Container */}
            <div
              className="hub-game-panel relative overflow-hidden bg-slate-900"
              style={{
                clipPath: 'polygon(16% 0%, 100% 0%, 84% 100%, 0% 100%)',
              }}
            >
              {/* Background Image */}
              <img
                src="./images/game1_runner.jpg"
                alt="Game 1 - Bearing Runner"
                className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-115 transition-transform duration-500 brightness-95 group-hover:brightness-105"
              />

              {/* Neutral Gradient Overlay for Bottom Title Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />

              {/* Slanted Border Stroke */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polygon
                  points="16,0 100,0 84,100 0,100"
                  fill="none"
                  stroke="#E60012"
                  strokeWidth="3"
                  className="opacity-85 group-hover:opacity-100 transition-opacity"
                />
              </svg>

              {/* Content Inside Game 1: BEARING RUNNER (Compact reduced font) */}
              <div className="relative z-10 h-full flex flex-col justify-end pb-3 sm:pb-5">
                {/* Bottom Title: Center-aligned to visible span */}
                <div className="w-[84%] text-center px-1.5 sm:px-2">
                  <h3 className="font-heading font-black text-[11px] sm:text-sm md:text-base lg:text-lg text-white tracking-widest uppercase drop-shadow-2xl">
                    BEARING RUNNER
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* DASHED CONNECTING LINE IN GRAY (Touches both panels seamlessly) */}
          <div className="hub-panel-connector relative flex items-center z-0 pointer-events-none">
            <svg className="w-full h-4" preserveAspectRatio="none">
              <line
                x1="0"
                y1="8"
                x2="100%"
                y2="8"
                stroke="#94a3b8"
                strokeWidth="3.5"
                strokeDasharray="6,5"
              />
            </svg>
          </div>

          {/* GAME 2: 3D BEARING INSPECTION (Locked with Gray Tint & Compact Lock Icon) */}
          <div
            id="panel-game2-inspection"
            onClick={handleGame2Click}
            className="group relative cursor-not-allowed transition-all duration-300 z-10"
            style={{
              filter: 'drop-shadow(0 20px 35px rgba(0,0,0,0.4))',
            }}
            title="Game 2: 3D Bearing Inspection (Locked · Complete Stage 1 to Unlock)"
          >
            {/* Slanted Parallelogram Container */}
            <div
              className="hub-game-panel relative overflow-hidden bg-slate-950"
              style={{
                clipPath: 'polygon(16% 0%, 100% 0%, 84% 100%, 0% 100%)',
              }}
            >
              {/* Background Image (Gray Tinted / Desaturated) */}
              <img
                src="./images/game2_inspection.jpg"
                alt="Game 2 - 3D Bearing Inspection (Locked)"
                className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-90 brightness-[0.45] pointer-events-none"
              />

              {/* Heavy Gray / Slate Overlay for locked arcade state */}
              <div className="absolute inset-0 bg-slate-950/75 backdrop-grayscale pointer-events-none" />

              {/* Slanted Border Stroke (Gray / Slate Tinted) */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polygon
                  points="16,0 100,0 84,100 0,100"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.5"
                  strokeDasharray="5,3"
                  className="opacity-75"
                />
              </svg>

              {/* Content Inside Game 2: Compact Lock Icon + Reduced Title */}
              <div className="relative z-10 h-full flex flex-col justify-between pb-3 sm:pb-5">
                <div />

                {/* Center Lock Badge (Reduced Icon & Container) */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-slate-900/95 border-2 border-slate-500/80 flex items-center justify-center shadow-xl shadow-black/95 group-hover:border-amber-400/80 group-hover:scale-105 transition-all">
                    <span className="text-sm sm:text-base md:text-lg filter drop-shadow">
                      🔒
                    </span>
                  </div>
                </div>

                {/* Bottom Title: Center-aligned to visible span (Reduced font) */}
                <div className="w-[84%] text-center px-1">
                  <h3 className="font-heading font-black text-[9px] sm:text-[10px] md:text-xs text-slate-300 tracking-wider uppercase drop-shadow-2xl leading-tight">
                    <div>3D</div>
                    <div>INSPECTION</div>
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── PLAY BUTTON (Prominent, right-edge slanted trigger - Moved lower & Enlarged) ── */}
      <div className="absolute top-[81%] right-0 -translate-y-1/2 z-40 pointer-events-auto">
        <button
          id="btn-play-game"
          onClick={() => setShowDifficultyModal(true)}
          className="group relative transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] focus:outline-none"
          title="Start Challenge Campaign"
        >
          <div
            className="w-[clamp(135px,29vh,400px)] h-[clamp(42px,10.2vh,120px)] pl-[clamp(24px,5vh,64px)] pr-[clamp(14px,3vh,36px)] bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-heading font-black text-[clamp(13px,2.9vh,30px)] tracking-widest uppercase transition-all shadow-2xl shadow-red-600/50 flex items-center justify-center gap-[1.8vh] border-t-2 border-l-2 border-red-300/50"
            style={{
              clipPath: 'polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)',
            }}
          >
            <span className="text-[clamp(14px,3.1vh,32px)] transform group-hover:scale-110 transition-transform drop-shadow-md">
              ▶
            </span>
            <span className="drop-shadow-lg tracking-wider">PLAY</span>
          </div>
        </button>
      </div>

      {/* ── BOTTOM BUTTONS BAR (Leaderboard Trapezoid Tab - Fluid Height Scale) ── */}
      <footer className="absolute bottom-0 inset-x-0 z-40 flex items-end justify-center pointer-events-none pb-0">
        <div className="flex justify-center pointer-events-auto">
          <button
            id="btn-leaderboard"
            onClick={() => navigate('/leaderboard')}
            className="group relative transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] focus:outline-none"
            title="View Plant Leaderboard"
          >
            <div
              className="w-[clamp(176px,38vh,520px)] h-[clamp(28px,6.8vh,80px)] bg-slate-900 hover:bg-red-600 active:bg-red-700 text-white font-heading font-black text-[clamp(10px,2.2vh,22px)] tracking-widest uppercase transition-all shadow-lg shadow-slate-950/70 hover:shadow-red-600/50 flex items-center justify-center gap-[1.5vh] border-t border-x border-white/20 hover:border-red-400"
              style={{
                clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
              }}
            >
              <span className="text-[clamp(11px,2.3vh,24px)] transform group-hover:rotate-12 transition-transform">🏆</span>
              <span className="drop-shadow-md">LEADERBOARD</span>
            </div>
          </button>
        </div>
      </footer>

      {/* ── DIFFICULTY MODAL (Compact 2x2 Grid · Fits Mobile Landscape Perfectly · Straight Industrial Panels) ── */}
      {showDifficultyModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 animate-scale-in">
          <div className="relative bg-[#f8fafc] max-w-md w-full rounded-none shadow-2xl shadow-black/70 overflow-hidden border-2 border-slate-400">
            {/* NSK Red accent top bar */}
            <div className="h-1.5 w-full bg-[#E60012]" />

            {/* Subtle CAD watermark */}
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-[0.06]"
              style={{ backgroundImage: `url(${homeBg})` }}
            />

            <div className="relative z-10 p-3 sm:p-4 space-y-2.5">
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-3.5 bg-red-600" />
                  <h3 className="font-heading text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase">
                    Select Difficulty
                  </h3>
                </div>
                <button
                  onClick={() => setShowDifficultyModal(false)}
                  className="w-7 h-7 rounded-none border border-slate-300 hover:border-red-600 bg-white hover:bg-red-50 flex items-center justify-center text-slate-500 hover:text-red-600 transition-all text-xs font-bold"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* 2x2 Grid of Difficulty Levels */}
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTY_LEVELS.map((lvl) => {
                  const isSelected = selectedDifficulty === lvl.id;
                  return (
                    <div
                      key={lvl.id}
                      onClick={() => setSelectedDifficulty(lvl.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-none border-2 cursor-pointer transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-white border-red-600 shadow-md shadow-red-600/15 ring-1 ring-red-500/20'
                          : 'bg-white border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <h4 className={`font-heading font-black text-xs sm:text-sm tracking-wider uppercase ${
                        isSelected ? 'text-slate-900' : 'text-slate-600'
                      }`}>
                        {lvl.name}
                      </h4>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-none bg-red-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                          ✓
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-none border-2 border-slate-300" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowDifficultyModal(false)}
                  className="flex-1 py-2.5 rounded-none border-2 border-slate-300 hover:border-red-600 bg-white hover:bg-red-50 text-slate-800 hover:text-red-600 text-xs font-heading font-black uppercase tracking-wider text-center transition-all active:scale-[0.99]"
                >
                  Cancel
                </button>
                <button
                  id="btn-launch-game"
                  onClick={() => handleLaunchGame(selectedDifficulty)}
                  className="flex-[1.5] py-2.5 rounded-none bg-slate-900 hover:bg-red-600 active:bg-red-700 text-white text-xs sm:text-sm font-heading font-black uppercase tracking-widest text-center flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/20 hover:shadow-red-600/30 border-2 border-slate-900 hover:border-red-600 transition-all active:scale-[0.99]"
                >
                  <span>PLAY</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
