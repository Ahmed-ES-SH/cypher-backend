import { HttpException, HttpStatus } from '@nestjs/common';

export class EmailNotVerifiedException extends HttpException {
  constructor() {
    super(
      {
        message:
          'Your account is not verified, please verify your email, check your inbox for the verification link',
        code: 'EMAIL_NOT_VERIFIED',
      },
      HttpStatus.CONFLICT,
    );
  }
}
