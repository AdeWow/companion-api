import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';
import { authMiddleware } from '../middleware/auth';

// Temporary test endpoints for manually triggering notifications.
// Will be removed after POC verification — in production, notifications
// are triggered by BullMQ jobs, not manual API calls.

async function getUserPushToken(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('companion_user_settings')
    .select('expo_push_token')
    .eq('user_id', userId)
    .single();

  if (error || !data?.expo_push_token) {
    return null;
  }
  return data.expo_push_token as string;
}

export default async function testPushRoutes(fastify: FastifyInstance) {
  // POST /test-push/morning
  // Sends a mock morning prompt notification with action buttons
  fastify.post('/test-push/morning', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const pushToken = await getUserPushToken(userId);

    if (!pushToken) {
      return reply.code(400).send({
        error: 'No push token found for user. Make sure the mobile app has registered.',
      });
    }

    const result = await sendPushNotification({
      pushToken,
      title: 'Good morning',
      body: "What's the one thing you'll focus on today?",
      categoryId: 'morning_prompt',
      data: {
        type: 'morning_prompt',
        userId,
      },
    });

    return reply.send(result);
  });

  // POST /test-push/checkin
  // Sends a mock check-in notification with 3 action buttons
  fastify.post('/test-push/checkin', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const pushToken = await getUserPushToken(userId);

    if (!pushToken) {
      return reply.code(400).send({
        error: 'No push token found for user.',
      });
    }

    const result = await sendPushNotification({
      pushToken,
      title: 'Checking in',
      body: "How's your task going?",
      categoryId: 'checkin',
      data: {
        type: 'checkin',
        userId,
      },
    });

    return reply.send(result);
  });

  // POST /test-push/evening
  // Sends a mock evening reflection notification
  fastify.post('/test-push/evening', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const pushToken = await getUserPushToken(userId);

    if (!pushToken) {
      return reply.code(400).send({
        error: 'No push token found for user.',
      });
    }

    const result = await sendPushNotification({
      pushToken,
      title: 'End of day',
      body: 'Take a moment to look back on today.',
      categoryId: 'evening_reflection',
      data: {
        type: 'evening_reflection',
        userId,
      },
    });

    return reply.send(result);
  });

  // POST /test-push/plain
  // Sends a plain notification with NO action buttons — baseline test
  fastify.post('/test-push/plain', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const pushToken = await getUserPushToken(userId);

    if (!pushToken) {
      return reply.code(400).send({
        error: 'No push token found for user.',
      });
    }

    const result = await sendPushNotification({
      pushToken,
      title: 'Test notification',
      body: 'If you see this, push notifications are working.',
      categoryId: '', // No category = no action buttons
    });

    return reply.send(result);
  });
}
