import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UserEntity } from '../../database/entities/user.entity';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockTokenRepo: Record<string, jest.Mock>;
  let mockMembershipRepo: Record<string, jest.Mock>;
  let mockJwtService: Record<string, jest.Mock>;
  let mockConfigService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'user-uuid-1', ...dto, createdAt: new Date() })),
      save: jest.fn().mockImplementation((user) => Promise.resolve({ id: 'user-uuid-1', ...user }))
    };

    mockTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 'token-uuid-1', ...dto })),
      save: jest
        .fn()
        .mockImplementation((token) => Promise.resolve({ id: 'token-uuid-1', ...token })),
      update: jest.fn().mockResolvedValue({ affected: 1 })
    };

    mockMembershipRepo = {
      findOne: jest.fn().mockResolvedValue(null)
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_access_token')
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test_jwt_access_secret_32_characters';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        return defaultValue;
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepo
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: mockTokenRepo
        },
        {
          provide: getRepositoryToken(MembershipEntity),
          useValue: mockMembershipRepo
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register a new user with hashed password and return tokens', async () => {
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue(null);

    const result = await service.register({
      name: 'Tanvir Hossain',
      phone: '01711223344',
      password: 'StrongPassword123!'
    });

    expect(result.response.user.name).toBe('Tanvir Hossain');
    expect(result.response.accessToken).toBe('mock_jwt_access_token');
    expect(result.rawRefreshToken).toBeDefined();
    expect(mockUserRepo.save).toHaveBeenCalled();
  });

  it('should throw ConflictException if phone number already registered', async () => {
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.register({
        name: 'Another User',
        phone: '01711223344',
        password: 'Password123!'
      })
    ).rejects.toThrow(ConflictException);
  });

  it('should authenticate valid credentials and issue tokens', async () => {
    const passwordHash = await argon2.hash('ValidPassword123!', { type: argon2.argon2id });
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Rahim',
      phone: '01711223344',
      passwordHash,
      avatarUrl: null,
      createdAt: new Date()
    });

    const result = await service.login({
      phone: '01711223344',
      password: 'ValidPassword123!'
    });

    expect(result.response.user.id).toBe('user-1');
    expect(result.response.accessToken).toBe('mock_jwt_access_token');
    expect(result.rawRefreshToken).toBeDefined();
  });

  it('should throw UnauthorizedException on invalid password', async () => {
    const passwordHash = await argon2.hash('CorrectPassword123!', { type: argon2.argon2id });
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'user-1',
      passwordHash
    });

    await expect(
      service.login({
        phone: '01711223344',
        password: 'WrongPassword'
      })
    ).rejects.toThrow(UnauthorizedException);
  });
});
