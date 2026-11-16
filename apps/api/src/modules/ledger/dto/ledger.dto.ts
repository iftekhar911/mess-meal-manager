import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsPositive,
  Matches,
  IsString,
  IsOptional,
  IsBoolean
} from 'class-validator';

export class RecordDepositDto {
  @ApiProperty({ example: 'b567d2b2-65a3-48df-b593-9d41b528a49c' })
  @IsUUID()
  membershipId!: string;

  @ApiProperty({ example: 2000.0 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-11-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ example: 'Cash handed to manager' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  restoreAutoOffMeals?: boolean;
}

export class CreateAdjustmentDto {
  @ApiProperty({ example: 'b567d2b2-65a3-48df-b593-9d41b528a49c' })
  @IsUUID()
  membershipId!: string;

  @ApiProperty({ example: -50.0, description: 'Positive for credit, negative for debit reversal' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: '2026-11-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: 'Correction for duplicate guest entry' })
  @IsString()
  note!: string;

  @ApiPropertyOptional({ example: 'a123d2b2-65a3-48df-b593-9d41b528a49c' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;
}
