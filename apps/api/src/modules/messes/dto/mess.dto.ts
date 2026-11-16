import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  Max,
  Matches,
  IsOptional
} from 'class-validator';

export class CreateMessDto {
  @ApiProperty({ example: 'Bashundhara Scholars Mess' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional({ example: '22:00:00', default: '22:00:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'Cutoff time must be HH:mm or HH:mm:ss'
  })
  cutoffTime?: string;

  @ApiPropertyOptional({ example: 50.0, default: 50.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  mealRate?: number;

  @ApiPropertyOptional({ example: 3, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  graceDays?: number;

  @ApiPropertyOptional({ example: 2, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  warningDays?: number;

  @ApiPropertyOptional({ example: 2, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  shoppersPerDay?: number;

  @ApiPropertyOptional({ example: 2, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  shopTimesPerMonth?: number;
}

export class UpdateMessDto {
  @ApiPropertyOptional({ example: 'Bashundhara Deluxe Mess' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({ example: '21:30:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'Cutoff time must be HH:mm or HH:mm:ss'
  })
  cutoffTime?: string;

  @ApiPropertyOptional({ example: 55.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  mealRate?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  graceDays?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  warningDays?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  shoppersPerDay?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  shopTimesPerMonth?: number;
}
