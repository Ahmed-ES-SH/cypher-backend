import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  avatar?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  googleId?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  password: string;
}
