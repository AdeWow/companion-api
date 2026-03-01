import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { selectMessage, renderMessage, logMessage, getRecentMessageIds } from '../lib/messages';

export default async function checkinRoutes(fastify: FastifyInstance) {
  // POST /checkin — User responds to check-in
  fastify.post('/checkin', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const { taskId, status } = request.body as {
      taskId: string;
      status: 'done' | 'working' | 'not_started' | 'switched';
    };

    if (!taskId || !status) {
      return reply.status(400).send({ error: 'taskId and status are required' });
    }

    if (!['done', 'working', 'not_started', 'switched'].includes(status)) {
      return reply.status(400).send({ error: 'status must be done, working, not_started, or switched' });
    }

    // Update task
    const { data: task, error } = await supabaseAdmin
      .from('companion_daily_tasks')
      .update({
        status,
        checkin_responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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
      p_status: status,
    }).then(
      () => console.log(`[CHECKIN] Analytics updated for user ${userId}`),
      (err: any) => console.error('[CHECKIN] Analytics update failed (RPC may not exist yet):', err.message)
    );

    // Select outcome response message
    const touchpoint = `outcome_${status}` as 'outcome_done' | 'outcome_working' | 'outcome_not_started';

    const { data: quiz } = await supabaseAdmin
      .from('quiz_results')
      .select('archetype')
      .eq('user_id', userId)
      .single();

    const archetype = quiz?.archetype || 'universal';

    const { data: settings } = await supabaseAdmin
      .from('companion_user_settings')
      .select('directiveness')
      .eq('user_id', userId)
      .single();

    const directiveness = settings?.directiveness || 'gentle';

    const recentIds = await getRecentMessageIds(userId, touchpoint);
    const template = selectMessage(touchpoint, archetype, directiveness, recentIds);
    const responseText = renderMessage(template, { taskText: task.task_text });
    await logMessage(userId, template.id, touchpoint);

    return reply.send({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        taskText: task.task_text,
      },
      response: {
        text: responseText,
        messageId: template.id,
      },
    });
  });
}
