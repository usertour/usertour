import { ApiProperty } from '@nestjs/swagger';
import { OpenApiObjectType } from '@/common/types/openapi';

export class DeleteCompanyMembershipResponseDto {
  @ApiProperty({ example: 'e9b32bd0-63cb-415e-9c4f-477c85b92f97' })
  id: string;

  @ApiProperty({ example: OpenApiObjectType.COMPANY_MEMBERSHIP })
  object: string;

  @ApiProperty({ example: true })
  deleted: boolean;
}
