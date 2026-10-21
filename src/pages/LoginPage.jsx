import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { getDepartmentOptions } from '../config/departments';
import homeBg from '../assets/home_bg.jpg';

const deptOptions = getDepartmentOptions();

/**
 * Diagonal Split-Screen Login Page
 * - Left side: Full-height cinematic plant technician portrait (replaceable at /public/login_hero.jpg)
 * - Right side: Clean diagonal white panel with gentle slant
 * - Centered, large, touch-friendly mobile UI with pure top-right NSK logo
 */
export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!employeeId.trim()) {
      setError('Please enter your Employee ID');
      return;
    }
    if (!department) {
      setError('Please select your department');
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    login(employeeId.trim(), department);
    navigate('/hub');
  };

  const handleGuestLogin = () => {
    const guestId = `GUEST-${Math.floor(1000 + Math.random() * 9000)}`;
    login(guestId, 'general');
    navigate('/hub');
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#070b14] select-none font-body">
      {/* ── LEFT SIDE: Cinematic Industrial NSK Bearing Hero (Centered in left visible region) ── */}
      <div className="absolute left-0 top-0 bottom-0 h-full w-full sm:w-[calc(40%+13.5vh)] overflow-hidden bg-[#070b14]">
        <img
          src="./images/nsk_bearing_hero.jpg"
          alt="NSK Precision Bearing Assembly"
          className="hero-nsk-bearing-img"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black/70 to-transparent pointer-events-none" />
      </div>

      {/* ── RIGHT SIDE: Clean Diagonal Panel (NSK Red Accent Slant + Mild CAD Bearing Blueprint) ── */}
      <div
        className="detroit-diagonal-container absolute right-0 top-0 bottom-0 h-full bg-[#f8fafc] text-slate-800 shadow-2xl z-20 overflow-hidden"
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

        {/* NSK Red Accent Slanting Lines along the Diagonal Edge */}
        {/* NSK Red Accent Slanting Lines along the Diagonal Edge (Exact 12.9vh slope) */}
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

        {/* Top Right Corner: Pure NSK Logo */}
        <div className="absolute top-2 right-4 sm:right-6 lg:right-10 flex items-center justify-end gap-2 z-30">
          <img src="./nsk_logo.png" alt="NSK" className="h-5 sm:h-7 md:h-9 w-auto object-contain" />
        </div>

        {/* Content Wrapper: Perfectly centered in visible white area */}
        <div className="relative z-20 h-full flex flex-col justify-center pl-8 sm:pl-14 md:pl-24 pr-4 sm:pr-8 lg:pr-16 py-1 overflow-y-auto">
          {/* Centered Mobile-Friendly Form */}
          <div className="w-full max-w-[280px] sm:max-w-sm lg:max-w-md mx-auto my-auto">
            <h1 className="font-heading font-black text-base sm:text-xl md:text-3xl lg:text-4xl tracking-wide text-slate-900 uppercase mb-1 sm:mb-1.5 md:mb-4 text-center sm:text-left">
              LOGIN
            </h1>

            <form onSubmit={handleSubmit} className="space-y-1 sm:space-y-1.5 md:space-y-3.5">
              {/* Employee ID */}
              <div>
                <label className="block font-mono text-[9px] sm:text-[10px] md:text-sm font-bold tracking-wider text-slate-700 uppercase mb-0.5">
                  EMPLOYEE ID
                </label>
                <div className="relative">
                  <input
                    id="employee-id-input"
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Enter your Employee ID"
                    className="w-full px-2.5 sm:px-3 py-1 sm:py-1.5 md:py-2.5 rounded-lg sm:rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-mono text-xs sm:text-sm md:text-base placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/15 shadow-sm transition-all caret-red-600 accent-red-600"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block font-mono text-[9px] sm:text-[10px] md:text-sm font-bold tracking-wider text-slate-700 uppercase mb-0.5">
                  PLANT DEPARTMENT
                </label>
                <div className="relative">
                  <select
                    id="department-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 sm:px-3 py-1 sm:py-1.5 md:py-2.5 rounded-lg sm:rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs sm:text-sm md:text-base font-medium focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/15 shadow-sm transition-all appearance-none cursor-pointer pr-8 accent-red-600"
                  >
                    <option value="">Select your department</option>
                    {deptOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-1 sm:p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[10px] sm:text-xs font-medium animate-slide-down flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                id="login-button"
                type="submit"
                disabled={isLoading}
                className="w-full mt-0.5 sm:mt-1 py-1.5 sm:py-2 md:py-3 px-4 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-red-600 active:bg-red-700 text-white font-heading font-bold text-xs sm:text-sm md:text-base tracking-widest uppercase transition-all shadow-md shadow-slate-900/20 hover:shadow-red-600/25 focus:outline-none focus:ring-4 focus:ring-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 font-mono text-xs">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    LOGGING IN...
                  </span>
                ) : (
                  <span>LOGIN</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-2 my-1 sm:my-1.5 md:my-2.5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">OR</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Guest Mode Button */}
            <button
              id="guest-mode-button"
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-1 sm:py-1.5 md:py-2 px-3 rounded-lg sm:rounded-xl border-2 border-slate-300 hover:border-red-600 bg-white hover:bg-red-50/60 active:bg-red-100/60 text-slate-700 hover:text-red-600 font-heading font-bold text-[11px] sm:text-xs tracking-wider uppercase transition-all shadow-sm focus:outline-none focus:ring-4 focus:ring-red-600/20 flex items-center justify-center gap-1.5 active:scale-[0.99]"
            >
              <span>👤</span>
              <span>GUEST MODE</span>
            </button>
          </div>

          {/* Bottom Spacer */}
          <div className="h-0.5" />
        </div>
      </div>
    </div>
  );
}
