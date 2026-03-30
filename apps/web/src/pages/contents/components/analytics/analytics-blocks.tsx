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

  const maxClicks = analyticsData?.viewsByBlock
    ? Math.max(
        ...analyticsData.viewsByBlock.map((b: AnalyticsViewsByBlock) => b.analytics.totalClicks),
        1,
      )
    : 1;

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
            {analyticsData?.viewsByBlock && analyticsData.viewsByBlock.length > 0 ? (
              analyticsData.viewsByBlock.map((block: AnalyticsViewsByBlock) => {
                const barWidth = Math.round((block.analytics.totalClicks / maxClicks) * 100);
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
                      <div
                        className="h-9 bg-gradient-to-r from-chart-1/50 to-chart-1"
                        style={{
                          width: `${barWidth}%`,
                        }}
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
