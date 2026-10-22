// Script to clear all test entries (both Employees and Guests) from Supabase Leaderboard
const { createClient } = require('@supabase/supabase-js');
const cfg = require('../src/config/supabase.json');

const supabase = createClient(cfg.supabase_url, cfg.supabase_anon_key);

async function clearLeaderboard() {
  console.log('Connecting to Supabase:', cfg.supabase_url);
  console.log('Purging all leaderboard records (Employees + Guests)...');

  // Delete all rows where id is not null
  const { data, error, count } = await supabase
    .from('leaderboard')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('Failed to clear Supabase leaderboard:', error.message);
    process.exit(1);
  }

  console.log('Successfully cleared all leaderboard records in Supabase Cloud!');
}

clearLeaderboard();
