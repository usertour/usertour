import { CancelIcon } from '@usertour-packages/icons';
import { TooltipContent } from '@usertour-packages/tooltip';
import { PlayIcon } from '@usertour-packages/icons';
import { Tooltip, TooltipTrigger } from '@usertour-packages/tooltip';
import { TooltipProvider } from '@usertour-packages/tooltip';
import { BizEvents, BizSession, ChecklistData, ContentVersion } from '@usertour/types';
import { Event } from '@usertour/types';
import { getProgressStatus } from '@/utils/session';

const LauncherProgressColumn = ({
  original,
  eventList,
}: { original: BizSession; eventList: Event[] }) => {
  const { bizEvent } = original;
  if (!eventList || !bizEvent || bizEvent.length === 0) {
    return <></>;
  }

  const isActivated = !!bizEvent.find((e) => e?.event?.codeName === BizEvents.LAUNCHER_ACTIVATED);
  const isDismissed = !!bizEvent.find((e) => e?.event?.codeName === BizEvents.LAUNCHER_DISMISSED);

  return (
    <div className="flex flex-row items-center space-x-3">
      {!isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <PlayIcon className="text-success h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>Active</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <CancelIcon className="text-foreground/60 h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>Dismissed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex flex-col">
        {!isActivated && <div className="text-muted-foreground">Seen</div>}
        {isActivated && <div className="text-success">Activated</div>}
      </div>
    </div>
  );
};
LauncherProgressColumn.displayName = 'LauncherProgressColumn';

const ChecklistProgressColumn = ({
  original,
  eventList,
  version,
}: { original: BizSession; eventList: Event[]; version: ContentVersion }) => {
  const { bizEvent } = original;
  const data = version?.data as ChecklistData;

  if (!eventList || !bizEvent || bizEvent.length === 0 || !data) {
    return <></>;
  }

  const { completeDate, isComplete, isDismissed } = getProgressStatus(
    bizEvent,
    BizEvents.CHECKLIST_COMPLETED,
    BizEvents.CHECKLIST_DISMISSED,
  );

  const checklistItemIds = bizEvent
    .filter((e) => e.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED)
    .map((e) => e.data?.checklist_task_id);

  const completedItemIds = data.items.filter((item) => checklistItemIds.includes(item.id));

  const progress = Math.floor((completedItemIds.length / data.items.length) * 100);

  return (
    <div className="flex flex-row items-center space-x-3">
      {!isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <PlayIcon className="text-success h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>Active</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <CancelIcon className="text-foreground/60 h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>Dismissed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex flex-col">
        {!isComplete && <span>{progress}%</span>}
        {isComplete && (
          <div className="text-success font-bold text-left">{`Completed in ${completeDate}`}</div>
        )}
      </div>
    </div>
  );
};
ChecklistProgressColumn.displayName = 'ChecklistProgressColumn';

const FlowProgressColumn = ({
  original,
  eventList,
}: { original: BizSession; eventList: Event[] }) => {
  const { bizEvent } = original;
  if (!eventList || !bizEvent || bizEvent.length === 0) {
    return <></>;
  }

  const { completeDate, isComplete, isDismissed } = getProgressStatus(
    bizEvent,
    BizEvents.FLOW_COMPLETED,
    BizEvents.FLOW_ENDED,
  );

  const lastSeenBizEvent = bizEvent
    .filter((e) => e.event?.codeName === BizEvents.FLOW_STEP_SEEN)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <div className="flex flex-row items-center space-x-3">
      {!isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <PlayIcon className="text-success h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>Active</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <CancelIcon className="text-foreground/60 h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>Dismissed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex flex-col">
        {!isComplete && <span>{lastSeenBizEvent?.data?.flow_step_progress ?? 0}%</span>}
        {isComplete && (
          <div className="text-success font-bold text-left">{`Completed in ${completeDate}`}</div>
        )}
        <div className="text-left text-muted-foreground">
          <div className="text-muted-foreground">
            {lastSeenBizEvent &&
              `Step ${lastSeenBizEvent?.data?.flow_step_number + 1}.
      ${lastSeenBizEvent?.data?.flow_step_name}`}
          </div>
        </div>
      </div>
    </div>
  );
};
FlowProgressColumn.displayName = 'FlowProgressColumn';

export { LauncherProgressColumn, ChecklistProgressColumn, FlowProgressColumn };
