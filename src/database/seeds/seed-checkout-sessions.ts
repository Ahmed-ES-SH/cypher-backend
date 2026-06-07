import { DataSource } from 'typeorm';
import { User } from '../../user/schema/user.entity';
import {
  CheckoutSessionState,
  CheckoutSessionStatus,
} from '../../payments/schema/checkout-session-state.schema';
import { USER_SEED_IDS } from './seed-carts';

export async function seedCheckoutSessions(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n🔒 Seeding checkout sessions...');

  const userRepo = dataSource.getRepository(User);
  const repo = dataSource.getRepository(CheckoutSessionState);

  const users = await userRepo.find({ select: ['id', 'email'] });
  if (users.length === 0) {
    console.log('  ⚠️  No users found. Skipping checkout sessions.');
    return { inserted: 0, skipped: 0 };
  }

  const existingSessions = await repo.find({
    select: ['id', 'userId', 'stripeSessionId'],
  });
  const existingUserIds = new Set(existingSessions.map((s) => s.userId));
  const existingStripeIds = new Set(
    existingSessions.map((s) => s.stripeSessionId).filter(Boolean),
  );

  let inserted = 0;
  let skipped = 0;

  const premiumUuid = USER_SEED_IDS.premium;
  if (
    existingUserIds.has(premiumUuid) ||
    existingStripeIds.has('cs_seed_checkout_001')
  ) {
    skipped++;
  } else {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 30);

    const session = repo.create({
      userId: premiumUuid,
      cartHash: 'seed_cart_hash_premium_001',
      stripeSessionId: 'cs_seed_checkout_001',
      status: CheckoutSessionStatus.ACTIVE,
      expiresAt,
    });
    await repo.save(session);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Checkout sessions seeded successfully\n');

  return { inserted, skipped };
}
