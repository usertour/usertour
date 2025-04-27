import { Test, TestingModule } from '@nestjs/testing';
import { CompanyMembershipService } from './company_membership.service';
import { BizService } from '@/biz/biz.service';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { OpenAPIException } from '../exceptions/openapi.exception';

describe('OpenAPI:CompanyMembershipService', () => {
  let service: CompanyMembershipService;

  const mockBizService = {
    getBizCompanyMembership: jest.fn(),
    deleteBizCompanyMembership: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyMembershipService,
        {
          provide: BizService,
          useValue: mockBizService,
        },
      ],
    }).compile();

    service = module.get<CompanyMembershipService>(CompanyMembershipService);
    jest.clearAllMocks();
  });

  describe('deleteCompanyMembership', () => {
    it('should delete company membership successfully', async () => {
      const mockMembership = {
        id: 'membership-1',
      };

      mockBizService.getBizCompanyMembership.mockResolvedValue(mockMembership);
      mockBizService.deleteBizCompanyMembership.mockResolvedValue(mockMembership);

      const result = await service.deleteCompanyMembership('user-1', 'company-1', 'env-1');

      expect(result).toEqual({
        id: 'membership-1',
        object: 'company_membership',
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

      const error = new OpenAPIException(
        OpenAPIErrors.COMPANY_MEMBERSHIP.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.COMPANY_MEMBERSHIP.NOT_FOUND.code,
      );

      await expect(service.deleteCompanyMembership('user-1', 'company-1', 'env-1')).rejects.toThrow(
        error,
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
