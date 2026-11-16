import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, Matches, IsString, IsOptional, MaxLength } from 'class-validator';
import { ProteinType } from '@mess/shared';

export class SetDailyMenuDto {
  @ApiProperty({ example: '2026-11-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ enum: ProteinType, example: ProteinType.FISH })
  @IsEnum(ProteinType)
  protein!: ProteinType;

  @ApiPropertyOptional({ example: 'Rui fish curry with potato and lentils' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
