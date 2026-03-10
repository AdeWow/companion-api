import { SupabaseClient } from '@supabase/supabase-js';

export interface UserPatterns {
  // Completion patterns
  completionRate: number;           // 0-100
  completionTrend: 'improving' | 'steady' | 'declining' | 'new';
  totalTasksCompleted: number;
  currentStreak: number;
  longestStreak: number;

  // Time patterns
  bestDayOfWeek: string | null;     // "Tuesday"
  worstDayOfWeek: string | null;    // "Monday"
  averageCompletionCount: number;   // tasks per day

  // Topic patterns
  repeatedTopics: string[];          // words that appear 3+ times in task text
  currentFocus: string | null;       // most common recent topic (last 7 days)

  // Behavioral patterns
  restDayCount: number;              // total rest days taken
  switchCount: number;               // times they switched tasks (Novelty Seeker)
  followThroughAfterWorking: number; // % of "working" that eventually became "done"

  // Streak context
  daysActive: number;                // total days with any task
  daysSinceFirstTask: number;

  // Execution vs planning (Strategic Planner feature)
  executionDays: number;             // days rated 'mostly_executing'
  planningDays: number;              // days rated 'mostly_planning'
  mixedDays: number;                 // days rated 'mixed'

  // Category split
  personalTasks: number;
  professionalTasks: number;
  sideProjectTasks: number;

  // Intensity split
  lightDays: number;
  mediumDays: number;
  heavyDays: number;

  // Peak hours (Chaotic Creative feature)
  peakSetHour: number | null;        // most common hour tasks are set
  peakDoneHour: number | null;       // most common hour tasks are completed

  // Project rotation (Novelty Seeker feature)
  uniqueTopicsLast14Days: number;
  staleTopics: Array<{ keyword: string; taskText: string; lastDate: string }>;  // topics not touched in 7+ days

  // User context
  timezone: string;
}

export async function computePatterns(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPatterns> {

  // Fetch user's timezone
  const { data: userSettings } = await supabase
    .from('companion_user_settings')
    .select('timezone')
    .eq('user_id', userId)
    .single();
  const timezone = userSettings?.timezone || 'America/New_York';

  // Fetch all tasks for this user (last 90 days max for performance)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().split('T')[0];

  const { data: tasks } = await supabase
    .from('companion_daily_tasks')
    .select('task_date, task_text, status, task_2_text, task_2_status, task_3_text, task_3_status, is_rest_day, energy_level, followup_status, execution_rating, task_category, shipping_intensity, task_set_at, task_completed_at')
    .eq('user_id', userId)
    .gte('task_date', cutoff)
    .order('task_date', { ascending: false });

  if (!tasks || tasks.length === 0) {
    return {
      completionRate: 0, completionTrend: 'new', totalTasksCompleted: 0,
      currentStreak: 0, longestStreak: 0, bestDayOfWeek: null,
      worstDayOfWeek: null, averageCompletionCount: 0, repeatedTopics: [],
      currentFocus: null, restDayCount: 0, switchCount: 0,
      followThroughAfterWorking: 0, daysActive: 0, daysSinceFirstTask: 0,
      executionDays: 0, planningDays: 0, mixedDays: 0,
      personalTasks: 0, professionalTasks: 0, sideProjectTasks: 0,
      lightDays: 0, mediumDays: 0, heavyDays: 0,
      peakSetHour: null, peakDoneHour: null,
      uniqueTopicsLast14Days: 0, staleTopics: [],
      timezone,
    };
  }

  // Completion rate
  const nonRestTasks = tasks.filter(t => !t.is_rest_day);
  const doneTasks = nonRestTasks.filter(t => t.status === 'done' || t.status === 'partial');
  const completionRate = nonRestTasks.length > 0
    ? Math.round((doneTasks.length / nonRestTasks.length) * 100)
    : 0;

  // Total completed (count individual tasks, not just days)
  let totalCompleted = 0;
  for (const t of tasks) {
    if (t.status === 'done') totalCompleted++;
    if (t.task_2_status === 'done') totalCompleted++;
    if (t.task_3_status === 'done') totalCompleted++;
  }

  // Completion trend (last 2 weeks vs 2 weeks before that)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const twoWeekStr = twoWeeksAgo.toISOString().split('T')[0];
  const fourWeekStr = fourWeeksAgo.toISOString().split('T')[0];

  const recentTasks = nonRestTasks.filter(t => t.task_date >= twoWeekStr);
  const olderTasks = nonRestTasks.filter(t => t.task_date >= fourWeekStr && t.task_date < twoWeekStr);

  let completionTrend: 'improving' | 'steady' | 'declining' | 'new' = 'new';
  if (olderTasks.length >= 3 && recentTasks.length >= 3) {
    const recentRate = recentTasks.filter(t => t.status === 'done').length / recentTasks.length;
    const olderRate = olderTasks.filter(t => t.status === 'done').length / olderTasks.length;
    if (recentRate > olderRate + 0.1) completionTrend = 'improving';
    else if (recentRate < olderRate - 0.1) completionTrend = 'declining';
    else completionTrend = 'steady';
  }

  // Current streak
  let currentStreak = 0;
  const sortedByDate = [...tasks].sort((a, b) => b.task_date.localeCompare(a.task_date));
  for (const t of sortedByDate) {
    if (t.status === 'done' || t.status === 'partial') currentStreak++;
    else break;
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const chronological = [...tasks].sort((a, b) => a.task_date.localeCompare(b.task_date));
  for (const t of chronological) {
    if (t.status === 'done' || t.status === 'partial') {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Best/worst day of week (timezone-aware)
  const dayCompletions: Record<string, { done: number; total: number }> = {};
  for (const t of nonRestTasks) {
    const day = new Date(t.task_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone });
    if (!dayCompletions[day]) dayCompletions[day] = { done: 0, total: 0 };
    dayCompletions[day].total++;
    if (t.status === 'done') dayCompletions[day].done++;
  }

  let bestDay: string | null = null;
  let worstDay: string | null = null;
  let bestRate = 0;
  let worstRate = 1;
  for (const [day, stats] of Object.entries(dayCompletions)) {
    if (stats.total < 2) continue; // need at least 2 data points
    const rate = stats.done / stats.total;
    if (rate > bestRate) { bestRate = rate; bestDay = day; }
    if (rate < worstRate) { worstRate = rate; worstDay = day; }
  }

  // Topic analysis — extract common words from task text
  const allTaskTexts = tasks
    .map(t => [t.task_text, t.task_2_text, t.task_3_text])
    .flat()
    .filter(Boolean)
    .map((t: string) => t.toLowerCase());

  const stopWords = new Set(['the', 'a', 'an', 'to', 'for', 'and', 'or', 'on', 'in', 'my', 'of', 'up', 'with', 'it', 'is', 'do', 'get', 'set', 'go', 'make', 'start', 'finish', 'work', 'task']);
  const wordCounts: Record<string, number> = {};
  for (const text of allTaskTexts) {
    const words = text.split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  const repeatedTopics = Object.entries(wordCounts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // Current focus — most common word in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTexts = tasks
    .filter(t => t.task_date >= sevenDaysAgo.toISOString().split('T')[0])
    .map(t => [t.task_text, t.task_2_text, t.task_3_text])
    .flat()
    .filter(Boolean)
    .map((t: string) => t.toLowerCase());

  const recentWordCounts: Record<string, number> = {};
  for (const text of recentTexts) {
    const words = text.split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      recentWordCounts[word] = (recentWordCounts[word] || 0) + 1;
    }
  }
  const currentFocus = Object.entries(recentWordCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Rest days, switches, follow-through
  const restDayCount = tasks.filter(t => t.is_rest_day).length;
  const switchCount = tasks.filter(t => t.status === 'switched').length;

  const workingTasks = tasks.filter(t => t.status === 'working' || t.followup_status === 'done');
  const workingThatFinished = tasks.filter(t => t.followup_status === 'done');
  const followThroughAfterWorking = workingTasks.length > 0
    ? Math.round((workingThatFinished.length / workingTasks.length) * 100)
    : 0;

  // Execution vs planning counts (Strategic Planner feature)
  let executionDays = 0;
  let planningDays = 0;
  let mixedDays = 0;
  for (const t of tasks) {
    if ((t as any).execution_rating === 'mostly_executing') executionDays++;
    else if ((t as any).execution_rating === 'mostly_planning') planningDays++;
    else if ((t as any).execution_rating === 'mixed') mixedDays++;
  }

  // Category split
  let personalTasks = 0;
  let professionalTasks = 0;
  let sideProjectTasks = 0;
  for (const t of tasks) {
    if ((t as any).task_category === 'personal') personalTasks++;
    else if ((t as any).task_category === 'professional') professionalTasks++;
    else if ((t as any).task_category === 'side_project') sideProjectTasks++;
  }

  // Intensity split
  let lightDays = 0;
  let mediumDays = 0;
  let heavyDays = 0;
  for (const t of tasks) {
    if ((t as any).shipping_intensity === 'light') lightDays++;
    else if ((t as any).shipping_intensity === 'medium') mediumDays++;
    else if ((t as any).shipping_intensity === 'heavy') heavyDays++;
  }

  // Peak hours — find the most common hour for setting and completing tasks
  function findModeHour(timestamps: string[]): number | null {
    if (timestamps.length === 0) return null;
    const hourCounts: Record<number, number> = {};
    for (const ts of timestamps) {
      const hour = new Date(ts).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    let maxCount = 0;
    let modeHour: number | null = null;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxCount) {
        maxCount = count;
        modeHour = parseInt(hour);
      }
    }
    return modeHour;
  }

  const setTimestamps = tasks
    .map(t => (t as any).task_set_at)
    .filter(Boolean) as string[];
  const doneTimestamps = tasks
    .map(t => (t as any).task_completed_at)
    .filter(Boolean) as string[];

  const peakSetHour = findModeHour(setTimestamps);
  const peakDoneHour = findModeHour(doneTimestamps);

  // Unique topics in last 14 days (Novelty Seeker feature)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDayStr = fourteenDaysAgo.toISOString().split('T')[0];

  const last14DayTexts = tasks
    .filter(t => t.task_date >= fourteenDayStr)
    .map(t => [t.task_text, t.task_2_text, t.task_3_text])
    .flat()
    .filter(Boolean)
    .map((t: string) => t.toLowerCase());

  const last14DayWords = new Set<string>();
  for (const text of last14DayTexts) {
    const words = text.split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
    for (const word of words) last14DayWords.add(word);
  }
  const uniqueTopicsLast14Days = last14DayWords.size;

  // Stale topics — keywords that appeared 7+ days ago but not in the last 7 days
  // For each stale keyword, find the most recent task text containing it
  const sevenDayStr = sevenDaysAgo.toISOString().split('T')[0];
  const olderTaskRows = tasks.filter(t => t.task_date < sevenDayStr);

  const olderWords = new Set<string>();
  for (const t of olderTaskRows) {
    const texts = [t.task_text, t.task_2_text, t.task_3_text].filter(Boolean);
    for (const text of texts) {
      const words = (text as string).toLowerCase().split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
      for (const word of words) olderWords.add(word);
    }
  }

  const recentWordsSet = new Set(Object.keys(recentWordCounts));
  const staleKeywords = [...olderWords]
    .filter(w => !recentWordsSet.has(w));

  // For each stale keyword, find the most recent task containing it (olderTaskRows sorted desc by date)
  const staleTopics: Array<{ keyword: string; taskText: string; lastDate: string }> = [];
  const seen = new Set<string>();
  for (const keyword of staleKeywords) {
    if (staleTopics.length >= 5) break;
    for (const t of olderTaskRows) {
      const texts = [t.task_text, t.task_2_text, t.task_3_text].filter(Boolean) as string[];
      const match = texts.find(text => text.toLowerCase().includes(keyword));
      if (match && !seen.has(match)) {
        seen.add(match);
        staleTopics.push({ keyword, taskText: match, lastDate: t.task_date });
        break;
      }
    }
  }

  const daysActive = tasks.length;
  const firstTask = chronological[0];
  const daysSinceFirstTask = firstTask
    ? Math.floor((Date.now() - new Date(firstTask.task_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    completionRate, completionTrend, totalTasksCompleted: totalCompleted,
    currentStreak, longestStreak, bestDayOfWeek: bestDay,
    worstDayOfWeek: worstDay, averageCompletionCount: nonRestTasks.length > 0 ? totalCompleted / nonRestTasks.length : 0,
    repeatedTopics, currentFocus, restDayCount, switchCount,
    followThroughAfterWorking, daysActive, daysSinceFirstTask,
    executionDays, planningDays, mixedDays,
    personalTasks, professionalTasks, sideProjectTasks,
    lightDays, mediumDays, heavyDays,
    peakSetHour, peakDoneHour,
    uniqueTopicsLast14Days, staleTopics,
    timezone,
  };
}
