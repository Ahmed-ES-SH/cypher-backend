import { MigrationInterface, QueryRunner } from "typeorm";

export class BlackList1775024295566 implements MigrationInterface {
    name = 'BlackList1775024295566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "black_list_tokens" ADD "userId" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "black_list_tokens" DROP COLUMN "userId"`);
    }

}
