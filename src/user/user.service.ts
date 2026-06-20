import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  RequestTimeoutException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, FindOptionsWhere, Repository, Not, IsNull } from 'typeorm';
import { User } from './schema/user.entity';
import * as argon2 from 'argon2';
import { paginate, PaginatedResult } from 'src/helpers/paginate.helper';
import { FilterOptionsDto } from './dto/filter-options.dto';
import { UserRoleEnum } from 'src/auth/types/UserRoleEnum';
import { StatusEnum } from 'src/auth/types/StatusEnum';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const isExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (isExists) throw new BadRequestException('User already exists');

    const hashedPassword = await argon2.hash(dto.password);

    const user = this.userRepo.create({ ...dto, password: hashedPassword });
    const savedUser = await this.userRepo.save(user);

    try {
      const token = await this.mailService.sendVerificationEmail(savedUser);
      await this.persistHashedVerificationToken(savedUser.id, token);
    } catch (error) {
      this.logger.error(
        'Verification email failed after registration',
        error instanceof Error ? error.stack : String(error),
      );
      throw new RequestTimeoutException(
        'Failed to send verification email. Please try again.',
      );
    }

    return savedUser;
  }

  async stats(): Promise<{
    total: number;
    adminsNumber: number;
    verifiedUsersNumber: number;
    unverifiedUsersNumber: number;
    active: number;
    inactive: number;
    banned: number;
    premium: number;
    oauthUsers: number;
  }> {
    const [
      total,
      adminsNumber,
      verifiedUsersNumber,
      unverifiedUsersNumber,
      active,
      inactive,
      banned,
      premium,
      oauthUsers,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { role: UserRoleEnum.ADMIN } }),
      this.userRepo.count({ where: { isEmailVerified: true } }),
      this.userRepo.count({ where: { isEmailVerified: false } }),
      this.userRepo.count({ where: { status: StatusEnum.ACTIVE } }),
      this.userRepo.count({ where: { status: StatusEnum.INACTIVE } }),
      this.userRepo.count({ where: { status: StatusEnum.BANNED } }),
      this.userRepo.count({ where: { isPremium: true } }),
      this.userRepo.count({ where: { googleId: Not(IsNull()) } }),
    ]);

    return {
      total,
      adminsNumber,
      verifiedUsersNumber,
      unverifiedUsersNumber,
      active,
      inactive,
      banned,
      premium,
      oauthUsers,
    };
  }

  async findAll(options: FilterOptionsDto): Promise<PaginatedResult<User>> {
    const { page, limit, role, search, status } = options;

    const baseWhere: FindOptionsWhere<User> = {};
    if (role) baseWhere.role = role;
    if (status) baseWhere.status = status;

    // Build where clause: if search is present, use OR across name/email
    const where: FindOptionsWhere<User> | FindOptionsWhere<User>[] = search
      ? [
          { ...baseWhere, name: ILike(`%${search}%`) },
          { ...baseWhere, email: ILike(`%${search}%`) },
        ]
      : baseWhere;

    return paginate(this.userRepo, page, limit, {
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, currentUser?: User): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    // Non-admin users can only view their own profile
    if (
      currentUser &&
      currentUser.role !== UserRoleEnum.ADMIN &&
      currentUser.id !== user.id
    ) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return user;
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    currentUser?: User,
  ): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    // Non-admin users can only update their own profile
    if (
      currentUser &&
      currentUser.role !== UserRoleEnum.ADMIN &&
      currentUser.id !== user.id
    ) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const isAdmin = currentUser?.role === UserRoleEnum.ADMIN;

    if (dto.email && dto.email !== user.email) {
      user.email = dto.email;
      user.isEmailVerified = false; // require re-verification after email change
    }
    if (dto.password) user.password = await argon2.hash(dto.password);
    if (dto.name) user.name = dto.name;
    if (dto.avatar) user.avatar = dto.avatar;

    // Only admins can change role and status
    if (isAdmin && dto.role) user.role = dto.role;
    if (isAdmin && dto.status) user.status = dto.status;

    return this.userRepo.save(user);
  }

  async remove(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    return this.userRepo.remove(user);
  }

  async findById(id: number): Promise<User> {
    return this.findOne(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async verifyEmail({
    token,
    email,
  }: {
    token: string;
    email: string;
  }): Promise<User> {
    if (!token || !email) {
      throw new BadRequestException('Token and email are required');
    }

    const user = await this.userRepo.findOne({ where: { email } });

    if (!user || !user.emailVerificationToken) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('The user is already verified');
    }

    if (
      user.emailVerificationTokenExpiry &&
      user.emailVerificationTokenExpiry < new Date()
    ) {
      throw new BadRequestException(
        'Verification link has expired. Please request a new one.',
      );
    }

    const isValid = await argon2.verify(user.emailVerificationToken, token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification link');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiry = null;
    user.emailVerificationLastSentAt = null;

    return this.userRepo.save(user);
  }

  // MARK: Private helpers

  private async persistHashedVerificationToken(
    userId: number,
    plainToken: string,
  ): Promise<void> {
    const hashedToken = await argon2.hash(plainToken);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    await this.userRepo.update(userId, {
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiry: expiry,
      emailVerificationLastSentAt: new Date(),
    });
  }
}
