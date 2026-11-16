import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { BANGLADESH_PHONE_REGEX } from '@mess/shared';

/**
 * DTO for user registration.
 */
export class RegisterDto {
  @ApiProperty({ example: 'Rahim Ahmed', description: 'Full name of the user' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '01712345678', description: 'Bangladesh mobile phone number' })
  @IsString()
  @Matches(BANGLADESH_PHONE_REGEX, {
    message: 'Phone must be a valid Bangladesh mobile number'
  })
  phone!: string;

  @ApiProperty({
    example: 'strongPassword123',
    description: 'User password (minimum 8 characters)'
  })
  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * DTO for user login.
 */
export class LoginDto {
  @ApiProperty({ example: '01712345678', description: 'Bangladesh mobile phone number' })
  @IsString()
  @Matches(BANGLADESH_PHONE_REGEX, {
    message: 'Phone must be a valid Bangladesh mobile number'
  })
  phone!: string;

  @ApiProperty({ example: 'strongPassword123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
