import { MigrationInterface, QueryRunner } from 'typeorm';

export class HashEmailVerificationTokensAndAddLastSentAt1781963311000 implements MigrationInterface {
  name = 'HashEmailVerificationTokensAndAddLastSentAt1781963311000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "emailVerificationLastSentAt" TIMESTAMP`,
    );

    // Existing verification tokens were stored as plain text.
    // They are now incompatible with the argon2.verify() flow.
    // Clear them; users will receive a fresh (hashed) verification
    // email automatically the next time they attempt to log in.
    await queryRunner.query(
      `UPDATE "users" SET "emailVerificationToken" = NULL, "emailVerificationTokenExpiry" = NULL WHERE "emailVerificationToken" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "emailVerificationLastSentAt"`,
    );
  }
}
