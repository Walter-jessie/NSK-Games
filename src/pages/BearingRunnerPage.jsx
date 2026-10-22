import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useGameStore from '../stores/gameStore';
import useAuthStore from '../stores/authStore';
import { getQuestionsForGame, markQuestionsAnswered } from '../services/questionService';
import { submitScore } from '../services/supabaseService';
import soundEffects from '../services/audioService';
import Runner3DScene, { loadRunnerModel } from '../components/game/Runner3DScene';
import { requestFullscreen } from '../utils/fullscreen';
import { BEARING_PARTS } from '../config/bearingParts';

// ─── Game Constants ───────────────────────────────────────────
const LANE_COUNT = 4;
const LANE_LABELS = ['A', 'B', 'C', 'D'];
const COLLISION_Y = 78;
const PASS_THROUGH_Y = 81.5; // Fast, seamless 180ms pass-through so question advances instantly without stalling
const COUNTDOWN_SECS = 3;

export const DIFFICULTY_CONFIG = {
  easy: {
    id: 'easy',
    name: 'Apprentice',
    badge: '🟢 EASY',
    speed: 0.0039,     // 20 seconds per question (78 / (0.0039 * 1000) = 20.0s)
    multiplier: 1.0,
    color: '#10B981',
    description: '20s per question · Calm rhythm & safety basics',
  },
  medium: {
    id: 'medium',
    name: 'Operator',
    badge: '🔵 MEDIUM',
    speed: 0.0052,     // 15 seconds per question (78 / (0.0052 * 1000) = 15.0s)
    multiplier: 1.25,
    color: '#3B82F6',
    description: '15s per question · Standard factory tempo',
  },
  hard: {
    id: 'hard',
    name: 'Plant Master',
    badge: '🔴 HARD',
    speed: 0.0065,     // 12 seconds per question (78 / (0.0065 * 1000) = 12.0s)
    multiplier: 1.5,
    color: '#EF4444',
    description: '12s per question · Fast diagnosis sprint',
  },
  progressive: {
    id: 'progressive',
    name: 'Progressive',
    badge: '⚡ PROGRESSIVE',
    speed: 0.0039,
    multiplier: 1.35,
    color: '#F59E0B',
    description: 'Ramps from Easy (20s) ➔ Medium (15s) ➔ Hard (12s)',
  },
};

function calcPoints(isCorrect, timeMs, streak, multiplier = 1.0) {
  if (!isCorrect) return 0;
  const base = 100;
  const speedBonus = Math.max(0, Math.round((1 - timeMs / 21000) * 50));
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
      if (questionIndex < 3) return 0.0039;  // 20s (Q1-3)
      if (questionIndex < 7) return 0.0052;  // 15s (Q4-7)
      return 0.0065;                         // 12s (Q8-10)
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
  const [completedScore, setCompletedScore] = useState(null);
  const [countdownToResult, setCountdownToResult] = useState(5);

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
    requestFullscreen().catch(() => {});
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
    if (phaseRef.current !== 'playing' && phaseRef.current !== 'feedback' && phaseRef.current !== 'completed_popup') {
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
    if (phaseRef.current === 'playing' && lockerYRef.current >= COLLISION_Y && !isTransitioningRef.current) {
      handleCollision();
    }

    // 2. Gate has zoomed completely past behind runner & camera: smoothly load next question
    if (phaseRef.current === 'playing' && lockerYRef.current >= PASS_THROUGH_Y && isTransitioningRef.current) {
      advanceToNextQuestion();
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [getLockerSpeed]);

  useEffect(() => {
    if (phase === 'playing' || phase === 'feedback' || phase === 'completed_popup') {
      lastFrameRef.current = performance.now();
      animRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [phase, gameLoop]);

  // ─── 5-Second Timer to Results Page on Completion ──────────
  useEffect(() => {
    if (phase !== 'completed_popup') return;

    const timer = setInterval(() => {
      setCountdownToResult((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/results');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, navigate]);

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
      const correctSoFar = useGameStore.getState().results.filter((r) => r.isCorrect).length;
      const partIdx = Math.min(correctSoFar - 1, BEARING_PARTS.length - 1);
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
      const storeState = useGameStore.getState();
      const correctCount = storeState.results.filter((r) => r.isCorrect).length;
      const accuracy = Math.round((correctCount / 10) * 100);

      // Immediately display completion popup showing only score out of 10
      setCompletedScore({ correct: correctCount, total: 10 });
      setCountdownToResult(5);
      setPhase('completed_popup');
      endGame();

      // Submit score and mark questions answered in background without awaiting or freezing UI
      const answeredIds = questionsRef.current.map((item) => item.id);
      markQuestionsAnswered(employeeId, answeredIds);

      submitScore({
        employeeId,
        department,
        score: storeState.score,
        accuracy,
        correctCount,
        difficulty: diffConfig.id,
      }).catch((err) => console.warn('Submit score background error:', err));

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
  }, [department, employeeId, endGame, diffConfig.id]);

  // ─── Lane Movement Controls ─────────────────────────
  const lastMoveTimeRef = useRef(0);

  const moveLeft = useCallback(() => {
    const isPlayActive = phaseRef.current === 'playing' || phaseRef.current === 'feedback';
    if (!isPlayActive) return;
    const now = performance.now();
    // Guard against duplicate touchstart + synthetic click double-firing (220ms debounce)
    if (now - lastMoveTimeRef.current < 220) return;
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
    // Guard against duplicate touchstart + synthetic click double-firing (220ms debounce)
    if (now - lastMoveTimeRef.current < 220) return;
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
    if (now - lastMoveTimeRef.current < 220) return;
    lastMoveTimeRef.current = now;

    if (laneIndex >= 0 && laneIndex < LANE_COUNT) {
      if (playerLaneRef.current !== laneIndex) soundEffects.playLaneSwitch();
      setPlayerLane(laneIndex);
      playerLaneRef.current = laneIndex;
    }
  }, []);

  // Screen Swipe & Tap Detection for intuitive mobile steering
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
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;

    // Horizontal swipe threshold: 30px, horizontal dominance over vertical
    if (Math.abs(diffX) > 30 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        moveLeft();
      } else {
        moveRight();
      }
    } else if (Math.abs(diffX) < 15 && Math.abs(diffY) < 15) {
      // Tap on left vs right side of the screen
      if (touch.clientX < window.innerWidth / 2) {
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
        <div className="absolute top-[44vh] sm:top-[47vh] left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center justify-center animate-bounce">
          <div className={`px-4 sm:px-6 py-1 sm:py-1.5 rounded-full font-heading font-black text-xs sm:text-sm md:text-base tracking-widest shadow-2xl border-2 flex items-center gap-2 backdrop-blur-md ${
            feedbackType === 'correct'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400 shadow-emerald-500/50'
              : 'bg-red-950/90 text-red-300 border-red-500 shadow-red-500/50'
          }`}>
            <span>{feedbackType === 'correct' ? '✓ CORRECT' : '✗ WRONG'}</span>
          </div>
        </div>
      )}

      {/* ═══ TOP GAME HUD & Q&A (Locked Container: Stable Proportions on 1080p, 2K & All Displays) ═══ */}
      {(phase === 'playing' || phase === 'feedback') && (
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-auto flex flex-col justify-start gap-2 px-3 pt-2 pb-2 bg-gradient-to-b from-[#050810]/98 via-[#050810]/90 to-transparent">
          {/* Question Row at Very Top with integrated Parts Counter */}
          {currentQ && (
            <div key={`q-${qIdx}`} className="flex items-center gap-2.5 max-w-[min(94vw,160vh)] mx-auto w-full flex-shrink-0 game-question-enter">
              {/* Parts Counter Badge (Cyber Cyan/Blue Gradient - Fluid Height Scale) */}
              <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-800 border-2 border-cyan-300 text-white whitespace-nowrap shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 h-[clamp(56px,13.5vh,125px)]">
                <span className="text-cyan-200 font-black uppercase text-[clamp(11px,2.4vh,20px)] tracking-widest">PARTS</span>
                <span className="font-heading font-black text-[clamp(17px,3.6vh,34px)] text-white">{collectedParts.length}/10</span>
              </div>

              {/* High-Contrast White Question Panel with Bold Cyber Cyan Border - Big Bold Legible Question */}
              <div className="flex-1 bg-white border-[3px] border-cyan-500 rounded-2xl px-6 py-2 shadow-[0_0_25px_rgba(6,182,212,0.35)] text-center flex items-center justify-center h-[clamp(56px,13.5vh,125px)]">
                <p className="text-[clamp(18px,4.4vh,38px)] font-heading font-black text-slate-900 leading-tight tracking-normal line-clamp-2">
                  {currentQ.question}
                </p>
              </div>
            </div>
          )}

          {/* Options: 4 Locked, Uniform Answer Cards (Cyber Cyan/Blue Theme) */}
          {currentQ && (
            <div key={`o-${qIdx}`} className="grid grid-cols-4 gap-2.5 game-options-enter max-w-[min(94vw,160vh)] mx-auto w-full items-stretch h-[clamp(48px,11.5vh,102px)]">
              {LANE_LABELS.map((label, idx) => {
                const isSelected = playerLane === idx;
                const isCorrectAnswer = currentQ.correct === label;
                return (
                  <button
                    key={label}
                    onClick={() => jumpToLane(idx)}
                    className={`relative py-1 px-2.5 rounded-2xl transition-all duration-150 select-none flex items-center justify-center gap-2 h-full ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 border-[3px] border-cyan-200 text-white shadow-[0_0_30px_rgba(6,182,212,0.85)] ring-2 ring-cyan-400 scale-[1.02] z-20'
                        : 'bg-[#080d1a]/95 border-2 border-slate-700/80 hover:border-cyan-400/60 hover:bg-[#0f172a] backdrop-blur-md text-white shadow-md'
                    }`}
                  >
                    {/* [TESTING HELPER] Dot on correct answer */}
                    {isCorrectAnswer && (
                      <span
                        title="[Testing Mode] Correct Answer"
                        className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-200 shadow-sm shadow-emerald-400 animate-pulse pointer-events-none z-20"
                      />
                    )}
                    {isSelected && <div className="absolute inset-0 game-option-shimmer pointer-events-none rounded-2xl" />}
                    
                    {/* Letter Badge (A, B, C, D) - Fluid Proportions */}
                    <span className={`relative z-10 inline-flex w-[clamp(26px,5.2vh,50px)] h-[clamp(26px,5.2vh,50px)] rounded-xl items-center justify-center text-[clamp(11px,2.2vh,20px)] font-heading font-black shrink-0 shadow-sm ${
                      isSelected ? 'bg-white text-blue-700 shadow-md font-black' : 'bg-white/15 text-white border border-white/20'
                    }`}>
                      {label}
                    </span>

                    {/* Words Text - High Contrast & Clean Size */}
                    <span className={`relative z-10 text-[clamp(11px,2.3vh,19px)] font-bold leading-tight line-clamp-2 text-left ${
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
            {flyingPart.image ? (
              <img
                src={flyingPart.image}
                alt=""
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
              />
            ) : (
              <span className="text-5xl sm:text-6xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] animate-pulse">{flyingPart.icon}</span>
            )}
            <div className="flex items-center gap-1.5 mt-2 bg-cyan-950/90 border border-cyan-400/40 px-3 py-0.5 rounded-full whitespace-nowrap shadow-md">
              <span className="text-[10px] text-cyan-400 font-heading font-black uppercase tracking-wider">
                {flyingPart.kind === 'process' ? '+ PROCESS' : '+ PART'}
              </span>
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
              dotClass = 'bg-cyan-400 border-cyan-200 game-dot-pulse scale-125 shadow-sm shadow-cyan-400/80';
            }
            return (
              <div key={i} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border transition-all ${dotClass}`} />
            );
          })}
        </div>
      )}

      {/* ═══ BOTTOM PROGRESS BAR (Cyber Cyan Theme) ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-40 h-1 bg-slate-950">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${(qIdx / 10) * 100}%`,
            background: 'linear-gradient(90deg, #06b6d4, #2563eb)',
            boxShadow: '0 0 10px rgba(6,182,212,0.8)',
          }}
        />
      </div>

      {/* ═══ SCREEN SWIPE & TAP ZONE (single unified zone, tap/swipe handled in handleTouchEnd) ═══ */}
      {(phase === 'playing' || phase === 'feedback') && (
        <div
          className="absolute inset-x-0 bottom-0 top-[44vh] sm:top-[47vh] z-20 pointer-events-auto select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* ═══ TOUCH STEERING CONTROLS (Only onPointerDown, no onClick duplicate) ═══ */}
      {(phase === 'playing' || phase === 'feedback') && (
        <>
          <button
            type="button"
            aria-label="Steer Left"
            disabled={playerLane === 0}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              moveLeft();
            }}
            className={`absolute bottom-[2vh] left-[2vh] z-40 w-[clamp(100px,28vh,200px)] h-[clamp(118px,34vh,230px)] rounded-[clamp(20px,5vh,38px)] flex items-center justify-center transition-all select-none shadow-[0_10px_35px_rgba(0,0,0,0.85)] border-2 ${
              playerLane === 0
                ? 'bg-slate-900/40 border-white/5 text-slate-600 opacity-25 cursor-not-allowed'
                : 'bg-slate-900/95 backdrop-blur-xl border-cyan-500/40 text-white hover:border-cyan-400 hover:bg-slate-800 active:bg-cyan-600 active:scale-95 active:border-cyan-300 active:shadow-cyan-500/80 ring-1 ring-cyan-400/30'
            }`}
            style={{ touchAction: 'none' }}
          >
            <svg className="w-[clamp(56px,16vh,115px)] h-[clamp(56px,16vh,115px)] drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Steer Right"
            disabled={playerLane === LANE_COUNT - 1}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              moveRight();
            }}
            className={`absolute bottom-[2vh] right-[2vh] z-40 w-[clamp(100px,28vh,200px)] h-[clamp(118px,34vh,230px)] rounded-[clamp(20px,5vh,38px)] flex items-center justify-center transition-all select-none shadow-[0_10px_35px_rgba(0,0,0,0.85)] border-2 ${
              playerLane === LANE_COUNT - 1
                ? 'bg-slate-900/40 border-white/5 text-slate-600 opacity-25 cursor-not-allowed'
                : 'bg-slate-900/95 backdrop-blur-xl border-cyan-500/40 text-white hover:border-cyan-400 hover:bg-slate-800 active:bg-cyan-600 active:scale-95 active:border-cyan-300 active:shadow-cyan-500/80 ring-1 ring-cyan-400/30'
            }`}
            style={{ touchAction: 'none' }}
          >
            <svg className="w-[clamp(56px,16vh,115px)] h-[clamp(56px,16vh,115px)] drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* ═══ COMPLETION POPUP (Score out of 10, auto-navigates to results in 5s) ═══ */}
      {phase === 'completed_popup' && completedScore && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050810]/90 backdrop-blur-lg px-6 text-center animate-fade-in">
          <div className="max-w-xs w-full px-6 py-8 rounded-3xl bg-slate-950/95 border-2 border-cyan-400/50 shadow-[0_0_60px_rgba(6,182,212,0.3)]">
            {/* Trophy */}
            <div className="text-5xl mb-3 animate-bounce">
              {completedScore.correct >= 8 ? '🏆' : completedScore.correct >= 5 ? '⭐' : '💪'}
            </div>
            {/* Title */}
            <h2 className="font-heading font-black text-lg sm:text-xl text-white tracking-wider uppercase mb-2">
              GAME COMPLETE!
            </h2>
            {/* Score */}
            <div className="flex items-center justify-center gap-1 mb-4">
              <span className="font-heading font-black text-5xl sm:text-6xl text-cyan-400" style={{ textShadow: '0 0 30px rgba(6,182,212,0.6)' }}>
                {completedScore.correct}
              </span>
              <span className="font-heading font-bold text-2xl sm:text-3xl text-slate-400">/</span>
              <span className="font-heading font-bold text-2xl sm:text-3xl text-slate-400">{completedScore.total}</span>
            </div>
            {/* Auto-redirect countdown */}
            <p className="text-xs text-slate-400 mt-2">
              Results in {countdownToResult}s...
            </p>
            {/* Skip button */}
            <button
              type="button"
              onClick={() => navigate('/results')}
              className="mt-4 w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              VIEW RESULTS NOW
            </button>
          </div>
        </div>
      )}

      {/* ═══ TUTORIAL OVERLAY (Original Design with Enlarged Dimensions) ═══ */}
      {phase === 'tutorial' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050810]/97 backdrop-blur-md px-4 py-2 select-none overflow-y-auto">
          <div className="max-w-lg w-full text-center flex flex-col justify-between my-auto py-2 px-3">
            {/* Title */}
            <div>
              <h2 className="font-heading font-black text-xl sm:text-2xl text-white tracking-wider uppercase mb-1">
                BEARING RUNNER
              </h2>
              <div className="w-16 h-1 bg-cyan-500 mx-auto rounded-full mb-2" />
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-1">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-cyan-400/30 flex items-center justify-center text-base sm:text-lg text-cyan-200 shadow-sm flex-shrink-0">
                  ◀
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-xs sm:text-sm font-semibold text-cyan-200 shadow-sm">
                  <span>Switch Lanes &amp; Select Answers</span>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-cyan-400/30 flex items-center justify-center text-base sm:text-lg text-cyan-200 shadow-sm flex-shrink-0">
                  ▶
                </div>
              </div>
            </div>

            {/* Instructions (Original 3 Steps - Enlarged) */}
            <div className="space-y-2.5 text-left my-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xs sm:text-sm font-heading font-black text-cyan-300 flex-shrink-0">
                  1
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-snug">
                  Choose the <span className="text-white font-bold">correct answer lane</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xs sm:text-sm font-heading font-black text-cyan-300 flex-shrink-0">
                  2
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-snug">
                  Get a <span className="text-white font-bold">bearing part</span> for each correct answer
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xs sm:text-sm font-heading font-black text-cyan-300 flex-shrink-0">
                  3
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-snug">
                  Collect all parts to <span className="text-white font-bold">build your bearing</span> ⚙️
                </p>
              </div>
            </div>

            {/* Play button - Enlarged */}
            <button
              id="btn-tutorial-play"
              onClick={handleStartGame}
              className="w-full py-3 sm:py-3.5 rounded-2xl bg-slate-900 hover:bg-cyan-600 active:bg-cyan-700 text-white font-heading font-black text-xs sm:text-sm tracking-[0.25em] uppercase transition-all shadow-xl hover:shadow-cyan-600/40 active:scale-[0.98] border-2 border-cyan-400/50 hover:border-cyan-300 cursor-pointer"
            >
              PLAY
            </button>
          </div>
        </div>
      )}

      {/* ═══ COUNTDOWN OVERLAY (Cyber Theme) ═══ */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050810]/97 backdrop-blur-md px-6 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-48 h-48 rounded-full border-2 border-cyan-400/30 game-ring-pulse" style={{ animationDelay: '0s' }} />
            <div className="absolute w-64 h-64 rounded-full border border-cyan-400/20 game-ring-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="absolute w-80 h-80 rounded-full border border-cyan-400/10 game-ring-pulse" style={{ animationDelay: '0.6s' }} />
            <span key={countdown} className="countdown-number text-cyan-400 relative z-10" style={{
              textShadow: '0 0 60px rgba(6,182,212,0.9), 0 0 120px rgba(6,182,212,0.4)',
              fontSize: '8rem',
            }}>
              {countdown > 0 ? countdown : 'GO!'}
            </span>
          </div>
          <p className="text-base sm:text-lg text-cyan-300/80 mt-8 font-heading font-bold tracking-[0.3em] uppercase">
            GET READY
          </p>
        </div>
      )}
    </div>
  );
}
