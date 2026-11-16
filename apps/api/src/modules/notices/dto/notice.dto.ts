import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateNoticeDto {
  @ApiProperty({ example: 'Next Friday Mess General Meeting' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: 'All members please attend after dinner to discuss the upcoming gas cylinder purchase.'
  })
  @IsString()
  @MinLength(5)
  body!: string;
}
