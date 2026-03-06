import {
  Attribute,
  AttributeBizTypes,
  BizEvent,
  BizEvents,
  BizSession,
  ContentDataType,
  ContentVersion,
  EventAttributes,
  contentStartReason,
} from '@usertour/types';

jest.mock('@usertour/helpers', () => ({
  extractQuestionData: jest.fn(() => []),
}));

jest.mock('@usertour-packages/shared-editor', () => ({
  ContentEditorElementType: {
    STAR_RATING: 'star-rating',
    SCALE: 'scale',
    NPS: 'nps',
    MULTIPLE_CHOICE: 'multiple-choice',
    MULTI_LINE_TEXT: 'multi-line-text',
  },
  contentTypesConfig: [],
}));

import { buildExportPayload } from './export-csv.utils';

const createEvent = (codeName: BizEvents, data: Record<string, unknown> = {}): BizEvent =>
  ({
    data,
    createdAt: '2026-03-05T10:27:41.000Z',
    event: { codeName },
  }) as BizEvent;

const createSession = (overrides: Partial<BizSession> = {}): BizSession =>
  ({
    createdAt: '2026-03-05T10:27:41.000Z',
    progress: 50,
    bizEvent: [],
    bizUser: {
      externalId: 'user-1',
      data: { name: 'Alice', email: 'alice@example.com' },
      bizUsersOnCompany: [
        {
          bizCompany: {
            externalId: 'company-1',
            data: { name: 'ACME' },
          },
        },
      ],
    },
    version: { sequence: 1 },
    ...overrides,
  }) as BizSession;

describe('buildExportPayload', () => {
  it('exports checklist task columns from CHECKLIST_TASK_COMPLETED and state as Active', () => {
    const checklistVersion = {
      sequence: 1,
      data: {
        items: [
          { id: 'task-1', name: 'Task A' },
          { id: 'task-2', name: 'Task B' },
        ],
      },
      steps: [],
    } as unknown as ContentVersion;

    const session = createSession({
      bizEvent: [
        createEvent(BizEvents.CHECKLIST_STARTED, {
          [EventAttributes.CHECKLIST_START_REASON]: contentStartReason.START_FROM_PROGRAM,
        }),
        createEvent(BizEvents.CHECKLIST_TASK_COMPLETED, {
          [EventAttributes.CHECKLIST_TASK_ID]: 'task-1',
        }),
      ],
    });

    const payload = buildExportPayload({
      sessions: [session],
      contentType: ContentDataType.CHECKLIST,
      contentName: 'Checklist',
      includeAllAttributes: false,
      version: checklistVersion,
    });

    expect(payload.headers).toContain('Task 1. Task A');
    expect(payload.headers).toContain('Task 2. Task B');
    expect(payload.headers.some((h) => h.startsWith('Question ('))).toBe(false);

    const stateIndex = payload.headers.indexOf('State');
    const task1Index = payload.headers.indexOf('Task 1. Task A');
    const task2Index = payload.headers.indexOf('Task 2. Task B');

    expect(payload.rows[0][stateIndex]).toBe('Active');
    expect(payload.rows[0][task1Index]).toBe('✔');
    expect(payload.rows[0][task2Index]).toBe('');
  });

  it('exports launcher Activated as launcher_activated event count', () => {
    const session = createSession({
      bizEvent: [
        createEvent(BizEvents.LAUNCHER_ACTIVATED),
        createEvent(BizEvents.LAUNCHER_ACTIVATED),
      ],
    });

    const payload = buildExportPayload({
      sessions: [session],
      contentType: ContentDataType.LAUNCHER,
      contentName: 'Launcher',
      includeAllAttributes: false,
      version: { sequence: 2, steps: [] } as unknown as ContentVersion,
    });

    const activatedIndex = payload.headers.indexOf('Activated');
    expect(activatedIndex).toBeGreaterThan(-1);
    expect(payload.rows[0][activatedIndex]).toBe(2);
  });

  it('keeps banner export minimal for content columns', () => {
    const session = createSession();
    const payload = buildExportPayload({
      sessions: [session],
      contentType: ContentDataType.BANNER,
      contentName: 'Banner',
      includeAllAttributes: false,
      version: { sequence: 3, steps: [] } as unknown as ContentVersion,
    });

    expect(payload.headers).toContain('Version');
    expect(payload.headers).toContain('Started at (UTC)');
    expect(payload.headers).not.toContain('Progress');
    expect(payload.headers).not.toContain('State');
    expect(payload.headers).not.toContain('Start reason');
    expect(payload.headers).not.toContain('End reason');
  });

  it('builds filename with sanitized/truncated content name and local date range', () => {
    const session = createSession();
    const payload = buildExportPayload({
      sessions: [session],
      contentType: ContentDataType.FLOW,
      contentName: 'A very long content name with / invalid : chars ? and spaces',
      includeAllAttributes: false,
      version: { sequence: 1, steps: [] } as unknown as ContentVersion,
      dateRange: {
        from: new Date(2026, 2, 1),
        to: new Date(2026, 2, 5),
      },
    });

    expect(payload.filename).toBe(
      'Usertour-A-very-long-content-name-with---invalid-sessions-2026-03-01_to_2026-03-05.csv',
    );
  });

  it('includes all user attributes when includeAllAttributes is true', () => {
    const session = createSession({
      bizUser: {
        id: 'biz-user-1',
        environmentId: 'env-1',
        createdAt: '2026-03-05T10:27:41.000Z',
        externalId: 'user-1',
        data: { name: 'Alice', email: 'alice@example.com', role: 'admin' },
        bizUsersOnCompany: [],
      },
    });

    const payload = buildExportPayload({
      sessions: [session],
      contentType: ContentDataType.FLOW,
      contentName: 'Flow',
      includeAllAttributes: true,
      attributeList: [
        {
          bizType: AttributeBizTypes.User,
          codeName: 'role',
          displayName: 'Role',
        },
      ] as unknown as Attribute[],
      version: { sequence: 1, steps: [] } as unknown as ContentVersion,
    });

    expect(payload.headers).toContain('User: Role');
    const roleIndex = payload.headers.indexOf('User: Role');
    expect(payload.rows[0][roleIndex]).toBe('admin');
  });
});
