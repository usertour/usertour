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

// Domain-internal counter names — the mapper renames these per content type.
const rawCounts = {
  uniqueViews: 10,
  totalViews: 14,
  uniqueCompletions: 4,
  totalCompletions: 5,
};

describe('mapContentAnalytics (pure)', () => {
  it('flow: starts/completions naming, byDay dates, step rows with renamed tooltip counters', () => {
    const raw = {
      ...rawCounts,
      viewsByDay: [{ date: new Date('2026-07-01T10:00:00Z'), ...rawCounts }],
      viewsByStep: [
        {
          name: 'Step A',
          cvid: 'cv1',
          stepIndex: 0,
          type: 'tooltip',
          explicitCompletionStep: true, // internal — must not leak
          target: { customSelector: '#x' }, // internal — must not leak
          analytics: {
            ...rawCounts,
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
      contentType: 'flow',
      environmentId: 'e1',
      uniqueStarts: 10,
      totalStarts: 14,
      uniqueCompletions: 4,
      totalCompletions: 5,
    });
    // No foreign-variant keys — the union carries only what the type has.
    expect(out).not.toHaveProperty('tasks');
    expect(out).not.toHaveProperty('blocks');
    expect(out).not.toHaveProperty('uniqueViews');
    expect(out.byDay).toEqual([
      {
        date: '2026-07-01',
        uniqueStarts: 10,
        totalStarts: 14,
        uniqueCompletions: 4,
        totalCompletions: 5,
      },
    ]);
    expect(out.contentType === 'flow' && out.steps).toEqual([
      {
        name: 'Step A',
        cvid: 'cv1',
        stepIndex: 0,
        type: 'tooltip',
        ...rawCounts,
        uniqueTooltipTargetMissing: 2,
        totalTooltipTargetMissing: 3,
      },
    ]);
  });

  it('checklist: starts/completions + task rows; non-array domain signals normalize to []', () => {
    // Checklist path: viewsByStep comes back as `false`, viewsByDay as null.
    const raw = {
      ...rawCounts,
      viewsByDay: null,
      viewsByStep: false,
      viewsByTask: [
        { name: 'T1', taskId: 't1', analytics: { ...rawCounts, uniqueClicks: 7, totalClicks: 9 } },
      ],
      viewsByBlock: [],
    };
    const out = mapContentAnalytics(raw, meta(ContentDataType.CHECKLIST));
    expect(out).toMatchObject({ contentType: 'checklist', uniqueStarts: 10, uniqueCompletions: 4 });
    expect(out.byDay).toEqual([]);
    expect(out).not.toHaveProperty('steps');
    expect(out.contentType === 'checklist' && out.tasks).toEqual([
      { name: 'T1', taskId: 't1', ...rawCounts, uniqueClicks: 7, totalClicks: 9 },
    ]);
  });

  it('launcher: seen/activations naming, no breakdown', () => {
    const out = mapContentAnalytics(
      { ...rawCounts, viewsByDay: [] },
      meta(ContentDataType.LAUNCHER),
    );
    expect(out).toMatchObject({
      contentType: 'launcher',
      uniqueSeen: 10,
      totalSeen: 14,
      uniqueActivations: 4,
      totalActivations: 5,
    });
    expect(out).not.toHaveProperty('steps');
    expect(out).not.toHaveProperty('uniqueCompletions');
  });

  it("banner: a dismissal is a dismissal — no 'completions' field exists", () => {
    const out = mapContentAnalytics({ ...rawCounts, viewsByDay: [] }, meta(ContentDataType.BANNER));
    expect(out).toMatchObject({
      contentType: 'banner',
      uniqueSeen: 10,
      totalSeen: 14,
      uniqueDismissals: 4,
      totalDismissals: 5,
    });
    expect(out).not.toHaveProperty('uniqueCompletions');
  });

  it('resource center: opens/clicks naming + block click rows', () => {
    const raw = {
      ...rawCounts,
      viewsByDay: [{ date: new Date('2026-07-01T00:00:00Z'), ...rawCounts }],
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
    expect(out).toMatchObject({
      contentType: 'resource-center',
      uniqueOpens: 10,
      totalOpens: 14,
      uniqueClicks: 4,
      totalClicks: 5,
    });
    expect(out.byDay).toEqual([
      { date: '2026-07-01', uniqueOpens: 10, totalOpens: 14, uniqueClicks: 4, totalClicks: 5 },
    ]);
    expect(out.contentType === 'resource-center' && out.blocks).toEqual([
      { name: 'Docs', blockId: 'b1', tabName: 'Help', uniqueClicks: 1, totalClicks: 2 },
      { name: 'Chat', blockId: 'b2', tabName: null, uniqueClicks: 0, totalClicks: 0 },
    ]);
  });

  it('tracker: users/occurrences only — the domain mirrors completions from views (fake data, dropped)', () => {
    const raw = {
      ...rawCounts,
      viewsByDay: [{ date: new Date('2026-07-01T00:00:00Z'), ...rawCounts }],
    };
    const out = mapContentAnalytics(raw, meta(ContentDataType.TRACKER));
    expect(out).toMatchObject({ contentType: 'tracker', uniqueUsers: 10, totalOccurrences: 14 });
    expect(out).not.toHaveProperty('uniqueCompletions');
    expect(out.byDay).toEqual([{ date: '2026-07-01', uniqueUsers: 10, totalOccurrences: 14 }]);
  });

  it('rejects content types outside the v2 union', () => {
    expect(() => mapContentAnalytics(rawCounts, meta('survey'))).toThrow(
      /Unsupported content type/,
    );
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
