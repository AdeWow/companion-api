export interface ArchetypeConfig {
  id: string;
  label: string;
  maxTasks: 1 | 2 | 3;
  morningStyle: 'direct_ask' | 'energy_check' | 'context_check' | 'open_invitation';
  taskFraming: 'neutral' | 'small' | 'execution' | 'curious';
  taskSizeCheck: boolean;
  checkinRelativeToTask: boolean;
  checkinLabels: {
    done: string;
    working: string;
    notStarted: string;
    switched?: string;
  };
  postCompletion: 'shutdown' | 'whats_next' | 'ride_wave' | 'permission_to_stop';
  lowEnergyOptOut: boolean;
  skipCheckinOnRestDay: boolean;
  idleAllowsNewTask: boolean;
  rotatePrompts: boolean;
  dailySummaryStyle: 'count' | 'reflection' | 'simple';
  morningPromptPool: string[];
}

export const ARCHETYPE_CONFIGS: Record<string, ArchetypeConfig> = {
  structured_achiever: {
    id: 'structured_achiever',
    label: 'Structured Achiever',
    maxTasks: 3,
    morningStyle: 'direct_ask',
    taskFraming: 'neutral',
    taskSizeCheck: false,
    checkinRelativeToTask: false,
    checkinLabels: {
      done: 'Done',
      working: 'Working on it',
      notStarted: "Didn't get to it",
    },
    postCompletion: 'whats_next',
    lowEnergyOptOut: false,
    skipCheckinOnRestDay: false,
    idleAllowsNewTask: true,
    rotatePrompts: false,
    dailySummaryStyle: 'count',
    morningPromptPool: [
      "What are your top priorities today?",
      "What's on the checklist today?",
      "What are you knocking out today?",
      "What needs to get done today?",
      "What's first on the list?",
    ],
  },
  anxious_perfectionist: {
    id: 'anxious_perfectionist',
    label: 'Anxious Perfectionist',
    maxTasks: 1,
    morningStyle: 'direct_ask',
    taskFraming: 'small',
    taskSizeCheck: true,
    checkinRelativeToTask: false,
    checkinLabels: {
      done: 'Made progress',
      working: 'Still working through it',
      notStarted: 'Chose to rest today',
    },
    postCompletion: 'permission_to_stop',
    lowEnergyOptOut: false,
    skipCheckinOnRestDay: false,
    idleAllowsNewTask: true,
    rotatePrompts: false,
    dailySummaryStyle: 'simple',
    morningPromptPool: [
      "What's one small thing you could move forward today?",
      "Pick something gentle to start with today.",
      "What's one thing you could make a little progress on?",
      "What feels manageable today?",
      "What's the smallest step you could take?",
    ],
  },
  chaotic_creative: {
    id: 'chaotic_creative',
    label: 'Chaotic Creative',
    maxTasks: 1,
    morningStyle: 'open_invitation',
    taskFraming: 'curious',
    taskSizeCheck: false,
    checkinRelativeToTask: true,
    checkinLabels: {
      done: 'Done',
      working: 'Deep in it',
      notStarted: "Energy didn't hit",
    },
    postCompletion: 'ride_wave',
    lowEnergyOptOut: false,
    skipCheckinOnRestDay: false,
    idleAllowsNewTask: true,
    rotatePrompts: false,
    dailySummaryStyle: 'simple',
    morningPromptPool: [
      "When you're ready, tell me what grabbed you today.",
      "No rush. What's calling to you?",
      "Whenever the spark hits — I'm here.",
      "What's pulling your attention?",
      "Follow the thread. What is it today?",
    ],
  },
  novelty_seeker: {
    id: 'novelty_seeker',
    label: 'Novelty Seeker',
    maxTasks: 2,
    morningStyle: 'direct_ask',
    taskFraming: 'curious',
    taskSizeCheck: false,
    checkinRelativeToTask: false,
    checkinLabels: {
      done: 'Done',
      working: 'Still on it',
      notStarted: "Haven't started",
      switched: 'Switched to something else',
    },
    postCompletion: 'whats_next',
    lowEnergyOptOut: false,
    skipCheckinOnRestDay: false,
    idleAllowsNewTask: true,
    rotatePrompts: true,
    dailySummaryStyle: 'simple',
    morningPromptPool: [
      "What are you curious about today?",
      "What would be fun to make progress on?",
      "Pick something you haven't touched in a while.",
      "What's pulling your attention today?",
      "What would feel satisfying to finish?",
      "Try something different today — what could that be?",
      "What project is calling your name?",
      "What would surprise you to actually finish today?",
      "What's the most interesting thing on your plate?",
      "Start with whatever excites you most.",
      "What haven't you looked at in a week?",
      "Which task would make you feel the most accomplished?",
    ],
  },
  strategic_planner: {
    id: 'strategic_planner',
    label: 'Strategic Planner',
    maxTasks: 1,
    morningStyle: 'direct_ask',
    taskFraming: 'execution',
    taskSizeCheck: false,
    checkinRelativeToTask: false,
    checkinLabels: {
      done: 'Shipped',
      working: 'Executing',
      notStarted: 'Still planning',
    },
    postCompletion: 'shutdown',
    lowEnergyOptOut: false,
    skipCheckinOnRestDay: false,
    idleAllowsNewTask: true,
    rotatePrompts: false,
    dailySummaryStyle: 'simple',
    morningPromptPool: [
      "What are you shipping today?",
      "What's the one deliverable for today?",
      "What will be DONE by tonight?",
      "What's leaving your desk today?",
      "Name the output. What ships?",
    ],
  },
  flexible_improviser: {
    id: 'flexible_improviser',
    label: 'Flexible Improviser',
    maxTasks: 1,
    morningStyle: 'energy_check',
    taskFraming: 'neutral',
    taskSizeCheck: false,
    checkinRelativeToTask: false,
    checkinLabels: {
      done: 'Done',
      working: 'Working on it',
      notStarted: "Didn't get to it",
    },
    postCompletion: 'shutdown',
    lowEnergyOptOut: true,
    skipCheckinOnRestDay: true,
    idleAllowsNewTask: true,
    rotatePrompts: false,
    dailySummaryStyle: 'reflection',
    morningPromptPool: [
      "How's your energy this morning?",
      "What does today feel like?",
      "Check in with yourself — how are you feeling?",
      "What's your battery level today?",
      "How are you showing up today?",
    ],
  },
  adaptive_generalist: {
    id: 'adaptive_generalist',
    label: 'Adaptive Generalist',
    maxTasks: 1,
    morningStyle: 'context_check',
    taskFraming: 'neutral',
    taskSizeCheck: false,
    checkinRelativeToTask: false,
    checkinLabels: {
      done: 'Done',
      working: 'Working on it',
      notStarted: "Didn't get to it",
    },
    postCompletion: 'shutdown',
    lowEnergyOptOut: true,
    skipCheckinOnRestDay: true,
    idleAllowsNewTask: true,
    rotatePrompts: false,
    dailySummaryStyle: 'simple',
    morningPromptPool: [
      "What kind of day is this?",
      "What mode are you in today?",
      "Before you start — what does today call for?",
      "Read the day. What does it need?",
      "What's the vibe today?",
    ],
  },
};

export function getArchetypeConfig(archetype: string | null | undefined): ArchetypeConfig {
  if (!archetype) return ARCHETYPE_CONFIGS['adaptive_generalist'];
  return ARCHETYPE_CONFIGS[archetype] || ARCHETYPE_CONFIGS['adaptive_generalist'];
}
