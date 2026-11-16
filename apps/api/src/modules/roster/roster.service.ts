import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ShoppingRosterEntity } from '../../database/entities/shopping-roster.entity';
import { SwapRequestEntity } from '../../database/entities/swap-request.entity';
import { MessEntity } from '../../database/entities/mess.entity';
import { MembershipEntity } from '../../database/entities/membership.entity';
import { MealRuleEntity } from '../../database/entities/meal-rule.entity';
import { RosterShuffler } from '../../domain/roster-shuffler/roster-shuffler';
import { VoteShoppingDayDto, RequestSwapDto, ReviewSwapDto } from './dto/roster.dto';
import {
  RosterSource,
  SwapStatus,
  RuleKind,
  ShoppingRosterDto,
  SwapRequestDto
} from '@mess/shared';

@Injectable()
export class RosterService {
  constructor(
    @InjectRepository(ShoppingRosterEntity)
    private rosterRepo: Repository<ShoppingRosterEntity>,
    @InjectRepository(SwapRequestEntity)
    private swapRepo: Repository<SwapRequestEntity>,
    @InjectRepository(MessEntity)
    private messRepo: Repository<MessEntity>,
    @InjectRepository(MembershipEntity)
    private membershipRepo: Repository<MembershipEntity>,
    @InjectRepository(MealRuleEntity)
    private ruleRepo: Repository<MealRuleEntity>
  ) {}

  /**
   * Boarder votes for preferred shopping date.
   * Seat count is capped by mess.shoppersPerDay (first vote wins).
   */
  async voteDate(
    messId: string,
    membershipId: string,
    dto: VoteShoppingDayDto
  ): Promise<ShoppingRosterDto> {
    const mess = await this.messRepo.findOne({ where: { id: messId } });
    if (!mess) throw new NotFoundException('Mess not found');

    const targetMonth = dto.date.slice(0, 7);
    const startDate = `${targetMonth}-01`;
    const [year, m] = targetMonth.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year!, m!, 0)).getUTCDate();
    const endDate = `${targetMonth}-${String(lastDay).padStart(2, '0')}`;

    // Check user vote count in this month
    const userVotes = await this.rosterRepo.count({
      where: {
        membershipId,
        date: Between(startDate, endDate)
      }
    });

    if (userVotes >= mess.shopTimesPerMonth) {
      throw new BadRequestException(
        `You have already reached your shopping duty quota (${mess.shopTimesPerMonth} times) for this month`
      );
    }

    // Check capacity on target date
    const dateCount = await this.rosterRepo.count({
      where: {
        messId,
        date: dto.date
      }
    });

    if (dateCount >= mess.shoppersPerDay) {
      throw new ConflictException('This shopping date is full. Please choose another date');
    }

    // Check if user already voting on this date
    const existing = await this.rosterRepo.findOne({
      where: {
        membershipId,
        date: dto.date
      }
    });

    if (existing) {
      throw new ConflictException('You are already scheduled for this date');
    }

    const roster = this.rosterRepo.create({
      messId,
      date: dto.date,
      membershipId,
      source: RosterSource.VOTE
    });

    const saved = await this.rosterRepo.save(roster);
    return this.toDto(saved);
  }

  /**
   * Requests a shopping duty swap with another boarder.
   */
  async requestSwap(membershipId: string, dto: RequestSwapDto): Promise<SwapRequestDto> {
    const roster = await this.rosterRepo.findOne({
      where: { id: dto.rosterId, membershipId }
    });

    if (!roster) {
      throw new NotFoundException('Roster assignment not found for this member');
    }

    const targetMember = await this.membershipRepo.findOne({
      where: { id: dto.toMembershipId, messId: roster.messId, isActive: true }
    });

    if (!targetMember) {
      throw new NotFoundException('Target boarder not found in this mess');
    }

    const swap = this.swapRepo.create({
      rosterId: dto.rosterId,
      fromMembershipId: membershipId,
      toMembershipId: dto.toMembershipId,
      status: SwapStatus.PENDING
    });

    const saved = await this.swapRepo.save(swap);
    return {
      id: saved.id,
      rosterId: saved.rosterId,
      fromMembershipId: saved.fromMembershipId,
      toMembershipId: saved.toMembershipId,
      status: saved.status,
      createdAt: saved.createdAt.toISOString()
    };
  }

  /**
   * Manager reviews and approves or rejects swap request.
   */
  async reviewSwap(swapId: string, dto: ReviewSwapDto): Promise<SwapRequestDto> {
    const swap = await this.swapRepo.findOne({
      where: { id: swapId },
      relations: ['roster']
    });

    if (!swap) {
      throw new NotFoundException('Swap request not found');
    }

    if (swap.status !== SwapStatus.PENDING) {
      throw new BadRequestException('Swap request has already been processed');
    }

    swap.status = dto.status;
    await this.swapRepo.save(swap);

    if (dto.status === SwapStatus.APPROVED) {
      // Reassign roster entry to the new member
      swap.roster.membershipId = swap.toMembershipId;
      swap.roster.source = RosterSource.SWAP;
      await this.rosterRepo.save(swap.roster);
    }

    return {
      id: swap.id,
      rosterId: swap.rosterId,
      fromMembershipId: swap.fromMembershipId,
      toMembershipId: swap.toMembershipId,
      status: swap.status,
      createdAt: swap.createdAt.toISOString()
    };
  }

  /**
   * Auto shuffles remaining unassigned dates for a month using RosterShuffler.
   */
  async autoShuffleMonth(messId: string, month: string): Promise<ShoppingRosterDto[]> {
    const mess = await this.messRepo.findOne({ where: { id: messId } });
    if (!mess) throw new NotFoundException('Mess not found');

    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year!, m!, 0)).getUTCDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const members = await this.membershipRepo.find({
      where: { messId, isActive: true }
    });

    const existing = await this.rosterRepo.find({
      where: { messId, date: Between(startDate, endDate) }
    });

    // Fetch range rules to determine who is away
    const rules = await this.ruleRepo.find({
      where: { kind: RuleKind.RANGE, status: false }
    });

    const demands = [];
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${month}-${String(day).padStart(2, '0')}`;
      demands.push({
        date: dateStr,
        requiredShoppers: mess.shoppersPerDay
      });
    }

    const boarderProfiles = members.map((member) => {
      const assigned = existing.filter((e) => e.membershipId === member.id).length;
      return {
        membershipId: member.id,
        assignedCount: assigned,
        isAvailableOnDate: (d: string) => {
          const leave = rules.find((r) => {
            if (r.membershipId !== member.id) return false;
            if (r.toDate) return d >= r.fromDate && d <= r.toDate;
            return d >= r.fromDate;
          });
          return !leave;
        }
      };
    });

    const autoAssigned = RosterShuffler.autoShuffle(
      demands,
      boarderProfiles,
      existing.map((e) => ({
        date: e.date,
        membershipId: e.membershipId,
        source: e.source
      }))
    );

    // Persist new auto-assigned entries
    for (const a of autoAssigned) {
      const found = existing.find((e) => e.date === a.date && e.membershipId === a.membershipId);
      if (!found) {
        const row = this.rosterRepo.create({
          messId,
          date: a.date,
          membershipId: a.membershipId,
          source: a.source
        });
        await this.rosterRepo.save(row);
      }
    }

    return this.findMonthRoster(messId, month);
  }

  /**
   * Retrieves full roster for a month.
   */
  async findMonthRoster(messId: string, month: string): Promise<ShoppingRosterDto[]> {
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year!, m!, 0)).getUTCDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const roster = await this.rosterRepo.find({
      where: { messId, date: Between(startDate, endDate) },
      relations: ['membership', 'membership.user'],
      order: { date: 'ASC' }
    });

    return roster.map((r) => this.toDto(r));
  }

  private toDto(r: ShoppingRosterEntity): ShoppingRosterDto {
    return {
      id: r.id,
      messId: r.messId,
      date: r.date,
      membershipId: r.membershipId,
      source: r.source,
      member: r.membership
        ? {
            id: r.membership.id,
            userId: r.membership.userId,
            messId: r.membership.messId,
            role: r.membership.role,
            isActive: r.membership.isActive,
            cookBillAmount: r.membership.cookBillAmount,
            joinedAt: r.membership.joinedAt.toISOString(),
            user: r.membership.user
              ? {
                  id: r.membership.user.id,
                  name: r.membership.user.name,
                  phone: r.membership.user.phone,
                  avatarUrl: r.membership.user.avatarUrl,
                  createdAt: r.membership.user.createdAt.toISOString()
                }
              : undefined
          }
        : undefined
    };
  }
}
