import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config';
import { seedCategories } from './seed-categories';
import { seedProducts } from './seed-products';
import { seedArticles } from './seed-articles';
import { seedUsers } from './seed-users';
import { seedCarts } from './seed-carts';
import { seedCartItems } from './seed-cart-items';
import { seedOrders } from './seed-orders';
import { seedOrderItems } from './seed-order-items';
import { seedPayments } from './seed-payments';
import { seedRefunds } from './seed-refunds';
import { seedCheckoutSessions } from './seed-checkout-sessions';
import { seedNotifications } from './seed-notifications';
import { seedNotificationPreferences } from './seed-notification-preferences';
import { seedContactMessages } from './seed-contact-messages';
import { seedWebhookEvents } from './seed-webhook-events';
import { seedOutboxEvents } from './seed-outbox-events';
import { seedBlacklistTokens } from './seed-blacklist-tokens';

async function main() {
  const isReset = process.argv.includes('--reset');

  console.log('🌱 Starting database seed...\n');
  console.log(
    `   Mode: ${isReset ? 'reset (drop & recreate categories/products)' : 'idempotent (safe to re-run)'}`,
  );
  const startTime = Date.now();

  let dataSource: DataSource | null = null;

  try {
    console.log('🔗 Connecting to database...');
    dataSource = new DataSource(databaseConfig);
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    if (isReset) {
      console.log('📦 Resetting categories and products tables...');
      await dataSource.query('DROP TABLE IF EXISTS cart_items CASCADE');
      await dataSource.query('DROP TABLE IF EXISTS carts CASCADE');
      await dataSource.query('DROP TABLE IF EXISTS order_items CASCADE');
      await dataSource.query('DROP TABLE IF EXISTS orders CASCADE');
      await dataSource.query('DROP TABLE IF EXISTS refunds CASCADE');
      await dataSource.query('DROP TABLE IF EXISTS payments CASCADE');
      await dataSource.query(
        'DROP TABLE IF EXISTS checkout_session_states CASCADE',
      );
      await dataSource.query('DROP TABLE IF EXISTS products CASCADE');
      await dataSource.query('DROP TABLE IF EXISTS categories CASCADE');
      console.log('✅ Tables dropped\n');
    }

    const stats: Record<string, { inserted: number; skipped: number }> = {};

    const userStats = await seedUsers(dataSource);
    stats.users = userStats;

    const categoryMap = await seedCategories(dataSource);
    stats.categories = { inserted: categoryMap.size, skipped: 0 };

    const productStats = await seedProducts(dataSource, categoryMap);
    stats.products = productStats;

    const articleStats = await seedArticles(dataSource, categoryMap);
    stats.articles = articleStats;

    const contactStats = await seedContactMessages(dataSource);
    stats.contactMessages = contactStats;

    const webhookStats = await seedWebhookEvents(dataSource);
    stats.webhookEvents = webhookStats;

    const outboxStats = await seedOutboxEvents(dataSource);
    stats.outboxEvents = outboxStats;

    const cartStats = await seedCarts(dataSource);
    stats.carts = cartStats;

    const cartItemStats = await seedCartItems(dataSource);
    stats.cartItems = cartItemStats;

    const orderStats = await seedOrders(dataSource);
    stats.orders = orderStats;

    const orderItemStats = await seedOrderItems(dataSource);
    stats.orderItems = orderItemStats;

    const paymentStats = await seedPayments(dataSource);
    stats.payments = paymentStats;

    const refundStats = await seedRefunds(dataSource);
    stats.refunds = refundStats;

    const checkoutStats = await seedCheckoutSessions(dataSource);
    stats.checkoutSessions = checkoutStats;

    const notificationStats = await seedNotifications(dataSource);
    stats.notifications = notificationStats;

    const prefStats = await seedNotificationPreferences(dataSource);
    stats.notificationPreferences = prefStats;

    const blacklistStats = await seedBlacklistTokens(dataSource);
    stats.blacklistTokens = blacklistStats;

    await dataSource.destroy();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('   Summary:');
    for (const [table, s] of Object.entries(stats)) {
      console.log(
        `   - ${table}: +${s.inserted} inserted, ${s.skipped} skipped`,
      );
    }
    console.log(`\n   Total time: ${duration}s\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);

    if (dataSource) {
      try {
        await dataSource.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Unhandled seed error:', error);
  process.exit(1);
});
