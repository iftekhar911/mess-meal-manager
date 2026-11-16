import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  Matches,
  IsNumber,
  IsPositive,
  IsOptional,
  IsUrl,
  ValidateNested,
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExpenseItemInputDto {
  @ApiProperty({ example: 'Rui Fish (3 kg)' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '3 kg' })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiProperty({ example: 1200.0 })
  @IsNumber()
  @IsPositive()
  price!: number;
}

export class RecordShoppingExpenseDto {
  @ApiProperty({ example: '2026-11-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/receipts/rec_123.jpg' })
  @IsOptional()
  @IsUrl()
  receiptUrl?: string;

  @ApiProperty({ type: [ExpenseItemInputDto] })
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemInputDto)
  @ArrayMinSize(1, { message: 'At least one expense line item is required' })
  items!: ExpenseItemInputDto[];
}

export class RecordFuelExpenseDto {
  @ApiProperty({ example: '2026-11-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: 'Gas Cylinder 12kg' })
  @IsString()
  kind!: string;

  @ApiProperty({ example: 1450.0 })
  @IsNumber()
  @IsPositive()
  amount!: number;
}
