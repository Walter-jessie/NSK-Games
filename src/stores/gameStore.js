import { create } from 'zustand';

/**
 * Game store — manages active game session state including difficulty level.
 */
const useGameStore = create((set, get) => ({
  // Current game session
  currentGame: null,          // 'bearing_runner' | 'bearing_check'
  difficulty: 'medium',       // 'easy' | 'medium' | 'hard' | 'progressive'
  questions: [],              // 10 questions for this run
  currentQuestionIndex: 0,
  score: 0,
  streak: 0,
  results: [],                // { questionId, answer, correct, isCorrect, timeMs, points }
  isPlaying: false,

  setDifficulty: (difficulty) => set({ difficulty }),

  // Start a new game
  startGame: (gameType, questions, difficulty = 'medium') => {
    set({
      currentGame: gameType,
      difficulty,
      questions,
      currentQuestionIndex: 0,
      score: 0,
      streak: 0,
      results: [],
      isPlaying: true,
    });
  },

  // Record an answer
  recordAnswer: (questionId, answer, correct, isCorrect, timeMs, points) => {
    const state = get();
    const newStreak = isCorrect ? state.streak + 1 : 0;

    set({
      score: state.score + points,
      streak: newStreak,
      currentQuestionIndex: state.currentQuestionIndex + 1,
      results: [
        ...state.results,
        { questionId, answer, correct, isCorrect, timeMs, points },
      ],
    });
  },

  // End game
  endGame: () => {
    set({ isPlaying: false });
  },

  // Reset
  resetGame: () => {
    set({
      currentGame: null,
      questions: [],
      currentQuestionIndex: 0,
      score: 0,
      streak: 0,
      results: [],
      isPlaying: false,
    });
  },
}));

export default useGameStore;
