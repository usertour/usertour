import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventDefinitionsService } from './event-definitions.service';
import { EventsService } from '@/events/events.service';
import { Environment } from '@/environments/models/environment.model';
import { ListEventDefinitionsQueryDto, EventDefinitionOrderByType } from './event-definitions.dto';

describe('OpenAPIEventDefinitionsService', () => {
  let service: OpenAPIEventDefinitionsService;
  let mockBusinessEventsService: jest.Mocked<EventsService>;

  const mockEnvironment: Environment = {
    id: 'env-1',
    projectId: 'project-1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequestUrl = 'http://localhost:3000/v1/event-definitions';

  beforeEach(async () => {
    mockBusinessEventsService = {
      listWithPagination: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIEventDefinitionsService,
        {
          provide: EventsService,
          useValue: mockBusinessEventsService,
        },
      ],
    }).compile();

    service = module.get<OpenAPIEventDefinitionsService>(OpenAPIEventDefinitionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listEventDefinitions', () => {
    const mockCursor = 'cursor-1';
    const mockLimit = 10;
    const mockOrderBy = [EventDefinitionOrderByType.CREATED_AT];

    const mockQuery: ListEventDefinitionsQueryDto = {
      cursor: mockCursor,
      limit: mockLimit,
      orderBy: mockOrderBy,
    };

    const mockEventDefinition = {
      id: 'event-1',
      displayName: 'Test Event',
      codeName: 'test_event',
      description: 'Test Description',
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
      predefined: false,
      projectId: 'project-1',
    };

    it('should return paginated event definitions', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue({
        edges: [
          {
            node: mockEventDefinition,
            cursor: 'cursor-1',
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      });

      const result = await service.listEventDefinitions(mockRequestUrl, mockEnvironment, {
        ...mockQuery,
        cursor: undefined,
      });

      expect(result.results).toHaveLength(1);
      expect(result.next).toBeNull();
      expect(result.previous).toBeNull();
      expect(mockBusinessEventsService.listWithPagination).toHaveBeenCalledWith(
        mockEnvironment.projectId,
        expect.any(Object),
        expect.any(Array),
      );
    });

    it('should handle empty results', async () => {
      mockBusinessEventsService.listWithPagination.mockResolvedValue({
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      });

      const result = await service.listEventDefinitions(mockRequestUrl, mockEnvironment, {
        ...mockQuery,
        cursor: undefined,
      });

      expect(result.results).toHaveLength(0);
      expect(result.next).toBeNull();
      expect(result.previous).toBeNull();
    });

    it('should handle default parameters', async () => {
      const defaultQuery: ListEventDefinitionsQueryDto = {};

      mockBusinessEventsService.listWithPagination.mockResolvedValue({
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      });

      await service.listEventDefinitions(mockRequestUrl, mockEnvironment, defaultQuery);

      expect(mockBusinessEventsService.listWithPagination).toHaveBeenCalledWith(
        mockEnvironment.projectId,
        expect.any(Object),
        expect.any(Array),
      );
    });
  });
});
