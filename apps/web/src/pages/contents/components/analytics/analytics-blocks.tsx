import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
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

export const AnalyticsBlocks = () => {
  const { analyticsData, loading } = useAnalyticsContext();

  if (loading) {
    return <AnalyticsTasksSkeleton />;
  }

  const blocks = analyticsData?.viewsByBlock ?? [];
  const groups = groupBlocksByTab(blocks);
  const maxTotalClicks = Math.max(...blocks.map((b) => b.analytics.totalClicks), 1);
  const hasAnyClicks = blocks.some((b) => b.analytics.totalClicks > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clicks by block</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyClicks ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.tabId}>
                <div className="flex items-baseline justify-between border-b pb-2 mb-3">
                  <span className="font-semibold text-sm">{group.tabName}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.totalClicks} total {group.totalClicks === 1 ? 'click' : 'clicks'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.blocks.map((block) => {
                    const barWidth = Math.max(
                      (block.analytics.totalClicks / maxTotalClicks) * 100,
                      block.analytics.totalClicks > 0 ? 2 : 0,
                    );
                    return (
                      <div
                        key={block.blockId}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-4 py-1"
                      >
                        <span className="truncate text-sm">{block.name}</span>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/80 rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="text-sm tabular-nums text-right min-w-[80px]">
                          <span className="font-medium">{block.analytics.uniqueClicks}</span>
                          <span className="text-muted-foreground">
                            {' '}
                            / {block.analytics.totalClicks}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground text-right pt-2">
              unique clickers / total clicks
            </div>
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
