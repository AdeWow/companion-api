import 'fastify';

// Extend Fastify request to include userId from JWT auth
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

// Push token registration
export interface PushTokenBody {
  token: string;
  platform: 'ios' | 'android';
}

// Health check response
export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  version: string;
  services: {
    redis: 'connected' | 'disconnected' | 'not_configured';
    supabase: 'connected' | 'error';
    queues: string;
  };
}

// Queue job types
export interface MorningPromptJob {
  userId: string;
  timezone: string;
  archetype: string;
}

export interface CheckinReminderJob {
  userId: string;
  checkinNumber: 1 | 2 | 3;
  taskId: string;
}
