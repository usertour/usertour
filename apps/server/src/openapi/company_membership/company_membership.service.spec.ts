import { Test, TestingModule } from '@nestjs/testing';
import { CompanyMembershipService } from './company_membership.service';
import { PrismaService } from 'nestjs-prisma';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { OpenAPIException } from '../exceptions/openapi.exception';

describe('OpenAPI:CompanyMembershipService', () => {
  let service: CompanyMembershipService;

  const mockPrismaService = {
    bizUserOnCompany: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyMembershipService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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

      mockPrismaService.bizUserOnCompany.findFirst.mockResolvedValue(mockMembership);
      mockPrismaService.bizUserOnCompany.delete.mockResolvedValue(mockMembership);

      const result = await service.deleteCompanyMembership('user-1', 'company-1', 'env-1');

      expect(result).toEqual({
        id: 'membership-1',
        object: 'company_membership',
        deleted: true,
      });

      expect(mockPrismaService.bizUserOnCompany.findFirst).toHaveBeenCalledWith({
        where: {
          bizUser: {
            externalId: 'user-1',
            environmentId: 'env-1',
          },
          bizCompany: {
            externalId: 'company-1',
            environmentId: 'env-1',
          },
        },
      });

      expect(mockPrismaService.bizUserOnCompany.delete).toHaveBeenCalledWith({
        where: {
          id: 'membership-1',
        },
      });
    });

    it('should throw not found error when membership does not exist', async () => {
      mockPrismaService.bizUserOnCompany.findFirst.mockResolvedValue(null);

      const error = new OpenAPIException(
        OpenAPIErrors.COMPANY_MEMBERSHIP.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.COMPANY_MEMBERSHIP.NOT_FOUND.code,
      );

      await expect(service.deleteCompanyMembership('user-1', 'company-1', 'env-1')).rejects.toThrow(
        error,
      );

      expect(mockPrismaService.bizUserOnCompany.findFirst).toHaveBeenCalledWith({
        where: {
          bizUser: {
            externalId: 'user-1',
            environmentId: 'env-1',
          },
          bizCompany: {
            externalId: 'company-1',
            environmentId: 'env-1',
          },
        },
      });

      expect(mockPrismaService.bizUserOnCompany.delete).not.toHaveBeenCalled();
    });
  });
});
