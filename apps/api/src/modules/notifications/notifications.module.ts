import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationSender } from './notification-sender.interface';

@Global()
@Module({
  providers: [
    NotificationsService,
    {
      provide: NotificationSender,
      useExisting: NotificationsService
    }
  ],
  exports: [NotificationsService, NotificationSender]
})
export class NotificationsModule {}
