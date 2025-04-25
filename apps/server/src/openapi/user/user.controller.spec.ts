import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../models/user.model';
import { ExpandType } from './user.dto';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';

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
            object: 'company_membership',
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
                object: 'company_membership',
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

  describe('upsertUser', () => {
    it('should create a new user', async () => {
      const mockUser: User = {
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: new Date().toISOString(),
        companies: null,
        memberships: null,
      };

      const upsertData = {
        id: 'test-id',
        attributes: { name: 'Test User' },
      };

      mockUserService.upsertUser.mockResolvedValue(mockUser);

      const result = await controller.upsertUser(upsertData, 'env-id');

      expect(result).toEqual(mockUser);
      expect(userService.upsertUser).toHaveBeenCalledWith(upsertData, 'env-id');
    });

    it('should update an existing user', async () => {
      const mockUser: User = {
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Updated User' },
        createdAt: new Date().toISOString(),
        companies: null,
        memberships: null,
      };

      const upsertData = {
        id: 'test-id',
        attributes: { name: 'Updated User' },
      };

      mockUserService.upsertUser.mockResolvedValue(mockUser);

      const result = await controller.upsertUser(upsertData, 'env-id');

      expect(result).toEqual(mockUser);
      expect(userService.upsertUser).toHaveBeenCalledWith(upsertData, 'env-id');
    });

    it('should create user with memberships', async () => {
      const mockUser: User = {
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: new Date().toISOString(),
        companies: null,
        memberships: [
          {
            id: 'membership-1',
            object: 'company_membership',
            attributes: { role: 'admin' },
            created_at: new Date().toISOString(),
            groupId: 'group-1',
            userId: 'user-1',
          },
        ],
      };

      const upsertData = {
        id: 'test-id',
        attributes: { name: 'Test User' },
        memberships: [
          {
            id: 'membership-1',
            attributes: { role: 'admin' },
            company: {
              id: 'group-1',
              attributes: { name: 'Group 1' },
            },
          },
        ],
      };

      mockUserService.upsertUser.mockResolvedValue(mockUser);

      const result = await controller.upsertUser(upsertData, 'env-id');

      expect(result).toEqual(mockUser);
      expect(userService.upsertUser).toHaveBeenCalledWith(upsertData, 'env-id');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      mockUserService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser('test-id', 'env-id');

      expect(userService.deleteUser).toHaveBeenCalledWith('test-id', 'env-id');
    });

    it('should throw error when user not found', async () => {
      mockUserService.deleteUser.mockRejectedValue(
        new OpenAPIException(
          OpenAPIErrors.USER.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.USER.NOT_FOUND.code,
        ),
      );

      await expect(controller.deleteUser('non-existent', 'env-id')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.USER.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.USER.NOT_FOUND.code,
        ),
      );
    });
  });
});
