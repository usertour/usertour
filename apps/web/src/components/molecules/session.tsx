import { CancelIcon, CheckmarkIcon, ClickIcon, EyeNoneIcon } from '@usertour-packages/icons';
import { TooltipContent } from '@usertour-packages/tooltip';
import { PlayIcon } from '@usertour-packages/icons';
import { Tooltip, TooltipTrigger } from '@usertour-packages/tooltip';
import { TooltipProvider } from '@usertour-packages/tooltip';
import {
  BizEvents,
  BizSession,
  ChecklistData,
  ChecklistItemType,
  ContentVersion,
} from '@usertour/types';
import { Event } from '@usertour/types';
import { getProgressStatus } from '@/utils/session';
import { cn } from '@usertour/helpers';

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
  const { bizEvent, progress } = original;
  const data = version?.data as ChecklistData;

  if (!eventList || !bizEvent || bizEvent.length === 0 || !data) {
    return <></>;
  }

  const { completeDate, isComplete, isDismissed } = getProgressStatus(
    bizEvent,
    BizEvents.CHECKLIST_COMPLETED,
    BizEvents.CHECKLIST_DISMISSED,
  );

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

const ChecklistItemsColumn = ({
  original,
  eventList,
  version,
}: { original: BizSession; eventList: Event[]; version: ContentVersion }) => {
  const { bizEvent } = original;
  const data = version?.data as ChecklistData;
  const { items: sessionItems } =
    (original.data as {
      items: Pick<ChecklistItemType, 'id' | 'isCompleted' | 'isVisible' | 'isClicked'>[];
    }) ?? {};

  if (!eventList || !bizEvent || bizEvent.length === 0 || !data) {
    return <></>;
  }

  const checklistItemIds = bizEvent
    .filter((e) => e.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED)
    .map((e) => e.data?.checklist_task_id);

  const checklistItems = data.items?.map((item) => ({
    ...item,
    ...(sessionItems.find((i) => i.id === item.id) ?? {}),
  }));

  return (
    <div className="flex flex-col gap-2">
      {checklistItems.map((item) => (
        <div key={item.id} className={cn('flex items-center', item.isVisible ? '' : 'opacity-30')}>
          <span
            className={cn(
              'flex-none w-8 h-8 border-2 border-transparent rounded-full flex justify-center items-center mr-3 text-sm text-white',
              checklistItemIds.includes(item.id)
                ? 'bg-success'
                : 'border border-foreground/25 bg-background',
            )}
          >
            {checklistItemIds.includes(item.id) && (
              <CheckmarkIcon className="w-5 h-5 stroke-white" />
            )}
          </span>
          <div className={cn('grow flex flex-col')}>
            <span className="font-bold flex items-center gap-1.5">
              {item.name}
              {item.isClicked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default">
                      <ClickIcon className="h-4 text-muted-foreground/70" />
                    </TooltipTrigger>
                    <TooltipContent usePortal={true}>User clicked this task</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!item.isVisible && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default">
                      <EyeNoneIcon className="h-4 text-muted-foreground/70" />
                    </TooltipTrigger>
                    <TooltipContent usePortal={true}>Task is hidden for user</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
            {item.description && <span className="text-xs opacity-75">{item.description}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
ChecklistItemsColumn.displayName = 'ChecklistItemsColumn';

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

export {
  LauncherProgressColumn,
  ChecklistProgressColumn,
  FlowProgressColumn,
  ChecklistItemsColumn,
};
