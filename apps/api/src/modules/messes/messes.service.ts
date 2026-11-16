import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MessEntity } from '../../database/entities/mess.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { CreateMessDto, UpdateMessDto } from './dto/mess.dto';
import { MessDto, MembershipRole } from '@mess/shared';

@Injectable()
export class MessesService {
  constructor(
    @InjectRepository(MessEntity)
    private messRepo: Repository<MessEntity>,
    @InjectRepository(MembershipEntity)
    private membershipRepo: Repository<MembershipEntity>,
    private dataSource: DataSource
  ) {}

  /**
   * Creates a new mess and registers the creator as the first MANAGER.
   *
   * @param creatorUserId - Authenticated user identifier.
   * @param dto - Mess initial settings.
   * @returns Newly created Mess DTO.
   */
  async create(creatorUserId: string, dto: CreateMessDto): Promise<MessDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const mess = queryRunner.manager.create(MessEntity, {
        name: dto.name,
        cutoffTime: dto.cutoffTime || '22:00:00',
        mealRate: (dto.mealRate ?? 50.0).toFixed(4),
        graceDays: dto.graceDays ?? 3,
        warningDays: dto.warningDays ?? 2,
        shoppersPerDay: dto.shoppersPerDay ?? 2,
        shopTimesPerMonth: dto.shopTimesPerMonth ?? 2
      });

      const savedMess = await queryRunner.manager.save(mess);

      const membership = queryRunner.manager.create(MembershipEntity, {
        userId: creatorUserId,
        messId: savedMess.id,
        role: MembershipRole.MANAGER,
        isActive: true,
        cookBillAmount: '250.0000'
      });

      await queryRunner.manager.save(membership);
      await queryRunner.commitTransaction();

      return this.toDto(savedMess);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves a mess by ID.
   *
   * @param id - Mess identifier.
   * @returns Mess DTO.
   */
  async findById(id: string): Promise<MessDto> {
    const mess = await this.messRepo.findOne({ where: { id } });
    if (!mess) {
      throw new NotFoundException('Mess not found');
    }
    return this.toDto(mess);
  }

  /**
   * Updates mess configuration settings.
   *
   * @param id - Mess identifier.
   * @param dto - Partial settings update.
   * @returns Updated Mess DTO.
   */
  async update(id: string, dto: UpdateMessDto): Promise<MessDto> {
    const mess = await this.messRepo.findOne({ where: { id } });
    if (!mess) {
      throw new NotFoundException('Mess not found');
    }

    if (dto.name !== undefined) mess.name = dto.name;
    if (dto.cutoffTime !== undefined) mess.cutoffTime = dto.cutoffTime;
    if (dto.mealRate !== undefined) mess.mealRate = dto.mealRate.toFixed(4);
    if (dto.graceDays !== undefined) mess.graceDays = dto.graceDays;
    if (dto.warningDays !== undefined) mess.warningDays = dto.warningDays;
    if (dto.shoppersPerDay !== undefined) mess.shoppersPerDay = dto.shoppersPerDay;
    if (dto.shopTimesPerMonth !== undefined) mess.shopTimesPerMonth = dto.shopTimesPerMonth;

    const updated = await this.messRepo.save(mess);
    return this.toDto(updated);
  }

  /**
   * Retrieves all messes associated with a user.
   *
   * @param userId - User identifier.
   * @returns List of Mess DTOs.
   */
  async findByUser(userId: string): Promise<MessDto[]> {
    const memberships = await this.membershipRepo.find({
      where: { userId, isActive: true },
      relations: ['mess']
    });

    return memberships.map((m) => this.toDto(m.mess));
  }

  private toDto(mess: MessEntity): MessDto {
    return {
      id: mess.id,
      name: mess.name,
      cutoffTime: mess.cutoffTime,
      mealRate: mess.mealRate,
      graceDays: mess.graceDays,
      warningDays: mess.warningDays,
      shoppersPerDay: mess.shoppersPerDay,
      shopTimesPerMonth: mess.shopTimesPerMonth,
      createdAt: mess.createdAt.toISOString()
    };
  }
}
