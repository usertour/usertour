import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { EventsService as BusinessEventsService } from '../../events/events.service';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { HttpStatus } from '@nestjs/common';
import { Connection } from '@devoxa/prisma-relay-cursor-connection';

describe('EventsService', () => {
  let service: EventsService;
  let mockBusinessEventsService: jest.Mocked<BusinessEventsService>;

  beforeEach(async () => {
    mockBusinessEventsService = {
      listWithPagination: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: BusinessEventsService,
          useValue: mockBusinessEventsService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('listEvents', () => {
    it('should return events with pagination', async () => {
      const projectId = 'test-project-id';
      const mockEvents: Connection<any> = {
        edges: [
          {
            node: {
              id: 'event1',
              createdAt: new Date(),
              description: 'Test event',
              displayName: 'Test Event',
              codeName: 'test_event',
              updatedAt: new Date(),
              deleted: false,
              predefined: false,
              projectId: 'test-project-id',
            },
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'next-cursor',
          startCursor: 'prev-cursor',
        },
        nodes: [
          {
            id: 'event1',
            createdAt: new Date(),
            description: 'Test event',
            displayName: 'Test Event',
            codeName: 'test_event',
            updatedAt: new Date(),
            deleted: false,
            predefined: false,
            projectId: 'test-project-id',
          },
        ],
        totalCount: 1,
      };

      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockEvents);

      const result = await service.listEvents(projectId);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('event1');
      expect(result.results[0].object).toBe('event_definition');
      expect(result.results[0].name).toBe('test_event');
      expect(mockBusinessEventsService.listWithPagination).toHaveBeenCalledWith(
        projectId,
        undefined,
        20,
      );
    });

    it('should throw OpenAPIException when limit is invalid', async () => {
      const projectId = 'test-project-id';
      const invalidLimit = -1;

      await expect(service.listEvents(projectId, undefined, invalidLimit)).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.USER.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.USER.INVALID_LIMIT.code,
        ),
      );

      expect(mockBusinessEventsService.listWithPagination).not.toHaveBeenCalled();
    });

    it('should handle cursor pagination', async () => {
      const projectId = 'test-project-id';
      const cursor = 'test-cursor';
      const mockEvents: Connection<any> = {
        edges: [
          {
            node: {
              id: 'event1',
              createdAt: new Date(),
              description: 'Test event',
              displayName: 'Test Event',
              codeName: 'test_event',
              updatedAt: new Date(),
              deleted: false,
              predefined: false,
              projectId: 'test-project-id',
            },
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'next-cursor',
          startCursor: 'prev-cursor',
        },
        nodes: [
          {
            id: 'event1',
            createdAt: new Date(),
            description: 'Test event',
            displayName: 'Test Event',
            codeName: 'test_event',
            updatedAt: new Date(),
            deleted: false,
            predefined: false,
            projectId: 'test-project-id',
          },
        ],
        totalCount: 1,
      };

      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockEvents);

      const result = await service.listEvents(projectId, cursor);

      expect(mockBusinessEventsService.listWithPagination).toHaveBeenCalledWith(
        projectId,
        cursor,
        20,
      );
      expect(result.results).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      const projectId = 'test-project-id';
      const mockEvents: Connection<any> = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          endCursor: null,
          startCursor: null,
        },
        nodes: [],
        totalCount: 0,
      };

      mockBusinessEventsService.listWithPagination.mockResolvedValue(mockEvents);

      const result = await service.listEvents(projectId);

      expect(result.results).toHaveLength(0);
      expect(result.next).toBeNull();
      expect(result.previous).toBeNull();
    });
  });
});
