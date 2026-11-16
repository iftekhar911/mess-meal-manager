import { IsString, Matches, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseMonthDto {
  @ApiProperty({ example: '2026-11', description: 'Month in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' })
  month!: string;

  @ApiPropertyOptional({ example: 4500, description: 'Actual total fuel expense if available' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualFuelCost?: number;
}
