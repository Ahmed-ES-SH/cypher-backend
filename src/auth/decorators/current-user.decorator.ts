import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../types/request.interface';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
