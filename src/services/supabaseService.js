import supabase from '../config/supabase';

const LOCAL_STORAGE_KEY = 'nsk_leaderboard';

/**
 * Saves game score to both local cache and Supabase cloud.
 */
export async function submitScore({
  employeeId,
  department,
  score,
  accuracy,
  correctCount,
  game = 'bearing_runner',
  ...extra
}) {
  const timestamp = new Date().toISOString();
  const isGame2 = game === 'plant_arena' || game === 'plant-arena-repair';
  const entry = {
    employeeId,
    department,
    score: Number(score) || 0,
    accuracy: Number(accuracy) || 0,
    correctCount: Number(correctCount) || 0,
    game: isGame2 ? 'plant_arena' : 'bearing_runner',
    ...extra,
    date: timestamp,
  };

  // 1. Immediately save to LocalStorage for zero-latency UI
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    existing.push(entry);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }

  // 2. Sync to Supabase cloud (uses ::g2 department suffix for Game 2 to fit current schema)
  try {
    const deptTag = isGame2
      ? `${department || 'general'}::g2`
      : (department || 'general');

    const { data, error } = await supabase.from('leaderboard').insert([
      {
        employee_id: employeeId,
        department: deptTag,
        score: entry.score,
        accuracy: entry.accuracy,
        correct_count: entry.correctCount,
        created_at: timestamp,
      },
    ]);

    if (error) {
      console.info('Supabase cloud sync note:', error.message || error);
    } else {
      console.log('Score synced to Supabase cloud successfully');
    }
  } catch (err) {
    console.info('Network offline or Supabase table pending setup:', err.message);
  }

  return entry;
}

/**
 * Fetches and aggregates leaderboard scores from Supabase cloud and LocalStorage.
 * Aggregates both Game 1 and Game 2 personal bests for each player.
 */
export async function getLeaderboard() {
  const extractCount = (row) => {
    if (row.correct_count !== undefined && row.correct_count !== null) return Number(row.correct_count);
    if (row.correctCount !== undefined && row.correctCount !== null) return Number(row.correctCount);
    if (row.repairs !== undefined && row.repairs !== null) return Number(row.repairs);
    if (row.accuracy !== undefined && row.accuracy !== null) return Math.round((Number(row.accuracy) / 100) * 10);
    return 0;
  };

  const playersMap = {};

  const processRow = (row) => {
    const emp = row.employee_id || row.employeeId;
    if (!emp) return;

    const rawDept = row.department || '';
    const isGame2 =
      rawDept.endsWith('::g2') ||
      rawDept.endsWith(':g2') ||
      row.game === 'plant_arena' ||
      row.game === 'plant-arena-repair';

    const cleanDept = rawDept.replace(/::g2$/, '').replace(/:g2$/, '');
    const isGuest = Boolean(emp.toUpperCase().startsWith('GUEST') || emp === 'NSK-GUEST');
    const scoreVal = Number(row.score) || 0;
    const countVal = extractCount(row);
    const dateVal = row.created_at || row.date || '';

    if (!playersMap[emp]) {
      playersMap[emp] = {
        employeeId: emp,
        department: cleanDept,
        isGuest,
        date: dateVal,
        game1: { played: false, score: 0, correctCount: 0, accuracy: 0 },
        game2: { played: false, score: 0, repairs: 0, integrity: 0 },
      };
    }

    const p = playersMap[emp];
    if (cleanDept && (!p.department || p.department === 'general')) {
      p.department = cleanDept;
    }

    if (isGame2) {
      if (
        !p.game2.played ||
        countVal > p.game2.repairs ||
        (countVal === p.game2.repairs && scoreVal > p.game2.score)
      ) {
        p.game2 = {
          played: true,
          score: scoreVal,
          repairs: countVal,
          integrity: Number(row.accuracy ?? 100),
          date: dateVal,
        };
      }
    } else {
      if (
        !p.game1.played ||
        countVal > p.game1.correctCount ||
        (countVal === p.game1.correctCount && scoreVal > p.game1.score)
      ) {
        p.game1 = {
          played: true,
          score: scoreVal,
          correctCount: countVal,
          accuracy: Number(row.accuracy ?? Math.round((countVal / 10) * 100)),
          date: dateVal,
        };
      }
    }
  };

  // 1. Try Supabase cloud first (fetch up to 1000 runs)
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach((row) => processRow(row));
    }
  } catch (err) {
    console.warn('Supabase fetch failed:', err);
  }

  // 2. Also merge LocalStorage cache
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    local.forEach((row) => processRow(row));
  } catch (err) {
    console.warn('LocalStorage read failed:', err);
  }

  return Object.values(playersMap);
}
