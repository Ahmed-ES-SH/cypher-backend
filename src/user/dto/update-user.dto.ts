import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRoleEnum } from 'src/auth/types/UserRoleEnum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  name?: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty()
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  avatar?: string;

  @IsEnum(UserRoleEnum)
  @IsOptional()
  @ApiProperty()
  role?: UserRoleEnum;

  @IsString()
  @MinLength(6)
  @IsOptional()
  @ApiProperty()
  password?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  isEmailVerified?: boolean;
}
