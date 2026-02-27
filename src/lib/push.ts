import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo();

interface PushPayload {
  pushToken: string;
  title: string;
  body: string;
  categoryId: string; // Maps to the notification categories defined in the mobile app
  data?: Record<string, unknown>;
}

export async function sendPushNotification(payload: PushPayload): Promise<{
  success: boolean;
  ticket?: ExpoPushTicket;
  error?: string;
}> {
  const { pushToken, title, body, categoryId, data } = payload;

  // Validate the token format
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('[PUSH] Invalid push token:', pushToken);
    return { success: false, error: 'Invalid push token format' };
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    categoryId, // This links to the categories registered on the mobile app
    data: data ?? {},
    priority: 'high',
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    const ticket = tickets[0];

    if (ticket.status === 'ok') {
      console.log('[PUSH] Notification sent successfully, ticket:', ticket.id);
      return { success: true, ticket };
    } else {
      console.error('[PUSH] Notification failed:', ticket.status, ticket.message);
      return { success: false, error: ticket.message };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PUSH] Send error:', message);
    return { success: false, error: message };
  }
}
