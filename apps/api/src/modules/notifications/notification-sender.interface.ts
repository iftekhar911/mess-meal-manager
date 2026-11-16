export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Replaceable interface for push notification dispatchers (e.g., Firebase Cloud Messaging).
 */
export abstract class NotificationSender {
  abstract sendPush(payload: PushNotificationPayload): Promise<boolean>;
}
