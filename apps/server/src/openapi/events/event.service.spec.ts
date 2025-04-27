import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { PrismaService } from 'nestjs-prisma';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { HttpStatus } from '@nestjs/common';

describe('EventService', () => {
  let service: EventService;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockPrismaService = {
      event: {
        findMany: jest.fn(() => Promise.resolve([])) as any,
        count: jest.fn(() => Promise.resolve(0)) as any,
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
  });

  describe('listEvents', () => {
    it('should return events with pagination', async () => {
      const projectId = 'test-project-id';
      const mockEvents = [
        {
          id: 'event1',
          createdAt: new Date(),
          description: 'Test event',
          displayName: 'Test Event',
          codeName: 'test_event',
        },
      ];

      mockPrismaService.event.findMany = jest.fn(() => Promise.resolve(mockEvents)) as any;
      mockPrismaService.event.count = jest.fn(() => Promise.resolve(1)) as any;

      const result = await service.listEvents(projectId);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('event1');
      expect(result.results[0].object).toBe('event_definition');
      expect(result.results[0].name).toBe('test_event');
      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId,
            deleted: false,
          },
        }),
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

      expect(mockPrismaService.event.findMany).not.toHaveBeenCalled();
    });

    it('should handle cursor pagination', async () => {
      const projectId = 'test-project-id';
      const cursor = 'test-cursor';
      const mockEvents = [
        {
          id: 'event1',
          createdAt: new Date(),
          description: 'Test event',
          displayName: 'Test Event',
          codeName: 'test_event',
        },
      ];

      mockPrismaService.event.findMany = jest.fn(() => Promise.resolve(mockEvents)) as any;
      mockPrismaService.event.count = jest.fn(() => Promise.resolve(1)) as any;

      const result = await service.listEvents(projectId, cursor);

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId,
            deleted: false,
          },
        }),
      );
      expect(result.results).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      const projectId = 'test-project-id';
      mockPrismaService.event.findMany = jest.fn(() => Promise.resolve([])) as any;
      mockPrismaService.event.count = jest.fn(() => Promise.resolve(0)) as any;

      const result = await service.listEvents(projectId);

      expect(result.results).toHaveLength(0);
      expect(result.next).toBeNull();
      expect(result.previous).toBeNull();
    });
  });
});
