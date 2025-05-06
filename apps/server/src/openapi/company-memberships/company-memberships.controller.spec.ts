import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompanyMembershipsController } from './company-memberships.controller';
import { OpenAPICompanyMembershipsService } from './company-memberships.service';
import { DeleteCompanyMembershipQueryDto } from './company-memberships.dto';
import { OpenApiObjectType } from '@/common/openapi/types';
import { ConfigService } from '@nestjs/config';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { PrismaService } from 'nestjs-prisma';

describe('OpenAPICompanyMembershipsController', () => {
  let controller: OpenAPICompanyMembershipsController;
  let service: jest.Mocked<OpenAPICompanyMembershipsService>;

  beforeEach(async () => {
    const mockService = {
      deleteCompanyMembership: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const mockPrismaService = {
      environment: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPICompanyMembershipsController],
      providers: [
        {
          provide: OpenAPICompanyMembershipsService,
          useValue: mockService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        OpenAPIKeyGuard,
        OpenAPIExceptionFilter,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<OpenAPICompanyMembershipsController>(
      OpenAPICompanyMembershipsController,
    );
    service = module.get(OpenAPICompanyMembershipsService);
  });

  describe('deleteCompanyMembership', () => {
    it('should delete company membership', async () => {
      const mockResponse = {
        id: 'membership-1',
        object: OpenApiObjectType.COMPANY_MEMBERSHIP,
        deleted: true,
      };

      const query: DeleteCompanyMembershipQueryDto = {
        userId: 'user-1',
        companyId: 'company-1',
      };

      service.deleteCompanyMembership.mockResolvedValue(mockResponse);

      const result = await controller.deleteCompanyMembership(query, 'env-1');

      expect(result).toEqual(mockResponse);
      expect(service.deleteCompanyMembership).toHaveBeenCalledWith('env-1', query);
    });
  });
});
