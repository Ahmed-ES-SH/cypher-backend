import { DataSource } from 'typeorm';
import { ContactMessage } from '../../contact/schema/contact-message.schema';

const CONTACT_MESSAGES_DATA: Partial<ContactMessage>[] = [
  {
    fullName: 'Alice Johnson',
    email: 'alice@example.com',
    subject: 'Question about order #1234',
    message:
      "Hi, I placed an order last week and haven't received a shipping confirmation yet. Could you please check the status?",
    isRead: false,
    ipAddress: '192.168.1.100',
  },
  {
    fullName: 'Bob Smith',
    email: 'bob@example.com',
    subject: 'Product return request',
    message:
      'I received a damaged item and would like to initiate a return. The product arrived with a broken screen.',
    isRead: false,
    ipAddress: '192.168.1.101',
  },
];

export async function seedContactMessages(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n📧 Seeding contact messages...');

  const repo = dataSource.getRepository(ContactMessage);

  const existing = await repo.find({ select: ['id', 'email', 'subject'] });
  const existingKeys = new Set(existing.map((m) => `${m.email}:${m.subject}`));

  let inserted = 0;
  let skipped = 0;

  for (const data of CONTACT_MESSAGES_DATA) {
    const key = `${data.email}:${data.subject}`;
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
  console.log('✅ Contact messages seeded successfully\n');

  return { inserted, skipped };
}
