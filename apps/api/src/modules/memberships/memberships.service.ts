import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AddBoarderDto, UpdateMembershipDto } from './dto/membership.dto';
import { MembershipDto, MembershipRole } from '@mess/shared';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(MembershipEntity)
    private membershipRepo: Repository<MembershipEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>
  ) {}

  /**
   * Adds a boarder to a mess by phone number.
   * If the user does not exist, registers a placeholder account with an initial temporary password.
   *
   * @param messId - Mess identifier.
   * @param dto - Add boarder inputs.
   * @returns Newly created Membership DTO.
   */
  async addBoarder(messId: string, dto: AddBoarderDto): Promise<MembershipDto> {
    let user = await this.userRepo.findOne({ where: { phone: dto.phone } });

    if (!user) {
      const defaultPassword = 'TemporaryPassword123!';
      const passwordHash = await argon2.hash(defaultPassword, {
        type: argon2.argon2id
      });

      user = this.userRepo.create({
        name: dto.name || `Boarder ${dto.phone.slice(-4)}`,
        phone: dto.phone,
        passwordHash
      });
      await this.userRepo.save(user);
    }

    const existingMembership = await this.membershipRepo.findOne({
      where: { userId: user.id, messId }
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException('User is already an active member of this mess');
      }
      // Reactivate membership
      existingMembership.isActive = true;
      existingMembership.leftAt = null;
      if (dto.role) existingMembership.role = dto.role;
      if (dto.cookBillAmount !== undefined) {
        existingMembership.cookBillAmount = dto.cookBillAmount.toFixed(4);
      }
      const reactivated = await this.membershipRepo.save(existingMembership);
      return this.toDto(reactivated, user);
    }

    const membership = this.membershipRepo.create({
      userId: user.id,
      messId,
      role: dto.role || MembershipRole.BOARDER,
      isActive: true,
      cookBillAmount: (dto.cookBillAmount ?? 250.0).toFixed(4)
    });

    const saved = await this.membershipRepo.save(membership);
    return this.toDto(saved, user);
  }

  /**
   * Lists all members of a given mess.
   *
   * @param messId - Mess identifier.
   * @param activeOnly - Whether to filter by active status.
   * @returns Array of Membership DTOs.
   */
  async findByMess(messId: string, activeOnly = true): Promise<MembershipDto[]> {
    const where: { messId: string; isActive?: boolean } = { messId };
    if (activeOnly) {
      where.isActive = true;
    }

    const memberships = await this.membershipRepo.find({
      where,
      relations: ['user'],
      order: { joinedAt: 'ASC' }
    });

    return memberships.map((m) => this.toDto(m, m.user));
  }

  /**
   * Retrieves a specific membership by ID.
   *
   * @param membershipId - Membership identifier.
   * @returns Membership DTO.
   */
  async findById(membershipId: string): Promise<MembershipDto> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId },
      relations: ['user', 'mess']
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return this.toDto(membership, membership.user);
  }

  /**
   * Updates membership configuration (role, cook bill, active status).
   *
   * @param membershipId - Membership identifier.
   * @param dto - Partial updates.
   * @returns Updated Membership DTO.
   */
  async update(membershipId: string, dto: UpdateMembershipDto): Promise<MembershipDto> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId },
      relations: ['user']
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (dto.role !== undefined) membership.role = dto.role;
    if (dto.cookBillAmount !== undefined) {
      membership.cookBillAmount = dto.cookBillAmount.toFixed(4);
    }
    if (dto.isActive !== undefined) {
      membership.isActive = dto.isActive;
      if (!dto.isActive) {
        membership.leftAt = new Date();
      }
    }

    const saved = await this.membershipRepo.save(membership);
    return this.toDto(saved, membership.user);
  }

  private toDto(m: MembershipEntity, user?: UserEntity): MembershipDto {
    return {
      id: m.id,
      userId: m.userId,
      messId: m.messId,
      role: m.role,
      isActive: m.isActive,
      cookBillAmount: m.cookBillAmount,
      joinedAt: m.joinedAt.toISOString(),
      user: user
        ? {
            id: user.id,
            name: user.name,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt.toISOString()
          }
        : undefined
    };
  }
}
