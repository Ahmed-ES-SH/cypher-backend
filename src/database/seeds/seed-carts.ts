import { DataSource } from 'typeorm';
import { User } from '../../user/schema/user.entity';
import { Cart } from '../../cart/schema/cart.schema';
import { v5 as uuidv5 } from 'uuid';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export const USER_SEED_IDS = {
  admin: uuidv5('admin@example.com', UUID_NAMESPACE),
  regular: uuidv5('user@example.com', UUID_NAMESPACE),
  premium: uuidv5('premium@example.com', UUID_NAMESPACE),
};

export async function seedCarts(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n🛒 Seeding carts...');

  const userRepo = dataSource.getRepository(User);
  const cartRepo = dataSource.getRepository(Cart);

  const users = await userRepo.find({ select: ['id', 'email'] });
  if (users.length === 0) {
    console.log('  ⚠️  No users found. Skipping carts.');
    return { inserted: 0, skipped: 0 };
  }

  const existingCarts = await cartRepo.find({ select: ['id', 'userId'] });
  const existingUserIds = new Set(existingCarts.map((c) => c.userId));

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

    const cart = cartRepo.create({ userId: userIdUuid });
    await cartRepo.save(cart);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Carts seeded successfully\n');

  return { inserted, skipped };
}
