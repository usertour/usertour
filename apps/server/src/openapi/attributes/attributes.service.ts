import { Injectable } from '@nestjs/common';
import { AttributesService } from '@/attributes/attributes.service';
import { ListAttributesDto } from './dto/attributes.dto';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class OpenAPIAttributesService {
  constructor(private readonly attributesService: AttributesService) {}

  async listAttributes(projectId: string, dto: ListAttributesDto) {
    const { cursor, limit = 20 } = dto;

    const pageSize = Number(limit) || 20;

    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new OpenAPIException(
        OpenAPIErrors.USER.INVALID_LIMIT.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_LIMIT.code,
      );
    }

    return this.attributesService.listWithPagination(projectId, cursor, limit);
  }
}
