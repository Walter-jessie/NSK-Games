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
 */
export function getQuestionsForGame(employeeId, deptId, count = 10, difficulty = 'progressive') {
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

  return {
    questions: finalQuestions.slice(0, count),
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
