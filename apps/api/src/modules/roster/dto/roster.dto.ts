import { ApiProperty } from '@nestjs/swagger';
import { Matches, IsUUID, IsEnum } from 'class-validator';
import { SwapStatus } from '@mess/shared';

export class VoteShoppingDayDto {
  @ApiProperty({ example: '2026-11-22' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date!: string;
}

export class RequestSwapDto {
  @ApiProperty({ example: 'b567d2b2-65a3-48df-b593-9d41b528a49c' })
  @IsUUID()
  rosterId!: string;

  @ApiProperty({ example: 'a123d2b2-65a3-48df-b593-9d41b528a49c' })
  @IsUUID()
  toMembershipId!: string;
}

export class ReviewSwapDto {
  @ApiProperty({ enum: SwapStatus, example: SwapStatus.APPROVED })
  @IsEnum(SwapStatus)
  status!: SwapStatus;
}
