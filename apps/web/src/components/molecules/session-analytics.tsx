import { Badge } from '@usertour-packages/badge';
import {
  BizEvents,
  BizSession,
  ChecklistData,
  ContentDataType,
  ContentVersion,
  Event,
} from '@usertour/types';
import { getProgressStatus } from '@/utils/session';
import { cn } from '@usertour-packages/tailwind';

type StatusVariant = 'active' | 'completed' | 'dismissed' | 'seen' | 'activated';

const statusLabel: Record<StatusVariant, string> = {
  active: 'Active',
  completed: 'Completed',
  dismissed: 'Dismissed',
  seen: 'Seen',
  activated: 'Activated',
};

const statusClass: Record<StatusVariant, string> = {
  active: 'bg-success/15 text-success hover:bg-success/15',
  completed: 'bg-success/15 text-success hover:bg-success/15',
  activated: 'bg-success/15 text-success hover:bg-success/15',
  seen: 'bg-muted text-muted-foreground hover:bg-muted',
  dismissed: 'bg-muted text-muted-foreground hover:bg-muted',
};

const deriveStatus = (
  contentType: ContentDataType,
  bizEvent: BizSession['bizEvent'],
): StatusVariant | null => {
  if (!bizEvent || bizEvent.length === 0) return null;

  const has = (codeName: BizEvents) => !!bizEvent.find((e) => e?.event?.codeName === codeName);

  if (contentType === ContentDataType.FLOW) {
    if (has(BizEvents.FLOW_COMPLETED)) return 'completed';
    if (has(BizEvents.FLOW_ENDED)) return 'dismissed';
    return 'active';
  }

  if (contentType === ContentDataType.CHECKLIST) {
    if (has(BizEvents.CHECKLIST_COMPLETED)) return 'completed';
    if (has(BizEvents.CHECKLIST_DISMISSED)) return 'dismissed';
    return 'active';
  }

  if (contentType === ContentDataType.LAUNCHER) {
    if (has(BizEvents.LAUNCHER_DISMISSED)) return 'dismissed';
    if (has(BizEvents.LAUNCHER_ACTIVATED)) return 'activated';
    return 'active';
  }

  if (contentType === ContentDataType.BANNER) {
    if (has(BizEvents.BANNER_DISMISSED)) return 'dismissed';
    if (has(BizEvents.BANNER_SEEN)) return 'active';
    return null;
  }

  if (contentType === ContentDataType.RESOURCE_CENTER) {
    if (has(BizEvents.RESOURCE_CENTER_DISMISSED)) return 'dismissed';
    if (has(BizEvents.RESOURCE_CENTER_OPENED)) return 'active';
    return null;
  }

  return null;
};

export const SessionStatusBadge = ({
  original,
  contentType,
}: { original: BizSession; contentType: ContentDataType }) => {
  const status = deriveStatus(contentType, original.bizEvent);
  if (!status) return null;

  return (
    <Badge
      variant="secondary"
      className={cn('font-medium border-transparent', statusClass[status])}
    >
      {statusLabel[status]}
    </Badge>
  );
};
SessionStatusBadge.displayName = 'SessionStatusBadge';

const formatFlowStepDisplay = (
  flowStepNumber: number | undefined | null,
  flowStepName: string | undefined | null,
): string => {
  const hasStepNumber = flowStepNumber !== undefined && flowStepNumber !== null;
  const stepNumberDisplay = hasStepNumber ? `Step ${Number(flowStepNumber) + 1}` : '';

  if (stepNumberDisplay && flowStepName) {
    return `${stepNumberDisplay}. ${flowStepName}`;
  }
  if (stepNumberDisplay) return stepNumberDisplay;
  if (flowStepName) return flowStepName;
  return '';
};

export const FlowProgressCell = ({
  original,
  eventList,
}: { original: BizSession; eventList: Event[] }) => {
  const { bizEvent } = original;
  if (!eventList || !bizEvent || bizEvent.length === 0) return null;

  const { completeDate, isComplete } = getProgressStatus(
    bizEvent,
    BizEvents.FLOW_COMPLETED,
    BizEvents.FLOW_ENDED,
  );

  const lastSeenBizEvent = bizEvent
    .filter((e) => e.event?.codeName === BizEvents.FLOW_STEP_SEEN)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const stepDisplay = lastSeenBizEvent
    ? formatFlowStepDisplay(
        lastSeenBizEvent?.data?.flow_step_number,
        lastSeenBizEvent?.data?.flow_step_name,
      )
    : '';

  return (
    <div className="flex flex-col min-w-0">
      {isComplete ? (
        <span className="text-sm text-muted-foreground">{`Finished in ${completeDate}`}</span>
      ) : (
        <span className="text-sm tabular-nums font-medium">
          {lastSeenBizEvent?.data?.flow_step_progress ?? 0}%
        </span>
      )}
      {stepDisplay && <span className="text-xs text-muted-foreground truncate">{stepDisplay}</span>}
    </div>
  );
};
FlowProgressCell.displayName = 'FlowProgressCell';

export const ChecklistProgressCell = ({
  original,
  eventList,
  version,
}: { original: BizSession; eventList: Event[]; version: ContentVersion }) => {
  const { bizEvent, progress } = original;
  const data = version?.data as ChecklistData;

  if (!eventList || !bizEvent || bizEvent.length === 0 || !data) return null;

  const { completeDate, isComplete } = getProgressStatus(
    bizEvent,
    BizEvents.CHECKLIST_COMPLETED,
    BizEvents.CHECKLIST_DISMISSED,
  );

  if (isComplete) {
    return <span className="text-sm text-muted-foreground">{`Finished in ${completeDate}`}</span>;
  }
  return <span className="text-sm tabular-nums font-medium">{progress}%</span>;
};
ChecklistProgressCell.displayName = 'ChecklistProgressCell';

export const LauncherProgressCell = () => {
  return <span className="text-sm text-muted-foreground">—</span>;
};
LauncherProgressCell.displayName = 'LauncherProgressCell';

export const BannerProgressCell = () => {
  return <span className="text-sm text-muted-foreground">—</span>;
};
BannerProgressCell.displayName = 'BannerProgressCell';

export const ResourceCenterProgressCell = () => {
  return <span className="text-sm text-muted-foreground">—</span>;
};
ResourceCenterProgressCell.displayName = 'ResourceCenterProgressCell';
