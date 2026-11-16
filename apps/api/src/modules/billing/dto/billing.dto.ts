import { IsString, Matches, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertMonthlySettingsDto {
  @ApiProperty({ example: '2026-11' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' })
  month!: string;

  @ApiProperty({ example: 12000, description: 'Estimated total monthly fuel cost in BDT' })
  @IsNumber()
  @Min(0)
  estFuelTotal!: number;

  @ApiProperty({ example: 50, description: 'Estimated meal rate in BDT' })
  @IsNumber()
  @Min(1)
  estMealRate!: number;
}
