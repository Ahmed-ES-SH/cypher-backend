import { DataSource } from 'typeorm';
import { User } from '../../user/schema/user.entity';
import { Order } from '../../orders/schema/order.schema';
import { OrderStatus } from '../../orders/types/order-status.enum';
import { USER_SEED_IDS } from './seed-carts';

export async function seedOrders(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n📋 Seeding orders...');

  const userRepo = dataSource.getRepository(User);
  const orderRepo = dataSource.getRepository(Order);

  const users = await userRepo.find({ select: ['id', 'email'] });
  if (users.length === 0) {
    console.log('  ⚠️  No users found. Skipping orders.');
    return { inserted: 0, skipped: 0 };
  }

  const existingOrders = await orderRepo.find({
    select: ['id', 'userId', 'status'],
  });
  const existingKeys = new Set(
    existingOrders.map((o) => `${o.userId}:${o.status}`),
  );

  let inserted = 0;
  let skipped = 0;

  const ordersToCreate: Partial<Order>[] = [
    {
      userId: USER_SEED_IDS.regular,
      status: OrderStatus.PAID,
      subtotal: 5998,
      taxAmount: 480,
      discountAmount: 0,
      totalAmount: 6478,
      currency: 'usd',
    },
    {
      userId: USER_SEED_IDS.premium,
      status: OrderStatus.PENDING_PAYMENT,
      subtotal: 2999,
      taxAmount: 240,
      discountAmount: 300,
      totalAmount: 2939,
      currency: 'usd',
    },
  ];

  for (const orderData of ordersToCreate) {
    const key = `${orderData.userId}:${orderData.status}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const order = orderRepo.create(orderData);
    await orderRepo.save(order);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Orders seeded successfully\n');

  return { inserted, skipped };
}
