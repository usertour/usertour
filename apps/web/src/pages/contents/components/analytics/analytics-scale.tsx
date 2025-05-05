import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import type {
  AnswerCount,
  AverageByDay,
  Content,
  ContentQuestionAnalytics,
  Question,
} from '@usertour-ui/types';
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@usertour-ui/chart';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { cn } from '@usertour-ui/ui-utils';
import { ArrowRightIcon } from '@usertour-ui/icons';
import { useUpdateContentMutation } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { RollingWindowDialog } from './components/rolling-window-dialog';
import { ContentEditorElementType } from '@usertour-ui/shared-editor';
import { QuestionStarRating } from '@/components/molecules/question';

interface AnalyticsScaleProps {
  questionAnalytics: ContentQuestionAnalytics;
  totalViews: number;
  content: Content;
  onRollingWindowChange: (success: boolean) => void;
}

const CONSTANTS = {
  BAR_HEIGHT: 100,
  DEFAULT_ROLLING_WINDOW: { nps: 365, rate: 365, scale: 365 },
  CHART_DIMENSIONS: {
    WIDTH: 300,
    HEIGHT: 150,
    OUTER_RADIUS: 140,
    INNER_RADIUS: 110,
  },
} as const;

const formatDate = (date: string) => format(new Date(date), 'MMM dd, yyyy');

const completeDistribution = (min: number, max: number, distribution: AnswerCount[]) => {
  const fullDistribution: AnswerCount[] = [];

  for (let score = min; score <= max; score++) {
    const existingItem = distribution.find((item) => Number(item.answer) === score);
    fullDistribution.push(
      existingItem || {
        answer: score,
        count: 0,
        percentage: 0,
      },
    );
  }

  return fullDistribution;
};

export const AnalyticsScale = (props: AnalyticsScaleProps) => {
  const { questionAnalytics, totalViews, content, onRollingWindowChange } = props;
  const { averageByDay, answer, question } = questionAnalytics;
  const rollingWindow = content.config?.rollWindowConfig ?? CONSTANTS.DEFAULT_ROLLING_WINDOW;
  const [selectedDay, setSelectedDay] = useState<AverageByDay | null>(null);
  const { invoke: updateContent } = useUpdateContentMutation();
  const { toast } = useToast();
  const lowRange = question.data.lowRange ?? 0;
  const highRange = question.data.highRange ?? 10;

  const isScale = question.type === ContentEditorElementType.SCALE;

  const averageChartConfig = {
    average: {
      label: 'Average',
      color: 'hsl(var(--primary))',
    },
  };

  const dailyNPSData = useMemo(
    () =>
      averageByDay?.map((item) => ({
        ...item,
        date: formatDate(item.day),
        average: Number(item.metrics.average),
      })) || [],
    [averageByDay],
  );

  const total = answer?.reduce((acc, item) => acc + item.count, 0) || 0;
  const lastDay = averageByDay?.[averageByDay.length - 1];

  const totalResponses = selectedDay?.metrics.total ?? total ?? 0;
  const rate = Math.round(((totalResponses ?? 0) / totalViews) * 100);
  const average = lastDay?.metrics.average ?? 0;

  const startDate = selectedDay?.startDate
    ? formatDate(selectedDay.startDate)
    : formatDate(lastDay?.startDate ?? '');
  const endDate = selectedDay?.endDate
    ? formatDate(selectedDay.endDate)
    : formatDate(lastDay?.endDate ?? '');

  // Handle rolling window update
  const handleRollingWindowUpdate = async (newValue: number) => {
    try {
      const rollingWindowConfig = isScale
        ? {
            ...rollingWindow,
            scale: newValue,
          }
        : {
            ...rollingWindow,
            rate: newValue,
          };
      const response = await updateContent(content.id, {
        config: {
          ...content.config,
          rollWindowConfig: rollingWindowConfig,
        },
      });

      if (response) {
        toast({ title: 'Rolling window updated' });
        onRollingWindowChange(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to update rolling window',
        });
        onRollingWindowChange(false);
      }
    } catch (_) {
      toast({
        variant: 'destructive',
        title: 'Failed to update rolling window',
      });
      onRollingWindowChange(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center">
          <div className="grow">{question.data.name}</div>
          <RollingWindowDialog
            key={question.type}
            currentValue={isScale ? rollingWindow.scale : rollingWindow.rate}
            onUpdate={handleRollingWindowUpdate}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-8 items-center justify-center">
          {/* Current NPS Score */}
          <div className="flex flex-col items-center justify-center ">
            <div className="text-6xl font-bold text-primary">{average}</div>
            <div className="text-sm text-muted-foreground ml-2">Current Average</div>
          </div>

          {/* NPS Trend Chart */}
          <ChartContainer config={averageChartConfig} className="h-64 w-full">
            <ComposedChart
              data={dailyNPSData}
              onMouseMove={(data) => {
                const payload = data.activePayload?.[0]?.payload;
                if (payload) {
                  setSelectedDay(payload);
                }
              }}
              onMouseLeave={() => {
                setSelectedDay(null);
              }}
            >
              <CartesianGrid vertical={false} />
              <YAxis
                domain={[lowRange, highRange]}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <div className="flex items-center justify-between gap-2">{value} Average</div>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={true}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
          <div className="flex flex-row gap-8 items-center justify-center">
            <div className=" flex flex-row gap-2 items-center justify-center">
              <span>{startDate}</span>
              <ArrowRightIcon className="w-8 text-muted-foreground" />
              <span>{endDate}</span>
            </div>
            <div className="flex flex-row gap-2 items-center justify-center">
              <span>{totalResponses}</span> <span className="text-muted-foreground">responses</span>
            </div>
            <div className="flex flex-row gap-2 items-center justify-center">
              <span>{rate}%</span> <span className="text-muted-foreground">response rate</span>
            </div>
          </div>
          {/* <NPSGauge score={selectedData?.nps ?? npsAnalysis?.npsScore ?? 0} /> */}
          <ScaleDistribution
            averageByDay={selectedDay ?? lastDay}
            question={questionAnalytics.question}
            className="w-1/2"
          />
        </div>
      </CardContent>
    </Card>
  );
};

AnalyticsScale.displayName = 'AnalyticsScale';

const BAR_HEIGHT = 100;

interface ScaleDistributionProps {
  className?: string;
  averageByDay: AverageByDay | undefined;
  question: Question;
}

export const ScaleDistribution = ({
  averageByDay,
  question,
  className,
}: ScaleDistributionProps) => {
  if (!averageByDay) return null;

  const lowRange = question.data.lowRange ?? 0;
  const highRange = question.data.highRange ?? 10;
  const isStarRating = question.type === ContentEditorElementType.STAR_RATING;

  const distribution = completeDistribution(lowRange, highRange, averageByDay.distribution).sort(
    (a, b) => Number(a.answer) - Number(b.answer),
  );

  const scaleLength = highRange - lowRange + 1;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-row gap-4 ">
        {/* Detractors Section - 7 columns */}
        {distribution.map((item) => {
          const score = Number(item.answer);
          return (
            <div key={item.answer} className="flex-1 flex flex-col items-center">
              <div className="text-sm text-gray-600 mb-1">{item.count}</div>
              <div className="w-full relative" style={{ height: `${BAR_HEIGHT}px` }}>
                {/* Light background bar with rounded corners */}
                <div className={'absolute bottom-0 w-full h-full rounded-sm bg-blue-100'} />
                {/* Dark data bar with rounded corners */}
                <div
                  className={
                    'absolute bottom-0 w-full rounded-b-sm transition-[height] duration-500 ease-in-out bg-blue-700'
                  }
                  style={{
                    height: `${(item.percentage / 100) * BAR_HEIGHT}px`,
                  }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-1 flex flex-row gap-1">
                {isStarRating ? (
                  <QuestionStarRating maxLength={scaleLength} score={score} />
                ) : (
                  <div className="flex flex-row gap-1">
                    <span>{score}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score labels */}
      <div className="flex justify-between mt-4">
        <div className="text-sm text-gray-600">{question.data.lowLabel || 'Not at all likely'}</div>
        <div className="text-sm text-gray-600">{question.data.highLabel || 'Extremely likely'}</div>
      </div>
    </div>
  );
};
