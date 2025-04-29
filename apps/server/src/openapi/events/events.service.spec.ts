import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventsService } from './events.service';
import { EventsService as BusinessEventsService } from '@/events/events.service';
import { InvalidLimitError } from '@/common/errors/errors';

describe('OpenAPIEventsService', () => {
  let service: OpenAPIEventsService;
  let businessEventsService: BusinessEventsService;

  const mockBusinessEventsService = {
    listWithPagination: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIEventsService,
        {
          provide: BusinessEventsService,
          useValue: mockBusinessEventsService,
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
      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockBusinessResponse);

      const result = await service.listEvents(mockProjectId, mockCursor, mockLimit);

      expect(businessEventsService.listWithPagination).toHaveBeenCalledWith(
        mockProjectId,
        mockCursor,
        mockLimit,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should use default limit if not provided', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockBusinessResponse);

      const result = await service.listEvents(mockProjectId);

      expect(businessEventsService.listWithPagination).toHaveBeenCalledWith(
        mockProjectId,
        undefined,
        20,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw error for invalid limit', async () => {
      await expect(service.listEvents(mockProjectId, undefined, -1)).rejects.toThrow(
        new InvalidLimitError(),
      );
    });
  });
});
