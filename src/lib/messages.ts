import { supabaseAdmin } from './supabase';

// Inline a minimal message pool for MVP
// In production, this would load from messagePool.json or a database
// For now, hardcode ~3 messages per archetype per touchpoint

interface MessageTemplate {
  id: string;
  touchpoint: 'morning_opening' | 'checkin_notification' | 'outcome_done' | 'outcome_working' | 'outcome_not_started';
  archetype: string; // archetype_id or 'universal'
  directiveness: 'gentle' | 'direct' | 'strict' | 'all';
  text: string;
}

const MESSAGE_POOL: MessageTemplate[] = [
  // === MORNING OPENING — Universal ===
  { id: 'mo-u-1', touchpoint: 'morning_opening', archetype: 'universal', directiveness: 'all', text: "What's the one thing you'll focus on today?" },
  { id: 'mo-u-2', touchpoint: 'morning_opening', archetype: 'universal', directiveness: 'all', text: "New day. One task. What matters most?" },
  { id: 'mo-u-3', touchpoint: 'morning_opening', archetype: 'universal', directiveness: 'all', text: "Before the day takes over — what's your priority?" },

  // === MORNING OPENING — Archetype-specific (gentle) ===
  { id: 'mo-cc-g1', touchpoint: 'morning_opening', archetype: 'chaotic_creative', directiveness: 'gentle', text: "Your brain's probably buzzing already. Pick ONE thread to pull today." },
  { id: 'mo-sa-g1', touchpoint: 'morning_opening', archetype: 'structured_achiever', directiveness: 'gentle', text: "Ready to check something off? What's going on the list today?" },
  { id: 'mo-ap-g1', touchpoint: 'morning_opening', archetype: 'anxious_perfectionist', directiveness: 'gentle', text: "No need to be perfect today. What's one thing worth starting?" },
  { id: 'mo-sp-g1', touchpoint: 'morning_opening', archetype: 'strategic_planner', directiveness: 'gentle', text: "You've got the plan. What's the ONE move today?" },
  { id: 'mo-ns-g1', touchpoint: 'morning_opening', archetype: 'novelty_seeker', directiveness: 'gentle', text: "I know there are ten exciting things calling. Pick the one that moves the needle." },
  { id: 'mo-fi-g1', touchpoint: 'morning_opening', archetype: 'flexible_improviser', directiveness: 'gentle', text: "No rigid plan needed. Just one thing. What feels right today?" },
  { id: 'mo-ag-g1', touchpoint: 'morning_opening', archetype: 'adaptive_generalist', directiveness: 'gentle', text: "Lots of ways to play today. What's the one thing?" },

  // === MORNING OPENING — Archetype-specific (direct) ===
  { id: 'mo-cc-d1', touchpoint: 'morning_opening', archetype: 'chaotic_creative', directiveness: 'direct', text: "Ideas are great. Execution matters more. What are you finishing today?" },
  { id: 'mo-sa-d1', touchpoint: 'morning_opening', archetype: 'structured_achiever', directiveness: 'direct', text: "Time to lock in. What's the task?" },
  { id: 'mo-ap-d1', touchpoint: 'morning_opening', archetype: 'anxious_perfectionist', directiveness: 'direct', text: "Done is better than perfect. What are you shipping today?" },
  { id: 'mo-sp-d1', touchpoint: 'morning_opening', archetype: 'strategic_planner', directiveness: 'direct', text: "Stop planning. Start doing. What's the task?" },
  { id: 'mo-ns-d1', touchpoint: 'morning_opening', archetype: 'novelty_seeker', directiveness: 'direct', text: "One project. One task. Not three. What is it?" },
  { id: 'mo-fi-d1', touchpoint: 'morning_opening', archetype: 'flexible_improviser', directiveness: 'direct', text: "Energy's fresh. Don't waste it deciding. What's the task?" },
  { id: 'mo-ag-d1', touchpoint: 'morning_opening', archetype: 'adaptive_generalist', directiveness: 'direct', text: "Pick your mode for today. What's the one thing?" },

  // === CHECKIN NOTIFICATION — Universal ===
  { id: 'ci-u-1', touchpoint: 'checkin_notification', archetype: 'universal', directiveness: 'all', text: "Checking in — how's [task] going?" },
  { id: 'ci-u-2', touchpoint: 'checkin_notification', archetype: 'universal', directiveness: 'all', text: "Hey — quick check on [task]. How's it looking?" },
  { id: 'ci-u-3', touchpoint: 'checkin_notification', archetype: 'universal', directiveness: 'all', text: "Time for a check-in. Where are you with [task]?" },

  // === OUTCOME RESPONSES — Done ===
  { id: 'od-u-1', touchpoint: 'outcome_done', archetype: 'universal', directiveness: 'all', text: "Done. That's a win. See you tomorrow." },
  { id: 'od-u-2', touchpoint: 'outcome_done', archetype: 'universal', directiveness: 'all', text: "Nice. You said you'd do it, and you did." },

  // === OUTCOME RESPONSES — Working ===
  { id: 'ow-u-1', touchpoint: 'outcome_working', archetype: 'universal', directiveness: 'all', text: "Still at it? Good. Keep going." },
  { id: 'ow-u-2', touchpoint: 'outcome_working', archetype: 'universal', directiveness: 'all', text: "Progress counts. Finish strong." },

  // === OUTCOME RESPONSES — Not Started ===
  { id: 'on-u-1', touchpoint: 'outcome_not_started', archetype: 'universal', directiveness: 'all', text: "No judgment. Tomorrow's a fresh start." },
  { id: 'on-u-2', touchpoint: 'outcome_not_started', archetype: 'universal', directiveness: 'all', text: "It happens. We'll try again tomorrow." },
];

interface MessageContext {
  taskText?: string;
}

export function selectMessage(
  touchpoint: MessageTemplate['touchpoint'],
  archetype: string,
  directiveness: string,
  recentMessageIds: string[] = [],
): MessageTemplate {
  const recentSet = new Set(recentMessageIds);

  // Try archetype-specific first
  let candidates = MESSAGE_POOL.filter(m =>
    m.touchpoint === touchpoint &&
    m.archetype === archetype &&
    (m.directiveness === directiveness || m.directiveness === 'all') &&
    !recentSet.has(m.id)
  );

  // Fall back to universal
  if (candidates.length === 0) {
    candidates = MESSAGE_POOL.filter(m =>
      m.touchpoint === touchpoint &&
      m.archetype === 'universal' &&
      (m.directiveness === directiveness || m.directiveness === 'all') &&
      !recentSet.has(m.id)
    );
  }

  // Last resort: any message for this touchpoint (ignore recency)
  if (candidates.length === 0) {
    candidates = MESSAGE_POOL.filter(m => m.touchpoint === touchpoint);
  }

  // Random from candidates
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function renderMessage(template: MessageTemplate, context: MessageContext): string {
  let text = template.text;
  if (context.taskText) {
    text = text.replace(/\[task\]/g, context.taskText);
  }
  return text;
}

export async function getRecentMessageIds(userId: string, touchpoint: string, limit = 7): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('companion_message_log')
    .select('message_id')
    .eq('user_id', userId)
    .eq('touchpoint', touchpoint)
    .order('sent_at', { ascending: false })
    .limit(limit);

  return data?.map(r => r.message_id) || [];
}

export async function logMessage(userId: string, messageId: string, touchpoint: string): Promise<void> {
  await supabaseAdmin
    .from('companion_message_log')
    .insert({ user_id: userId, message_id: messageId, touchpoint });
}
