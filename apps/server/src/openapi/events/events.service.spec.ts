import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventsService } from './events.service';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { InvalidLimitError } from '@/common/errors/errors';
import { ConfigService } from '@nestjs/config';
import { OpenApiObjectType } from '@/common/types/openapi';

describe('OpenAPIEventsService', () => {
  let service: OpenAPIEventsService;
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
        OpenAPIEventsService,
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

    service = module.get<OpenAPIEventsService>(OpenAPIEventsService);
    businessEventsService = module.get<BusinessEventsService>(BusinessEventsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('listEvents', () => {
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
          object: OpenApiObjectType.EVENT,
          createdAt: '2024-01-01T00:00:00.000Z',
          description: 'Test Event',
          displayName: 'Test Event',
          name: 'test_event',
        },
      ],
      next: `http://localhost:3000/v1/events?cursor=next-cursor&limit=${mockLimit}`,
      previous: `http://localhost:3000/v1/events?limit=${mockLimit}`,
    };

    const expectedDefaultResponse = {
      results: [
        {
          id: 'event-123',
          object: OpenApiObjectType.EVENT,
          createdAt: '2024-01-01T00:00:00.000Z',
          description: 'Test Event',
          displayName: 'Test Event',
          name: 'test_event',
        },
      ],
      next: 'http://localhost:3000/v1/events?cursor=next-cursor&limit=20',
      previous: null,
    };

    it('should successfully list events', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockBusinessResponse);

      const result = await service.listEvents(mockProjectId, mockLimit, mockCursor);

      expect(businessEventsService.listWithPagination).toHaveBeenCalledWith(mockProjectId, {
        first: mockLimit,
        after: mockCursor,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should use default limit if not provided', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockBusinessResponse);

      const result = await service.listEvents(mockProjectId);

      expect(businessEventsService.listWithPagination).toHaveBeenCalledWith(mockProjectId, {
        first: 20,
        after: undefined,
      });
      expect(result).toEqual(expectedDefaultResponse);
    });

    it('should throw error for invalid limit', async () => {
      await expect(service.listEvents(mockProjectId, -1)).rejects.toThrow(new InvalidLimitError());
    });
  });
});
