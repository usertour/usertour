import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateAttributeInput, UpdateAttributeInput } from './dto/attribute.input';
import { AttributeBizTypeNames, AttributeDataTypeNames } from './models/attribute.model';

@Injectable()
export class AttributesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateAttributeInput) {
    return await this.prisma.attribute.create({
      data,
    });
  }

  async update(data: UpdateAttributeInput) {
    const { id, ...others } = data;
    return await this.prisma.attribute.update({
      where: { id },
      data: { ...others },
    });
  }

  async delete(id: string) {
    return await this.prisma.attribute.delete({
      where: { id },
    });
  }

  async get(id: string) {
    return await this.prisma.attribute.findUnique({
      where: { id },
    });
  }

  async list(projectId: string, bizType: number) {
    if (bizType === 0) {
      return await this.prisma.attribute.findMany({
        where: { projectId },
        orderBy: { id: 'asc' },
      });
    }
    return await this.prisma.attribute.findMany({
      where: { projectId, bizType },
      orderBy: { id: 'asc' },
    });
  }

  mapDataType(dataType: number): AttributeDataTypeNames {
    switch (dataType) {
      case 1:
        return AttributeDataTypeNames.Number;
      case 2:
        return AttributeDataTypeNames.String;
      case 3:
        return AttributeDataTypeNames.Boolean;
      case 4:
        return AttributeDataTypeNames.List;
      case 5:
        return AttributeDataTypeNames.DateTime;
      case 6:
        return AttributeDataTypeNames.RandomAB;
      case 7:
        return AttributeDataTypeNames.RandomNumber;
      default:
        return AttributeDataTypeNames.String;
    }
  }

  mapBizType(bizType: number): AttributeBizTypeNames {
    switch (bizType) {
      case 1:
        return AttributeBizTypeNames.USER;
      case 2:
        return AttributeBizTypeNames.COMPANY;
      case 3:
        return AttributeBizTypeNames.MEMBERSHIP;
      case 4:
        return AttributeBizTypeNames.EVENT;
      default:
        return AttributeBizTypeNames.USER;
    }
  }
}
