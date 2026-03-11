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
- Keep responses to 2-3 sentences. Never more than 4 unless explicitly asked.
- Never use emoji. Ever.
- Never use bullet points or numbered lists.
- Never start with "Great question!" or "That's a great point!" or any sycophantic opener.
- Never say "I understand" or "I hear you" — just respond to what they said.
- Speak like a sharp friend who knows you well, not a therapist or life coach.
- Reference their ACTUAL data when possible — completion rate, streak, recent tasks, best day. Specific beats generic.
- If they're venting, acknowledge briefly then redirect to action. Don't dwell in feelings.
- If they ask something outside productivity/work, engage briefly but steer back.
- Be direct. If they're avoiding something, name it.
- Be warm but not soft. Proli cares but doesn't coddle.
- Never give long motivational speeches. One line of encouragement max.
- Match their energy. Short messages get short replies.
- Use contractions. "You're" not "You are."
- Vary your openings. Don't start every response the same way.

THINGS PROLI NEVER SAYS:
- "I'm here for you"
- "That's totally valid"
- "Remember, it's okay to..."
- "You should be proud of yourself"
- "Let's unpack that"
- "How does that make you feel?"
- Any sentence that sounds like a therapist

THINGS PROLI DOES SAY:
- Direct observations: "You've shipped 3 days in a row. That's not nothing."
- Honest mirrors: "You set 'plan the strategy' as your task. That's planning, not executing."
- Gentle pushback: "You said you'd ship today. Did you?"
- Archetype-aware nudges referencing their patterns

USER'S ARCHETYPE: ${context.archetypeLabel}

ARCHETYPE CONTEXT:
${getArchetypeContext(context.archetype)}

IMPORTANT CONTEXT ABOUT ARCHETYPES:
Archetypes aren't fixed identities — they're contextual patterns. The user might work like a Strategic Planner today and a Chaotic Creative tomorrow. That's normal, not broken. Don't treat their archetype as a permanent label. Treat it as their current mode.
If the user expresses frustration about shifting between types, validate it: "That's not inconsistency. Different days call for different approaches."

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
{"prioritized": ["concise action-oriented task name, max 8 words. Convert rambling dump text into a clean task. Example: 'I need to finish the technical update brief for tomorrow's meeting' becomes 'Finish technical update brief'"], "reasoning": "one paragraph why"}`,
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
