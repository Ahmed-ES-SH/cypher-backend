import { DataSource } from 'typeorm';
import { User } from '../../user/schema/user.entity';
import { Cart } from '../../cart/schema/cart.schema';
import { CartItem } from '../../cart/schema/cart-item.schema';
import { Product } from '../../products/schema/product.schema';

export async function seedCartItems(
  dataSource: DataSource,
): Promise<{ inserted: number; skipped: number }> {
  console.log('\n🛒 Seeding cart items...');

  const cartRepo = dataSource.getRepository(Cart);
  const cartItemRepo = dataSource.getRepository(CartItem);
  const productRepo = dataSource.getRepository(Product);

  const carts = await cartRepo.find({ select: ['id', 'userId'] });
  if (carts.length === 0) {
    console.log('  ⚠️  No carts found. Skipping cart items.');
    return { inserted: 0, skipped: 0 };
  }

  const products = await productRepo.find({
    select: ['id', 'title', 'price', 'thumbnail', 'sku'],
    take: 6,
  });
  if (products.length === 0) {
    console.log('  ⚠️  No products found. Skipping cart items.');
    return { inserted: 0, skipped: 0 };
  }

  const existingItems = await cartItemRepo.find({
    select: ['id', 'cartId', 'productId'],
  });
  const existingKeys = new Set(
    existingItems.map((i) => `${i.cartId}:${i.productId}`),
  );

  let inserted = 0;
  let skipped = 0;

  for (let cartIndex = 0; cartIndex < carts.length; cartIndex++) {
    const cart = carts[cartIndex]!;
    const itemsPerCart = cartIndex === 0 ? 3 : 2;

    for (let i = 0; i < itemsPerCart && i < products.length; i++) {
      const product = products[(cartIndex + i) % products.length];
      if (!product) continue;
      const key = `${cart.id}:${product.id}`;

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const cartItem = cartItemRepo.create({
        cartId: cart.id,
        productId: product.id,
        quantity: i + 1,
      });
      await cartItemRepo.save(cartItem);
      inserted++;
    }
  }

  console.log(`  → Inserted: ${inserted}`);
  console.log(`  → Skipped (existing): ${skipped}`);
  console.log('✅ Cart items seeded successfully\n');

  return { inserted, skipped };
}
