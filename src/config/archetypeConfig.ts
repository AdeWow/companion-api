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
  },
};

export function getArchetypeConfig(archetype: string | null | undefined): ArchetypeConfig {
  if (!archetype) return ARCHETYPE_CONFIGS['adaptive_generalist'];
  return ARCHETYPE_CONFIGS[archetype] || ARCHETYPE_CONFIGS['adaptive_generalist'];
}
