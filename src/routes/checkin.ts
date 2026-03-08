import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { selectMessage as selectPoolMessage } from '../config/messagePools';
import { maybeGetInsight } from '../config/insightLines';
import { computePatterns } from '../lib/patternEngine';
import { generateOutcomeMessage } from '../lib/personalMessages';
import { getQueues } from '../lib/queue';

const VALID_STATUSES = ['done', 'working', 'not_started', 'switched'];

function deriveOverallStatus(statuses: string[]): string {
  const filtered = statuses.filter(s => s != null);
  if (filtered.length === 0) return 'not_started';
  if (filtered.every(s => s === 'done')) return 'done';
  if (filtered.some(s => s === 'done')) return 'partial';
  if (filtered.some(s => s === 'working')) return 'working';
  return 'not_started';
}

export default async function checkinRoutes(fastify: FastifyInstance) {
  // POST /checkin — User responds to check-in
  fastify.post('/checkin', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const body = request.body as {
      taskId: string;
      status?: 'done' | 'working' | 'not_started' | 'switched';
      statuses?: {
        task1?: string;
        task2?: string;
        task3?: string;
      };
      executionRating?: string;
    };

    const { taskId } = body;

    if (!taskId) {
      return reply.status(400).send({ error: 'taskId is required' });
    }

    // Determine update fields based on old vs new format
    let updateFields: Record<string, any> = {
      checkin_responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    let overallStatus: string;

    if (body.statuses) {
      // New format: per-task statuses
      const { task1, task2, task3 } = body.statuses;

      // Validate each provided status
      const entries = [
        ['task1', task1],
        ['task2', task2],
        ['task3', task3],
      ] as const;

      for (const [key, val] of entries) {
        if (val != null && !VALID_STATUSES.includes(val)) {
          return reply.status(400).send({
            error: `statuses.${key} must be one of: ${VALID_STATUSES.join(', ')}`,
          });
        }
      }

      if (task1 != null) updateFields.status = task1;
      if (task2 != null) updateFields.task_2_status = task2;
      if (task3 != null) updateFields.task_3_status = task3;

      // Derive overall status from all provided statuses
      const allStatuses = [task1, task2, task3].filter((s): s is string => s != null);
      overallStatus = deriveOverallStatus(allStatuses);
      updateFields.status = overallStatus;
    } else if (body.status) {
      // Old format: single status
      if (!VALID_STATUSES.includes(body.status)) {
        return reply.status(400).send({
          error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      updateFields.status = body.status;
      overallStatus = body.status;
    } else {
      return reply.status(400).send({ error: 'status or statuses is required' });
    }

    // Save execution rating if provided (strategic_planner feature)
    const VALID_RATINGS = ['mostly_executing', 'mixed', 'mostly_planning'];
    if (body.executionRating && VALID_RATINGS.includes(body.executionRating)) {
      updateFields.execution_rating = body.executionRating;
    }

    // Record completion timestamp when task is done
    if (overallStatus === 'done') {
      updateFields.task_completed_at = new Date().toISOString();
    }

    // Update task
    const { data: task, error } = await supabaseAdmin
      .from('companion_daily_tasks')
      .update(updateFields)
      .eq('id', taskId)
      .eq('user_id', userId) // Security: ensure user owns the task
      .select()
      .single();

    if (error || !task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Update analytics (RPC may not exist yet — catch and log)
    await supabaseAdmin.rpc('companion_record_outcome', {
      p_task_id: taskId,
      p_status: overallStatus,
    }).then(
      () => console.log(`[CHECKIN] Analytics updated for user ${userId}`),
      (err: any) => console.error('[CHECKIN] Analytics update failed (RPC may not exist yet):', err.message)
    );

    // Select outcome response message
    const { data: quiz } = await supabaseAdmin
      .from('quiz_results')
      .select('archetype')
      .eq('user_id', userId)
      .single();

    const archetype = quiz?.archetype || 'universal';
    const messageStatus = overallStatus === 'partial' ? 'done' : overallStatus;

    // Compute patterns and try personal message first
    const patterns = await computePatterns(supabaseAdmin, userId);
    const personalMessage = generateOutcomeMessage(patterns, archetype, messageStatus, task.task_text || '');
    const responseText = personalMessage || selectPoolMessage('checkin_outcome', archetype, messageStatus);
    const insight = maybeGetInsight(archetype, `post_${messageStatus}`, patterns.daysActive);

    // Cancel mid-day encouragement (user has checked in)
    try {
      const queues = getQueues();
      const midDayJobId = `midday-${taskId}`;
      const existingMidDay = await queues.midDayEncouragement.getJob(midDayJobId);
      if (existingMidDay) await existingMidDay.remove();
    } catch (midDayErr) {
      console.error('[CHECKIN] Failed to remove mid-day job:', midDayErr);
    }

    // Schedule or remove follow-up job
    try {
      const queues = getQueues();
      const followupJobId = `followup-${taskId}`;

      if (overallStatus === 'working' || overallStatus === 'not_started') {
        // Schedule follow-up in 90 minutes
        const existing = await queues.followupCheckin.getJob(followupJobId);
        if (existing) await existing.remove();

        await queues.followupCheckin.add(
          followupJobId,
          {
            userId,
            taskId,
            originalStatus: overallStatus,
            taskText: task.task_text,
          },
          {
            delay: 90 * 60 * 1000, // 90 minutes
            jobId: followupJobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
          }
        );
        console.log(`[CHECKIN] Follow-up scheduled for user ${userId} in 90min`);
      } else {
        // Remove any existing follow-up for done/switched
        const existing = await queues.followupCheckin.getJob(followupJobId);
        if (existing) await existing.remove();
      }
    } catch (queueErr) {
      console.error('[CHECKIN] Failed to manage follow-up job:', queueErr);
    }

    return reply.send({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        taskText: task.task_text,
        task2Status: task.task_2_status || null,
        task3Status: task.task_3_status || null,
      },
      response: {
        text: responseText,
      },
      insight,
      patterns: {
        completionRate: patterns.completionRate,
        currentStreak: patterns.currentStreak,
        totalCompleted: patterns.totalTasksCompleted,
        trend: patterns.completionTrend,
      },
    });
  });
}
