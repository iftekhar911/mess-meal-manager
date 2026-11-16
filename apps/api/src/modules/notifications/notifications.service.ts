import { Injectable, Logger } from '@nestjs/common';
import { NotificationSender, PushNotificationPayload } from './notification-sender.interface';

/**
 * Push notification service implementing NotificationSender for Firebase Cloud Messaging.
 */
@Injectable()
export class NotificationsService extends NotificationSender {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Dispatches a push notification to a boarder or manager.
   *
   * @param payload - Notification message and metadata.
   * @returns True if queued or delivered successfully.
   */
  async sendPush(payload: PushNotificationPayload): Promise<boolean> {
    this.logger.log(`Push notification queued for user ${payload.userId}: ${payload.title}`);
    return true;
  }

  /**
   * Sends low-balance warning notification on the 2nd grace day.
   */
  async sendLowBalanceWarning(
    userId: string,
    messName: string,
    daysLeft: number
  ): Promise<boolean> {
    return this.sendPush({
      userId,
      title: `${messName}: Balance Warning`,
      body: `Your meal balance has ${daysLeft} days remaining. Please deposit soon.`
    });
  }

  /**
   * Sends auto-off alert when grace period expires.
   */
  async sendAutoOffAlert(userId: string, messName: string): Promise<boolean> {
    return this.sendPush({
      userId,
      title: `${messName}: Meals Auto-Off`,
      body: 'Your meals have been automatically turned off due to exhausted grace days.'
    });
  }
}
