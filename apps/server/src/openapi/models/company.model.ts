import { ApiProperty } from '@nestjs/swagger';

export class Company {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: 'group' })
  object: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  attributes: Record<string, any>;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;
}
