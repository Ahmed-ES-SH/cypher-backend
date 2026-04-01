import { User } from 'src/user/schema/user.schema';
import { DataSourceOptions, DataSource } from 'typeorm';
import { config } from 'dotenv';
import { BlackList } from 'src/auth/schema/blacklisk-tokens.schema';

// Config
config({ path: '.env' });

// Data Source Options
export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, BlackList],
  migrations: ['dist/db/migrations/*.js'],
};

const dataSource = new DataSource(databaseConfig);

export default dataSource;
