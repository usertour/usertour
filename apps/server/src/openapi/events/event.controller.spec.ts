import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';

describe('EventController', () => {
  let controller: EventController;
  let eventService: EventService;

  const mockEventService = {
    listEvents: jest.fn(),
  };

  const mockPrismaService = {
    event: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        {
          provide: EventService,
          useValue: mockEventService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'app.docUrl':
                  return 'https://docs.usertour.com';
                case 'app.apiUrl':
                  return 'http://localhost:3000';
                default:
                  return null;
              }
            }),
          },
        },
        OpenapiGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
    eventService = module.get<EventService>(EventService);
    jest.clearAllMocks();
  });

  describe('listEvents', () => {
    it('should return paginated events', async () => {
      const mockResponse = {
        results: [
          {
            id: 'event1',
            object: 'event_definition',
            createdAt: new Date().toISOString(),
            description: 'Test event',
            displayName: 'Test Event',
            name: 'test_event',
          },
        ],
        next: null,
        previous: null,
      };

      mockEventService.listEvents.mockResolvedValue(mockResponse);

      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const result = await controller.listEvents(environment);

      expect(result).toEqual(mockResponse);
      expect(eventService.listEvents).toHaveBeenCalledWith('project-1', undefined, undefined);
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        results: [
          {
            id: 'event1',
            object: 'event_definition',
            createdAt: new Date().toISOString(),
            description: 'Test event',
            displayName: 'Test Event',
            name: 'test_event',
          },
        ],
        next: 'next_cursor',
        previous: null,
      };

      mockEventService.listEvents.mockResolvedValue(mockResponse);

      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const cursor = 'current_cursor';
      const limit = 10;

      const result = await controller.listEvents(environment, cursor, limit);

      expect(result).toEqual(mockResponse);
      expect(eventService.listEvents).toHaveBeenCalledWith('project-1', cursor, limit);
    });
  });
});
