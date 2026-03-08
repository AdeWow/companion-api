import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getArchetypeConfig } from '../config/archetypeConfig';
import { maybeGetInsight } from '../config/insightLines';
import { computePatterns } from '../lib/patternEngine';
import { generateMorningContext } from '../lib/personalMessages';

export default async function dailyRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/daily',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;

      // 1. Fetch user settings (needed for timezone)
      const settingsResult = await supabaseAdmin
        .from('companion_user_settings')
        .select('morning_time, evening_time, timezone, directiveness')
        .eq('user_id', userId)
        .single();

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        fastify.log.error({ error: settingsResult.error }, '[DAILY] Failed to fetch user settings');
        return reply.code(500).send({ error: 'Failed to fetch user settings' });
      }

      if (!settingsResult.data) {
        return reply.code(404).send({ error: 'User settings not found' });
      }

      const settings = settingsResult.data;
      const tz = settings.timezone || 'America/New_York';
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz });
      const today = formatter.format(now);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatter.format(yesterday);

      // 2. Fetch archetype + today's task + yesterday's task + last activity in parallel
      const [archetypeResult, taskResult, yesterdayResult, lastActivityResult] = await Promise.all([
        supabaseAdmin
          .from('quiz_results')
          .select('archetype')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single(),
        supabaseAdmin
          .from('companion_daily_tasks')
          .select('id, task_text, task_date, status, morning_sent_at, checkin_sent_at, checkin_responded_at, energy_level, is_rest_day, context_mode, task_2_text, task_2_status, task_3_text, task_3_status, followup_sent_at, followup_status, followup_responded_at, evening_sent_at, evening_response, execution_rating, task_category, shipping_intensity, task_set_at, task_completed_at, created_at')
          .eq('user_id', userId)
          .eq('task_date', today)
          .single(),
        supabaseAdmin
          .from('companion_daily_tasks')
          .select('task_text, status, task_2_text, task_2_status, task_3_text, task_3_status')
          .eq('user_id', userId)
          .eq('task_date', yesterdayStr)
          .single(),
        supabaseAdmin
          .from('companion_daily_tasks')
          .select('task_date')
          .eq('user_id', userId)
          .order('task_date', { ascending: false })
          .limit(1)
          .single(),
      ]);

      // Build task object — null if no task row exists for today
      let task = null;
      let morningSent = false;

      if (taskResult.data) {
        const t = taskResult.data;
        morningSent = !!t.morning_sent_at;
        task = {
          id: t.id,
          taskText: t.task_text || '',
          taskDate: t.task_date,
          status: t.status,
          morningSentAt: t.morning_sent_at || null,
          checkinSentAt: t.checkin_sent_at || null,
          checkinRespondedAt: t.checkin_responded_at || null,
          energyLevel: t.energy_level || null,
          isRestDay: t.is_rest_day || false,
          task2Text: t.task_2_text || null,
          task2Status: t.task_2_status || null,
          task3Text: t.task_3_text || null,
          task3Status: t.task_3_status || null,
          contextMode: t.context_mode || null,
          followupSentAt: t.followup_sent_at || null,
          followupStatus: t.followup_status || null,
          followupRespondedAt: t.followup_responded_at || null,
          eveningSentAt: t.evening_sent_at || null,
          eveningResponse: t.evening_response || null,
          executionRating: t.execution_rating || null,
          taskCategory: t.task_category || null,
          shippingIntensity: t.shipping_intensity || null,
          taskSetAt: t.task_set_at || null,
          taskCompletedAt: t.task_completed_at || null,
        };
      }

      // Build carry-forward array from yesterday's unfinished tasks
      const carryForward: string[] = [];
      const yt = yesterdayResult.data;
      if (yt) {
        if (yt.task_text && !['done', 'rest'].includes(yt.status)) {
          carryForward.push(yt.task_text);
        }
        if (yt.task_2_text && yt.task_2_status !== 'done') {
          carryForward.push(yt.task_2_text);
        }
        if (yt.task_3_text && yt.task_3_status !== 'done') {
          carryForward.push(yt.task_3_text);
        }
      }

      // Calculate days since last activity
      let daysSinceLastActivity: number | null = null;
      if (lastActivityResult.data?.task_date) {
        const lastDate = new Date(lastActivityResult.data.task_date + 'T00:00:00');
        const todayDate = new Date(today + 'T00:00:00');
        const diffMs = todayDate.getTime() - lastDate.getTime();
        daysSinceLastActivity = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      // Detect if today is a weekend
      const dayOfWeek = new Date().toLocaleDateString('en-US', {
        timeZone: tz,
        weekday: 'long',
      });
      const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';

      // Calculate Monday of current week in user's timezone
      const todayDate = new Date(today + 'T00:00:00');
      const todayDow = todayDate.getDay(); // 0 = Sunday
      const mondayOffset = (todayDow + 6) % 7;
      const mondayDate = new Date(todayDate);
      mondayDate.setDate(mondayDate.getDate() - mondayOffset);
      const weekStart = mondayDate.toISOString().split('T')[0];

      const { data: weekTasks } = await supabaseAdmin
        .from('companion_daily_tasks')
        .select('status, is_rest_day, task_date')
        .eq('user_id', userId)
        .gte('task_date', weekStart)
        .lte('task_date', today);

      const weekStats = {
        tasksSet: weekTasks?.length || 0,
        completed: weekTasks?.filter(t => t.status === 'done').length || 0,
        restDays: weekTasks?.filter(t => t.is_rest_day).length || 0,
      };

      const archetype = archetypeResult.data?.archetype ?? null;
      const config = getArchetypeConfig(archetype);

      // Select morning prompt when no task exists today (MORNING state)
      let morningPrompt: string | null = null;
      if (!taskResult.data && config.morningPromptPool.length > 0) {
        if (config.rotatePrompts) {
          // Fetch recent prompts to avoid repeats
          try {
            const { data: recentPrompts } = await supabaseAdmin
              .from('companion_prompt_history')
              .select('prompt_text')
              .eq('user_id', userId)
              .order('shown_date', { ascending: false })
              .limit(7);

            const recentTexts = new Set(recentPrompts?.map(r => r.prompt_text) || []);
            const available = config.morningPromptPool.filter(p => !recentTexts.has(p));
            const pool = available.length > 0 ? available : config.morningPromptPool;
            morningPrompt = pool[Math.floor(Math.random() * pool.length)];

            // Track in history
            await supabaseAdmin
              .from('companion_prompt_history')
              .insert({
                user_id: userId,
                prompt_text: morningPrompt,
                shown_date: today,
              })
              .then(
                () => {},
                (err: any) => console.warn('[DAILY] Failed to insert prompt history:', err.message)
              );
          } catch (err: any) {
            // Table may not exist yet — fall back to random
            console.warn('[DAILY] Prompt history query failed (table may not exist):', err.message);
            morningPrompt = config.morningPromptPool[Math.floor(Math.random() * config.morningPromptPool.length)];
          }
        } else {
          // No rotation tracking — just pick randomly
          morningPrompt = config.morningPromptPool[Math.floor(Math.random() * config.morningPromptPool.length)];
        }
      }

      // Compute user patterns, personal morning context, and insight
      const patterns = await computePatterns(supabaseAdmin, userId);
      const morningInsight = archetype ? maybeGetInsight(archetype, 'morning', patterns.daysActive) : null;
      const yesterdayTaskText = yesterdayResult.data?.task_text || null;
      const yesterdayStatus = yesterdayResult.data?.status || null;
      const morningContext = archetype
        ? generateMorningContext(patterns, archetype, yesterdayTaskText, yesterdayStatus)
        : null;

      console.log('[DAILY] archetype:', archetype, 'config:', JSON.stringify({
        maxTasks: config.maxTasks,
        morningStyle: config.morningStyle,
        taskFraming: config.taskFraming,
        taskSizeCheck: config.taskSizeCheck,
        checkinLabels: config.checkinLabels,
        postCompletion: config.postCompletion,
        lowEnergyOptOut: config.lowEnergyOptOut,
        idleAllowsNewTask: config.idleAllowsNewTask,
      }));

      return {
        today: {
          date: today,
          task,
          morningSent,
        },
        daysSinceLastActivity,
        isWeekend,
        morningInsight,
        morningPrompt,
        morningContext,
        weekStats,
        carryForward,
        patterns: {
          completionRate: patterns.completionRate,
          currentStreak: patterns.currentStreak,
          totalCompleted: patterns.totalTasksCompleted,
          daysActive: patterns.daysActive,
          trend: patterns.completionTrend,
          bestDay: patterns.bestDayOfWeek,
          peakSetHour: patterns.peakSetHour ?? null,
          peakDoneHour: patterns.peakDoneHour ?? null,
          uniqueTopicsLast14Days: patterns.uniqueTopicsLast14Days ?? 0,
          staleTopics: patterns.staleTopics ?? [],
        },
        user: {
          archetype,
          morningTime: settings.morning_time,
          eveningTime: settings.evening_time || '20:00:00',
          timezone: settings.timezone,
          config: {
            maxTasks: config.maxTasks,
            morningStyle: config.morningStyle,
            taskFraming: config.taskFraming,
            taskSizeCheck: config.taskSizeCheck,
            checkinLabels: config.checkinLabels,
            postCompletion: config.postCompletion,
            lowEnergyOptOut: config.lowEnergyOptOut,
            idleAllowsNewTask: config.idleAllowsNewTask,
            dailySummaryStyle: config.dailySummaryStyle,
          },
        },
      };
    },
  );
}
