import { DataSource } from 'typeorm';
import { PaymentStatus } from '../../payments/schema/payment-status.enum';
import { USER_SEED_IDS } from './seed-carts';

export async function seedPayments(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n💳 Seeding payments...');

  const existingPayments = await dataSource.query(
    `SELECT "order_id", "stripe_payment_intent" FROM "payments"`,
  );
  const existingOrderIds = new Set(
    existingPayments.map((p: any) => p.order_id),
  );
  const existingStripePIs = new Set(
    existingPayments.map((p: any) => p.stripe_payment_intent),
  );

  const orders = await dataSource.query(
    `SELECT "id", "user_id", "total_amount", "currency", "status" FROM "orders"`,
  );

  if (orders.length === 0) {
    console.log('  ⚠️  No orders found. Skipping payments.');
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  const paidOrder = orders.find(
    (o: any) => o.status === 'paid' && o.user_id === USER_SEED_IDS.regular,
  );
  const pendingOrder = orders.find(
    (o: any) =>
      o.status === 'pending_payment' && o.user_id === USER_SEED_IDS.premium,
  );

  const paymentsToCreate: Array<{
    user_id: string;
    order_id: string;
    stripe_payment_intent: string;
    amount: number;
    currency: string;
    status: string;
    idempotency_key: string;
  }> = [];

  if (paidOrder) {
    paymentsToCreate.push({
      user_id: paidOrder.user_id,
      order_id: paidOrder.id,
      stripe_payment_intent: 'pi_seed_succeeded_001',
      amount: paidOrder.total_amount,
      currency: paidOrder.currency,
      status: PaymentStatus.SUCCEEDED,
      idempotency_key: 'idem_seed_001',
    });
  }

  if (pendingOrder) {
    paymentsToCreate.push({
      user_id: pendingOrder.user_id,
      order_id: pendingOrder.id,
      stripe_payment_intent: 'pi_seed_pending_001',
      amount: pendingOrder.total_amount,
      currency: pendingOrder.currency,
      status: PaymentStatus.PENDING,
      idempotency_key: 'idem_seed_002',
    });
  }

  for (const data of paymentsToCreate) {
    if (
      existingOrderIds.has(data.order_id) ||
      existingStripePIs.has(data.stripe_payment_intent)
    ) {
      skipped++;
      continue;
    }

    await dataSource.query(
      `INSERT INTO "payments" ("user_id", "stripe_payment_intent", "amount", "currency", "status", "idempotency_key", "order_id")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.user_id,
        data.stripe_payment_intent,
        data.amount,
        data.currency,
        data.status,
        data.idempotency_key,
        data.order_id,
      ],
    );
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Payments seeded successfully\n');

  return { inserted, skipped };
}
