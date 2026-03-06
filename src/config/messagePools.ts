export interface MessagePool {
  touchpoint: string;
  archetype: string | 'universal';  // 'universal' = used for any archetype
  status?: string;  // for outcome messages: 'done', 'working', 'not_started', etc.
  messages: string[];
}

export const MESSAGE_POOLS: MessagePool[] = [
  // === DONE outcomes — universal ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'universal',
    status: 'done',
    messages: [
      "Done. That's a win.",
      "You said you'd do it, and you did.",
      "Shipped. That's what matters.",
      "Another one checked off.",
      "Delivered. Nice work.",
      "That's done. Feel that?",
      "Completed. The rest of the day is yours.",
      "Finished. You showed up today.",
    ],
  },

  // === DONE outcomes — Structured Achiever ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'structured_achiever',
    status: 'done',
    messages: [
      "Checked off. What's next?",
      "Done. Your list just got shorter.",
      "Completed. That momentum is real.",
      "One down. Keep the pace.",
      "Clean execution. Next?",
      "Ticked off. Feels good, right?",
      "Systematic. Efficient. Done.",
      "Progress logged. Moving on.",
    ],
  },

  // === DONE outcomes — Anxious Perfectionist ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'anxious_perfectionist',
    status: 'done',
    messages: [
      "You did it. That's enough for today.",
      "Done. And it doesn't have to be perfect.",
      "Progress made. That's what counts.",
      "You showed up and moved it forward.",
      "Finished. Let that sit for a moment.",
      "It's done. Not perfect — done. That's better.",
      "You touched it. You moved it. That's a win.",
      "Completed. Breathe. You earned this.",
    ],
  },

  // === DONE outcomes — Chaotic Creative ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'chaotic_creative',
    status: 'done',
    messages: [
      "You caught the wave and rode it.",
      "Done. The spark became something real.",
      "Finished. When it clicks, it clicks.",
      "Created and completed. That's rare.",
      "You followed the thread all the way through.",
      "Done. That energy was real.",
      "Shipped while the fire was hot.",
      "From chaos to completion. Beautiful.",
    ],
  },

  // === DONE outcomes — Novelty Seeker ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'novelty_seeker',
    status: 'done',
    messages: [
      "Done. Ready for the next thing?",
      "Finished. Your curiosity paid off.",
      "Completed. What caught your eye next?",
      "That's a wrap. Variety is your fuel.",
      "Done. Now you've got room for something new.",
      "Shipped. The novelty of finishing never gets old.",
      "Checked off. What's the next adventure?",
      "Finished this one. Plenty more where that came from.",
    ],
  },

  // === DONE outcomes — Strategic Planner ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'strategic_planner',
    status: 'done',
    messages: [
      "Shipped. That's what matters.",
      "Executed. Not just planned — done.",
      "Delivered. The plan became reality.",
      "Done. Execution over planning today.",
      "Shipped. Your future self thanks you.",
      "From plan to done. That's the move.",
      "Completed. Strategy without execution is just a wish.",
      "Delivered. That's leadership.",
    ],
  },

  // === DONE outcomes — Flexible Improviser ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'flexible_improviser',
    status: 'done',
    messages: [
      "Done. You read the day right.",
      "Finished. Your instincts were spot on.",
      "Completed. You found your flow today.",
      "Done. Energy well spent.",
      "You matched your energy to your task. Smart.",
      "Shipped. That felt right, didn't it?",
      "Finished. Trust that rhythm.",
      "Done. The vibe was right and you used it.",
    ],
  },

  // === DONE outcomes — Adaptive Generalist ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'adaptive_generalist',
    status: 'done',
    messages: [
      "Done. You picked the right mode today.",
      "Completed. Versatility is your strength.",
      "Finished. You adapted and delivered.",
      "Done. Right context, right task, right result.",
      "Shipped. You read the situation perfectly.",
      "Completed. That flexibility paid off.",
      "Done. Another day, another mode mastered.",
      "Finished. You make switching look easy.",
    ],
  },

  // === WORKING outcomes — universal ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'universal',
    status: 'working',
    messages: [
      "Still in it. That's not failure — that's persistence.",
      "Progress counts. Keep going.",
      "Working through it. That takes patience.",
      "Not done yet, but you're in motion.",
      "The work is happening. Trust the process.",
      "Still going. That's more than most people do.",
      "In progress. Some things take time.",
      "You're in the middle. That's where the work happens.",
    ],
  },

  // === NOT_STARTED outcomes — universal ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'universal',
    status: 'not_started',
    messages: [
      "That's okay. Tomorrow's a fresh start.",
      "Some days just don't line up. No judgment.",
      "It happens. The task will be there tomorrow.",
      "Not today. And that's fine.",
      "Rest is part of the process too.",
      "Sometimes the day has other plans.",
      "No progress today. That doesn't define you.",
      "Acknowledged. We move forward tomorrow.",
    ],
  },

  // === NOT_STARTED — Anxious Perfectionist ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'anxious_perfectionist',
    status: 'not_started',
    messages: [
      "That's okay. Choosing to rest is still a choice.",
      "Not starting doesn't mean failing.",
      "Some days the resistance wins. Tomorrow you try again.",
      "Be gentle with yourself. One day doesn't define anything.",
      "It's okay. The task isn't going anywhere.",
      "You showed up to check in. That counts for something.",
      "Not today. And that's allowed.",
      "Rest isn't laziness. It's recovery.",
    ],
  },

  // === SWITCHED outcomes — Novelty Seeker ===
  {
    touchpoint: 'checkin_outcome',
    archetype: 'novelty_seeker',
    status: 'switched',
    messages: [
      "Switching keeps you moving. That counts.",
      "Different direction, same momentum.",
      "You followed the pull. That's not quitting.",
      "Redirected, not derailed.",
      "The switch was the move. Trust that.",
      "New direction, new energy. That's your style.",
      "You pivoted. Some call that adaptability.",
      "Switched lanes. Still moving forward.",
    ],
  },

  // === FOLLOW-UP outcomes ===
  {
    touchpoint: 'followup_outcome',
    archetype: 'universal',
    status: 'done',
    messages: [
      "Got there in the end. Nice.",
      "Finished on the second wind.",
      "Done. Persistence paid off.",
      "Completed. Better late than never isn't just a saying.",
    ],
  },
  {
    touchpoint: 'followup_outcome',
    archetype: 'universal',
    status: 'still_going',
    messages: [
      "Keep at it. No more interruptions from me today.",
      "Understood. I'll leave you to it.",
      "Still going. That's dedication. Last check from me.",
      "Noted. You're in the zone — I'm backing off.",
    ],
  },
  {
    touchpoint: 'followup_outcome',
    archetype: 'universal',
    status: 'calling_it',
    messages: [
      "No worries. Tomorrow's a fresh start.",
      "Called it. Rest up.",
      "That's fair. Some days are just like that.",
      "Done for today. No guilt attached.",
    ],
  },

  // === EVENING outcomes ===
  {
    touchpoint: 'evening_outcome',
    archetype: 'universal',
    status: 'good',
    messages: [
      "Nice. Carry that into tomorrow.",
      "Good days build on each other.",
      "That energy is worth remembering.",
      "Solid. Sleep well.",
    ],
  },
  {
    touchpoint: 'evening_outcome',
    archetype: 'universal',
    status: 'okay',
    messages: [
      "Steady days add up. See you in the morning.",
      "Okay is underrated. Consistency matters.",
      "Not every day needs to be great. This one counted.",
      "Average days are still progress.",
    ],
  },
  {
    touchpoint: 'evening_outcome',
    archetype: 'universal',
    status: 'tough',
    messages: [
      "Tough days happen. Tomorrow's a reset.",
      "Hard day. You got through it.",
      "Some days fight back. You survived it.",
      "Tomorrow is a new one. Rest up.",
    ],
  },
];

// Helper to select a random message
export function selectMessage(
  touchpoint: string,
  archetype: string,
  status: string
): string {
  // Try archetype-specific first
  const specific = MESSAGE_POOLS.find(
    p => p.touchpoint === touchpoint && p.archetype === archetype && p.status === status
  );
  if (specific && specific.messages.length > 0) {
    return specific.messages[Math.floor(Math.random() * specific.messages.length)];
  }

  // Fall back to universal
  const universal = MESSAGE_POOLS.find(
    p => p.touchpoint === touchpoint && p.archetype === 'universal' && p.status === status
  );
  if (universal && universal.messages.length > 0) {
    return universal.messages[Math.floor(Math.random() * universal.messages.length)];
  }

  // Ultimate fallback
  return "Done for today. See you tomorrow.";
}
