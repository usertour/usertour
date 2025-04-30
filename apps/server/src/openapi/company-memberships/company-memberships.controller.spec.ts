import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompanyMembershipsController } from './company-memberships.controller';
import { OpenAPICompanyMembershipsService } from './company-memberships.service';
import { DeleteCompanyMembershipResponseDto } from './company-memberships.dto';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { OpenApiObjectType } from '@/common/openapi/types';

describe('OpenAPICompanyMembershipsController', () => {
  let controller: OpenAPICompanyMembershipsController;

  const mockCompanyMembershipsService = {
    deleteCompanyMembership: jest.fn(),
  };

  const mockPrismaService = {
    environment: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'env-1',
        projectId: 'project-1',
      }),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'app.docUrl':
          return 'https://docs.usertour.com';
        case 'app.apiUrl':
          return 'http://localhost:3000';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPICompanyMembershipsController],
      providers: [
        {
          provide: OpenAPICompanyMembershipsService,
          useValue: mockCompanyMembershipsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        OpenAPIKeyGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<OpenAPICompanyMembershipsController>(
      OpenAPICompanyMembershipsController,
    );
  });

  describe('OpenAPICompanyMemberships:Delete', () => {
    it('should delete company membership successfully', async () => {
      const mockResponse: DeleteCompanyMembershipResponseDto = {
        id: 'membership-1',
        object: OpenApiObjectType.COMPANY_MEMBERSHIP,
        deleted: true,
      };

      mockCompanyMembershipsService.deleteCompanyMembership.mockResolvedValue(mockResponse);

      const result = await controller.deleteCompanyMembership('user-1', 'company-1', 'env-1');

      expect(result).toEqual(mockResponse);
      expect(mockCompanyMembershipsService.deleteCompanyMembership).toHaveBeenCalledWith(
        'user-1',
        'company-1',
        'env-1',
      );
    });
  });
});
