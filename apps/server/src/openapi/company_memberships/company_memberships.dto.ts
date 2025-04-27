import { ApiProperty } from '@nestjs/swagger';

export class DeleteCompanyMembershipResponseDto {
  @ApiProperty({ example: 'e9b32bd0-63cb-415e-9c4f-477c85b92f97' })
  id: string;

  @ApiProperty({ example: 'company_membership' })
  object: string;

  @ApiProperty({ example: true })
  deleted: boolean;
}
