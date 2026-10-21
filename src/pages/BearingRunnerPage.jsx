import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useGameStore from '../stores/gameStore';
import useAuthStore from '../stores/authStore';
import { getQuestionsForGame, markQuestionsAnswered } from '../services/questionService';
import { submitScore } from '../services/supabaseService';
import soundEffects from '../services/audioService';
import Runner3DScene, { loadRunnerModel } from '../components/game/Runner3DScene';

// ─── Game Constants ───────────────────────────────────────────
const LANE_COUNT = 4;
const LANE_LABELS = ['A', 'B', 'C', 'D'];
const COLLISION_Y = 78;
const PASS_THROUGH_Y = 81.5; // Fast, seamless 180ms pass-through so question advances instantly without stalling
const COUNTDOWN_SECS = 3;

// Bearing parts collected for correct answers
const BEARING_PARTS = [
  { name: 'Outer Ring', icon: '🔩' },
  { name: 'Inner Ring', icon: '⚙️' },
  { name: 'Steel Balls', icon: '🔵' },
  { name: 'Cage', icon: '🛡️' },
  { name: 'Seal', icon: '🔒' },
  { name: 'Grease', icon: '🧴' },
  { name: 'Shield', icon: '🛞' },
  { name: 'Retainer', icon: '📎' },
  { name: 'Snap Ring', icon: '💍' },
  { name: 'Housing', icon: '🏗️' },
];

export const DIFFICULTY_CONFIG = {
  easy: {
    id: 'easy',
    name: 'Apprentice',
    badge: '🟢 EASY',
    speed: 0.013,      // ~40% slower for more answering time
    multiplier: 1.0,
    color: '#10B981',
    description: 'Calm rhythm & essential safety basics',
  },
  medium: {
    id: 'medium',
    name: 'Operator',
    badge: '🔵 MEDIUM',
    speed: 0.017,
    multiplier: 1.25,
    color: '#3B82F6',
    description: 'Standard factory tempo & assembly standards',
  },
  hard: {
    id: 'hard',
    name: 'Plant Master',
    badge: '🔴 HARD',
    speed: 0.022,
    multiplier: 1.5,
    color: '#EF4444',
    description: 'High-speed sprint & advanced failure diagnosis',
  },
  progressive: {
    id: 'progressive',
    name: 'Progressive',
    badge: '⚡ PROGRESSIVE',
    speed: 0.016,
    multiplier: 1.35,
    color: '#F59E0B',
    description: 'Ramps from Easy (Q1-3) ➔ Medium (Q4-7) ➔ Hard (Q8-10)',
  },
};

function calcPoints(isCorrect, timeMs, streak, multiplier = 1.0) {
  if (!isCorrect) return 0;
  const base = 100;
  const speedBonus = Math.max(0, Math.round((1 - timeMs / 10000) * 50));
  const streakMult = streak >= 3 ? 1.5 : 1;
  return Math.round((base + speedBonus) * streakMult * multiplier);
}

export default function BearingRunnerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startGame, recordAnswer, endGame, score, streak, results } = useGameStore();
  const { employeeId, department } = useAuthStore();

  const queryDiff = searchParams.get('difficulty') || useGameStore.getState().difficulty || 'progressive';
  const diffConfig = DIFFICULTY_CONFIG[queryDiff] || DIFFICULTY_CONFIG.progressive;

  const getLockerSpeed = useCallback((questionIndex) => {
    if (diffConfig.id === 'progressive') {
      if (questionIndex < 3) return 0.013;
      if (questionIndex < 7) return 0.017;
      return 0.022;
    }
    return diffConfig.speed;
  }, [diffConfig]);

  // ─── State ──────────────────────────────────────────
  const [phase, setPhase] = useState('tutorial'); // tutorial | countdown | playing | feedback | done
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [playerLane, setPlayerLane] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [lockerY, setLockerY] = useState(0);
  const [feedbackType, setFeedbackType] = useState(null);
  const [scorePopup, setScorePopup] = useState(null);
  const [deptInfo, setDeptInfo] = useState({ name: 'Plant Floor', total: 10 });
  const [collectedParts, setCollectedParts] = useState([]);
  const [flyingPart, setFlyingPart] = useState(null);

  // ─── Refs ───────────────────────────────────────────
  const animRef = useRef(null);
  const lastFrameRef = useRef(0);
  const questionStartRef = useRef(0);
  const phaseRef = useRef(phase);
  const lockerYRef = useRef(0);
  const playerLaneRef = useRef(1);
  const qIdxRef = useRef(0);
  const questionsRef = useRef([]);
  const isTransitioningRef = useRef(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { playerLaneRef.current = playerLane; }, [playerLane]);
  useEffect(() => { qIdxRef.current = qIdx; }, [qIdx]);

  // ─── Initialize Questions (on mount) ──────────────────
  useEffect(() => {
    const qData = getQuestionsForGame(employeeId, department, 10, diffConfig.id);
    setQuestions(qData.questions);
    questionsRef.current = qData.questions;
    setDeptInfo({
      name: qData.departmentName,
      total: qData.totalInBank,
      isRecycled: qData.isBankCompleted,
    });
    startGame('bearing_runner', qData.questions, diffConfig.id);
    // Eagerly preload 3D runner model so it is ready before gameplay starts
    loadRunnerModel().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diffConfig.id]);

  // ─── Start Game (from tutorial → countdown → playing) ──
  const handleStartGame = useCallback(() => {
    setPhase('countdown');
    let count = COUNTDOWN_SECS;
    soundEffects.playCountdownBeep(false);

    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count > 0) {
        soundEffects.playCountdownBeep(false);
      } else if (count === 0) {
        soundEffects.playCountdownBeep(true);
        clearInterval(timer);
        setPhase('playing');
        questionStartRef.current = performance.now();
        lastFrameRef.current = performance.now();
        lockerYRef.current = 0;
        setLockerY(0);
        isTransitioningRef.current = false;
      }
    }, 800);

    return () => clearInterval(timer);
  }, []);

  // ─── Game Loop (NEVER STOPS - runner flows continuously) ──
  const gameLoop = useCallback((timestamp) => {
    if (phaseRef.current !== 'playing') {
      animRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const delta = timestamp - lastFrameRef.current;
    lastFrameRef.current = timestamp;

    const currentSpeed = getLockerSpeed(qIdxRef.current);
    // Continuous forward motion - lockerY never freezes!
    lockerYRef.current += currentSpeed * delta;
    setLockerY(lockerYRef.current);

    // 1. Collision line reached: score answer and flash feedback
    if (lockerYRef.current >= COLLISION_Y && !isTransitioningRef.current) {
      handleCollision();
    }

    // 2. Gate has zoomed completely past behind runner & camera: smoothly load next question
    if (lockerYRef.current >= PASS_THROUGH_Y && isTransitioningRef.current) {
      advanceToNextQuestion();
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [getLockerSpeed]);

  useEffect(() => {
    if (phase === 'playing' || phase === 'feedback') {
      lastFrameRef.current = performance.now();
      animRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [phase, gameLoop]);

  // ─── Collision Handler (Triggered when passing through gate) ─
  const handleCollision = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const q = questionsRef.current[qIdxRef.current];
    if (!q) {
      isTransitioningRef.current = false;
      return;
    }

    const lane = playerLaneRef.current;
    const chosenAnswer = LANE_LABELS[lane];
    const isCorrect = chosenAnswer === q.correct;
    const timeMs = performance.now() - questionStartRef.current;
    const currentStreak = useGameStore.getState().streak;
    const points = calcPoints(isCorrect, timeMs, currentStreak, diffConfig.multiplier);

    recordAnswer(q.id, chosenAnswer, q.correct, isCorrect, timeMs, points);

    if (isCorrect) {
      if (currentStreak + 1 >= 3) {
        soundEffects.playStreak();
      } else {
        soundEffects.playCorrect();
      }
      // Collect bearing part (showcase prominently for 1.6s before incrementing bag)
      const partIdx = qIdxRef.current % BEARING_PARTS.length;
      const part = BEARING_PARTS[partIdx];
      setFlyingPart({ ...part, key: Date.now() });
      setTimeout(() => {
        setCollectedParts((prev) => [...prev, part]);
        setFlyingPart(null);
      }, 1600);
    } else {
      soundEffects.playWrong();
    }

    setFeedbackType(isCorrect ? 'correct' : 'wrong');
  }, [diffConfig.multiplier, recordAnswer]);

  // ─── Seamless Question Advancement (Gates keep moving) ───
  const advanceToNextQuestion = useCallback(async () => {
    const nextIdx = qIdxRef.current + 1;

    // Only finish when ALL 10 questions have been answered
    if (nextIdx >= 10) {
      endGame();
      setPhase('done');

      const answeredIds = questionsRef.current.map((item) => item.id);
      markQuestionsAnswered(employeeId, answeredIds);

      const storeState = useGameStore.getState();
      const correctCount = storeState.results.filter((r) => r.isCorrect).length;
      const accuracy = Math.round((correctCount / 10) * 100);

      await submitScore({
        employeeId,
        department,
        score: storeState.score,
        accuracy,
        correctCount,
        difficulty: diffConfig.id,
      });

      setTimeout(() => navigate('/results'), 400);
      return;
    }

    // Advance question seamlessly without changing player lane or freezing
    setQIdx(nextIdx);
    qIdxRef.current = nextIdx;
    lockerYRef.current = 0;
    setLockerY(0);
    setFeedbackType(null);
    questionStartRef.current = performance.now();
    lastFrameRef.current = performance.now();
    isTransitioningRef.current = false;
  }, [department, employeeId, endGame, navigate, diffConfig.id]);

  // ─── Lane Movement Controls ─────────────────────────
  const lastMoveTimeRef = useRef(0);

  const moveLeft = useCallback(() => {
    const isPlayActive = phaseRef.current === 'playing' || phaseRef.current === 'feedback';
    if (!isPlayActive) return;
    const now = performance.now();
    // Guard against duplicate touchstart + synthetic click double-firing
    if (now - lastMoveTimeRef.current < 200) return;
    lastMoveTimeRef.current = now;

    setPlayerLane((prev) => {
      const next = Math.max(0, prev - 1);
      if (next !== prev) soundEffects.playLaneSwitch();
      playerLaneRef.current = next;
      return next;
    });
  }, []);

  const moveRight = useCallback(() => {
    const isPlayActive = phaseRef.current === 'playing' || phaseRef.current === 'feedback';
    if (!isPlayActive) return;
    const now = performance.now();
    // Guard against duplicate touchstart + synthetic click double-firing
    if (now - lastMoveTimeRef.current < 200) return;
    lastMoveTimeRef.current = now;

    setPlayerLane((prev) => {
      const next = Math.min(LANE_COUNT - 1, prev + 1);
      if (next !== prev) soundEffects.playLaneSwitch();
      playerLaneRef.current = next;
      return next;
    });
  }, []);

  const jumpToLane = useCallback((laneIndex) => {
    const isPlayActive = phaseRef.current === 'playing' || phaseRef.current === 'feedback';
    if (!isPlayActive) return;
    const now = performance.now();
    if (now - lastMoveTimeRef.current < 200) return;
    lastMoveTimeRef.current = now;

    if (laneIndex >= 0 && laneIndex < LANE_COUNT) {
      if (playerLaneRef.current !== laneIndex) soundEffects.playLaneSwitch();
      setPlayerLane(laneIndex);
      playerLaneRef.current = laneIndex;
    }
  }, []);

  // Screen Swipe Detection for intuitive mobile steering
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current;
    // Horizontal swipe threshold: 35px, horizontal dominance over vertical
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        moveLeft();
      } else {
        moveRight();
      }
    }
  }, [moveLeft, moveRight]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isPlayActive = phaseRef.current === 'playing' || phaseRef.current === 'feedback';
      if (!isPlayActive) return;
      if (e.key === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); moveLeft(); }
      else if (e.key === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); moveRight(); }
      else if (e.key === '1') jumpToLane(0);
      else if (e.key === '2') jumpToLane(1);
      else if (e.key === '3') jumpToLane(2);
      else if (e.key === '4') jumpToLane(3);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jumpToLane, moveLeft, moveRight]);

  // ─── Render ─────────────────────────────────────────
  const currentQ = questions[qIdx];
  const laneWidth = 100 / LANE_COUNT;
  const correctSoFar = results.filter((r) => r.isCorrect).length;
  const wrongSoFar = results.filter((r) => !r.isCorrect).length;
  const urgencyPct = phase === 'playing' ? Math.min((lockerY / COLLISION_Y) * 100, 100) : 0;
  const isUrgent = urgencyPct > 70;

  return (
    <div className="relative h-full w-full overflow-hidden select-none bg-[#050810] font-body" style={{ touchAction: 'none' }}>
      {/* ═══ GAME BACKGROUND ═══ */}
      <div className="absolute inset-0 game-speed-bg" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 50% 80%, rgba(230,0,18,0.06) 0%, transparent 50%),
          radial-gradient(circle at 50% 20%, rgba(230,0,18,0.03) 0%, transparent 40%)
        `
      }} />

      {/* Speed lines */}
      <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
        {(phase === 'playing' || phase === 'feedback') && (
          <>
            <div className="speed-line" style={{ left: '8%', animationDelay: '0s' }} />
            <div className="speed-line" style={{ left: '22%', animationDelay: '0.3s' }} />
            <div className="speed-line" style={{ left: '38%', animationDelay: '0.7s' }} />
            <div className="speed-line" style={{ left: '55%', animationDelay: '0.15s' }} />
            <div className="speed-line" style={{ left: '72%', animationDelay: '0.5s' }} />
            <div className="speed-line" style={{ left: '88%', animationDelay: '0.85s' }} />
          </>
        )}
      </div>

      {/* Urgency edge glow */}
      {phase === 'playing' && isUrgent && (
        <div className="absolute inset-0 z-[2] pointer-events-none urgency-vignette" style={{
          boxShadow: `inset 0 0 ${60 + (urgencyPct - 70) * 3}px rgba(230,0,18,${0.15 + (urgencyPct - 70) * 0.008})`,
        }} />
      )}

      {/* Feedback flash edge vignette (never blocks runner) */}
      {feedbackType && (
        <div className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-150 ${
          feedbackType === 'correct' ? 'game-flash-correct' : 'game-flash-wrong'
        }`} />
      )}

      {/* Feedback Banner (Positioned directly below enlarged Q&A HUD, never covers runner) */}
      {feedbackType && (
        <div className="absolute top-[42vh] sm:top-[44vh] left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center justify-center animate-bounce">
          <div className={`px-4 sm:px-6 py-1 sm:py-1.5 rounded-full font-heading font-black text-xs sm:text-sm md:text-base tracking-widest shadow-2xl border-2 flex items-center gap-2 backdrop-blur-md ${
            feedbackType === 'correct'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400 shadow-emerald-500/50'
              : 'bg-red-950/90 text-red-300 border-red-500 shadow-red-500/50'
          }`}>
            <span>{feedbackType === 'correct' ? '✓ CORRECT' : '✗ WRONG'}</span>
          </div>
        </div>
      )}

      {/* ═══ TOP GAME HUD & Q&A (High-Contrast White & NSK Red Question + Expanded Answers) ═══ */}
      {(phase === 'playing' || phase === 'feedback') && (
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-auto h-[38vh] sm:h-[40vh] md:h-[42vh] flex flex-col justify-start gap-1.5 sm:gap-2.5 px-2 sm:px-6 md:px-12 lg:px-16 pt-1 sm:pt-2 pb-2 bg-gradient-to-b from-[#050810]/98 via-[#050810]/90 to-transparent">
          {/* Question Row at Very Top with integrated Parts Counter */}
          {currentQ && (
            <div key={`q-${qIdx}`} className="flex items-center gap-1.5 sm:gap-2.5 max-w-5xl mx-auto w-full flex-shrink-0 game-question-enter">
              {/* Parts Counter Badge (NSK Theme) */}
              <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-br from-[#E60012] to-[#b3000d] border border-red-400 text-white whitespace-nowrap shrink-0 shadow-md flex items-center gap-1 sm:gap-1.5 min-h-[46px] sm:min-h-[58px]">
                <span className="text-white/80 font-bold uppercase text-[9px] sm:text-[10px] tracking-wider">PARTS</span>
                <span className="font-heading font-black text-xs sm:text-base text-white">{collectedParts.length}/10</span>
              </div>

              {/* High-Contrast White Question Panel with NSK Red Border */}
              <div className="flex-1 bg-white border-2 sm:border-[3px] border-[#E60012] rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-3 shadow-[0_4px_25px_rgba(230,0,18,0.25),0_4px_12px_rgba(0,0,0,0.5)] text-center flex items-center justify-center min-h-[46px] sm:min-h-[58px]">
                <p className="text-xs sm:text-base md:text-lg lg:text-xl font-heading font-black text-slate-900 leading-tight tracking-wide uppercase line-clamp-2 drop-shadow-sm">
                  {currentQ.question}
                </p>
              </div>
            </div>
          )}

          {/* Options: Prominent, Expanded Answer Cards covering more screen area */}
          {currentQ && (
            <div key={`o-${qIdx}`} className="flex-1 grid grid-cols-4 gap-1.5 sm:gap-2.5 md:gap-3.5 game-options-enter max-w-5xl mx-auto w-full items-stretch min-h-[52px] sm:min-h-[66px] md:min-h-[76px]">
              {LANE_LABELS.map((label, idx) => {
                const isSelected = playerLane === idx;
                const isCorrectAnswer = currentQ.correct === label;
                return (
                  <button
                    key={label}
                    onClick={() => jumpToLane(idx)}
                    className={`relative py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl sm:rounded-2xl border-2 transition-all duration-150 select-none flex items-center justify-center gap-1.5 sm:gap-2.5 h-full min-h-[48px] sm:min-h-[60px] ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#E60012] via-[#ff1a2e] to-[#cc0010] border-white text-white shadow-[0_0_25px_rgba(230,0,18,0.85)] ring-2 ring-red-400 scale-[1.02]'
                        : 'bg-slate-900/95 border-slate-700/80 hover:border-white/50 hover:bg-slate-800/95 backdrop-blur-md text-slate-100 shadow-md'
                    }`}
                  >
                    {/* [TESTING HELPER] Dot on correct answer */}
                    {isCorrectAnswer && (
                      <span
                        title="[Testing Mode] Correct Answer"
                        className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-200 shadow-sm shadow-emerald-400 animate-pulse pointer-events-none z-20"
                      />
                    )}
                    {isSelected && <div className="absolute inset-0 game-option-shimmer pointer-events-none rounded-xl sm:rounded-2xl" />}
                    
                    {/* Letter Badge (A, B, C, D) */}
                    <span className={`relative z-10 inline-flex w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg items-center justify-center text-xs sm:text-sm md:text-base font-heading font-black shrink-0 shadow-sm ${
                      isSelected ? 'bg-white text-[#E60012]' : 'bg-white/10 text-slate-200 border border-white/20'
                    }`}>
                      {label}
                    </span>

                    {/* Words Text - High Contrast & Large */}
                    <span className={`relative z-10 text-[11px] sm:text-xs md:text-sm lg:text-base font-bold sm:font-black leading-tight line-clamp-2 text-left ${
                      isSelected ? 'text-white drop-shadow-md font-black' : 'text-slate-100'
                    }`}>
                      {currentQ.options[label]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ 3D RUNNER SCENE (Paused during tutorial for max performance) ═══ */}
      <Runner3DScene
        playerLane={playerLane}
        gateProgress={lockerY / COLLISION_Y}
        feedbackType={feedbackType}
        currentSpeed={getLockerSpeed(qIdx)}
        isPaused={phase === 'tutorial'}
        className="absolute inset-0 z-10"
      />

      {/* ═══ FLYING PART ANIMATION (icon flies to inventory bag) ═══ */}
      {flyingPart && (
        <div
          key={flyingPart.key}
          className="absolute z-50 pointer-events-none part-fly-to-bag"
          style={{ top: '48%', left: '50%' }}
        >
          <div className="flex flex-col items-center px-4 py-2.5 rounded-2xl bg-slate-950/85 border border-cyan-400/50 shadow-[0_0_35px_rgba(56,189,248,0.45)] backdrop-blur-md">
            <span className="text-5xl sm:text-6xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] animate-pulse">{flyingPart.icon}</span>
            <div className="flex items-center gap-1.5 mt-2 bg-cyan-950/90 border border-cyan-400/40 px-3 py-0.5 rounded-full whitespace-nowrap shadow-md">
              <span className="text-[10px] text-cyan-400 font-heading font-black uppercase tracking-wider">+ PART</span>
              <span className="text-xs sm:text-sm font-heading font-black text-white">
                {flyingPart.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM PROGRESS DOTS (Moved to bottom) ═══ */}
      {(phase === 'playing' || phase === 'feedback') && (
        <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/15 shadow-xl pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => {
            const result = results[i];
            const isCurrent = i === qIdx;
            let dotClass = 'bg-white/20 border-white/15';
            if (result) {
              dotClass = result.isCorrect
                ? 'bg-emerald-500 border-emerald-400 shadow-sm shadow-emerald-500/60'
                : 'bg-red-500 border-red-400 shadow-sm shadow-red-500/60';
            } else if (isCurrent) {
              dotClass = 'bg-red-500 border-red-300 game-dot-pulse scale-125';
            }
            return (
              <div key={i} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border transition-all ${dotClass}`} />
            );
          })}
        </div>
      )}

      {/* ═══ BOTTOM PROGRESS BAR ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-40 h-1 bg-slate-950">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${(qIdx / 10) * 100}%`,
            background: 'linear-gradient(90deg, #E60012, #ff3333)',
            boxShadow: '0 0 8px rgba(230,0,18,0.6)',
          }}
        />
      </div>

      {/* ═══ SCREEN TAP & SWIPE ZONES (Tap left half to steer left, right half to steer right) ═══ */}
      {(phase === 'playing' || phase === 'feedback') && (
        <div
          className="absolute inset-x-0 bottom-0 top-[35vh] z-20 flex pointer-events-auto select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'manipulation' }}
        >
          {/* Left half tap zone */}
          <div
            onClick={moveLeft}
            className="flex-1 h-full cursor-pointer active:bg-white/[0.02] transition-colors"
            style={{ touchAction: 'manipulation' }}
            title="Tap left to steer left"
          />
          {/* Right half tap zone */}
          <div
            onClick={moveRight}
            className="flex-1 h-full cursor-pointer active:bg-white/[0.02] transition-colors"
            style={{ touchAction: 'manipulation' }}
            title="Tap right to steer right"
          />
        </div>
      )}

      {/* ═══ TOUCH STEERING CONTROLS (Left / Right Arrow Icons - EXTRA LARGE ARROWS) ═══ */}
      {(phase === 'playing' || phase === 'feedback') && (
        <>
          <button
            type="button"
            aria-label="Steer Left"
            disabled={playerLane === 0}
            onClick={(e) => {
              e.stopPropagation();
              moveLeft();
            }}
            className={`absolute bottom-2 left-2 sm:bottom-3 sm:left-3 md:bottom-5 md:left-5 z-40 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all select-none shadow-[0_8px_25px_rgba(0,0,0,0.85)] border-2 ${
              playerLane === 0
                ? 'bg-slate-900/40 border-white/5 text-slate-600 opacity-25 cursor-not-allowed'
                : 'bg-slate-900/95 backdrop-blur-xl border-white/35 text-white hover:border-red-500 hover:bg-slate-800 active:bg-red-600 active:scale-95 active:border-red-400 active:shadow-red-600/80 ring-1 ring-white/15'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Steer Right"
            disabled={playerLane === LANE_COUNT - 1}
            onClick={(e) => {
              e.stopPropagation();
              moveRight();
            }}
            className={`absolute bottom-2 right-2 sm:bottom-3 sm:right-3 md:bottom-5 md:right-5 z-40 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all select-none shadow-[0_8px_25px_rgba(0,0,0,0.85)] border-2 ${
              playerLane === LANE_COUNT - 1
                ? 'bg-slate-900/40 border-white/5 text-slate-600 opacity-25 cursor-not-allowed'
                : 'bg-slate-900/95 backdrop-blur-xl border-white/35 text-white hover:border-red-500 hover:bg-slate-800 active:bg-red-600 active:scale-95 active:border-red-400 active:shadow-red-600/80 ring-1 ring-white/15'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* ═══ TUTORIAL OVERLAY (Original Design & Texts with Scaling Fixed) ═══ */}
      {phase === 'tutorial' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050810]/97 backdrop-blur-md px-4 py-2 overflow-y-auto">
          <div className="max-w-sm sm:max-w-md w-full text-center flex flex-col justify-between my-auto py-1 max-h-[96vh]">
            {/* Title */}
            <div>
              <h2 className="font-heading font-black text-xl sm:text-2xl text-white tracking-wider uppercase mb-1">
                BEARING RUNNER
              </h2>
              <div className="w-12 sm:w-16 h-0.5 sm:h-1 bg-red-600 mx-auto rounded-full mb-1.5" />
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-semibold text-slate-300">
                <span>⬅️ ➡️</span>
                <span>Switch Lanes &amp; Select Answers</span>
              </div>
            </div>

            {/* Minimal Instructions (Original clean layout & exact texts) */}
            <div className="space-y-1.5 sm:space-y-2 text-left my-2 sm:my-2.5">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-heading font-black text-red-400 flex-shrink-0">
                  1
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-tight">
                  Choose the <span className="text-white font-bold">correct answer lane</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-heading font-black text-red-400 flex-shrink-0">
                  2
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-tight">
                  Get a <span className="text-white font-bold">bearing part</span> for every correct answer
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-heading font-black text-red-400 flex-shrink-0">
                  3
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-tight">
                  Collect all parts to <span className="text-white font-bold">build your own bearing</span> ⚙️
                </p>
              </div>
            </div>

            {/* Touch input icons */}
            <div className="flex items-center justify-center gap-4 my-1.5 sm:my-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center text-lg sm:text-xl text-slate-400">
                ◀
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center text-lg sm:text-xl text-slate-400">
                ▶
              </div>
            </div>

            {/* Play button from original design */}
            <button
              onClick={handleStartGame}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-slate-900 hover:bg-red-600 active:bg-red-700 text-white font-heading font-black text-sm sm:text-base tracking-[0.3em] uppercase transition-all shadow-lg hover:shadow-red-600/30 active:scale-[0.98] border-2 border-white/10 hover:border-red-500"
            >
              ▶ &nbsp; PLAY
            </button>
          </div>
        </div>
      )}

      {/* ═══ COUNTDOWN OVERLAY ═══ */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050810]/97 backdrop-blur-md px-6 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-48 h-48 rounded-full border-2 border-red-500/20 game-ring-pulse" style={{ animationDelay: '0s' }} />
            <div className="absolute w-64 h-64 rounded-full border border-red-500/10 game-ring-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="absolute w-80 h-80 rounded-full border border-red-500/5 game-ring-pulse" style={{ animationDelay: '0.6s' }} />
            <span key={countdown} className="countdown-number text-red-500 relative z-10" style={{
              textShadow: '0 0 60px rgba(230,0,18,0.8), 0 0 120px rgba(230,0,18,0.3)',
              fontSize: '8rem',
            }}>
              {countdown > 0 ? countdown : 'GO!'}
            </span>
          </div>
          <p className="text-base sm:text-lg text-slate-400 mt-8 font-heading font-bold tracking-[0.3em] uppercase">
            GET READY
          </p>
        </div>
      )}
    </div>
  );
}
