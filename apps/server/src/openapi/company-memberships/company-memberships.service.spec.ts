import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompanyMembershipsService } from './company-memberships.service';
import { BizService } from '@/biz/biz.service';
import { CompanyMembershipNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { DeleteCompanyMembershipQueryDto } from './company-memberships.dto';
import { Prisma } from '@prisma/client';

describe('OpenAPICompanyMembershipsService', () => {
  let service: OpenAPICompanyMembershipsService;
  let bizService: jest.Mocked<BizService>;

  beforeEach(async () => {
    const mockBizService = {
      getBizCompanyMembership: jest.fn(),
      deleteBizCompanyMembership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPICompanyMembershipsService,
        {
          provide: BizService,
          useValue: mockBizService,
        },
      ],
    }).compile();

    service = module.get<OpenAPICompanyMembershipsService>(OpenAPICompanyMembershipsService);
    bizService = module.get(BizService);
  });

  describe('deleteCompanyMembership', () => {
    it('should delete company membership', async () => {
      const mockMembership: Prisma.BizUserOnCompanyGetPayload<{
        include: {
          bizUser: true;
          bizCompany: true;
        };
      }> = {
        id: 'membership-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        bizCompanyId: 'company-1',
        bizUserId: 'user-1',
        data: {},
        bizUser: {
          id: 'user-1',
          externalId: 'user-1',
          environmentId: 'env-1',
          data: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deleted: false,
          bizCompanyId: 'company-1',
        },
        bizCompany: {
          id: 'company-1',
          externalId: 'company-1',
          environmentId: 'env-1',
          data: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deleted: false,
        },
      };

      const query: DeleteCompanyMembershipQueryDto = {
        userId: 'user-1',
        companyId: 'company-1',
      };

      bizService.getBizCompanyMembership.mockResolvedValue(mockMembership);
      bizService.deleteBizCompanyMembership.mockResolvedValue(mockMembership);

      const result = await service.deleteCompanyMembership('env-1', query);

      expect(result).toEqual({
        id: 'membership-1',
        object: OpenApiObjectType.COMPANY_MEMBERSHIP,
        deleted: true,
      });
      expect(bizService.getBizCompanyMembership).toHaveBeenCalledWith(
        'user-1',
        'company-1',
        'env-1',
      );
      expect(bizService.deleteBizCompanyMembership).toHaveBeenCalledWith('membership-1');
    });

    it('should throw error when membership not found', async () => {
      const query: DeleteCompanyMembershipQueryDto = {
        userId: 'user-1',
        companyId: 'company-1',
      };

      bizService.getBizCompanyMembership.mockResolvedValue(null);

      await expect(service.deleteCompanyMembership('env-1', query)).rejects.toThrow(
        CompanyMembershipNotFoundError,
      );
    });
  });
});
