export interface InsightLine {
  archetype: string;
  touchpoint: 'morning' | 'post_done' | 'post_working' | 'post_not_started' | 'evening' | 'idle';
  text: string;
}

export const INSIGHT_LINES: InsightLine[] = [
  // === STRATEGIC PLANNER — The core wound: planning feels like progress ===
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'Planning feels productive. It activates the same brain regions as doing. But plans don\'t ship.' },
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'How many plans have you created this year? How many did you execute? That ratio is your growth edge.' },
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'Your instinct is to plan before doing. Today: do before planning.' },
  { archetype: 'strategic_planner', touchpoint: 'morning', text: '90-minute rule: plan for 90 minutes max, then execute with whatever you have. Ready or not.' },
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'The best plan executed today beats the perfect plan executed never.' },
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'Your elaborate planning is sophisticated procrastination. Ship something rough instead.' },
  { archetype: 'strategic_planner', touchpoint: 'morning', text: 'Question for today: is this task execution or disguised planning?' },
  { archetype: 'strategic_planner', touchpoint: 'post_done', text: 'You shipped. Not planned, not researched, not optimized — shipped. That\'s the hardest thing for your type.' },
  { archetype: 'strategic_planner', touchpoint: 'post_done', text: 'Most Strategic Planners have a 5:1 ratio of plans to execution. You just improved yours.' },
  { archetype: 'strategic_planner', touchpoint: 'post_done', text: 'Rough and live beats perfect and planned. Every time.' },
  { archetype: 'strategic_planner', touchpoint: 'post_done', text: 'That feeling of \'it\'s not ready\'? That\'s your planning addiction talking. You shipped anyway.' },
  { archetype: 'strategic_planner', touchpoint: 'post_working', text: 'Check yourself: are you still executing, or have you slipped back into planning mode?' },
  { archetype: 'strategic_planner', touchpoint: 'post_working', text: 'Mid-task replanning is your escape hatch. Stay in execution. Ship what you have.' },
  { archetype: 'strategic_planner', touchpoint: 'post_not_started', text: 'Did you not start, or did you plan instead of starting? Be honest.' },
  { archetype: 'strategic_planner', touchpoint: 'post_not_started', text: 'Strategic Planners average 70-90% planning, 10-30% doing. Which side was today?' },

  // === ANXIOUS PERFECTIONIST — The core wound: fear of imperfection causes paralysis ===
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'Your perfectionism is a protection mechanism. It keeps you from starting because starting means risking failure.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'The task doesn\'t have to be good. It has to be done. Good comes from iteration, not first attempts.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'Big tasks trigger your freeze response. That\'s neurological, not laziness. Small scope disarms it.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'You\'ve started more things than you give yourself credit for. The starts that don\'t feel dramatic still count.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'Permission slip for today: it\'s allowed to be mediocre.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'morning', text: 'Your inner critic will say this task isn\'t enough. It is.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_done', text: 'You finished something your brain said wasn\'t ready. That\'s courage, not recklessness.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_done', text: 'Perfectionism says \'not enough.\' Reality says you moved something forward. Reality wins.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_done', text: 'The gap between what you did and what you imagined doesn\'t matter. What you did is real.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_working', text: 'Still going is not failing. Your brain interprets incomplete as failure. It\'s not.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_working', text: 'The anxiety you feel about unfinished work? That\'s your perfectionism, not reality. You\'re in progress.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_not_started', text: 'Some days the resistance is louder than the will. That\'s not weakness — it\'s a symptom. Tomorrow you try again.' },
  { archetype: 'anxious_perfectionist', touchpoint: 'post_not_started', text: 'Not starting doesn\'t define you. The fact that you\'re here, checking in, means you haven\'t given up.' },

  // === CHAOTIC CREATIVE — The core wound: structure kills the spark ===
  { archetype: 'chaotic_creative', touchpoint: 'morning', text: 'Your energy is nonlinear. The people who told you to \'just follow a schedule\' don\'t have your brain.' },
  { archetype: 'chaotic_creative', touchpoint: 'morning', text: 'You don\'t procrastinate. You incubate. The idea isn\'t ready until the energy hits.' },
  { archetype: 'chaotic_creative', touchpoint: 'morning', text: 'Rigid structure kills your spark. But no structure scatters it. You need just enough container.' },
  { archetype: 'chaotic_creative', touchpoint: 'morning', text: 'Your 47 browser tabs aren\'t chaos — they\'re your brain\'s way of keeping options alive.' },
  { archetype: 'chaotic_creative', touchpoint: 'morning', text: 'The world rewards consistency. You reward bursts. Both create results — yours just look different.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_done', text: 'You caught the wave and rode it all the way in. That\'s your superpower — most people can\'t do that.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_done', text: 'Finishing is genuinely harder than starting for your type. You just did the hard thing.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_done', text: 'From spark to shipped. That transition is where most Chaotic Creatives lose it. You didn\'t.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_working', text: 'You\'re in the flow. This is where your best work happens. Don\'t let anyone interrupt it.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_working', text: 'Deep in creation mode. The world can wait.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_not_started', text: 'Low energy days aren\'t wasted for you. Your brain processes in the background. Tomorrow it might fire.' },
  { archetype: 'chaotic_creative', touchpoint: 'post_not_started', text: 'No spark today. That\'s not failure — it\'s recharging. The burst will come.' },

  // === NOVELTY SEEKER — The core wound: finishing requires a different energy than starting ===
  { archetype: 'novelty_seeker', touchpoint: 'morning', text: 'Your brain is wired for novelty. New ideas light you up in a way that routine work never will.' },
  { archetype: 'novelty_seeker', touchpoint: 'morning', text: 'The problem isn\'t that you start too many things. It\'s that finishing requires a different kind of energy.' },
  { archetype: 'novelty_seeker', touchpoint: 'morning', text: 'Variety isn\'t distraction for you — it\'s how you sustain engagement. Two projects beat one boring one.' },
  { archetype: 'novelty_seeker', touchpoint: 'morning', text: 'Your abandoned projects aren\'t failures. They\'re experiments. But finishing a few changes everything.' },
  { archetype: 'novelty_seeker', touchpoint: 'morning', text: 'The excitement of starting fades around 60-70%. That\'s the danger zone. Push through it once and everything changes.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_done', text: 'You finished before the novelty wore off. That\'s timing and discipline combined.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_done', text: 'Most Novelty Seekers have a graveyard of 70%-done projects. You just added one to the 100% column.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_done', text: 'Completion and curiosity aren\'t opposites. You just proved it.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_working', text: 'Sticking with something past the exciting phase is your growth edge. You\'re right in it.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_working', text: 'The pull toward something new is strong right now. Recognizing it is half the battle.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_not_started', text: 'The shiny new thing won. It happens. The question is whether you\'ll come back to this one.' },
  { archetype: 'novelty_seeker', touchpoint: 'post_not_started', text: 'Your attention went somewhere else. That\'s data, not failure. What pulled you?' },

  // === FLEXIBLE IMPROVISER — The core wound: inconsistency feels like failure ===
  { archetype: 'flexible_improviser', touchpoint: 'morning', text: 'Your energy drives your output. Checking in with your body isn\'t soft — it\'s your most strategic move.' },
  { archetype: 'flexible_improviser', touchpoint: 'morning', text: 'Society rewards consistency. You reward alignment. Working with your energy isn\'t laziness — it\'s intelligence.' },
  { archetype: 'flexible_improviser', touchpoint: 'morning', text: 'Low energy days aren\'t failures. They\'re data. Adjust the output, don\'t force the input.' },
  { archetype: 'flexible_improviser', touchpoint: 'morning', text: 'You\'re at your best when energy and task are matched. That\'s a skill most people never develop.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_done', text: 'You read the day right and matched your energy to your task. That\'s expertise.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_done', text: 'When the energy is there, you\'re unstoppable. Today it was there and you used it.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_working', text: 'Steady progress on a medium energy day is worth more than a burned-out sprint.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_not_started', text: 'You listened to your body today. That\'s not laziness — it\'s the self-awareness that keeps you sustainable.' },
  { archetype: 'flexible_improviser', touchpoint: 'post_not_started', text: 'Rest isn\'t the opposite of productive. For your type, it\'s the prerequisite.' },

  // === ADAPTIVE GENERALIST — The core wound: having range feels like lacking focus ===
  { archetype: 'adaptive_generalist', touchpoint: 'morning', text: 'Most people have one gear. You have four. The skill isn\'t having range — it\'s knowing which mode to use.' },
  { archetype: 'adaptive_generalist', touchpoint: 'morning', text: 'People call you \'scattered\' because they only have one mode. You context-switch because you can.' },
  { archetype: 'adaptive_generalist', touchpoint: 'morning', text: 'Your challenge isn\'t focus — it\'s choosing. Once you pick a mode, you execute as well as anyone.' },
  { archetype: 'adaptive_generalist', touchpoint: 'morning', text: 'Versatility looks like inconsistency from the outside. From the inside, it\'s reading the room.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_done', text: 'Right mode, right task, right result. Your range is a genuine competitive advantage.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_done', text: 'You adapted and delivered. That\'s harder than it looks to people who only have one approach.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_working', text: 'Sometimes generalists spread too thin. Today might be a day to narrow focus instead of switching modes.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_not_started', text: 'Having too many options can paralyze. Tomorrow, pick one mode before you pick a task.' },
  { archetype: 'adaptive_generalist', touchpoint: 'post_not_started', text: 'Analysis of which mode to use IS a form of planning. Pick and go.' },

  // === STRUCTURED ACHIEVER — The core wound: identity tied to output ===
  { archetype: 'structured_achiever', touchpoint: 'morning', text: 'Your brain rewards completion. That\'s powerful — but it can also make you avoid tasks that don\'t have clear endpoints.' },
  { archetype: 'structured_achiever', touchpoint: 'morning', text: 'Checklists aren\'t boring for you. They\'re neurological fuel. Each check releases a hit of satisfaction.' },
  { archetype: 'structured_achiever', touchpoint: 'morning', text: 'The risk for your type isn\'t laziness — it\'s burnout. You\'ll keep going past empty because stopping feels wrong.' },
  { archetype: 'structured_achiever', touchpoint: 'morning', text: 'Not every day needs to be maximally productive. Rest days protect the high-output days.' },
  { archetype: 'structured_achiever', touchpoint: 'post_done', text: 'Another one checked off. That satisfaction you feel? That\'s dopamine. Your brain is literally built for this.' },
  { archetype: 'structured_achiever', touchpoint: 'post_done', text: 'Completion momentum is real for your type. Each finish makes the next one easier.' },
  { archetype: 'structured_achiever', touchpoint: 'post_working', text: 'Unfinished items sit heavy for you. That discomfort is your drive — channel it, don\'t fight it.' },
  { archetype: 'structured_achiever', touchpoint: 'post_not_started', text: 'A day without visible progress feels wrong to you. But rest days make the productive days sharper.' },
  { archetype: 'structured_achiever', touchpoint: 'post_not_started', text: 'Your identity is tied to output. That\'s your strength and your vulnerability. One off day doesn\'t change who you are.' },
];

// Select a random insight for a given archetype and touchpoint
// Frequency varies by user engagement:
//   < 14 days active: 100% (always show — hook new users with the "reading me" experience)
//   14-30 days: 50%
//   30+ days: 33%
export function maybeGetInsight(archetype: string, touchpoint: string, daysActive: number = 0): string | null {
  // Tiered frequency based on how long the user has been active
  if (daysActive >= 30) {
    if (Math.random() > 0.33) return null;
  } else if (daysActive >= 14) {
    if (Math.random() > 0.50) return null;
  }
  // < 14 days: always show (no random gate)

  const candidates = INSIGHT_LINES.filter(
    i => i.archetype === archetype && i.touchpoint === touchpoint
  );
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)].text;
}
