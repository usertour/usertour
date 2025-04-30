import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventDefinitionsService } from './event-definitions.service';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { InvalidLimitError } from '@/common/errors/errors';
import { ConfigService } from '@nestjs/config';
import { OpenApiObjectType } from '@/common/openapi/types';

describe('OpenAPIEventDefinitionsService', () => {
  let service: OpenAPIEventDefinitionsService;
  let businessEventsService: BusinessEventsService;

  const mockBusinessEventsService = {
    listWithPagination: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
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
    const mockProjectId = 'project-123';
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

    const expectedResponse = {
      results: [
        {
          id: 'event-123',
          object: OpenApiObjectType.EVENT_DEFINITION,
          createdAt: '2024-01-01T00:00:00.000Z',
          description: 'Test Event',
          displayName: 'Test Event',
          name: 'test_event',
        },
      ],
      next: 'http://localhost:3000/v1/event-definitions?cursor=next-cursor&limit=10',
      previous: 'http://localhost:3000/v1/event-definitions?limit=10',
    };

    const expectedDefaultResponse = {
      results: [
        {
          id: 'event-123',
          object: OpenApiObjectType.EVENT_DEFINITION,
          createdAt: '2024-01-01T00:00:00.000Z',
          description: 'Test Event',
          displayName: 'Test Event',
          name: 'test_event',
        },
      ],
      next: 'http://localhost:3000/v1/event-definitions?cursor=next-cursor&limit=20',
      previous: null,
    };

    it('should successfully list events', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockBusinessResponse);

      const result = await service.listEventDefinitions(mockProjectId, mockLimit, mockCursor);

      expect(businessEventsService.listWithPagination).toHaveBeenCalledWith(mockProjectId, {
        first: mockLimit,
        after: mockCursor,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should use default limit if not provided', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockBusinessResponse);

      const result = await service.listEventDefinitions(mockProjectId);

      expect(businessEventsService.listWithPagination).toHaveBeenCalledWith(mockProjectId, {
        first: 20,
        after: undefined,
      });
      expect(result).toEqual(expectedDefaultResponse);
    });

    it('should throw error for invalid limit', async () => {
      await expect(service.listEventDefinitions(mockProjectId, -1)).rejects.toThrow(
        new InvalidLimitError(),
      );
    });
  });
});
