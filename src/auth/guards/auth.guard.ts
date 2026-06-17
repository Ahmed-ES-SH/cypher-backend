import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Request } from 'express';
import { AuthService } from '../auth.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestWithUser } from '../types/request.interface';
import { UserRoleEnum } from '../types/UserRoleEnum';
import { User } from '../../user/schema/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly cookieName: string;

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.cookieName =
      this.configService.get<string>('AUTH_TOKEN') ?? 'cypher_auth_token';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token: string | undefined = request.cookies?.[this.cookieName];

    if (!token) {
      throw new UnauthorizedException('Authentication cookie not found');
    }

    try {
      const decodedToken = await this.jwtService.verifyAsync<{
        id: number;
        email: string;
        role: UserRoleEnum;
      }>(token);

      const isBlacklisted = await this.authService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('This token has been revoked');
      }

      const user = await this.userRepo.findOne({ where: { id: decodedToken.id } });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request.user = user;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
