import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteCompanyMembershipQueryDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Company ID',
    example: 'company-123',
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}
