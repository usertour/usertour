import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompanyMembershipController } from './company_memberships.controller';
import { OpenAPICompanyMembershipService } from './company_memberships.service';
import { DeleteCompanyMembershipResponseDto } from './company_memberships.dto';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';

describe('OpenAPI:CompanyMembershipController', () => {
  let controller: OpenAPICompanyMembershipController;

  const mockCompanyMembershipService = {
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
      controllers: [OpenAPICompanyMembershipController],
      providers: [
        {
          provide: OpenAPICompanyMembershipService,
          useValue: mockCompanyMembershipService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        OpenapiGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<OpenAPICompanyMembershipController>(OpenAPICompanyMembershipController);
  });

  describe('deleteCompanyMembership', () => {
    it('should delete company membership successfully', async () => {
      const mockResponse: DeleteCompanyMembershipResponseDto = {
        id: 'membership-1',
        object: 'company_membership',
        deleted: true,
      };

      mockCompanyMembershipService.deleteCompanyMembership.mockResolvedValue(mockResponse);

      const result = await controller.deleteCompanyMembership('user-1', 'company-1', 'env-1');

      expect(result).toEqual(mockResponse);
      expect(mockCompanyMembershipService.deleteCompanyMembership).toHaveBeenCalledWith(
        'user-1',
        'company-1',
        'env-1',
      );
    });
  });
});
