import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config';
import { User } from '../../user/schema/user.entity';
import { Category } from '../../categories/schema/category.schema';
import { Product } from '../../products/schema/product.schema';
import { Article } from '../../blog/schema/article.schema';
import { Cart } from '../../cart/schema/cart.schema';
import { CartItem } from '../../cart/schema/cart-item.schema';
import { Order } from '../../orders/schema/order.schema';
import { OrderItem } from '../../orders/schema/order-item.schema';
import { Payment } from '../../payments/schema/payment.schema';
import { Refund } from '../../payments/schema/refund.schema';
import { CheckoutSessionState } from '../../payments/schema/checkout-session-state.schema';
import { Notification } from '../../notifications/schema/notification.schema';
import { NotificationPreferences } from '../../notifications/schema/notification-preferences.schema';
import { ContactMessage } from '../../contact/schema/contact-message.schema';
import { WebhookEvent } from '../../payments/schema/webhook-event.schema';
import { OutboxEvent } from '../../payments/schema/outbox-event.schema';
import { BlackList } from '../../auth/schema/blacklist-tokens.schema';

async function verify() {
  const dataSource = new DataSource(databaseConfig);
  await dataSource.initialize();

  const repos = [
    { name: 'Users', repo: dataSource.getRepository(User) },
    { name: 'Categories', repo: dataSource.getRepository(Category) },
    { name: 'Products', repo: dataSource.getRepository(Product) },
    { name: 'Articles', repo: dataSource.getRepository(Article) },
    { name: 'Carts', repo: dataSource.getRepository(Cart) },
    { name: 'Cart Items', repo: dataSource.getRepository(CartItem) },
    { name: 'Orders', repo: dataSource.getRepository(Order) },
    { name: 'Order Items', repo: dataSource.getRepository(OrderItem) },
    { name: 'Payments', repo: dataSource.getRepository(Payment) },
    { name: 'Refunds', repo: dataSource.getRepository(Refund) },
    {
      name: 'Checkout Sessions',
      repo: dataSource.getRepository(CheckoutSessionState),
    },
    { name: 'Notifications', repo: dataSource.getRepository(Notification) },
    {
      name: 'Notification Prefs',
      repo: dataSource.getRepository(NotificationPreferences),
    },
    {
      name: 'Contact Messages',
      repo: dataSource.getRepository(ContactMessage),
    },
    { name: 'Webhook Events', repo: dataSource.getRepository(WebhookEvent) },
    { name: 'Outbox Events', repo: dataSource.getRepository(OutboxEvent) },
    { name: 'Blacklist Tokens', repo: dataSource.getRepository(BlackList) },
  ];

  console.log('\n📊 Database Verification:');
  console.log('   ─────────────────────────────────────');

  let total = 0;
  for (const { name, repo } of repos) {
    const count = await repo.count();
    total += count;
    console.log(`   ${name.padEnd(22)} ${String(count).padStart(4)}`);
  }

  console.log('   ─────────────────────────────────────');
  console.log(`   ${'Total'.padEnd(22)} ${String(total).padStart(4)}`);

  const categoryRepo = dataSource.getRepository(Category);
  const productRepo = dataSource.getRepository(Product);

  const categories = await categoryRepo.find({
    select: ['id', 'name', 'slug'],
    order: { name: 'ASC' },
  });

  if (categories.length > 0) {
    console.log('\n📂 Categories breakdown:');
    for (const cat of categories) {
      const productCount = await productRepo.count({
        where: { categoryId: cat.id },
      });
      console.log(`   - ${cat.name} (${cat.slug}): ${productCount} products`);
    }
  }

  await dataSource.destroy();
  console.log('\n✅ Verification complete\n');
}

verify().catch(console.error);
