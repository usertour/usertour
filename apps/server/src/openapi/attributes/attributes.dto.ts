import { ApiProperty } from '@nestjs/swagger';
import { Attribute } from '../models/attribute.model';

export class ListAttributesResponseDto {
  @ApiProperty({ description: 'List of attributes', type: [Attribute] })
  results: Attribute[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}
