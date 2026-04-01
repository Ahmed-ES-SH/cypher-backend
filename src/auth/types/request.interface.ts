import { Request } from 'express';
import { User } from 'src/user/schema/user.schema';

export interface RequestWithUser extends Request {
  user: User;
}
