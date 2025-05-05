import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventDefinitionsService } from './event-definitions.service';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { InvalidLimitError } from '@/common/errors/errors';
import { ConfigService } from '@nestjs/config';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Environment } from '@/environments/models/environment.model';

describe('OpenAPIEventDefinitionsService', () => {
  let service: OpenAPIEventDefinitionsService;
  let businessEventsService: BusinessEventsService;

  const mockBusinessEventsService = {
    listWithPagination: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockEnvironment: Environment = {
    id: 'env-123',
    projectId: 'project-123',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIEventDefinitionsService,
        {
          provide: BusinessEventsService,
          useValue: mockBusinessEventsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenAPIEventDefinitionsService>(OpenAPIEventDefinitionsService);
    businessEventsService = module.get<BusinessEventsService>(BusinessEventsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('listEventDefinitions', () => {
    const mockRequestUrl = 'http://localhost:3000/v1/event-definitions';
    const mockCursor = 'test-cursor';
    const mockLimit = 10;

    const mockBusinessResponse = {
      edges: [
        {
          node: {
            id: 'event-123',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            description: 'Test Event',
            displayName: 'Test Event',
            codeName: 'test_event',
          },
        },
      ],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: 'next-cursor',
      },
    };

    it('should successfully list events', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockBusinessResponse);

      const result = await service.listEventDefinitions(
        mockRequestUrl,
        mockEnvironment,
        mockLimit,
        mockCursor,
      );

      expect(businessEventsService.listWithPagination).toHaveBeenCalledWith(
        mockEnvironment.projectId,
        {
          first: mockLimit,
          after: mockCursor,
        },
        [{ createdAt: 'asc' }],
      );
      expect(result).toEqual({
        results: [
          {
            id: 'event-123',
            object: OpenApiObjectType.EVENT_DEFINITION,
            createdAt: '2024-01-01T00:00:00.000Z',
            description: 'Test Event',
            displayName: 'Test Event',
            codeName: 'test_event',
          },
        ],
        next: 'http://localhost:3000/v1/event-definitions?cursor=next-cursor&limit=10',
        previous: 'http://localhost:3000/v1/event-definitions?limit=10',
      });
    });

    it('should use default limit if not provided', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockBusinessResponse);

      const result = await service.listEventDefinitions(mockRequestUrl, mockEnvironment);

      expect(businessEventsService.listWithPagination).toHaveBeenCalledWith(
        mockEnvironment.projectId,
        {
          first: 20,
          after: undefined,
        },
        [{ createdAt: 'asc' }],
      );
      expect(result).toEqual({
        results: [
          {
            id: 'event-123',
            object: OpenApiObjectType.EVENT_DEFINITION,
            createdAt: '2024-01-01T00:00:00.000Z',
            description: 'Test Event',
            displayName: 'Test Event',
            codeName: 'test_event',
          },
        ],
        next: 'http://localhost:3000/v1/event-definitions?cursor=next-cursor&limit=20',
        previous: null,
      });
    });

    it('should throw error for invalid limit', async () => {
      await expect(
        service.listEventDefinitions(mockRequestUrl, mockEnvironment, -1),
      ).rejects.toThrow(new InvalidLimitError());
    });
  });
});
