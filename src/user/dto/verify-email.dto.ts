import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @MinLength(6)
  @ApiProperty()
  token: string;

  @IsEmail()
  @ApiProperty({ description: 'Email of the user being verified' })
  email: string;
}
