import { supabase } from './supabase.js';
import { getNflState } from './sleeper.js';
import { generateMarcusPowerRankings } from './reporters/marcusVance.js';
import { generateMartyRecap } from './reporters/martySullivan.js';
import { generateChloeTransactions } from './reporters/chloeCarmichael.js';
import { generateBuckPreview } from './reporters/buckCallahan.js';

// In-memory concurrency locks to prevent multiple simultaneous requests
// from triggering duplicate AI generations in the same instance
const activeGenerations = {};

/**
 * Returns current Pacific (America/Los_Angeles) day, hour (0-23), and minute
 */
export function getPacificDateTime() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    day: get('weekday'),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
  };
}

/**
 * Self-healing check specifically for Dr. Marcus Vance's Power Rankings.
 * Scheduled: Tuesdays at 2:00 PM (14:00) Pacific.
 * If the current time is Tuesday >= 14:00 (or later in the week) and
 * no power rankings exist for the current NFL week, generate them immediately.
 */
export async function selfHealMarcusPowerRankings(currentWeekNumber) {
  try {
    let week = currentWeekNumber;
    if (!week) {
      const state = await getNflState();
      week = state?.week || 1;
    }

    // Check if rankings for this week already exist in DB
    const { data: existingRanking } = await supabase
      .from('power_rankings')
      .select('id, week_number')
      .eq('week_number', week)
      .maybeSingle();

    if (existingRanking) {
      return { alreadyExists: true, weekNumber: week };
    }

    const { day, hour } = getPacificDateTime();
    const isTuesdayAfter2pm = day === 'Tuesday' && hour >= 14;
    const isLaterInWeek = ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(day);

    if (isTuesdayAfter2pm || isLaterInWeek) {
      const lockKey = `marcus_week_${week}`;
      if (activeGenerations[lockKey]) {
        console.log(`[selfHealMarcus] Generation already in progress for Week ${week}. Awaiting existing promise...`);
        return await activeGenerations[lockKey];
      }

      console.log(`[selfHealMarcus] Week ${week} Power Rankings missing past Tuesday 2:00 PM PT. Triggering JIT generation...`);
      activeGenerations[lockKey] = generateMarcusPowerRankings({ dryRun: false });
      const result = await activeGenerations[lockKey];
      delete activeGenerations[lockKey];
      return { generated: true, weekNumber: week, result };
    }

    return { skipped: true, reason: 'Before scheduled publication time (Tuesday 2:00 PM PT)' };
  } catch (err) {
    console.error('[selfHealMarcus] Error in self-healing Marcus Vance:', err);
    return { error: err.message };
  }
}

/**
 * Evaluates all editorial beats and auto-dispatches any overdue columnists.
 */
export async function autoDispatchOverdueReporters() {
  const { day, hour } = getPacificDateTime();
  let state = null;
  try {
    state = await getNflState();
  } catch (e) {
    console.warn('[autoDispatch] Failed to get NFL state:', e.message);
  }
  const currentWeek = state?.week || 1;
  const results = {};

  // 1. Marty Sullivan: Tuesday >= 12:00 PM PT
  const isMartyDue = (day === 'Tuesday' && hour >= 12) || ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(day);
  if (isMartyDue) {
    const { data: martyArticle } = await supabase
      .from('newsroom_articles')
      .select('id, created_at')
      .eq('author_id', 'marty_sullivan')
      .gte('created_at', new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (!martyArticle || martyArticle.length === 0) {
      console.log('[autoDispatch] Marty Sullivan is overdue. Generating recap...');
      try {
        results.marty = await generateMartyRecap({ dryRun: false });
      } catch (err) {
        results.marty = { error: err.message };
      }
    } else {
      results.marty = { skipped: true, message: 'Already published within the last 6 days' };
    }
  }

  // 2. Marcus Vance: Tuesday >= 2:00 PM (14:00) PT
  const marcusResult = await selfHealMarcusPowerRankings(currentWeek);
  results.marcus = marcusResult;

  // 3. Chloe Carmichael: Wednesday >= 12:00 PM PT
  const isChloeDue = (day === 'Wednesday' && hour >= 12) || ['Thursday', 'Friday', 'Saturday', 'Sunday'].includes(day);
  if (isChloeDue) {
    const { data: chloeArticle } = await supabase
      .from('newsroom_articles')
      .select('id, created_at')
      .eq('author_id', 'chloe_carmichael')
      .gte('created_at', new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (!chloeArticle || chloeArticle.length === 0) {
      console.log('[autoDispatch] Chloe Carmichael is overdue. Generating spin room...');
      try {
        results.chloe = await generateChloeTransactions({ dryRun: false });
      } catch (err) {
        results.chloe = { error: err.message };
      }
    } else {
      results.chloe = { skipped: true, message: 'Already published within the last 6 days' };
    }
  }

  // 4. Buck Callahan: Thursday >= 12:00 PM PT
  const isBuckDue = (day === 'Thursday' && hour >= 12) || ['Friday', 'Saturday', 'Sunday'].includes(day);
  if (isBuckDue) {
    const { data: buckArticle } = await supabase
      .from('newsroom_articles')
      .select('id, created_at')
      .eq('author_id', 'buck_callahan')
      .gte('created_at', new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (!buckArticle || buckArticle.length === 0) {
      console.log('[autoDispatch] Buck Callahan is overdue. Generating look-ahead...');
      try {
        results.buck = await generateBuckPreview({ dryRun: false });
      } catch (err) {
        results.buck = { error: err.message };
      }
    } else {
      results.buck = { skipped: true, message: 'Already published within the last 6 days' };
    }
  }

  return {
    day,
    hour,
    currentWeek,
    results,
  };
}
