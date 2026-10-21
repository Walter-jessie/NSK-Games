import supabase from '../config/supabase';

const LOCAL_STORAGE_KEY = 'nsk_leaderboard';

/**
 * Saves game score to both local cache and Supabase cloud.
 */
export async function submitScore({ employeeId, department, score, accuracy, correctCount, game = 'bearing_runner' }) {
  const timestamp = new Date().toISOString();
  const entry = {
    employeeId,
    department,
    score,
    accuracy,
    correctCount,
    game,
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

  // 2. Sync to Supabase cloud (resilient background sync)
  try {
    const { data, error } = await supabase.from('leaderboard').insert([
      {
        employee_id: employeeId,
        department: department,
        score: score,
        accuracy: accuracy,
        correct_count: correctCount,
        created_at: timestamp,
      },
    ]);

    if (error) {
      // PGRST205 indicates table not created yet in Supabase SQL editor
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
 * Fetches top leaderboard scores, querying Supabase cloud first with LocalStorage fallback.
 * Deduplicates to display each employee's personal best high score.
 */
export async function getLeaderboard(limit = 25) {
  const extractCorrectCount = (row) => {
    if (row.correct_count !== undefined && row.correct_count !== null) return Number(row.correct_count);
    if (row.correctCount !== undefined && row.correctCount !== null) return Number(row.correctCount);
    if (row.accuracy !== undefined && row.accuracy !== null) return Math.round((Number(row.accuracy) / 100) * 10);
    return 0;
  };

  // 1. Try Supabase cloud first
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      if (data.length > 0) {
        // Deduplicate to show each employee's best correct answers count
        const best = {};
        data.forEach((row) => {
          const emp = row.employee_id;
          const count = extractCorrectCount(row);
          if (!best[emp] || count > best[emp].correctCount) {
            best[emp] = {
              employeeId: row.employee_id,
              department: row.department,
              correctCount: count,
              accuracy: row.accuracy ?? Math.round((count / 10) * 100),
              date: row.created_at,
            };
          }
        });
        return Object.values(best).sort((a, b) => b.correctCount - a.correctCount).slice(0, limit);
      } else {
        return [];
      }
    }
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to local storage:', err);
  }

  // 2. Fallback to LocalStorage (if device is offline)
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const best = {};
    local.forEach((entry) => {
      const count = extractCorrectCount(entry);
      if (!best[entry.employeeId] || count > best[entry.employeeId].correctCount) {
        best[entry.employeeId] = {
          ...entry,
          correctCount: count,
        };
      }
    });
    return Object.values(best).sort((a, b) => b.correctCount - a.correctCount).slice(0, limit);
  } catch {
    return [];
  }
}
