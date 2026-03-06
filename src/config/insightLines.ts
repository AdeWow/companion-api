export interface InsightLine {
  archetype: string;
  touchpoint: 'morning' | 'post_done' | 'post_working' | 'post_not_started' | 'evening' | 'idle';
  text: string;
}

export const INSIGHT_LINES: InsightLine[] = [
  // === STRUCTURED ACHIEVER ===
  { archetype: 'structured_achiever', touchpoint: 'morning', text: 'Your brain rewards completion. Multiple small wins beat one big maybe.' },
  { archetype: 'structured_achiever', touchpoint: 'morning', text: 'Checklists aren\'t boring for you — they\'re fuel. Use that.' },
  { archetype: 'structured_achiever', touchpoint: 'post_done', text: 'Completion momentum is real for your type. Each finish makes the next one easier.' },
  { archetype: 'structured_achiever', touchpoint: 'post_done', text: 'You thrive on visible progress. That checkmark isn\'t vanity — it\'s how you stay in motion.' },
  { archetype: 'structured_achiever', touchpoint: 'post_working', text: 'Unfinished items sit heavy for you. That discomfort is your drive — use it, don\'t fight it.' },
  { archetype: 'structured_achiever', touchpoint: 'post_not_started', text: 'A day without progress feels wrong to you. But rest days make the productive ones sharper.' },
  { archetype: 'structured_achiever', touchpoint: 'idle', text: 'You process satisfaction through completion counts. That\'s not shallow — it\'s your wiring.' },
  { archetype: 'structured_achiever', touchpoint: 'evening', text: 'Review isn\'t optional for you. Your brain needs to close the loop to feel settled.' },

  // === ANXIOUS PERFECTIONIST ===
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'Starting is the hardest part for your type. The task doesn\'t have to be perfect — it has to be touched.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'Big tasks trigger your freeze response. Breaking them down isn\'t weakness — it\'s strategy.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'Your perfectionism is a protection mechanism. Small scope disarms it.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_done', text: 'You finished something. Your brain will say it wasn\'t enough. It was.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_done', text: 'Progress over perfection. You moved something forward today — that\'s the win.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_working', text: 'Still going doesn\'t mean failing. Your pace is valid.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_not_started', text: 'Not starting today isn\'t a verdict on you. Anxiety won this round — tomorrow you try again.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'idle', text: 'Permission to stop is hard for you. This is practice.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'evening', text: 'Reflection can spiral for your type. One answer, then let the day go.' },

  // === CHAOTIC CREATIVE ===
  { archetype: 'chaotic_creative', touchpoint: 'morning', text: 'Your energy is nonlinear. The best work happens when you stop forcing a schedule.' },
  { archetype: 'chaotic_creative', touchpoint: 'morning', text: 'Rigid structure kills your spark. Loose frameworks channel it.' },
  { archetype: 'chaotic_creative', touchpoint: 'morning', text: 'You don\'t procrastinate — you incubate. The idea isn\'t ready until the energy hits.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_done', text: 'You rode the wave all the way in. That\'s your superpower — bursts of intense execution.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_done', text: 'Finishing is harder than starting for you. This one actually landed.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_working', text: 'Deep in it is where you do your best work. Don\'t let anyone rush you out.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_not_started', text: 'Low energy days aren\'t wasted — your brain is processing in the background.' },
  { archetype: 'chaotic_creative', touchpoint: 'idle', text: 'Your next burst will come. Rest isn\'t the opposite of creative — it\'s the precondition.' },

  // === NOVELTY SEEKER ===
  { archetype: 'novelty_seeker', touchpoint: 'morning', text: 'Variety isn\'t distraction for you — it\'s how you sustain interest. Two projects > one boring one.' },
  { archetype: 'novelty_seeker', touchpoint: 'morning', text: 'Your brain craves new input. Rotating between tasks keeps each one fresh.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_done', text: 'You finished before the novelty wore off. That\'s timing, not luck.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_done', text: 'Completion and curiosity aren\'t opposites. You just proved it.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_working', text: 'Sticking with something past the exciting phase is your growth edge. You\'re in it.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_not_started', text: 'The pull toward something new is strong. Recognizing it is the first step.' },
  { archetype: 'novelty_seeker', touchpoint: 'idle', text: 'Your abandoned projects aren\'t failures — they\'re experiments. But finishing a few changes everything.' },

  // === STRATEGIC PLANNER ===
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'Your instinct is to plan before doing. Today, try doing before planning.' },
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'Planning feels productive but isn\'t — until something ships. Ship first, optimize later.' },
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'You see the whole system. But the system doesn\'t move until one piece does.' },
  { archetype: 'strategic_planner', touchpoint: 'post_done', text: 'You shipped. Not planned, not researched — shipped. That\'s the hardest thing for your type.' },
  { archetype: 'strategic_planner', touchpoint: 'post_done', text: 'Execution over optimization. You just did the thing your archetype struggles with most.' },
  { archetype: 'strategic_planner', touchpoint: 'post_working', text: 'Check: are you executing or refining the plan? If it\'s the plan, stop and ship what you have.' },
  { archetype: 'strategic_planner', touchpoint: 'post_not_started', text: 'Did you not start, or did you plan instead of starting? Be honest with yourself.' },
  { archetype: 'strategic_planner', touchpoint: 'idle', text: 'The gap between your plans and your output is your biggest growth area.' },

  // === FLEXIBLE IMPROVISER ===
  { archetype: 'flexible_improviser', touchpoint: 'morning', text: 'Your energy drives your output. Checking in with your body isn\'t soft — it\'s strategic.' },
  { archetype: 'flexible_improviser', touchpoint: 'morning', text: 'Low energy days aren\'t failures. They\'re data. Adjust, don\'t push through.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_done', text: 'You matched your energy to your task. That\'s a skill most people never learn.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_done', text: 'When the energy is right, you\'re unstoppable. You just proved it.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_working', text: 'Steady progress on a medium day is worth more than a burned-out sprint.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_not_started', text: 'You listened to your body. That\'s not laziness — that\'s self-awareness.' },
  { archetype: 'flexible_improviser', touchpoint: 'idle', text: 'Consistency for you doesn\'t mean same output every day. It means showing up to check in.' },

  // === ADAPTIVE GENERALIST ===
  { archetype: 'adaptive_generalist', touchpoint: 'morning', text: 'Your strength is reading the day. Trust that instinct — pick the right mode.' },
  { archetype: 'adaptive_generalist', touchpoint: 'morning', text: 'Most people have one gear. You have four. The skill is knowing which to use.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_done', text: 'Right mode, right task. Your versatility is a genuine advantage.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_done', text: 'You adapted and delivered. That\'s harder than it looks.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_working', text: 'Sometimes generalists spread too thin. Focus beats flexibility today.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_not_started', text: 'Having options can paralyze. Tomorrow, pick one mode and commit.' },
  { archetype: 'adaptive_generalist', touchpoint: 'idle', text: 'You don\'t fit neatly into one box. That\'s not a weakness — it\'s range.' },
];

// Select a random insight for a given archetype and touchpoint
// Returns null 2 out of 3 times (show insights ~33% of sessions)
export function maybeGetInsight(archetype: string, touchpoint: string): string | null {
  // Only show insight ~1 in 3 times
  if (Math.random() > 0.33) return null;

  const candidates = INSIGHT_LINES.filter(
    i => i.archetype === archetype && i.touchpoint === touchpoint
  );
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)].text;
}
