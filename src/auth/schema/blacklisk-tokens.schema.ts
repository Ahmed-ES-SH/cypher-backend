import { IsNotEmpty, IsString } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('black_list_tokens')
export class BlackList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  @IsString()
  @IsNotEmpty()
  token: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
