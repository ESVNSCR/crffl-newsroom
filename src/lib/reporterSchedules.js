import { supabase } from './supabase.js';

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const TIMES_OF_DAY = [
  '6:00 AM',
  '7:00 AM',
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
  '9:00 PM',
  '10:00 PM',
];

export const DEFAULT_SCHEDULES = [
  {
    reporter_id: 'marty_sullivan',
    reporter_name: 'Marty Sullivan',
    column_name: 'The Tuesday Recap',
    desk: 'The Tuesday Recap Desk',
    category: 'The Tuesday Recap',
    avatar: '/reporters/marty-sullivan.png',
    description: 'Old-school, no-nonsense post-game analysis of every matchup, bench malpractices, and the official adjudication of the weekly side contest bounty.',
    day_of_week: 'Tuesday',
    time_of_day: '12:00 PM',
    timezone: 'America/Los_Angeles',
    enabled: true,
  },
  {
    reporter_id: 'chloe_carmichael',
    reporter_name: 'Chloe Carmichael',
    column_name: 'The Spin Room',
    desk: 'Waiver Wire & Front-Office Espionage Desk',
    category: 'The Spin Room',
    avatar: '/reporters/chloe-carmichael.png',
    description: 'Sharp insider reporting on midnight waiver wire claims, FAAB spending spree audits, locker-room psychological warfare, and trade rumor leaks.',
    day_of_week: 'Wednesday',
    time_of_day: '12:00 PM',
    timezone: 'America/Los_Angeles',
    enabled: true,
  },
  {
    reporter_id: 'marcus_vance',
    reporter_name: 'Dr. Marcus Vance',
    column_name: 'Official Power Rankings',
    desk: 'Applied Mathematics & Fantasy Arbitrage Desk',
    category: 'Power Rankings',
    avatar: '/reporters/marcus-vance.png',
    description: 'Analytical weekly power rankings, mathematical regression curves, expected fantasy points models, and mathematical luck vs. skill breakdowns.',
    day_of_week: 'Tuesday',
    time_of_day: '2:00 PM',
    timezone: 'America/Los_Angeles',
    enabled: true,
  },
  {
    reporter_id: 'buck_callahan',
    reporter_name: 'Buck Callahan',
    column_name: 'The Look-Ahead',
    desk: 'The Grit & Trench Warfare Desk',
    category: 'The Grit Desk',
    avatar: '/reporters/buck-callahan.png',
    description: 'Previewing every upcoming matchup on the schedule, calculating grit ratings, analyzing trench battles, and delivering game-by-game predictions before Thursday Night Football.',
    day_of_week: 'Thursday',
    time_of_day: '12:00 PM',
    timezone: 'America/Los_Angeles',
    enabled: true,
  },
  {
    reporter_id: 'commissioner',
    reporter_name: 'Eric Vaughan',
    column_name: "Commissioner's Corner",
    desk: 'The Front Office',
    category: "Commissioner's Corner",
    avatar: '/logos/league.png',
    description: 'Official executive dispatches, constitutional interpretations of the CRFFL charter, league health evaluations, and formal front-office memoranda.',
    day_of_week: 'Monday',
    time_of_day: '9:00 AM',
    timezone: 'America/Los_Angeles',
    enabled: false,
  },
];

const REPORTER_ORDER = [
  'marty_sullivan',
  'chloe_carmichael',
  'marcus_vance',
  'buck_callahan',
  'commissioner',
];

export function normalizeReporterId(id) {
  if (!id) return '';
  const clean = id.trim().toLowerCase();
  if (clean === 'marty' || clean === 'marty_sullivan') return 'marty_sullivan';
  if (clean === 'chloe' || clean === 'chloe_carmichael') return 'chloe_carmichael';
  if (clean === 'marcus' || clean === 'marcus_vance') return 'marcus_vance';
  if (clean === 'buck' || clean === 'buck_callahan') return 'buck_callahan';
  if (clean === 'commissioner' || clean === 'the-commissioner') return 'commissioner';
  return clean;
}

/**
 * Fetch all reporter schedules and attach each reporter's most recent published article
 */
export async function getReporterSchedules() {
  try {
    const [{ data: dbSchedules, error: schedError }, { data: articles, error: artError }] = await Promise.all([
      supabase.from('reporter_schedules').select('*'),
      supabase
        .from('newsroom_articles')
        .select('id, title, slug, author_id, created_at')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    if (schedError) {
      console.warn('Could not fetch reporter_schedules from DB, falling back to defaults:', schedError.message);
    }

    const schedMap = {};
    (dbSchedules || []).forEach((s) => {
      schedMap[s.reporter_id] = s;
    });

    // Map latest article for each author
    const latestArticles = {};
    (articles || []).forEach((a) => {
      const normalizedAuthor = normalizeReporterId(a.author_id);
      if (!latestArticles[normalizedAuthor]) {
        latestArticles[normalizedAuthor] = a;
      }
    });

    // Build unified list preserving logical order
    return REPORTER_ORDER.map((rid) => {
      const defaultInfo = DEFAULT_SCHEDULES.find((d) => d.reporter_id === rid) || {};
      const dbInfo = schedMap[rid] || {};
      const latestArticle = latestArticles[rid] || null;

      return {
        ...defaultInfo,
        ...dbInfo,
        latest_article: latestArticle,
      };
    });
  } catch (err) {
    console.error('getReporterSchedules error:', err);
    return DEFAULT_SCHEDULES;
  }
}

/**
 * Fetch a single reporter's schedule
 */
export async function getReporterScheduleById(reporterId) {
  const normId = normalizeReporterId(reporterId);
  try {
    const { data, error } = await supabase
      .from('reporter_schedules')
      .select('*')
      .eq('reporter_id', normId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn(`Error getting schedule for ${normId}:`, err.message);
  }

  return DEFAULT_SCHEDULES.find((d) => d.reporter_id === normId) || null;
}

/**
 * Update a reporter's publishing schedule
 */
export async function updateReporterSchedule(reporterId, updates, updatedBy = 'Commissioner Eric Vaughan') {
  const normId = normalizeReporterId(reporterId);
  const defaultInfo = DEFAULT_SCHEDULES.find((d) => d.reporter_id === normId);

  if (!defaultInfo) {
    throw new Error(`Invalid reporter ID: ${reporterId}`);
  }

  const { day_of_week, time_of_day, enabled } = updates;

  const payload = {
    reporter_id: normId,
    reporter_name: defaultInfo.reporter_name,
    column_name: defaultInfo.column_name,
    desk: defaultInfo.desk,
    category: defaultInfo.category,
    description: defaultInfo.description,
    day_of_week: day_of_week || defaultInfo.day_of_week,
    time_of_day: time_of_day || defaultInfo.time_of_day,
    timezone: 'America/Los_Angeles',
    enabled: typeof enabled === 'boolean' ? enabled : defaultInfo.enabled,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  const { data, error } = await supabase
    .from('reporter_schedules')
    .upsert(payload, { onConflict: 'reporter_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

