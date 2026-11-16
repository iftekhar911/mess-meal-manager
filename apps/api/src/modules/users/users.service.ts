import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { UserDto } from '@mess/shared';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>
  ) {}

  /**
   * Finds a user by ID.
   *
   * @param id - User identifier.
   * @returns User DTO.
   */
  async findById(id: string): Promise<UserDto> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString()
    };
  }

  /**
   * Updates user profile name or avatar URL.
   *
   * @param id - User identifier.
   * @param data - Update payload.
   * @returns Updated User DTO.
   */
  async updateProfile(id: string, data: { name?: string; avatarUrl?: string }): Promise<UserDto> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.name) {
      user.name = data.name;
    }
    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl;
    }

    await this.userRepo.save(user);

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString()
    };
  }
}
