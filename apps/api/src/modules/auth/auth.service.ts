import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { UserEntity } from '../../database/entities/user.entity';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { AuthResponseDto } from '@mess/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private tokenRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(MembershipEntity)
    private membershipRepo: Repository<MembershipEntity>,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  /**
   * Registers a new user with Argon2id password hashing.
   *
   * @param dto - Registration inputs.
   * @returns User profile, access token, and raw refresh token for cookie.
   */
  async register(
    dto: RegisterDto
  ): Promise<{ response: AuthResponseDto; rawRefreshToken: string }> {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone }
    });

    if (existing) {
      throw new ConflictException('A user with this phone number already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id
    });

    const user = this.userRepo.create({
      name: dto.name,
      phone: dto.phone,
      passwordHash
    });

    await this.userRepo.save(user);

    const accessToken = this.generateAccessToken(user.id, user.phone);
    const rawRefreshToken = await this.createRefreshToken(user.id);

    return {
      response: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt.toISOString()
        },
        accessToken
      },
      rawRefreshToken
    };
  }

  /**
   * Authenticates user credentials and issues session tokens.
   *
   * @param dto - Login credentials.
   * @returns User profile, active mess, access token, and raw refresh token.
   */
  async login(dto: LoginDto): Promise<{ response: AuthResponseDto; rawRefreshToken: string }> {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const isValidPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    // Find default active mess membership if available
    const activeMembership = await this.membershipRepo.findOne({
      where: { userId: user.id, isActive: true },
      order: { joinedAt: 'DESC' }
    });

    const accessToken = this.generateAccessToken(user.id, user.phone);
    const rawRefreshToken = await this.createRefreshToken(user.id);

    return {
      response: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt.toISOString()
        },
        accessToken,
        activeMessId: activeMembership?.messId
      },
      rawRefreshToken
    };
  }

  /**
   * Refreshes access token and rotates the refresh token.
   * Detects refresh token reuse and revokes all sessions if compromised.
   *
   * @param rawToken - Refresh token provided in HTTP-only cookie.
   * @returns New access token and new raw refresh token.
   */
  async refreshTokens(
    rawToken: string
  ): Promise<{ response: AuthResponseDto; newRawRefreshToken: string }> {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawToken);
    const tokenRecord = await this.tokenRepo.findOne({
      where: { tokenHash },
      relations: ['user']
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: token was already revoked
    if (tokenRecord.revokedAt) {
      // Invalidate all active sessions for this user
      await this.tokenRepo.update({ userId: tokenRecord.userId }, { revokedAt: new Date() });
      throw new UnauthorizedException('Token reuse detected. All sessions have been revoked');
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke old token and rotate
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);

    tokenRecord.revokedAt = new Date();
    tokenRecord.replacedBy = newTokenHash;
    await this.tokenRepo.save(tokenRecord);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newTokenRecord = this.tokenRepo.create({
      userId: tokenRecord.userId,
      tokenHash: newTokenHash,
      expiresAt
    });
    await this.tokenRepo.save(newTokenRecord);

    const user = tokenRecord.user;
    const accessToken = this.generateAccessToken(user.id, user.phone);

    const activeMembership = await this.membershipRepo.findOne({
      where: { userId: user.id, isActive: true },
      order: { joinedAt: 'DESC' }
    });

    return {
      response: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt.toISOString()
        },
        accessToken,
        activeMessId: activeMembership?.messId
      },
      newRawRefreshToken
    };
  }

  /**
   * Revokes the current refresh token on user logout.
   *
   * @param rawToken - Raw refresh token from cookie.
   */
  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) {
      return;
    }
    const tokenHash = this.hashToken(rawToken);
    await this.tokenRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  /**
   * Revokes all active refresh tokens for the given user.
   *
   * @param userId - Unique user identifier.
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.tokenRepo.update({ userId }, { revokedAt: new Date() });
  }

  private generateAccessToken(userId: string, phone: string): string {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET')!;
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    return this.jwtService.sign(
      { sub: userId, phone },
      {
        secret,
        expiresIn: expiresIn as unknown as undefined
      }
    );
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = this.tokenRepo.create({
      userId,
      tokenHash,
      expiresAt
    });

    await this.tokenRepo.save(token);
    return rawToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
