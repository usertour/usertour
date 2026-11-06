import { Prisma } from '@prisma/client';
import {
  BizEvents,
  ContentEditorElementType,
  EventAttributes,
  contentEndReason,
} from '@usertour/types';

import { AnalyticsService } from './analytics.service';

const condition = {
  environmentId: 'env1',
  contentId: 'c1',
  eventId: 'start-event',
  startDateStr: '2026-06-01T00:00:00.000Z',
  endDateStr: '2026-07-01T00:00:00.000Z',
  isDistinct: true,
};

const button = (cvid: string | undefined, text: string) => ({
  element: { type: ContentEditorElementType.BUTTON, data: { cvid, text, actions: [] } },
  children: null,
});
const text = () => ({ element: { type: ContentEditorElementType.TEXT, data: [] }, children: null });
const group = (...items: unknown[]) => [
  {
    element: { type: ContentEditorElementType.GROUP },
    children: [{ element: { type: ContentEditorElementType.COLUMN }, children: items }],
  },
];

const publishedContent = (type: string) => ({
  id: 'c1',
  type,
  editedVersionId: 'v-draft',
  contentOnEnvironments: [{ environmentId: 'env1', publishedVersionId: 'v1' }],
});

const buildService = () => {
  const prisma: any = {
    content: { findFirst: jest.fn() },
    version: { findFirst: jest.fn() },
    event: { findFirst: jest.fn() },
    bizSession: { findUnique: jest.fn(), update: jest.fn() },
    bizEvent: { findFirst: jest.fn(), create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((callback: any) => callback(prisma)),
  };
  const eventEmitter: any = { emit: jest.fn() };
  return { service: new AnalyticsService(prisma, eventEmitter), prisma };
};

describe('AnalyticsService.aggregationButtonsByContent', () => {
  it('walks the published version steps and keys each button by (button cvid, step cvid)', async () => {
    const { service, prisma } = buildService();
    prisma.content.findFirst.mockResolvedValue(publishedContent('embed'));
    prisma.version.findFirst.mockResolvedValue({
      id: 'v1',
      steps: [
        {
          cvid: 's1',
          name: 'Step 1',
          data: group(text(), button('b1', 'Next'), button(undefined, 'No cvid')),
        },
        // A duplicated step kept the original button cvid: the pair tells them apart
        { cvid: 's2', name: 'Step 2', data: group(button('b1', 'Finish')) },
      ],
    });
    prisma.event.findFirst.mockResolvedValue({ id: 'click-event' });
    const uniqueClicks = jest.spyOn(service, 'aggregationByItem').mockResolvedValue(3);
    const totalClicks = jest.spyOn(service, 'countTotalEvents').mockResolvedValue(5);

    const rows = await service.aggregationButtonsByContent(condition, 'p1');

    expect(rows).toEqual([
      {
        name: 'Next',
        cvid: 'b1',
        stepCvid: 's1',
        stepName: 'Step 1',
        stepIndex: 0,
        analytics: { uniqueClicks: 3, totalClicks: 5 },
      },
      {
        name: 'Finish',
        cvid: 'b1',
        stepCvid: 's2',
        stepName: 'Step 2',
        stepIndex: 1,
        analytics: { uniqueClicks: 3, totalClicks: 5 },
      },
    ]);
    expect(prisma.version.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'v1' } }),
    );
    expect(prisma.event.findFirst).toHaveBeenCalledWith({
      where: { projectId: 'p1', codeName: BizEvents.BUTTON_CLICKED },
    });
    const expectedKey = (stepCvid: string) => ({
      ...condition,
      eventId: 'click-event',
      key: EventAttributes.BUTTON_CVID,
      value: 'b1',
      additionalAttributes: { [EventAttributes.EMBED_STEP_CVID]: stepCvid },
    });
    expect(uniqueClicks.mock.calls.map(([call]) => call)).toEqual([
      { ...expectedKey('s1'), isDistinct: true },
      { ...expectedKey('s2'), isDistinct: true },
    ]);
    expect(totalClicks.mock.calls.map(([call]) => call)).toEqual([
      expectedKey('s1'),
      expectedKey('s2'),
    ]);
  });

  it('returns no rows for other content types without reading the version', async () => {
    const { service, prisma } = buildService();
    prisma.content.findFirst.mockResolvedValue(publishedContent('flow'));

    expect(await service.aggregationButtonsByContent(condition, 'p1')).toEqual([]);
    expect(prisma.version.findFirst).not.toHaveBeenCalled();
  });
});

describe('AnalyticsService.aggregationStepsByContent', () => {
  const step = { cvid: 's1', name: 'A', type: 'tooltip', setting: {}, target: null, data: [] };
  const stepSeenEvent = { id: 'step-seen' } as any;
  const completeEvent = { id: 'complete' } as any;
  const tooltipTargetMissingEvent = { id: 'target-missing' } as any;

  it('flow: queries views, completions and target-missing under flow_step_cvid', async () => {
    const { service, prisma } = buildService();
    prisma.content.findFirst.mockResolvedValue(publishedContent('flow'));
    prisma.version.findFirst.mockResolvedValue({ id: 'v1', steps: [step] });
    const byItem = jest.spyOn(service, 'aggregationByItem').mockResolvedValue(1);

    const rows = await service.aggregationStepsByContent(
      condition,
      stepSeenEvent,
      completeEvent,
      tooltipTargetMissingEvent,
    );

    expect(rows).toEqual([
      {
        name: 'A',
        cvid: 's1',
        stepIndex: 0,
        explicitCompletionStep: false,
        target: null,
        type: 'tooltip',
        analytics: {
          uniqueViews: 1,
          totalViews: 1,
          uniqueCompletions: 1,
          totalCompletions: 1,
          uniqueTooltipTargetMissingCount: 1,
          tooltipTargetMissingCount: 1,
        },
      },
    ]);
    expect(byItem).toHaveBeenCalledTimes(6);
    for (const [call] of byItem.mock.calls) {
      expect(call).toEqual(expect.objectContaining({ key: 'flow_step_cvid', value: 's1' }));
    }
    expect(byItem.mock.calls.map(([call]) => call.eventId)).toEqual([
      'step-seen',
      'step-seen',
      'complete',
      'complete',
      'target-missing',
      'target-missing',
    ]);
  });

  it('embed: queries only the step-seen views under embed_step_cvid', async () => {
    const { service, prisma } = buildService();
    prisma.content.findFirst.mockResolvedValue(publishedContent('embed'));
    prisma.version.findFirst.mockResolvedValue({ id: 'v1', steps: [step] });
    const byItem = jest.spyOn(service, 'aggregationByItem').mockResolvedValue(4);

    const rows = await service.aggregationStepsByContent(condition, stepSeenEvent);

    expect(rows[0].analytics).toEqual({
      uniqueViews: 4,
      totalViews: 4,
      uniqueCompletions: 0,
      totalCompletions: 0,
      uniqueTooltipTargetMissingCount: 0,
      tooltipTargetMissingCount: 0,
    });
    expect(byItem.mock.calls.map(([call]) => call)).toEqual([
      expect.objectContaining({
        eventId: 'step-seen',
        key: 'embed_step_cvid',
        value: 's1',
        isDistinct: true,
      }),
      expect.objectContaining({
        eventId: 'step-seen',
        key: 'embed_step_cvid',
        value: 's1',
        isDistinct: false,
      }),
    ]);
  });

  it('returns no rows for a type whose steps are not steps', async () => {
    const { service, prisma } = buildService();
    prisma.content.findFirst.mockResolvedValue(publishedContent('checklist'));

    expect(await service.aggregationStepsByContent(condition, stepSeenEvent)).toEqual([]);
    expect(prisma.version.findFirst).not.toHaveBeenCalled();
  });
});

describe('AnalyticsService.countTotalEvents attribute matching', () => {
  const captureQuery = (prisma: any) => {
    const captured: Prisma.Sql[] = [];
    prisma.$queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.push(Prisma.sql(strings, ...(values as Prisma.Sql[])));
      return Promise.resolve([{ count: BigInt(7) }]);
    });
    return captured;
  };

  it('ANDs every additional attribute pair after the primary one', async () => {
    const { service, prisma } = buildService();
    const captured = captureQuery(prisma);

    const count = await service.countTotalEvents({
      ...condition,
      eventId: 'click-event',
      key: EventAttributes.BUTTON_CVID,
      value: 'b1',
      additionalAttributes: { [EventAttributes.EMBED_STEP_CVID]: 's1' },
    });

    expect(count).toBe(7);
    expect(captured[0].sql).toMatch(
      /AND "BizEvent"\."data" ->> \? = \? AND "BizEvent"\."data" ->> \? = \?\s*$/,
    );
    expect(captured[0].values.slice(-4)).toEqual(['button_cvid', 'b1', 'embed_step_cvid', 's1']);
  });

  it('keeps the single-pair clause unchanged when no additional attributes are given', async () => {
    const { service, prisma } = buildService();
    const captured = captureQuery(prisma);

    await service.countTotalEvents({
      ...condition,
      eventId: 'task-event',
      key: 'checklist_task_id',
      value: 't1',
    });

    expect(captured[0].sql).toMatch(/AND "BizEvent"\."data" ->> \? = \?\s*$/);
    expect(captured[0].sql.match(/->>/g)).toHaveLength(1);
    expect(captured[0].values.slice(-2)).toEqual(['checklist_task_id', 't1']);
  });
});

describe('AnalyticsService.endSession for an embed session', () => {
  it('writes embed_dismissed with admin_ended and the latest event attributes', async () => {
    const { service, prisma } = buildService();
    prisma.bizSession.findUnique.mockResolvedValue({
      id: 'session1',
      state: 0,
      bizUserId: 'user1',
      environmentId: 'env1',
      content: { type: 'embed' },
      environment: { projectId: 'p1' },
    });
    prisma.event.findFirst.mockResolvedValue({
      id: 'dismissed-event',
      codeName: BizEvents.EMBED_DISMISSED,
    });
    prisma.bizEvent.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.eventId
          ? null
          : {
              data: {
                [EventAttributes.EMBED_ID]: 'c1',
                [EventAttributes.EMBED_NAME]: 'Welcome',
                [EventAttributes.EMBED_SESSION_ID]: 'session1',
                [EventAttributes.EMBED_STEP_CVID]: 's1',
                [EventAttributes.BUTTON_CVID]: 'b1',
              },
            },
      ),
    );
    prisma.bizEvent.create.mockResolvedValue({ id: 'biz-event1' });

    expect(await service.endSession('session1')).toBe(true);

    expect(prisma.event.findFirst).toHaveBeenCalledWith({
      where: { projectId: 'p1', codeName: BizEvents.EMBED_DISMISSED },
    });
    expect(prisma.bizEvent.create).toHaveBeenCalledWith({
      data: {
        bizSessionId: 'session1',
        eventId: 'dismissed-event',
        bizUserId: 'user1',
        // Only the dismissed event's own attributes are copied: no step or button keys
        data: {
          [EventAttributes.EMBED_END_REASON]: contentEndReason.ADMIN_ENDED,
          [EventAttributes.EMBED_ID]: 'c1',
          [EventAttributes.EMBED_NAME]: 'Welcome',
          [EventAttributes.EMBED_SESSION_ID]: 'session1',
        },
      },
    });
    expect(prisma.bizSession.update).toHaveBeenCalledWith({
      where: { id: 'session1' },
      data: { state: 1 },
    });
  });
});
