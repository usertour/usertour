import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompanyMembershipsService } from './company-memberships.service';
import { BizService } from '@/biz/biz.service';
import { CompanyMembershipNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/types/openapi';

describe('OpenAPICompanyMembershipsService', () => {
  let service: OpenAPICompanyMembershipsService;

  const mockBizService = {
    getBizCompanyMembership: jest.fn(),
    deleteBizCompanyMembership: jest.fn(),
  };

  beforeEach(async () => {
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
    jest.clearAllMocks();
  });

  describe('OpenAPICompanyMemberships:Delete', () => {
    it('should delete company membership when membership exists', async () => {
      const mockMembership = {
        id: 'membership-1',
      };

      mockBizService.getBizCompanyMembership.mockResolvedValue(mockMembership);
      mockBizService.deleteBizCompanyMembership.mockResolvedValue(mockMembership);

      const result = await service.deleteCompanyMembership('user-1', 'company-1', 'env-1');

      expect(result).toEqual({
        id: 'membership-1',
        object: OpenApiObjectType.COMPANY_MEMBERSHIP,
        deleted: true,
      });

      expect(mockBizService.getBizCompanyMembership).toHaveBeenCalledWith(
        'user-1',
        'company-1',
        'env-1',
      );

      expect(mockBizService.deleteBizCompanyMembership).toHaveBeenCalledWith('membership-1');
    });

    it('should throw not found error when membership does not exist', async () => {
      mockBizService.getBizCompanyMembership.mockResolvedValue(null);

      await expect(service.deleteCompanyMembership('user-1', 'company-1', 'env-1')).rejects.toThrow(
        new CompanyMembershipNotFoundError(),
      );

      expect(mockBizService.getBizCompanyMembership).toHaveBeenCalledWith(
        'user-1',
        'company-1',
        'env-1',
      );

      expect(mockBizService.deleteBizCompanyMembership).not.toHaveBeenCalled();
    });
  });
});
