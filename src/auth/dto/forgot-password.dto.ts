import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email: string;
}
