import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  Matches,
  IsEnum,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsOptional,
  MinLength
} from 'class-validator';
import { MembershipRole, BANGLADESH_PHONE_REGEX } from '@mess/shared';

export class AddBoarderDto {
  @ApiProperty({ example: '01812345678' })
  @IsString()
  @Matches(BANGLADESH_PHONE_REGEX, {
    message: 'Phone must be a valid Bangladesh mobile number'
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'Karim Uddin' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: MembershipRole, default: MembershipRole.BOARDER })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @ApiPropertyOptional({ example: 250.0, default: 250.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  cookBillAmount?: number;
}

export class UpdateMembershipDto {
  @ApiPropertyOptional({ enum: MembershipRole })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @ApiPropertyOptional({ example: 250.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  cookBillAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
