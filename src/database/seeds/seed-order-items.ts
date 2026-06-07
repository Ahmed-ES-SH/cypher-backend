import { DataSource } from 'typeorm';
import { Order } from '../../orders/schema/order.schema';
import { OrderItem } from '../../orders/schema/order-item.schema';
import { Product } from '../../products/schema/product.schema';

export async function seedOrderItems(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n📋 Seeding order items...');

  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);
  const productRepo = dataSource.getRepository(Product);

  const orders = await orderRepo.find({ select: ['id', 'status'] });
  if (orders.length === 0) {
    console.log('  ⚠️  No orders found. Skipping order items.');
    return { inserted: 0, skipped: 0 };
  }

  const products = await productRepo.find({
    select: ['id', 'title', 'price', 'thumbnail'],
    take: 4,
  });
  if (products.length === 0) {
    console.log('  ⚠️  No products found. Skipping order items.');
    return { inserted: 0, skipped: 0 };
  }

  const existingItems = await orderItemRepo.find({
    select: ['id', 'orderId', 'productId'],
  });
  const existingKeys = new Set(
    existingItems.map((i) => `${i.orderId}:${i.productId}`),
  );

  let inserted = 0;
  let skipped = 0;

  for (let orderIndex = 0; orderIndex < orders.length; orderIndex++) {
    const order = orders[orderIndex]!;
    const itemsPerOrder = orderIndex === 0 ? 2 : 1;

    for (let i = 0; i < itemsPerOrder && i < products.length; i++) {
      const product = products[(orderIndex + i) % products.length];
      if (!product) continue;
      const key = `${order.id}:${product.id}`;

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const quantity = i + 1;
      const unitPrice = Math.round(product.price * 100);

      const orderItem = orderItemRepo.create({
        orderId: order.id,
        productId: product.id,
        productTitleSnapshot: product.title,
        productThumbnailSnapshot: product.thumbnail,
        unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
        currency: 'usd',
        metadataSnapshot: {},
      });
      await orderItemRepo.save(orderItem);
      inserted++;
    }
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Order items seeded successfully\n');

  return { inserted, skipped };
}
