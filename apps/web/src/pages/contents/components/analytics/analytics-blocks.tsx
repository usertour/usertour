import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { AnalyticsViewsByBlock } from '@usertour/types';
import { AnalyticsTasksSkeleton } from './analytics-skeleton';

type TabGroup = {
  tabId: string;
  tabName: string;
  totalClicks: number;
  blocks: AnalyticsViewsByBlock[];
};

const groupBlocksByTab = (blocks: AnalyticsViewsByBlock[]): TabGroup[] => {
  const groups = new Map<string, TabGroup>();
  for (const block of blocks) {
    const existing = groups.get(block.tabId);
    if (existing) {
      existing.blocks.push(block);
      existing.totalClicks += block.analytics.totalClicks;
    } else {
      groups.set(block.tabId, {
        tabId: block.tabId,
        tabName: block.tabName,
        totalClicks: block.analytics.totalClicks,
        blocks: [block],
      });
    }
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      blocks: [...group.blocks].sort((a, b) => b.analytics.totalClicks - a.analytics.totalClicks),
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks);
};

const getRankDotClass = (rank: number, isIdle: boolean) => {
  if (isIdle) return 'bg-muted-foreground/20';
  if (rank === 0) return 'bg-primary';
  if (rank <= 2) return 'bg-primary/60';
  return 'bg-muted-foreground/30';
};

export const AnalyticsBlocks = () => {
  const { analyticsData, loading } = useAnalyticsContext();

  if (loading) {
    return <AnalyticsTasksSkeleton />;
  }

  const blocks = analyticsData?.viewsByBlock ?? [];
  const groups = groupBlocksByTab(blocks);
  const hasAnyClicks = blocks.some((b) => b.analytics.totalClicks > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Clicks by block
          <QuestionTooltip>
            Clicks grouped by tab and block within this resource center. "% of tab" is the block's
            share of its tab's total clicks; "Clickers / clicks" shows unique users who clicked
            versus total click events.
          </QuestionTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyClicks ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.tabId}>
                <div className="flex items-baseline justify-between border-b pb-2 mb-2">
                  <span className="font-semibold text-sm">{group.tabName}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.totalClicks} total {group.totalClicks === 1 ? 'click' : 'clicks'}
                  </span>
                </div>
                <div className="grid grid-cols-[auto_1fr_auto_auto] items-center text-[11px] text-muted-foreground px-2 pb-1">
                  <span className="w-2 mr-3" />
                  <span>Block</span>
                  <span className="text-right min-w-[56px]">% of tab</span>
                  <span className="text-right min-w-[96px]">Clickers / clicks</span>
                </div>
                <div>
                  {group.blocks.map((block, idx) => {
                    const { uniqueClicks, totalClicks } = block.analytics;
                    const isIdle = totalClicks === 0;
                    const share =
                      group.totalClicks > 0 ? (totalClicks / group.totalClicks) * 100 : 0;
                    return (
                      <div
                        key={block.blockId}
                        className={`grid grid-cols-[auto_1fr_auto_auto] items-center rounded-md px-2 py-2 transition-colors hover:bg-muted/50 ${
                          isIdle ? 'opacity-50' : ''
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full mr-3 shrink-0 ${getRankDotClass(
                            idx,
                            isIdle,
                          )}`}
                        />
                        <span className="truncate text-sm">{block.name}</span>
                        <span className="text-sm tabular-nums font-medium text-right min-w-[56px]">
                          {share.toFixed(0)}%
                        </span>
                        <span className="text-sm tabular-nums text-right min-w-[96px]">
                          <span className="font-medium">{uniqueClicks}</span>
                          <span className="text-muted-foreground"> / {totalClicks}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            No clicks yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

AnalyticsBlocks.displayName = 'AnalyticsBlocks';
