import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIContext {
  archetype: string;
  archetypeLabel: string;
  patterns: {
    completionRate: number;
    currentStreak: number;
    totalCompleted: number;
    bestDay: string | null;
    trend: string;
    daysActive: number;
  };
  recentTasks: Array<{ text: string; status: string; date: string }>;
  currentEnergy?: string;
  currentContext?: string;
  dayOfWeek: string;
  timeOfDay: string;
  isWeekend: boolean;
}

function getArchetypeContext(archetype: string): string {
  const contexts: Record<string, string> = {
    structured_achiever:
      "This person thrives on checklists and completion momentum. Their risk is burnout from never stopping. They need visible progress and clear endpoints. Don't tell them to relax — help them be strategic about what makes the list.",
    anxious_perfectionist:
      "This person freezes when tasks feel too big or imperfect. Their inner critic is loud. They need permission to do things imperfectly. Small scope is their friend. Never pressure them — reduce the size of the ask instead.",
    chaotic_creative:
      "This person works in bursts, not schedules. They resist routine. Their best work happens when energy hits, not when the clock says to. Don't impose structure — offer containers that channel without constraining.",
    novelty_seeker:
      "This person is driven by curiosity. They start many things and finish fewer. The excitement fades around 60-70% completion. They need help pushing through the boring middle, not help starting. Variety sustains them.",
    strategic_planner:
      "This person over-plans and under-executes. Planning feels like progress to them but it's not. They need to be pushed toward shipping, not strategizing. Call out planning disguised as execution.",
    flexible_improviser:
      "This person's output depends on their energy. They read their body well. Low-energy days aren't failures — they're data. Help them match task intensity to energy level, not push through regardless.",
    adaptive_generalist:
      "This person has range — they can operate in multiple modes. Their challenge is choosing which mode to be in, not doing the work itself. Help them commit to a mode rather than analysis-paralyze between options.",
  };
  return contexts[archetype] || contexts['adaptive_generalist'];
}

function buildSystemPrompt(context: AIContext): string {
  return `You are Proli, a productivity companion inside the Prolific Companion app.
You speak in a warm, direct, slightly playful voice. You are NOT a generic AI assistant.
You are a companion who knows this specific person.

CRITICAL RULES:
- Keep responses SHORT. 2-4 sentences max unless asked for more.
- Never use emoji.
- Never use bullet points or numbered lists in conversation.
- Speak like a thoughtful friend, not a coach or therapist.
- Reference their actual data when relevant — don't make generic statements.
- You know their archetype and what it means for how they work.
- Be honest. If they're avoiding something, name it gently.
- Don't be sycophantic. Don't say "great job" for everything.

USER'S ARCHETYPE: ${context.archetypeLabel}

ARCHETYPE CONTEXT:
${getArchetypeContext(context.archetype)}

USER'S PATTERNS:
- Completion rate: ${context.patterns.completionRate}%
- Current streak: ${context.patterns.currentStreak} days
- Total tasks completed: ${context.patterns.totalCompleted}
- Best day: ${context.patterns.bestDay || 'not enough data'}
- Trend: ${context.patterns.trend}
- Days active: ${context.patterns.daysActive}
- Today is ${context.dayOfWeek}${context.isWeekend ? ' (weekend)' : ''}
- Time: ${context.timeOfDay}

RECENT TASKS (last 7 days):
${context.recentTasks.map(t => `- "${t.text}" (${t.status}, ${t.date})`).join('\n')}

${context.currentEnergy ? `Current energy level: ${context.currentEnergy}` : ''}
${context.currentContext ? `Today's mode: ${context.currentContext}` : ''}`;
}

export async function aiPrioritize(
  items: string[],
  context: AIContext
): Promise<{ prioritized: string[]; reasoning: string }> {
  const itemCount = context.patterns.completionRate > 70 ? '1-2' : '1';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: buildSystemPrompt(context),
    messages: [
      {
        role: 'user',
        content: `I just brain-dumped everything on my mind. Help me pick what to focus on today.

Here's my dump:
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Based on what you know about me — my archetype, my patterns, my energy today — which ${itemCount} should I commit to right now? And briefly, why?

Respond with JSON only, no markdown:
{"prioritized": ["item text exactly as written above"], "reasoning": "one paragraph why"}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return parsed;
  } catch {
    return {
      prioritized: [items[0]],
      reasoning:
        "I'd start with the first thing you wrote — it was top of mind for a reason.",
    };
  }
}

export async function aiChat(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: AIContext
): Promise<string> {
  const messages = [
    ...conversationHistory,
    { role: 'user' as const, content: message },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: buildSystemPrompt(context),
    messages,
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
