import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoticeEntity } from '../../database/entities/notice.entity';
import { CreateNoticeDto } from './dto/notice.dto';
import { NoticeDto } from '@mess/shared';

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(NoticeEntity)
    private noticeRepo: Repository<NoticeEntity>
  ) {}

  /**
   * Posts a new notice to the mess board.
   */
  async create(messId: string, authorId: string, dto: CreateNoticeDto): Promise<NoticeDto> {
    const notice = this.noticeRepo.create({
      messId,
      authorId,
      title: dto.title,
      body: dto.body
    });

    const saved = await this.noticeRepo.save(notice);
    return this.toDto(saved);
  }

  /**
   * Lists all notices for a mess.
   */
  async findByMess(messId: string): Promise<NoticeDto[]> {
    const notices = await this.noticeRepo.find({
      where: { messId },
      relations: ['author'],
      order: { createdAt: 'DESC' }
    });

    return notices.map((n) => this.toDto(n, n.author?.name));
  }

  private toDto(n: NoticeEntity, authorName?: string): NoticeDto {
    return {
      id: n.id,
      messId: n.messId,
      authorId: n.authorId,
      title: n.title,
      body: n.body,
      authorName,
      createdAt: n.createdAt.toISOString()
    };
  }
}
