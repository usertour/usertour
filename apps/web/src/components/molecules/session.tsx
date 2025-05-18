import { CancelIcon } from '@usertour-ui/icons';
import { TooltipContent } from '@usertour-ui/tooltip';
import { PlayIcon } from '@usertour-ui/icons';
import { Tooltip, TooltipTrigger } from '@usertour-ui/tooltip';
import { TooltipProvider } from '@usertour-ui/tooltip';
import { BizEvents, BizSession, ChecklistData, ContentVersion } from '@usertour-ui/types';
import { Event } from '@usertour-ui/types';
import { formatDistanceStrict } from 'date-fns';

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

  const completeBizEvent = bizEvent.find(
    (e) => e.event?.codeName === BizEvents.CHECKLIST_COMPLETED,
  );
  const dismissedBizEvent = bizEvent.find(
    (e) => e.event?.codeName === BizEvents.CHECKLIST_DISMISSED,
  );

  // Sort events by creation time
  const firstEvent = bizEvent.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )[0];

  const checklistItemIds = bizEvent
    .filter((e) => e.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED)
    .map((e) => e.data?.checklist_task_id);

  const completedItemIds = data.items.filter((item) => checklistItemIds.includes(item.id));

  const progress = Math.floor((completedItemIds.length / data.items.length) * 100);

  const completeDate =
    completeBizEvent && firstEvent
      ? formatDistanceStrict(new Date(completeBizEvent.createdAt), new Date(firstEvent.createdAt))
      : null;
  const isComplete = !!completeBizEvent;
  const isDismissed = !!dismissedBizEvent;

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

  const completeBizEvent = bizEvent.find((e) => e.event?.codeName === BizEvents.FLOW_COMPLETED);
  const lastSeenBizEvent = bizEvent
    .filter((e) => e.event?.codeName === BizEvents.FLOW_STEP_SEEN)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Sort events by creation time
  const firstEvent = bizEvent.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )[0];

  const endedBizEvent = bizEvent.find((e) => e.event?.codeName === BizEvents.FLOW_ENDED);

  const completeDate =
    completeBizEvent && firstEvent
      ? formatDistanceStrict(new Date(completeBizEvent.createdAt), new Date(firstEvent.createdAt))
      : null;
  const isComplete = !!completeBizEvent;
  const isDismissed = !!endedBizEvent;

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
