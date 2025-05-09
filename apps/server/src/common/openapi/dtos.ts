import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { OpenApiObjectType } from './types';

export class DeleteResponseDto {
  @ApiProperty({ description: 'The unique identifier for the resource' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'The object type', example: OpenApiObjectType.COMPANY })
  @IsString()
  object: OpenApiObjectType;

  @ApiProperty({ description: 'Whether the resource was deleted', example: true })
  deleted: boolean;
}
