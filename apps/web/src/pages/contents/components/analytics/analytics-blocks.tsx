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

  // Find max values for bar scaling
  const maxUniqueClicks = Math.max(...blocks.map((b) => b.analytics.uniqueClicks), 1);
  const maxTotalClicks = Math.max(...blocks.map((b) => b.analytics.totalClicks), 1);

  // Sort by total clicks descending
  const sortedBlocks = [...blocks].sort(
    (a, b) => b.analytics.totalClicks - a.analytics.totalClicks,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row items-center justify-between">
          <div className="grow">Click breakdown</div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center gap-8 mb-4 text-sm">
          <div>
            <span className="font-semibold text-lg">{totalUniqueClicks}</span>{' '}
            <span className="text-muted-foreground">unique clicks</span>
          </div>
          <div>
            <span className="font-semibold text-lg">{totalTotalClicks}</span>{' '}
            <span className="text-muted-foreground">total clicks</span>
          </div>
        </div>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-72">Block</TableHead>
              <TableHead className="text-right w-32">Unique clicks</TableHead>
              <TableHead />
              <TableHead className="text-right w-32">Total clicks</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBlocks.length > 0 ? (
              sortedBlocks.map((block: AnalyticsViewsByBlock) => {
                const uniqueBar = Math.round(
                  (block.analytics.uniqueClicks / maxUniqueClicks) * 100,
                );
                const totalBar = Math.round((block.analytics.totalClicks / maxTotalClicks) * 100);
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
                    <TableCell className="py-[1px] px-0">
                      <div
                        className="h-9 bg-gradient-to-r from-success/50 to-success"
                        style={{ width: `${uniqueBar}%` }}
                      />
                    </TableCell>
                    <TableCell className="py-[1px] text-right">
                      {block.analytics.totalClicks}
                    </TableCell>
                    <TableCell className="py-[1px] px-0">
                      <div
                        className="h-9 bg-gradient-to-r from-chart-1/50 to-chart-1"
                        style={{ width: `${totalBar}%` }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
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
