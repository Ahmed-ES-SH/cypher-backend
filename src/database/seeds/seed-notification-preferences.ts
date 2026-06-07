import { DataSource } from 'typeorm';
import { User } from '../../user/schema/user.entity';
import { NotificationPreferences } from '../../notifications/schema/notification-preferences.schema';
import { USER_SEED_IDS } from './seed-carts';

export async function seedNotificationPreferences(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n🔔 Seeding notification preferences...');

  const userRepo = dataSource.getRepository(User);
  const repo = dataSource.getRepository(NotificationPreferences);

  const users = await userRepo.find({ select: ['id', 'email'] });
  if (users.length === 0) {
    console.log('  ⚠️  No users found. Skipping notification preferences.');
    return { inserted: 0, skipped: 0 };
  }

  const existingPrefs = await repo.find({
    select: ['id', 'userId'],
  });
  const existingUserIds = new Set(existingPrefs.map((p) => p.userId));

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

    if (existingUserIds.has(userIdUuid)) {
      skipped++;
      continue;
    }

    const prefs = repo.create({
      userId: userIdUuid,
      orderNotifications: true,
      paymentNotifications: true,
      systemNotifications: true,
      emailEnabled: true,
      pushEnabled: true,
    });
    await repo.save(prefs);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Notification preferences seeded successfully\n');

  return { inserted, skipped };
}
