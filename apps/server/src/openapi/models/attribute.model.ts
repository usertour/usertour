import { AttributeDataTypeNames } from '@/attributes/models/attribute.model';
import { ApiProperty } from '@nestjs/swagger';
import { OpenApiObjectType } from '@/common/openapi/types';

export class Attribute {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: 'attribute' })
  object: string;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;

  @ApiProperty({ example: AttributeDataTypeNames.DateTime })
  dataType: AttributeDataTypeNames;

  @ApiProperty({ example: 'When user first signed up in your app' })
  description: string;

  @ApiProperty({ example: 'Signed Up' })
  displayName: string;

  @ApiProperty({ example: 'signed_up_at' })
  codeName: string;

  @ApiProperty({ example: OpenApiObjectType.USER })
  scope: OpenApiObjectType;
}
