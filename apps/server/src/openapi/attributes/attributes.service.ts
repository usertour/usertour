import { Injectable } from '@nestjs/common';
import { AttributesService } from '@/attributes/attributes.service';
import { ListAttributesDto } from './attributes.dto';
import { InvalidLimitError } from '@/common/errors/errors';

@Injectable()
export class OpenAPIAttributesService {
  constructor(private readonly attributesService: AttributesService) {}

  async listAttributes(projectId: string, dto: ListAttributesDto) {
    const { cursor, limit = 20 } = dto;

    const pageSize = Number(limit) || 20;

    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new InvalidLimitError();
    }

    return this.attributesService.listWithPagination(projectId, cursor, limit);
  }
}
