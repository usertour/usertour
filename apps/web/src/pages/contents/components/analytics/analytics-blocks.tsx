import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { AnalyticsViewsByBlock } from '@usertour/types';
import { AnalyticsTasksSkeleton } from './analytics-skeleton';

export const AnalyticsBlocks = () => {
  const { analyticsData, loading } = useAnalyticsContext();

  if (loading) {
    return <AnalyticsTasksSkeleton />;
  }

  const blocks = analyticsData?.viewsByBlock ?? [];
  const totalUniqueClicks = blocks.reduce(
    (sum: number, b: AnalyticsViewsByBlock) => sum + b.analytics.uniqueClicks,
    0,
  );
  const totalTotalClicks = blocks.reduce(
    (sum: number, b: AnalyticsViewsByBlock) => sum + b.analytics.totalClicks,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row items-center justify-between">
          <div className="grow">Click breakdown</div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-72">Block</TableHead>
              <TableHead className="text-right w-32">Unique clicks</TableHead>
              <TableHead className="text-right w-32">Total clicks</TableHead>
              <TableHead className="w-6" />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.length > 0 ? (
              <>
                <TableRow className="font-medium bg-muted/50">
                  <TableCell className="py-[1px]">All blocks</TableCell>
                  <TableCell className="py-[1px] text-right">{totalUniqueClicks}</TableCell>
                  <TableCell className="py-[1px] text-right">{totalTotalClicks}</TableCell>
                  <TableCell className="py-[1px] px-0 w-6" />
                  <TableCell className="py-[1px] px-0" />
                </TableRow>
                {blocks.map((block: AnalyticsViewsByBlock) => {
                  const uniqueBar =
                    totalUniqueClicks > 0
                      ? Math.round((block.analytics.uniqueClicks / totalUniqueClicks) * 100)
                      : 0;
                  const totalBar =
                    totalTotalClicks > 0
                      ? Math.round((block.analytics.totalClicks / totalTotalClicks) * 100)
                      : 0;
                  return (
                    <TableRow key={block.blockId}>
                      <TableCell className="py-[1px] overflow-hidden">
                        <div className="min-w-0">
                          <span className="truncate block">{block.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-[1px] text-right">
                        {block.analytics.uniqueClicks}
                      </TableCell>
                      <TableCell className="py-[1px] text-right">
                        {block.analytics.totalClicks}
                      </TableCell>
                      <TableCell className="py-[1px] px-0 w-6" />
                      <TableCell className="py-[1px] px-0">
                        <div className="flex flex-col gap-0.5">
                          <div className="h-4 bg-chart-1/50" style={{ width: `${uniqueBar}%` }} />
                          <div className="h-4 bg-chart-1" style={{ width: `${totalBar}%` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

AnalyticsBlocks.displayName = 'AnalyticsBlocks';
