import { DataSource } from 'typeorm';
import { OutboxEvent } from '../../payments/schema/outbox-event.schema';
import { OutboxEventStatus } from '../../payments/schema/outbox-event.schema';

const OUTBOX_EVENTS_DATA: Partial<OutboxEvent>[] = [
  {
    eventType: 'order.created',
    aggregateId: '00000000-0000-0000-0000-000000000001',
    payload: {
      orderId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000001',
      totalAmount: 5998,
    },
    status: OutboxEventStatus.COMPLETED,
    retryCount: 0,
    processedAt: new Date(),
  },
  {
    eventType: 'payment.completed',
    aggregateId: '00000000-0000-0000-0000-000000000002',
    payload: {
      paymentId: '00000000-0000-0000-0000-000000000002',
      orderId: '00000000-0000-0000-0000-000000000002',
      status: 'succeeded',
    },
    status: OutboxEventStatus.PENDING,
    retryCount: 0,
  },
];

export async function seedOutboxEvents(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n📤 Seeding outbox events...');

  const repo = dataSource.getRepository(OutboxEvent);

  const existing = await repo.find({
    select: ['id', 'eventType', 'aggregateId'],
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.eventType}:${e.aggregateId}`),
  );

  let inserted = 0;
  let skipped = 0;

  for (const data of OUTBOX_EVENTS_DATA) {
    const key = `${data.eventType}:${data.aggregateId}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const entity = repo.create(data);
    await repo.save(entity);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Outbox events seeded successfully\n');

  return { inserted, skipped };
}
