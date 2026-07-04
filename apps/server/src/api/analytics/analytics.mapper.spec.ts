import { ContentDataType } from '@usertour/types';

import { mapContentAnalytics, mapQuestionAnalytics } from './analytics.mapper';
import { toDayBoundary } from './analytics.service';

const meta = (contentType: string) => ({
  contentId: 'c1',
  contentType,
  environmentId: 'e1',
  startDate: '2026-06-05',
  endDate: '2026-07-05',
  timezone: 'UTC',
});

const baseCounts = {
  uniqueViews: 10,
  totalViews: 14,
  uniqueCompletions: 4,
  totalCompletions: 5,
};

describe('mapContentAnalytics (pure)', () => {
  it('maps a flow: counters, byDay dates, step rows with renamed tooltip counters', () => {
    const raw = {
      ...baseCounts,
      viewsByDay: [{ date: new Date('2026-07-01T10:00:00Z'), ...baseCounts }],
      viewsByStep: [
        {
          name: 'Step A',
          cvid: 'cv1',
          stepIndex: 0,
          type: 'tooltip',
          explicitCompletionStep: true, // internal — must not leak
          target: { customSelector: '#x' }, // internal — must not leak
          analytics: {
            ...baseCounts,
            uniqueTooltipTargetMissingCount: 2,
            tooltipTargetMissingCount: 3,
          },
        },
      ],
      viewsByTask: [],
      viewsByBlock: [],
    };
    const out = mapContentAnalytics(raw, meta(ContentDataType.FLOW));
    expect(out).toMatchObject({
      object: 'contentAnalytics',
      contentId: 'c1',
      environmentId: 'e1',
      ...baseCounts,
      tasks: null,
      blocks: null,
    });
    expect(out.byDay).toEqual([{ date: '2026-07-01', ...baseCounts }]);
    expect(out.steps).toEqual([
      {
        name: 'Step A',
        cvid: 'cv1',
        stepIndex: 0,
        type: 'tooltip',
        ...baseCounts,
        uniqueTooltipTargetMissing: 2,
        totalTooltipTargetMissing: 3,
      },
    ]);
  });

  it('normalizes the domain "not applicable" signals (false / []) to null by content type', () => {
    // Checklist path: viewsByStep comes back as `false`, tasks as rows.
    const raw = {
      ...baseCounts,
      viewsByDay: null,
      viewsByStep: false,
      viewsByTask: [
        { name: 'T1', taskId: 't1', analytics: { ...baseCounts, uniqueClicks: 7, totalClicks: 9 } },
      ],
      viewsByBlock: [],
    };
    const out = mapContentAnalytics(raw, meta(ContentDataType.CHECKLIST));
    expect(out.steps).toBeNull();
    expect(out.blocks).toBeNull();
    expect(out.byDay).toEqual([]);
    expect(out.tasks).toEqual([
      { name: 'T1', taskId: 't1', ...baseCounts, uniqueClicks: 7, totalClicks: 9 },
    ]);
  });

  it('a banner gets counters only — every breakdown is null even when arrays are present', () => {
    const raw = {
      ...baseCounts,
      viewsByDay: [],
      viewsByStep: [],
      viewsByTask: [],
      viewsByBlock: [],
    };
    const out = mapContentAnalytics(raw, meta(ContentDataType.BANNER));
    expect(out.steps).toBeNull();
    expect(out.tasks).toBeNull();
    expect(out.blocks).toBeNull();
  });

  it('resource center maps block click rows', () => {
    const raw = {
      ...baseCounts,
      viewsByBlock: [
        {
          name: 'Docs',
          blockId: 'b1',
          tabName: 'Help',
          analytics: { uniqueClicks: 1, totalClicks: 2 },
        },
        {
          name: 'Chat',
          blockId: 'b2',
          tabName: null,
          analytics: { uniqueClicks: 0, totalClicks: 0 },
        },
      ],
    };
    const out = mapContentAnalytics(raw, meta(ContentDataType.RESOURCE_CENTER));
    expect(out.blocks).toEqual([
      { name: 'Docs', blockId: 'b1', tabName: 'Help', uniqueClicks: 1, totalClicks: 2 },
      { name: 'Chat', blockId: 'b2', tabName: null, uniqueClicks: 0, totalClicks: 0 },
    ]);
  });
});

describe('mapQuestionAnalytics (pure)', () => {
  const day = (d: string, metrics: Record<string, unknown>) => ({
    day: new Date(d),
    startDate: new Date(d),
    endDate: new Date(d),
    distribution: [],
    metrics,
  });

  it('maps an NPS question: slim question ref, overall = LAST rolling-window day', () => {
    const raw = [
      {
        totalResponse: 57,
        question: { type: 'nps', data: { cvid: 'q1', name: 'How satisfied?' } },
        answer: [{ answer: 9, count: 21, percentage: 36.8 }],
        npsAnalysisByDay: [
          day('2026-07-01', {
            promoters: { count: 1, percentage: 50 },
            passives: { count: 1, percentage: 50 },
            detractors: { count: 0, percentage: 0 },
            total: 2,
            views: 3,
            npsScore: 50,
          }),
          day('2026-07-02', {
            promoters: { count: 30, percentage: 52.6 },
            passives: { count: 16, percentage: 28.1 },
            detractors: { count: 11, percentage: 19.3 },
            total: 57,
            views: 60,
            npsScore: 42,
          }),
        ],
      },
    ];
    const [out] = mapQuestionAnalytics(raw);
    expect(out.question).toEqual({ cvid: 'q1', name: 'How satisfied?', type: 'nps' });
    expect(out.totalResponses).toBe(57);
    expect(out.distribution).toEqual([{ answer: 9, count: 21, percentage: 36.8 }]);
    expect(out.rating).toBeNull();
    expect(out.nps).toMatchObject({
      score: 42,
      promoters: { count: 30, percentage: 52.6 },
      detractors: { count: 11, percentage: 19.3 },
    });
    expect(out.nps?.byDay).toEqual([
      { date: '2026-07-01', score: 50, total: 2 },
      { date: '2026-07-02', score: 42, total: 57 },
    ]);
  });

  it('maps a rating question and leaves nps null; text questions get neither', () => {
    const raw = [
      {
        totalResponse: 5,
        question: { type: 'star-rating', data: { cvid: 'q2', name: 'Rate us' } },
        answer: [{ answer: 4, count: 3, percentage: 60 }],
        averageByDay: [day('2026-07-02', { average: 4.2, total: 5, views: 6 })],
      },
      {
        totalResponse: 2,
        question: { type: 'multi-line-text', data: { cvid: 'q3', name: 'Feedback' } },
        answer: [{ answer: 'Great', count: 1, percentage: 50 }],
      },
    ];
    const [rating, text] = mapQuestionAnalytics(raw);
    expect(rating.nps).toBeNull();
    expect(rating.rating).toEqual({
      average: 4.2,
      byDay: [{ date: '2026-07-02', average: 4.2, total: 5 }],
    });
    expect(text.nps).toBeNull();
    expect(text.rating).toBeNull();
    expect(text.totalResponses).toBe(2);
  });
});

describe('toDayBoundary', () => {
  it('expands an inclusive date to full-day bounds (the domain filters createdAt <= raw value)', () => {
    // Regression: passing bare '2026-07-04' straight through meant MIDNIGHT,
    // silently dropping the entire end day — live-verified as all-zero
    // analytics while 33 sessions existed on that day.
    expect(toDayBoundary('2026-07-04', 'UTC', 'start')).toBe('2026-07-04T00:00:00.000Z');
    expect(toDayBoundary('2026-07-04', 'UTC', 'end')).toBe('2026-07-04T23:59:59.999Z');
  });

  it('respects the requested timezone for the day edges', () => {
    // Shanghai (UTC+8): the local day starts 8h before UTC midnight.
    expect(toDayBoundary('2026-07-04', 'Asia/Shanghai', 'start')).toBe('2026-07-03T16:00:00.000Z');
    expect(toDayBoundary('2026-07-04', 'Asia/Shanghai', 'end')).toBe('2026-07-04T15:59:59.999Z');
  });

  it('passes full timestamps through untouched', () => {
    expect(toDayBoundary('2026-07-04T12:30:00.000Z', 'UTC', 'end')).toBe(
      '2026-07-04T12:30:00.000Z',
    );
  });
});
