import { DataSource } from 'typeorm';
import { WebhookEvent } from '../../payments/schema/webhook-event.schema';
import { WebhookEventStatus } from '../../payments/types/webhook-event-status.enum';

const WEBHOOK_EVENTS_DATA: Partial<WebhookEvent>[] = [
  {
    stripeEventId: 'evt_seed_completed_001',
    eventType: 'payment_intent.succeeded',
    status: WebhookEventStatus.COMPLETED,
    processingAttempts: 1,
    processedAt: new Date(),
    payloadSnapshot: {
      id: 'evt_seed_completed_001',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_seed_001',
          amount: 2999,
          currency: 'usd',
          status: 'succeeded',
        },
      },
    },
  },
  {
    stripeEventId: 'evt_seed_pending_001',
    eventType: 'checkout.session.completed',
    status: WebhookEventStatus.PENDING,
    processingAttempts: 0,
    payloadSnapshot: {
      id: 'evt_seed_pending_001',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_seed_001',
          payment_status: 'paid',
          customer: 'cus_seed_001',
        },
      },
    },
  },
];

export async function seedWebhookEvents(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n🔗 Seeding webhook events...');

  const repo = dataSource.getRepository(WebhookEvent);

  const existing = await repo.find({ select: ['id', 'stripeEventId'] });
  const existingIds = new Set(existing.map((e) => e.stripeEventId));

  let inserted = 0;
  let skipped = 0;

  for (const data of WEBHOOK_EVENTS_DATA) {
    if (existingIds.has(data.stripeEventId!)) {
      skipped++;
      continue;
    }

    const entity = repo.create(data);
    await repo.save(entity);
    inserted++;
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Webhook events seeded successfully\n');

  return { inserted, skipped };
}
