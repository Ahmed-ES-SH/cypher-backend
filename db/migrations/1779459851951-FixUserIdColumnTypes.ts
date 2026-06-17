import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUserIdColumnTypes1779459851951 implements MigrationInterface {
  name = 'FixUserIdColumnTypes1779459851951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // All existing user_id values are UUIDs that don't match users.id (integer)
    // Delete orphaned data before changing column types
    await queryRunner.query(`DELETE FROM refunds`);
    await queryRunner.query(`DELETE FROM cart_items`);
    await queryRunner.query(`DELETE FROM order_items`);
    await queryRunner.query(`UPDATE orders SET payment_id = NULL`);
    await queryRunner.query(`UPDATE payments SET order_id = NULL`);
    await queryRunner.query(`DELETE FROM carts`);
    await queryRunner.query(`DELETE FROM checkout_session_states`);
    await queryRunner.query(`DELETE FROM notifications`);
    await queryRunner.query(`DELETE FROM notification_preferences`);
    await queryRunner.query(`DELETE FROM payments`);
    await queryRunner.query(`DELETE FROM orders`);

    // Alter user_id columns from uuid to integer to match users.id type
    // USING clause needed even with empty tables because no implicit cast exists
    await queryRunner.query(
      `ALTER TABLE "carts" ALTER COLUMN "user_id" TYPE integer USING user_id::text::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "user_id" TYPE integer USING user_id::text::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "user_id" TYPE integer USING user_id::text::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_session_states" ALTER COLUMN "user_id" TYPE integer USING user_id::text::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "user_id" TYPE integer USING user_id::text::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "user_id" TYPE integer USING user_id::text::integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ALTER COLUMN "user_id" TYPE uuid USING user_id::text::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "user_id" TYPE uuid USING user_id::text::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_session_states" ALTER COLUMN "user_id" TYPE uuid USING user_id::text::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "user_id" TYPE uuid USING user_id::text::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "user_id" TYPE uuid USING user_id::text::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" ALTER COLUMN "user_id" TYPE uuid USING user_id::text::uuid`,
    );
  }
}
