import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../models/user.model';
import { ExpandType } from './user.dto';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    getUser: jest.fn(),
    listUsers: jest.fn(),
    upsertUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockPrismaService = {
    bizUser: {
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
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

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  describe('getUser', () => {
    it('should return user with no expand', async () => {
      const mockUser: User = {
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: new Date().toISOString(),
        companies: null,
        memberships: null,
      };

      mockUserService.getUser.mockResolvedValue(mockUser);

      const result = await controller.getUser('test-id', 'env-id');

      expect(result).toEqual(mockUser);
      expect(userService.getUser).toHaveBeenCalledWith('test-id', 'env-id', undefined);
    });

    it('should return user with expand', async () => {
      const mockUser: User = {
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: new Date().toISOString(),
        companies: null,
        memberships: [
          {
            id: 'membership-1',
            object: 'membership',
            attributes: { role: 'admin' },
            created_at: new Date().toISOString(),
            groupId: 'group-1',
            userId: 'user-1',
            group: {
              id: 'group-1',
              object: 'company',
              attributes: { name: 'Group 1' },
              createdAt: new Date().toISOString(),
            },
          },
        ],
      };

      mockUserService.getUser.mockResolvedValue(mockUser);

      const result = await controller.getUser('test-id', 'env-id', 'memberships.group');

      expect(result).toEqual(mockUser);
      expect(userService.getUser).toHaveBeenCalledWith('test-id', 'env-id', [
        ExpandType.MEMBERSHIPS_GROUP,
      ]);
    });
  });

  describe('listUsers', () => {
    it('should return paginated users with no expand', async () => {
      const mockUsers = {
        results: [
          {
            id: 'test-id-1',
            object: 'user',
            attributes: { name: 'User 1' },
            createdAt: new Date().toISOString(),
            companies: null,
            memberships: null,
          },
        ],
        next: null,
        previous: null,
      };

      mockUserService.listUsers.mockResolvedValue(mockUsers);

      const result = await controller.listUsers('env-id', undefined, 10);

      expect(result).toEqual(mockUsers);
      expect(userService.listUsers).toHaveBeenCalledWith('env-id', undefined, 10, undefined);
    });

    it('should return paginated users with expand', async () => {
      const mockUsers = {
        results: [
          {
            id: 'test-id-1',
            object: 'user',
            attributes: { name: 'User 1' },
            createdAt: new Date().toISOString(),
            companies: null,
            memberships: [
              {
                id: 'membership-1',
                object: 'membership',
                attributes: { role: 'admin' },
                created_at: new Date().toISOString(),
                groupId: 'group-1',
                userId: 'user-1',
                group: {
                  id: 'group-1',
                  object: 'company',
                  attributes: { name: 'Group 1' },
                  createdAt: new Date().toISOString(),
                },
              },
            ],
          },
        ],
        next: null,
        previous: null,
      };

      mockUserService.listUsers.mockResolvedValue(mockUsers);

      const result = await controller.listUsers('env-id', undefined, 10, 'memberships.group');

      expect(result).toEqual(mockUsers);
      expect(userService.listUsers).toHaveBeenCalledWith('env-id', undefined, 10, [
        ExpandType.MEMBERSHIPS_GROUP,
      ]);
    });
  });
});
