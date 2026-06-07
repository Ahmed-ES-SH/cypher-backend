import { DataSource } from 'typeorm';
import { User } from '../../user/schema/user.entity';
import { BlackList } from '../../auth/schema/blacklist-tokens.schema';
import { USER_SEED_IDS } from './seed-carts';

export async function seedBlacklistTokens(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n🚫 Seeding blacklist tokens...');

  const userRepo = dataSource.getRepository(User);
  const repo = dataSource.getRepository(BlackList);

  const users = await userRepo.find({ select: ['id', 'email'] });
  if (users.length === 0) {
    console.log('  ⚠️  No users found. Skipping blacklist tokens.');
    return { inserted: 0, skipped: 0 };
  }

  const existingTokens = await repo.find({
    select: ['id', 'token'],
  });
  const existingTokenValues = new Set(existingTokens.map((t) => t.token));

  let inserted = 0;
  let skipped = 0;

  const tokenValue = 'seed_expired_token_001';
  if (existingTokenValues.has(tokenValue)) {
    skipped++;
  } else {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() - 24);

    const token = repo.create({
      token: tokenValue,
      userId: USER_SEED_IDS.admin,
      expiresAt,
    });
    await repo.save(token);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Blacklist tokens seeded successfully\n');

  return { inserted, skipped };
}
