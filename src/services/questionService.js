import generalQuestions from '../data/questions/general.json';
import manufacturingQuestions from '../data/questions/manufacturing.json';
import itcQuestions from '../data/questions/itc.json';
import pteSalesQuestions from '../data/questions/pte_sales.json';
import industrialSalesQuestions from '../data/questions/industrial_sales.json';
import itQuestions from '../data/questions/it.json';
import supplyChainQuestions from '../data/questions/supply_chain.json';
import complianceQuestions from '../data/questions/compliance.json';
import hrGaQuestions from '../data/questions/hr_ga.json';
import corporatePlanningQuestions from '../data/questions/corporate_planning.json';

const DEPARTMENT_BANKS = {
  manufacturing: manufacturingQuestions,
  itc: itcQuestions,
  pte_sales: pteSalesQuestions,
  industrial_sales: industrialSalesQuestions,
  it: itQuestions,
  supply_chain: supplyChainQuestions,
  compliance: complianceQuestions,
  hr_ga: hrGaQuestions,
  corporate_planning: corporatePlanningQuestions,
  general: generalQuestions,
};

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const LANE_LABELS = ['A', 'B', 'C', 'D'];

// A run should keep the player running across the track. Two answers in a row
// on the same lane mean the player stands still, and neighbouring lanes are
// only a nudge, so sequences are scored on how far the player has to travel
// and the best of a batch is used.
const SEQUENCE_CANDIDATES = 240;
const ADJACENT_LANE_PENALTY = 0.6;  // B -> C is movement, but barely
const PING_PONG_PENALTY = 1.8;      // A,D,A,D is its own pattern

/**
 * Balanced bag of lanes: every lane used about equally over the run, so no
 * lane is starved and none is over-represented.
 */
function laneBag(count) {
  const bag = [];
  const perLane = Math.floor(count / LANE_LABELS.length);
  for (const label of LANE_LABELS) bag.push(...Array(perLane).fill(label));
  const extras = shuffle(LANE_LABELS).slice(0, count - bag.length);
  return [...bag, ...extras];
}

/**
 * Average lanes crossed per question, minus penalties for the shapes that read
 * as a pattern on screen. Higher is a livelier run.
 */
function scoreLaneSequence(seq, startLane) {
  let travelled = 0;
  let penalty = 0;

  for (let i = 0; i < seq.length; i++) {
    const from = i === 0 ? startLane : LANE_LABELS.indexOf(seq[i - 1]);
    const gap = Math.abs(LANE_LABELS.indexOf(seq[i]) - from);

    travelled += gap;
    if (gap === 1) penalty += ADJACENT_LANE_PENALTY;
    // A,D,A,D reads as a rhythm the player can ride without reading the answer
    if (i >= 3 && seq[i] === seq[i - 2] && seq[i - 1] === seq[i - 3]) penalty += PING_PONG_PENALTY;
  }

  return (travelled - penalty) / seq.length;
}

/**
 * Picks which lane holds the correct answer for each question in the run.
 * No two answers in a row share a lane, and the run is chosen to make the
 * player cross as much of the track as possible without falling into an
 * obvious rhythm.
 */
export function buildAnswerLaneSequence(count, startLane = 1) {
  if (count <= 0) return [];

  let best = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < SEQUENCE_CANDIDATES; attempt++) {
    const bag = shuffle(laneBag(count));
    const seq = [];

    while (bag.length) {
      // Never repeat the lane the player is already standing in.
      const previous = seq.length ? seq.at(-1) : null;
      let pick = bag.findIndex((label) => label !== previous);
      if (pick === -1) pick = 0; // only the current lane left: unavoidable
      seq.push(bag.splice(pick, 1)[0]);
    }

    const score = scoreLaneSequence(seq, startLane);
    if (score > bestScore) {
      bestScore = score;
      best = seq;
    }
  }

  return best;
}

/**
 * Rebuilds a question with its correct answer sitting on `targetLabel` and the
 * three distractors shuffled across the remaining lanes. Placement is tracked
 * per option rather than by text, so questions that repeat an option string are
 * still scored correctly.
 */
function placeAnswerAt(question, targetLabel) {
  const labels = Object.keys(question.options || {});
  if (!labels.includes(targetLabel)) return question;

  const distractors = shuffle(labels.filter((l) => l !== question.correct).map((l) => question.options[l]));

  const options = {};
  labels.forEach((label) => {
    options[label] = label === targetLabel ? question.options[question.correct] : distractors.pop();
  });

  return { ...question, options, correct: targetLabel };
}

/**
 * Resolves question bank by department ID (handles sub-departments)
 */
export function getDepartmentBank(deptId) {
  if (!deptId) return generalQuestions;
  const baseDept = deptId.split('_')[0];
  if (baseDept === 'manufacturing') return manufacturingQuestions;
  if (DEPARTMENT_BANKS[deptId]) return DEPARTMENT_BANKS[deptId];
  return DEPARTMENT_BANKS[baseDept] || generalQuestions;
}

/**
 * Retrieves player's answered question IDs from storage
 */
export function getAnsweredQuestionIds(employeeId) {
  if (!employeeId) return [];
  try {
    const raw = localStorage.getItem(`nsk_answered_${employeeId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Selects 10 questions for a game run with:
 * 1. NO-REPEAT guarantee (prioritizes unseen questions).
 * 2. DIFFICULTY FILTERING / PROGRESSION ('easy' | 'medium' | 'hard' | 'progressive').
 * 3. LANE CHOREOGRAPHY: the correct answers are spread across the track so the
 *    player keeps moving, starting from `startLane` (the spawn lane).
 */
export function getQuestionsForGame(employeeId, deptId, count = 10, difficulty = 'progressive', startLane = 1) {
  const bank = getDepartmentBank(deptId);
  const allQuestions = bank.questions || [];
  const answeredIds = new Set(getAnsweredQuestionIds(employeeId));

  const unseenQuestions = allQuestions.filter((q) => !answeredIds.has(q.id));
  const seenQuestions = allQuestions.filter((q) => answeredIds.has(q.id));

  // Determine the pool to select from (prefer unseen, fall back to seen if exhausted)
  let candidatePool = unseenQuestions.length >= count ? unseenQuestions : [...unseenQuestions, ...shuffle(seenQuestions)];
  let bankRecycled = unseenQuestions.length < count;

  // If still fewer than count, supplement with general bank
  if (candidatePool.length < count) {
    const generalExtras = generalQuestions.questions || [];
    candidatePool = [...candidatePool, ...generalExtras];
  }

  let finalQuestions = [];

  if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
    // Specific difficulty requested: prioritize matching difficulty
    const targetDiff = candidatePool.filter((q) => (q.difficulty || 'medium').toLowerCase() === difficulty);
    const otherDiff = candidatePool.filter((q) => (q.difficulty || 'medium').toLowerCase() !== difficulty);

    const selected = [...shuffle(targetDiff), ...shuffle(otherDiff)].slice(0, count);
    finalQuestions = shuffle(selected);
  } else {
    // 'progressive': Sort into 3 Easy (Q1-3) -> 4 Medium (Q4-7) -> 3 Hard (Q8-10)
    const easyPool = shuffle(candidatePool.filter((q) => (q.difficulty || 'medium').toLowerCase() === 'easy'));
    const medPool = shuffle(candidatePool.filter((q) => (q.difficulty || 'medium').toLowerCase() === 'medium'));
    const hardPool = shuffle(candidatePool.filter((q) => (q.difficulty || 'medium').toLowerCase() === 'hard'));

    const takeEasy = easyPool.slice(0, 3);
    const takeMed = medPool.slice(0, 4);
    const takeHard = hardPool.slice(0, 3);

    const selected = [...takeEasy, ...takeMed, ...takeHard];

    // If any group fell short, fill remaining with whatever is available
    if (selected.length < count) {
      const remainingCandidates = candidatePool.filter((q) => !selected.some((s) => s.id === q.id));
      selected.push(...shuffle(remainingCandidates).slice(0, count - selected.length));
    }

    // Sort progressively by difficulty rank
    const diffRank = { easy: 1, medium: 2, hard: 3 };
    finalQuestions = selected.sort((a, b) => {
      const rA = diffRank[(a.difficulty || 'medium').toLowerCase()] || 2;
      const rB = diffRank[(b.difficulty || 'medium').toLowerCase()] || 2;
      return rA - rB;
    });
  }

  const run = finalQuestions.slice(0, count);
  const lanes = buildAnswerLaneSequence(run.length, startLane);

  return {
    questions: run.map((q, i) => placeAnswerAt(q, lanes[i])),
    totalInBank: allQuestions.length,
    answeredCount: answeredIds.size,
    isBankCompleted: bankRecycled,
    departmentName: bank.department_name || 'General Training',
    selectedDifficulty: difficulty,
  };
}

/**
 * Marks questions as answered by this employee
 */
export function markQuestionsAnswered(employeeId, questionIds = []) {
  if (!employeeId || questionIds.length === 0) return;
  try {
    const existing = new Set(getAnsweredQuestionIds(employeeId));
    questionIds.forEach((id) => existing.add(id));
    localStorage.setItem(`nsk_answered_${employeeId}`, JSON.stringify([...existing]));
  } catch (err) {
    console.error('Failed to save answered questions', err);
  }
}

/**
 * Gets player progress stats in their department
 */
export function getPlayerDepartmentProgress(employeeId, deptId) {
  const bank = getDepartmentBank(deptId);
  const allQuestions = bank.questions || [];
  const answeredIds = new Set(getAnsweredQuestionIds(employeeId));
  const answeredInDept = allQuestions.filter((q) => answeredIds.has(q.id)).length;

  return {
    answered: answeredInDept,
    total: allQuestions.length,
    percentage: allQuestions.length > 0 ? Math.round((answeredInDept / allQuestions.length) * 100) : 0,
    departmentName: bank.department_name,
  };
}
