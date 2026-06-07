import { HttpException, HttpStatus } from '@nestjs/common';

export class EmailNotVerifiedException extends HttpException {
  constructor() {
    super(
      {
        message: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
      },
      HttpStatus.CONFLICT,
    );
  }
}
