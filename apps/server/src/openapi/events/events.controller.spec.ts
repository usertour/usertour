import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventsController } from './events.controller';
import { OpenAPIEventsService } from './events.service';
import { Environment } from '@/environments/models/environment.model';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { OpenapiGuard } from '../openapi.guard';
import { PrismaService } from 'nestjs-prisma';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { ConfigService } from '@nestjs/config';

describe('OpenAPIEventsController', () => {
  let controller: OpenAPIEventsController;
  let service: OpenAPIEventsService;

  const mockEventsService = {
    listEvents: jest.fn(),
  };

  const mockPrismaService = {
    environment: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEnvironment: Environment = {
    id: 'env-123',
    name: 'Test Environment',
    token: 'test-token',
    projectId: 'project-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIEventsController],
      providers: [
        {
          provide: OpenAPIEventsService,
          useValue: mockEventsService,
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

    controller = module.get<OpenAPIEventsController>(OpenAPIEventsController);
    service = module.get<OpenAPIEventsService>(OpenAPIEventsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('listEvents', () => {
    const mockResponse = {
      results: [
        {
          id: 'event-123',
          object: 'event_definition',
          createdAt: '2024-01-01T00:00:00.000Z',
          description: 'Test Event',
          displayName: 'Test Event',
          name: 'test_event',
        },
      ],
      next: 'next-cursor',
      previous: null,
    };

    it('should successfully list events', async () => {
      mockEventsService.listEvents.mockResolvedValue(mockResponse);

      const result = await controller.listEvents(mockEnvironment);

      expect(service.listEvents).toHaveBeenCalledWith(
        mockEnvironment.projectId,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should list events with pagination parameters', async () => {
      mockEventsService.listEvents.mockResolvedValue(mockResponse);

      const cursor = 'test-cursor';
      const limit = 10;

      const result = await controller.listEvents(mockEnvironment, cursor, limit);

      expect(service.listEvents).toHaveBeenCalledWith(mockEnvironment.projectId, cursor, limit);
      expect(result).toEqual(mockResponse);
    });

    it('should handle service errors', async () => {
      const error = new OpenAPIException(
        OpenAPIErrors.USER.INVALID_LIMIT.message,
        400,
        OpenAPIErrors.USER.INVALID_LIMIT.code,
      );
      mockEventsService.listEvents.mockRejectedValue(error);

      await expect(controller.listEvents(mockEnvironment)).rejects.toThrow(error);
      expect(service.listEvents).toHaveBeenCalledWith(
        mockEnvironment.projectId,
        undefined,
        undefined,
      );
    });
  });
});
