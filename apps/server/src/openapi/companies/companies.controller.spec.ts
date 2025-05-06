import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompaniesController } from './companies.controller';
import { OpenAPICompaniesService } from './companies.service';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Environment } from '@/environments/models/environment.model';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';

describe('OpenAPICompaniesController', () => {
  let controller: OpenAPICompaniesController;
  let service: jest.Mocked<OpenAPICompaniesService>;

  const mockEnvironment: Environment = {
    id: 'env-1',
    projectId: 'project-1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      getCompany: jest.fn(),
      listCompanies: jest.fn(),
      upsertCompany: jest.fn(),
      deleteCompany: jest.fn(),
    };

    const mockPrismaService = {
      environment: {
        findFirst: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPICompaniesController],
      providers: [
        {
          provide: OpenAPICompaniesService,
          useValue: mockService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<OpenAPICompaniesController>(OpenAPICompaniesController);
    service = module.get(OpenAPICompaniesService);
  });

  describe('getCompany', () => {
    it('should return company', async () => {
      const mockCompany = {
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: {},
        createdAt: '2025-04-27T10:56:52.198Z',
        users: null,
        memberships: null,
      };

      service.getCompany.mockResolvedValue(mockCompany);

      const result = await controller.getCompany(mockEnvironment, 'company-1', {});

      expect(result).toEqual(mockCompany);
      expect(service.getCompany).toHaveBeenCalledWith('company-1', mockEnvironment, {});
    });
  });

  describe('listCompanies', () => {
    it('should return paginated companies', async () => {
      const mockResponse = {
        results: [
          {
            id: 'company-1',
            object: OpenApiObjectType.COMPANY,
            attributes: {},
            createdAt: '2025-04-27T10:56:52.198Z',
            users: null,
            memberships: null,
          },
        ],
        next: null,
        previous: null,
      };

      service.listCompanies.mockResolvedValue(mockResponse);

      const result = await controller.listCompanies(
        'http://localhost:3000/v1/companies',
        mockEnvironment,
        {},
      );

      expect(result).toEqual(mockResponse);
      expect(service.listCompanies).toHaveBeenCalledWith(
        'http://localhost:3000/v1/companies',
        mockEnvironment,
        {},
      );
    });
  });

  describe('upsertCompany', () => {
    it('should upsert company', async () => {
      const mockCompany = {
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: {},
        createdAt: '2025-04-27T10:56:52.198Z',
        users: null,
        memberships: null,
      };

      service.upsertCompany.mockResolvedValue(mockCompany);

      const result = await controller.upsertCompany(mockEnvironment, {
        id: 'company-1',
        attributes: {},
      });

      expect(result).toEqual(mockCompany);
      expect(service.upsertCompany).toHaveBeenCalledWith(
        {
          id: 'company-1',
          attributes: {},
        },
        'env-1',
        'project-1',
      );
    });
  });

  describe('deleteCompany', () => {
    it('should delete company', async () => {
      const mockResponse = {
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        deleted: true,
      };

      service.deleteCompany.mockResolvedValue(mockResponse);

      const result = await controller.deleteCompany(mockEnvironment, 'company-1');

      expect(result).toEqual(mockResponse);
      expect(service.deleteCompany).toHaveBeenCalledWith('company-1', 'env-1');
    });
  });
});
