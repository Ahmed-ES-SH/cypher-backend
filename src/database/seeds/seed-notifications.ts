import { DataSource } from 'typeorm';
import { User } from '../../user/schema/user.entity';
import { Notification } from '../../notifications/schema/notification.schema';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { USER_SEED_IDS } from './seed-carts';

const NOTIFICATION_TEMPLATES: Omit<
  Notification,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>[] = [
  {
    type: NotificationType.SYSTEM,
    title: 'Welcome to Cypher!',
    message:
      'Thank you for joining our platform. Explore our products and enjoy!',
    data: null,
    isRead: false,
    readAt: null,
    isDeleted: false,
  },
  {
    type: NotificationType.ORDER_UPDATED,
    title: 'Order Confirmed',
    message: 'Your order has been confirmed and is being processed.',
    data: { orderId: '00000000-0000-0000-0000-000000000001' },
    isRead: false,
    readAt: null,
    isDeleted: false,
  },
  {
    type: NotificationType.PAYMENT_SUCCESS,
    title: 'Payment Successful',
    message: 'Your payment of $64.78 has been processed successfully.',
    data: { amount: 6478, currency: 'usd' },
    isRead: true,
    readAt: new Date(),
    isDeleted: false,
  },
];

export async function seedNotifications(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n🔔 Seeding notifications...');

  const userRepo = dataSource.getRepository(User);
  const repo = dataSource.getRepository(Notification);

  const users = await userRepo.find({ select: ['id', 'email'] });
  if (users.length === 0) {
    console.log('  ⚠️  No users found. Skipping notifications.');
    return { inserted: 0, skipped: 0 };
  }

  const existingNotifications = await repo.find({
    select: ['id', 'userId', 'title'],
  });
  const existingKeys = new Set(
    existingNotifications.map((n) => `${n.userId}:${n.title}`),
  );

  let inserted = 0;
  let skipped = 0;

  const emailToUuid = new Map<string, string>();
  for (const user of users) {
    if (user.email === 'admin@example.com') {
      emailToUuid.set(user.email, USER_SEED_IDS.admin);
    } else if (user.email === 'user@example.com') {
      emailToUuid.set(user.email, USER_SEED_IDS.regular);
    } else if (user.email === 'premium@example.com') {
      emailToUuid.set(user.email, USER_SEED_IDS.premium);
    }
  }

  for (const user of users) {
    const userIdUuid = emailToUuid.get(user.email);
    if (!userIdUuid) continue;

    for (const template of NOTIFICATION_TEMPLATES) {
      const key = `${userIdUuid}:${template.title}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const notification = repo.create({
        ...template,
        userId: userIdUuid,
      });
      await repo.save(notification);
      inserted++;
    }
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Notifications seeded successfully\n');

  return { inserted, skipped };
}
