import { UserPatterns } from './patternEngine';

export function generateOutcomeMessage(
  patterns: UserPatterns,
  archetype: string,
  status: string,
  taskText: string
): string | null {
  // Need at least 5 days of data for personal messages
  if (patterns.daysActive < 5) return null;

  if (status === 'done') {
    const options: string[] = [];

    // Completion rate observations
    if (patterns.completionRate >= 80) {
      options.push(`${patterns.completionRate}% completion rate. That's not luck — that's consistency.`);
    }
    if (patterns.completionRate >= 60 && patterns.completionRate < 80) {
      options.push(`You finish what you start about ${patterns.completionRate}% of the time. That's honest and solid.`);
    }

    // Trend observations
    if (patterns.completionTrend === 'improving') {
      options.push("You're completing more than you were two weeks ago. The trend line is yours.");
    }

    // Streak observations
    if (patterns.currentStreak >= 3) {
      options.push(`${patterns.currentStreak} days in a row. Your longest is ${patterns.longestStreak}. ${patterns.currentStreak >= patterns.longestStreak ? "This is a new record." : "Keep building."}`);
    }

    // Total milestone
    if (patterns.totalTasksCompleted === 10) {
      options.push("That's task number 10. Double digits.");
    } else if (patterns.totalTasksCompleted === 25) {
      options.push("25 tasks completed. A month's worth of showing up.");
    } else if (patterns.totalTasksCompleted === 50) {
      options.push("50 tasks. That's not a streak — that's a practice.");
    }

    // Best day observation
    if (patterns.bestDayOfWeek) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: patterns.timezone });
      if (today === patterns.bestDayOfWeek) {
        options.push(`${patterns.bestDayOfWeek}s are your best day. You're proving it right now.`);
      }
    }

    // Topic continuity
    if (patterns.currentFocus) {
      options.push(`"${patterns.currentFocus}" keeps showing up in your tasks. It clearly matters to you.`);
    }

    // Follow-through after working
    if (patterns.followThroughAfterWorking >= 70) {
      options.push(`When you say "working on it," you finish ${patterns.followThroughAfterWorking}% of the time. Your word means something.`);
    }

    // Execution vs planning ratio (Strategic Planner)
    const totalRated = patterns.executionDays + patterns.planningDays + patterns.mixedDays;
    if (archetype === 'strategic_planner' && totalRated >= 5) {
      if (patterns.executionDays > patterns.planningDays) {
        options.push(`Your execution-to-planning ratio is flipping. ${patterns.executionDays} execution days vs ${patterns.planningDays} planning days. The shift is real.`);
      } else if (patterns.planningDays > patterns.executionDays) {
        options.push(`${patterns.planningDays} planning-heavy days vs ${patterns.executionDays} execution days. You know what needs to change.`);
      }
    }

    // Category balance
    if (patterns.personalTasks > patterns.professionalTasks && patterns.personalTasks >= 3) {
      options.push("You've been focusing on personal tasks lately. That balance matters.");
    }

    // Intensity warnings (last 7 days approximated from total counts with 5+ data)
    if (patterns.heavyDays >= 3 && patterns.daysActive >= 7) {
      options.push("Multiple heavy shipping days this week. Watch for burnout.");
    }
    if (patterns.lightDays >= 3 && patterns.daysActive >= 7) {
      options.push("Lighter week. Sometimes that's exactly what's needed.");
    }

    // Peak done hour (Chaotic Creative)
    if (archetype === 'chaotic_creative' && patterns.peakDoneHour !== null) {
      options.push(`You tend to finish things around ${patterns.peakDoneHour}:00. Your brain has a rhythm.`);
    }

    if (options.length > 0) {
      return options[Math.floor(Math.random() * options.length)];
    }
  }

  if (status === 'working') {
    const options: string[] = [];

    if (patterns.followThroughAfterWorking >= 50) {
      options.push(`You've finished ${patterns.followThroughAfterWorking}% of tasks you said "working" on. The odds are in your favor.`);
    }
    if (patterns.currentStreak >= 2) {
      options.push(`${patterns.currentStreak}-day streak on the line. You tend to finish what you start.`);
    }

    if (options.length > 0) {
      return options[Math.floor(Math.random() * options.length)];
    }
  }

  if (status === 'not_started') {
    const options: string[] = [];

    if (patterns.completionRate >= 60) {
      options.push(`One off day doesn't change a ${patterns.completionRate}% completion rate. You'll be back.`);
    }
    if (patterns.restDayCount >= 2) {
      options.push(`You've taken ${patterns.restDayCount} rest days total. You know when to push and when to pause.`);
    }

    if (options.length > 0) {
      return options[Math.floor(Math.random() * options.length)];
    }
  }

  return null; // fall back to generic message pool
}

export function generateMorningContext(
  patterns: UserPatterns,
  archetype: string,
  yesterdayTask?: string | null,
  yesterdayStatus?: string | null
): string | null {
  if (patterns.daysActive < 3) return null;

  const options: string[] = [];

  // Reference yesterday
  if (yesterdayTask && yesterdayStatus === 'done') {
    options.push(`You shipped "${yesterdayTask}" yesterday. What's today's target?`);
  }
  if (yesterdayTask && yesterdayStatus === 'working') {
    options.push(`"${yesterdayTask}" was still in progress yesterday. Pick it back up or start fresh?`);
  }

  // Streak context
  if (patterns.currentStreak >= 3) {
    options.push(`Day ${patterns.currentStreak + 1}. The streak is alive.`);
  }

  // Day of week context
  if (patterns.bestDayOfWeek) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: patterns.timezone });
    if (today === patterns.bestDayOfWeek) {
      options.push(`${today}. Historically your strongest day. Make it count.`);
    }
    if (today === patterns.worstDayOfWeek) {
      options.push(`${today}s are usually tough for you. Set something manageable.`);
    }
  }

  // Milestone approaching
  if (patterns.totalTasksCompleted === 9 || patterns.totalTasksCompleted === 24 || patterns.totalTasksCompleted === 49) {
    options.push(`One more and you hit ${patterns.totalTasksCompleted + 1}. Let's get it.`);
  }

  // Topic continuity
  if (patterns.currentFocus) {
    options.push(`You've been focused on "${patterns.currentFocus}" lately. Continuing or switching gears?`);
  }

  // Stale topics (Novelty Seeker)
  if (archetype === 'novelty_seeker' && patterns.staleTopics.length > 0) {
    options.push(`You haven't touched "${patterns.staleTopics[0].taskText}" in over a week. Still alive or ready to let it go?`);
  }

  if (options.length > 0) {
    return options[Math.floor(Math.random() * options.length)];
  }

  return null;
}
