import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsBoolean,
  IsString,
  IsInt,
  Min,
  Max,
  Matches,
  IsOptional,
  IsUUID,
  MinLength
} from 'class-validator';
import { MealType, SlotType, EggPreference } from '@mess/shared';

export class SetMealDefaultDto {
  @ApiProperty({ enum: MealType })
  @IsEnum(MealType)
  mealType!: MealType;

  @ApiPropertyOptional({ enum: SlotType, nullable: true })
  @IsOptional()
  @IsEnum(SlotType)
  halfSlot?: SlotType | null;

  @ApiPropertyOptional({ enum: EggPreference, default: EggPreference.NONE })
  @IsOptional()
  @IsEnum(EggPreference)
  eggPreference?: EggPreference;
}

export class SetMealToggleDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  status!: boolean;

  @ApiPropertyOptional({ example: '2026-11-20' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  fromDate?: string;
}

export class SetMealRangeDto {
  @ApiProperty({ example: '2026-11-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'From date must be YYYY-MM-DD' })
  fromDate!: string;

  @ApiProperty({ example: '2026-11-25' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'To date must be YYYY-MM-DD' })
  toDate!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  status!: boolean;
}

export class SetMealOverrideDto {
  @ApiProperty({ example: '2026-11-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ enum: SlotType })
  @IsEnum(SlotType)
  slot!: SlotType;

  @ApiProperty({ example: true })
  @IsBoolean()
  status!: boolean;

  @ApiPropertyOptional({ enum: EggPreference, default: EggPreference.NONE })
  @IsOptional()
  @IsEnum(EggPreference)
  eggPreference?: EggPreference;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  guestCount?: number;
}

export class ManagerForceMealDto {
  @ApiProperty({ example: 'b567d2b2-65a3-48df-b593-9d41b528a49c' })
  @IsUUID()
  membershipId!: string;

  @ApiProperty({ example: '2026-11-20' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ enum: SlotType })
  @IsEnum(SlotType)
  slot!: SlotType;

  @ApiProperty({ example: true })
  @IsBoolean()
  status!: boolean;

  @ApiPropertyOptional({ enum: EggPreference, default: EggPreference.NONE })
  @IsOptional()
  @IsEnum(EggPreference)
  eggPreference?: EggPreference;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  guestCount?: number;

  @ApiProperty({ example: 'Boarder requested late activation via SMS' })
  @IsString()
  @MinLength(5)
  reason!: string;
}
