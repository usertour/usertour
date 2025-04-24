import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { BizService } from '../../biz/biz.service';
import { PrismaService } from '../../prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { UpsertUserRequestDto } from './user.dto';
import { OpenAPIException } from '../exceptions/openapi.exception';

describe('OpenAPI:UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    bizUser: {
      findFirst: jest.fn(),
    },
  };

  const mockBizService = {
    upsertBizUsers: jest.fn(),
    upsertBizCompanies: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BizService,
          useValue: mockBizService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('upsertUser', () => {
    it('should throw error when both companies and memberships are provided', async () => {
      const data: UpsertUserRequestDto = {
        id: 'user1',
        attributes: { name: 'Test User' },
        companies: [{ id: 'company1', attributes: { name: 'Test Company' } }],
        memberships: [
          {
            id: 'membership1',
            attributes: { role: 'admin' },
            company: { id: 'company1', attributes: { name: 'Test Company' } },
          },
        ],
      };

      const error = new OpenAPIException(
        OpenAPIErrors.USER.INVALID_REQUEST.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_REQUEST.code,
      );

      await expect(service.upsertUser('user1', data, 'env1')).rejects.toThrow(error);
    });

    it('should create user with companies', async () => {
      const data: UpsertUserRequestDto = {
        id: 'user1',
        attributes: { name: 'Test User' },
        companies: [{ id: 'company1', attributes: { name: 'Test Company' } }],
      };

      const mockUser = {
        id: 'user1',
        externalId: 'user1',
        data: { name: 'Test User' },
        environmentId: 'env1',
        createdAt: new Date(),
        updatedAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockPrismaService.bizUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockBizService.upsertBizUsers.mockResolvedValue(mockUser);
      mockBizService.upsertBizCompanies.mockResolvedValue({});

      await service.upsertUser('user1', data, 'env1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockBizService.upsertBizUsers).toHaveBeenCalledWith(
        mockPrismaService,
        'user1',
        data.attributes,
        'env1',
      );
      expect(mockBizService.upsertBizCompanies).toHaveBeenCalledWith(
        mockPrismaService,
        'company1',
        'user1',
        data.companies[0].attributes,
        'env1',
        {},
      );
    });

    it('should create user with memberships', async () => {
      const data: UpsertUserRequestDto = {
        id: 'user1',
        attributes: { name: 'Test User' },
        memberships: [
          {
            id: 'membership1',
            attributes: { role: 'admin' },
            company: { id: 'company1', attributes: { name: 'Test Company' } },
          },
        ],
      };

      const mockUser = {
        id: 'user1',
        externalId: 'user1',
        data: { name: 'Test User' },
        environmentId: 'env1',
        createdAt: new Date(),
        updatedAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockPrismaService.bizUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockBizService.upsertBizUsers.mockResolvedValue(mockUser);
      mockBizService.upsertBizCompanies.mockResolvedValue({});

      await service.upsertUser('user1', data, 'env1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockBizService.upsertBizUsers).toHaveBeenCalledWith(
        mockPrismaService,
        'user1',
        data.attributes,
        'env1',
      );
      expect(mockBizService.upsertBizCompanies).toHaveBeenCalledWith(
        mockPrismaService,
        'company1',
        'user1',
        data.memberships[0].company.attributes,
        'env1',
        data.memberships[0].attributes,
      );
    });

    it('should throw error when user creation fails', async () => {
      const data: UpsertUserRequestDto = {
        id: 'user1',
        attributes: { name: 'Test User' },
        companies: [{ id: 'company1', attributes: { name: 'Test Company' } }],
      };

      const error = new OpenAPIException(
        OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
        OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.code,
      );

      mockPrismaService.bizUser.findFirst.mockRejectedValue(error);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockBizService.upsertBizUsers.mockRejectedValue(error);

      await expect(service.upsertUser('user1', data, 'env1')).rejects.toThrow(error);
    });
  });
});
