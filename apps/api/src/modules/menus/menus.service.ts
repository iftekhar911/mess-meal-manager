import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyMenuEntity } from '../../database/entities/daily-menu.entity';
import { SetDailyMenuDto } from './dto/menu.dto';
import { DailyMenuDto } from '@mess/shared';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(DailyMenuEntity)
    private menuRepo: Repository<DailyMenuEntity>
  ) {}

  /**
   * Sets or updates daily shopper menu.
   */
  async setMenu(
    messId: string,
    shopperMembershipId: string | null,
    dto: SetDailyMenuDto
  ): Promise<DailyMenuDto> {
    let menu = await this.menuRepo.findOne({
      where: { messId, date: dto.date }
    });

    if (!menu) {
      menu = this.menuRepo.create({
        messId,
        date: dto.date,
        shopperId: shopperMembershipId,
        protein: dto.protein,
        note: dto.note || null
      });
    } else {
      menu.protein = dto.protein;
      if (dto.note !== undefined) menu.note = dto.note;
      if (shopperMembershipId) menu.shopperId = shopperMembershipId;
    }

    const saved = await this.menuRepo.save(menu);
    return this.toDto(saved);
  }

  /**
   * Gets daily menu for a specific date in a mess.
   */
  async getMenu(messId: string, date: string): Promise<DailyMenuDto | null> {
    const menu = await this.menuRepo.findOne({
      where: { messId, date }
    });
    return menu ? this.toDto(menu) : null;
  }

  private toDto(m: DailyMenuEntity): DailyMenuDto {
    return {
      id: m.id,
      messId: m.messId,
      date: m.date,
      shopperId: m.shopperId,
      protein: m.protein,
      note: m.note
    };
  }
}
