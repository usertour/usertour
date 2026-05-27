import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour/ui';
import { ContentDataType } from '@usertour/types';
import { addDays, differenceInCalendarDays, format, startOfMonth, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { AnalyticsDaysSkeleton } from './analytics-skeleton';

type Granularity = 'daily' | 'weekly' | 'monthly';

const GRANULARITY_LABEL: Record<Granularity, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const availableGranularities = (rangeDays: number): Granularity[] => {
  if (rangeDays <= 14) return ['daily'];
  if (rangeDays <= 90) return ['daily', 'weekly'];
  if (rangeDays <= 365) return ['weekly', 'monthly'];
  return ['monthly'];
};

const defaultGranularity = (rangeDays: number): Granularity => {
  if (rangeDays <= 30) return 'daily';
  if (rangeDays <= 180) return 'weekly';
  return 'monthly';
};

const isTotalSeries = (key: string) => key.startsWith('total');
const lineDash = (key: string) => (isTotalSeries(key) ? '5 4' : undefined);

const COLOR_VIEWS = 'hsl(217 91% 60%)';
const COLOR_VIEWS_SOFT = 'hsl(217 91% 74%)';
const COLOR_ENGAGEMENT = 'hsl(142 71% 45%)';
const COLOR_ENGAGEMENT_SOFT = 'hsl(142 60% 58%)';

const generateViewChartConfig = (contentType: ContentDataType): ChartConfig => {
  if (contentType === ContentDataType.TRACKER) {
    return {
      uniqueViews: { label: 'Unique events', color: COLOR_VIEWS },
      totalViews: { label: 'Events', color: COLOR_VIEWS_SOFT },
    };
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return {
      uniqueViews: { label: 'Unique views', color: COLOR_VIEWS },
      uniqueCompletions: { label: 'Activations', color: COLOR_ENGAGEMENT },
    };
  }
  if (contentType === ContentDataType.BANNER) {
    return {
      uniqueViews: { label: 'Unique views', color: COLOR_VIEWS },
      uniqueCompletions: { label: 'Dismissals', color: COLOR_ENGAGEMENT },
    };
  }
  if (contentType === ContentDataType.RESOURCE_CENTER) {
    return {
      uniqueViews: { label: 'Unique user interactions', color: COLOR_VIEWS },
      uniqueCompletions: { label: 'Unique clickers', color: COLOR_ENGAGEMENT },
    };
  }
  return {
    uniqueViews: { label: 'Unique views', color: COLOR_VIEWS },
    uniqueCompletions: { label: 'Unique completions', color: COLOR_ENGAGEMENT },
    totalViews: { label: 'Total views', color: COLOR_VIEWS_SOFT },
    totalCompletions: { label: 'Total completions', color: COLOR_ENGAGEMENT_SOFT },
  };
};

type BucketData = {
  date: string;
  tooltipLabel: string;
  totalViews: number;
  totalCompletions: number;
  uniqueViews: number;
  uniqueCompletions: number;
};

const formatDateRange = (range: DateRange | undefined): string | null => {
  if (!range?.from || !range?.to) return null;
  const days = differenceInCalendarDays(new Date(range.to), new Date(range.from)) + 1;
  return `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d')} · ${days} ${
    days === 1 ? 'day' : 'days'
  }`;
};

const formatBucketLabel = (date: Date, granularity: Granularity): string => {
  if (granularity === 'monthly') return format(date, 'MMM yyyy');
  return format(date, 'MMM d');
};

const formatBucketTooltipLabel = (date: Date, granularity: Granularity): string => {
  if (granularity === 'monthly') return format(date, 'MMMM yyyy');
  if (granularity === 'weekly') {
    const end = addDays(date, 6);
    const sameYear = date.getFullYear() === end.getFullYear();
    const startLabel = sameYear ? format(date, 'MMM d') : format(date, 'MMM d, yyyy');
    return `${startLabel} – ${format(end, 'MMM d, yyyy')}`;
  }
  return format(date, 'MMM d, yyyy');
};

const TooltipRow = ({
  value,
  name,
  chartConfig,
}: {
  value: number;
  name: string;
  chartConfig: ChartConfig;
}) => (
  <div className="flex flex-row min-w-[180px] items-center text-xs text-muted-foreground">
    <div className="grow">{chartConfig[name as keyof typeof chartConfig]?.label || name}</div>
    <div className="flex-none mx-2 font-medium tabular-nums text-foreground">
      {value.toLocaleString()}
    </div>
  </div>
);

const ViewChart = ({
  chartData,
  chartConfig,
}: {
  chartData: BucketData[];
  chartConfig: ChartConfig;
}) => (
  <ChartContainer config={chartConfig} className="h-96 w-full">
    <ComposedChart accessibilityLayer data={chartData}>
      <CartesianGrid vertical={false} />
      <YAxis
        tickLine={false}
        tickMargin={10}
        axisLine={false}
        allowDecimals={false}
        tickFormatter={(v: number) => v.toLocaleString()}
      />
      <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
      <ChartTooltip
        content={
          <ChartTooltipContent
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload as BucketData | undefined;
              return item?.tooltipLabel ?? label;
            }}
            formatter={(value, name) => (
              <TooltipRow value={Number(value)} name={name as string} chartConfig={chartConfig} />
            )}
          />
        }
        cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
      />
      <ChartLegend content={<ChartLegendContent />} />
      {Object.keys(chartConfig).map((key) => (
        <Line
          key={key}
          dataKey={key}
          type="linear"
          stroke={`var(--color-${key})`}
          strokeWidth={2}
          strokeDasharray={lineDash(key)}
          dot={{ r: 2, strokeWidth: 0, fill: `var(--color-${key})` }}
          activeDot={{ r: 4 }}
        />
      ))}
    </ComposedChart>
  </ChartContainer>
);

const EmptyState = () => (
  <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
    No data in this range
  </div>
);

export const AnalyticsDays = () => {
  const { analyticsData, loading, dateRange } = useAnalyticsContext();
  const { content } = useContentDetailContext();
  const contentType = content?.type;

  const rangeDays = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return differenceInCalendarDays(new Date(dateRange.to), new Date(dateRange.from)) + 1;
  }, [dateRange]);

  const granularityOptions = useMemo(() => availableGranularities(rangeDays), [rangeDays]);
  const [userGranularity, setUserGranularity] = useState<Granularity | null>(null);
  const granularity: Granularity =
    userGranularity && granularityOptions.includes(userGranularity)
      ? userGranularity
      : defaultGranularity(rangeDays);

  const { chartData, hasData, avgUniqueRate, avgTotalRate } = useMemo(() => {
    const entries = analyticsData?.viewsByDay ?? [];
    const buckets = new Map<string, BucketData>();

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      const bucketDate =
        granularity === 'monthly'
          ? startOfMonth(entryDate)
          : granularity === 'weekly'
            ? startOfWeek(entryDate, { weekStartsOn: 1 })
            : entryDate;
      const key = bucketDate.toISOString();
      const existing = buckets.get(key);
      if (existing) {
        existing.uniqueViews += entry.uniqueViews;
        existing.uniqueCompletions += entry.uniqueCompletions;
        existing.totalViews += entry.totalViews;
        existing.totalCompletions += entry.totalCompletions;
      } else {
        buckets.set(key, {
          date: formatBucketLabel(bucketDate, granularity),
          tooltipLabel: formatBucketTooltipLabel(bucketDate, granularity),
          uniqueViews: entry.uniqueViews,
          uniqueCompletions: entry.uniqueCompletions,
          totalViews: entry.totalViews,
          totalCompletions: entry.totalCompletions,
        });
      }
    }

    const data = Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);

    const sum = data.reduce(
      (acc, d) => {
        acc.uniqueViews += d.uniqueViews;
        acc.uniqueCompletions += d.uniqueCompletions;
        acc.totalViews += d.totalViews;
        acc.totalCompletions += d.totalCompletions;
        return acc;
      },
      { uniqueViews: 0, uniqueCompletions: 0, totalViews: 0, totalCompletions: 0 },
    );

    return {
      chartData: data,
      hasData: data.length > 0 && (sum.uniqueViews > 0 || sum.totalViews > 0),
      avgUniqueRate: sum.uniqueViews
        ? Math.round((sum.uniqueCompletions / sum.uniqueViews) * 100)
        : null,
      avgTotalRate: sum.totalViews
        ? Math.round((sum.totalCompletions / sum.totalViews) * 100)
        : null,
    };
  }, [analyticsData, granularity]);

  if (loading) {
    return <AnalyticsDaysSkeleton />;
  }

  if (!contentType) {
    return null;
  }

  const showRate =
    contentType !== ContentDataType.BANNER &&
    contentType !== ContentDataType.TRACKER &&
    contentType !== ContentDataType.RESOURCE_CENTER;

  const dateLabel = formatDateRange(dateRange);

  const rateSummary =
    !showRate || !hasData ? null : avgUniqueRate === null ? (
      'No completions in range'
    ) : contentType === ContentDataType.LAUNCHER ? (
      <>
        Avg activation rate{' '}
        <span className="font-medium text-foreground tabular-nums">{avgUniqueRate}%</span>
      </>
    ) : (
      <>
        Avg unique rate{' '}
        <span className="font-medium text-foreground tabular-nums">{avgUniqueRate}%</span>
        {avgTotalRate !== null && (
          <>
            {' · '}Avg total rate{' '}
            <span className="font-medium text-foreground tabular-nums">{avgTotalRate}%</span>
          </>
        )}
      </>
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Performance</CardTitle>
            {dateLabel && <CardDescription>{dateLabel}</CardDescription>}
            {rateSummary && <div className="text-xs text-muted-foreground">{rateSummary}</div>}
          </div>
          {granularityOptions.length > 1 && (
            <Select value={granularity} onValueChange={(v) => setUserGranularity(v as Granularity)}>
              <SelectTrigger className="h-9 w-[120px] flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {granularityOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {GRANULARITY_LABEL[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ViewChart chartConfig={generateViewChartConfig(contentType)} chartData={chartData} />
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
};

AnalyticsDays.displayName = 'AnalyticsDays';
