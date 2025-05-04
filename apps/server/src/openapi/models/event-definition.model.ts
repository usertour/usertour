import { ApiProperty } from '@nestjs/swagger';
import { OpenApiObjectType } from '@/common/openapi/types';

export class EventDefinition {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: OpenApiObjectType.EVENT_DEFINITION })
  object: string;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;

  @ApiProperty({ example: 'A custom event was triggered' })
  description: string;

  @ApiProperty({ example: 'Flow Started' })
  displayName: string;

  @ApiProperty({ example: 'flow_started' })
  codeName: string;
}
