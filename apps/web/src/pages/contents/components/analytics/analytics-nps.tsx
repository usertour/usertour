import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import type { ContentQuestionAnalytics, NPSByDay, Question } from '@usertour-ui/types';
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@usertour-ui/chart';
import { format } from 'date-fns';
import { Badge } from '@usertour-ui/badge';
import { PieChart, Pie, Cell } from 'recharts';
import { useState } from 'react';
import { cn } from '@usertour-ui/ui-utils';
import { ArrowRightIcon } from '@usertour-ui/icons';

interface AnalyticsNPSProps {
  questionAnalytics: ContentQuestionAnalytics;
  totalViews: number;
}

export const AnalyticsNPS = (props: AnalyticsNPSProps) => {
  const [selectedDay, setSelectedDay] = useState<NPSByDay | null>(null);

  const { questionAnalytics, totalViews } = props;
  const { npsAnalysisByDay, answer } = questionAnalytics;

  const npsChartConfig = {
    nps: {
      label: 'NPS Score',
      color: 'hsl(var(--primary))',
    },
  };

  const dailyNPSData =
    npsAnalysisByDay?.map((item) => ({
      ...item,
      date: format(new Date(item.day), 'MMM dd, yyyy'),
      nps: Number(item.metrics.npsScore),
    })) || [];

  const total = answer?.reduce((acc, item) => acc + item.count, 0) || 0;
  const lastDay = npsAnalysisByDay?.[npsAnalysisByDay.length - 1];

  const totalResponses = selectedDay?.metrics.total ?? total ?? 0;
  const rate = Math.round(((totalResponses ?? 0) / totalViews) * 100);

  const startDate = selectedDay?.startDate
    ? format(new Date(selectedDay.startDate), 'MMM dd, yyyy')
    : format(new Date(lastDay?.startDate ?? ''), 'MMM dd, yyyy');
  const endDate = selectedDay?.endDate
    ? format(new Date(selectedDay.endDate), 'MMM dd, yyyy')
    : format(new Date(lastDay?.endDate ?? ''), 'MMM dd, yyyy');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center">
          <div className="grow">{questionAnalytics.question.data.name} - Net Promoter Score</div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-8 items-center justify-center">
          {/* Current NPS Score */}
          <div className="flex flex-col items-center justify-center ">
            <div className="text-6xl font-bold text-primary">{lastDay?.metrics.npsScore}</div>
            <div className="text-sm text-muted-foreground ml-2">Current NPS</div>
          </div>

          {/* NPS Trend Chart */}
          <ChartContainer config={npsChartConfig} className="h-64 w-full">
            <ComposedChart
              data={dailyNPSData}
              onMouseMove={(data) => {
                if (data.activePayload) {
                  setSelectedDay(data.activePayload[0].payload);
                }
              }}
              onMouseLeave={() => {
                setSelectedDay(null);
              }}
            >
              <CartesianGrid vertical={false} />
              <YAxis domain={[-100, 100]} tickLine={false} tickMargin={10} axisLine={false} />
              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <div className="flex items-center justify-between gap-2">
                        <span>NPS Score</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="nps"
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
          <NPSDistribution
            npsByDay={selectedDay ?? lastDay}
            question={questionAnalytics.question}
            className="w-2/3"
          />
        </div>
      </CardContent>
    </Card>
  );
};

AnalyticsNPS.displayName = 'AnalyticsNPS';

const BAR_HEIGHT = 100;

const getLightBarColor = (score: number) => {
  if (score <= 6) return 'bg-red-100';
  if (score <= 8) return 'bg-yellow-100';
  return 'bg-green-100';
};

const getDarkBarColor = (score: number) => {
  if (score <= 6) return 'bg-red-500';
  if (score <= 8) return 'bg-yellow-500';
  return 'bg-green-500';
};

interface NPSDistributionProps {
  className?: string;
  npsByDay: NPSByDay | undefined;
  question: Question;
}

export const NPSDistribution = ({ npsByDay, question, className }: NPSDistributionProps) => {
  if (!npsByDay) return null;
  const distribution = npsByDay.distribution;
  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-11 gap-2">
        {/* Detractors Section - 7 columns */}
        <div className="col-span-7 flex flex-col">
          <div className="text-center border-b mb-4 pb-2">
            <div className="text-sm font-medium">Detractors</div>
            <Badge variant="secondary">{npsByDay.metrics.detractors.percentage}%</Badge>
          </div>
          <div className="flex items-end gap-2">
            {distribution.slice(0, 7).map((item) => {
              const score = Number(item.answer);
              return (
                <div key={item.answer} className="flex-1 flex flex-col items-center">
                  <div className="text-sm text-gray-600 mb-1">{item.count}</div>
                  <div className="w-full relative" style={{ height: `${BAR_HEIGHT}px` }}>
                    {/* Light background bar with rounded corners */}
                    <div
                      className={`absolute bottom-0 w-full h-full rounded-sm ${getLightBarColor(score)}`}
                    />
                    {/* Dark data bar with rounded corners */}
                    <div
                      className={`absolute bottom-0 w-full rounded-b-sm transition-[height] duration-500 ease-in-out ${getDarkBarColor(score)}`}
                      style={{
                        height: `${(item.percentage / 100) * BAR_HEIGHT}px`,
                      }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{score}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Passives Section - 2 columns */}
        <div className="col-span-2 flex flex-col">
          <div className="text-center border-b mb-4 pb-2">
            <div className="text-sm font-medium">Passives</div>
            <Badge variant="secondary">{npsByDay.metrics.passives.percentage}%</Badge>
          </div>
          <div className="flex items-end gap-2">
            {distribution.slice(7, 9).map((item) => {
              const score = Number(item.answer);
              return (
                <div key={item.answer} className="flex-1 flex flex-col items-center">
                  <div className="text-sm text-gray-600 mb-1">{item.count}</div>
                  <div className="w-full relative" style={{ height: `${BAR_HEIGHT}px` }}>
                    {/* Light background bar with rounded corners */}
                    <div
                      className={`absolute bottom-0 w-full h-full rounded-sm ${getLightBarColor(score)}`}
                    />
                    {/* Dark data bar with rounded corners */}
                    <div
                      className={`absolute bottom-0 w-full rounded-b-sm transition-[height] duration-500 ease-in-out ${getDarkBarColor(score)}`}
                      style={{
                        height: `${(item.percentage / 100) * BAR_HEIGHT}px`,
                      }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{score}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Promoters Section - 2 columns */}
        <div className="col-span-2 flex flex-col">
          <div className="text-center border-b mb-4 pb-2">
            <div className="text-sm font-medium">Promoters</div>
            <Badge variant="secondary">{npsByDay.metrics.promoters.percentage}%</Badge>
          </div>
          <div className="flex items-end gap-2">
            {distribution.slice(9).map((item) => {
              const score = Number(item.answer);
              return (
                <div key={item.answer} className="flex-1 flex flex-col items-center">
                  <div className="text-sm text-gray-600 mb-1">{item.count}</div>
                  <div className="w-full relative" style={{ height: `${BAR_HEIGHT}px` }}>
                    {/* Light background bar with rounded corners */}
                    <div
                      className={`absolute bottom-0 w-full h-full rounded-sm ${getLightBarColor(score)}`}
                    />
                    {/* Dark data bar with rounded corners */}
                    <div
                      className={`absolute bottom-0 w-full rounded-b-sm transition-[height] duration-500 ease-in-out ${getDarkBarColor(score)}`}
                      style={{
                        height: `${(item.percentage / 100) * BAR_HEIGHT}px`,
                      }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{score}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score labels */}
      <div className="flex justify-between mt-4">
        <div className="text-sm text-gray-600">{question.data.lowLabel || 'Not at all likely'}</div>
        <div className="text-sm text-gray-600">{question.data.highLabel || 'Extremely likely'}</div>
      </div>
    </div>
  );
};

interface NPSGaugeProps {
  score: number;
}

export const NPSGauge = ({ score }: NPSGaugeProps) => {
  // Fixed dimensions
  const CHART_WIDTH = 300;
  const CHART_HEIGHT = 150;
  const OUTER_RADIUS = 140;
  const INNER_RADIUS = 110;

  // Normalize score from -100~100 to 0~1
  const normalizedScore = (score + 100) / 200;

  const data = [{ value: normalizedScore }, { value: 1 - normalizedScore }];

  return (
    <div
      className="inline-block relative"
      style={{ width: CHART_WIDTH, height: CHART_HEIGHT + 24 }}
    >
      <PieChart width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Pie
          data={data}
          cx={CHART_WIDTH / 2}
          cy={CHART_HEIGHT}
          startAngle={180}
          endAngle={0}
          innerRadius={INNER_RADIUS}
          outerRadius={OUTER_RADIUS}
          dataKey="value"
        >
          {/* Active segment */}
          <Cell fill="#3B82F6" />
          {/* Background segment */}
          <Cell fill="#F3F4F6" />
        </Pie>
      </PieChart>

      {/* Score display */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-2xl font-bold">{score}</div>
        <div className="text-sm text-gray-500">NPS</div>
      </div>

      {/* Scale labels */}
      <div className="absolute bottom-0 left-4 text-sm text-gray-500">-100</div>
      <div className="absolute bottom-0 right-4 text-sm text-gray-500">100</div>
    </div>
  );
};
