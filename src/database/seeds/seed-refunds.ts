import { DataSource } from 'typeorm';
import { Order } from '../../orders/schema/order.schema';
import { Payment } from '../../payments/schema/payment.schema';
import { Refund, RefundStatus } from '../../payments/schema/refund.schema';

export async function seedRefunds(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n💸 Seeding refunds...');

  const paymentRepo = dataSource.getRepository(Payment);
  const refundRepo = dataSource.getRepository(Refund);

  const payments = await paymentRepo.find({
    select: ['id', 'orderId', 'amount', 'currency', 'status'],
    where: { status: 'succeeded' as any },
  });

  if (payments.length === 0) {
    console.log('  ⚠️  No succeeded payments found. Skipping refunds.');
    return { inserted: 0, skipped: 0 };
  }

  const existingRefunds = await refundRepo.find({
    select: ['id', 'paymentId'],
  });
  const existingPaymentIds = new Set(existingRefunds.map((r) => r.paymentId));

  let inserted = 0;
  let skipped = 0;

  const payment = payments[0];
  if (!payment) {
    skipped++;
  } else if (existingPaymentIds.has(payment.id)) {
    skipped++;
  } else {
    const refund = refundRepo.create({
      orderId: payment.orderId!,
      paymentId: payment.id,
      amount: Math.round(payment.amount * 0.5),
      currency: payment.currency,
      reason: 'Customer requested partial refund',
      stripeRefundId: 're_seed_refund_001',
      status: RefundStatus.SUCCEEDED,
      metadata: {},
    });
    await refundRepo.save(refund);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Refunds seeded successfully\n');

  return { inserted, skipped };
}
