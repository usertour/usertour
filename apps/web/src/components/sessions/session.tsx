import { CancelIcon, CheckmarkIcon, ClickIcon, EyeNoneIcon } from '@usertour/icons';
import { TooltipContent, Tooltip, TooltipTrigger, TooltipProvider } from '@usertour/ui';
import { PlayIcon } from '@usertour/icons';
import {
  BizEvents,
  BizSession,
  ChecklistData,
  ChecklistItemType,
  ContentVersion,
} from '@usertour/types';
import { Event } from '@usertour/types';
import { getProgressStatus } from '@/utils/session';
import { isUndefined } from '@usertour/helpers';
import { cn } from '@usertour/tailwind';
import { useTranslation } from 'react-i18next';

/**
 * Format flow step display text from event data
 * @param flowStepNumber - Step number (0-indexed)
 * @param flowStepName - Step name
 * @param t - i18n translation function
 * @returns Formatted display string
 */
const formatFlowStepDisplay = (
  flowStepNumber: number | undefined | null,
  flowStepName: string | undefined | null,
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  const hasStepNumber = flowStepNumber !== undefined && flowStepNumber !== null;
  const stepNumberDisplay = hasStepNumber
    ? t('users.sessions.stepN', { number: Number(flowStepNumber) + 1 })
    : '';

  if (stepNumberDisplay && flowStepName) {
    return `${stepNumberDisplay}. ${flowStepName}`;
  }
  if (stepNumberDisplay) {
    return stepNumberDisplay;
  }
  if (flowStepName) {
    return flowStepName;
  }
  return '';
};

const LauncherProgressColumn = ({
  original,
  eventList,
}: { original: BizSession; eventList: Event[] }) => {
  const { t } = useTranslation();
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
            <TooltipContent>{t('users.sessions.status.active')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <CancelIcon className="text-foreground/60 h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>{t('users.sessions.status.dismissed')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex flex-col">
        {!isActivated && (
          <div className="text-muted-foreground">{t('users.sessions.status.seen')}</div>
        )}
        {isActivated && <div className="text-success">{t('users.sessions.status.activated')}</div>}
      </div>
    </div>
  );
};
LauncherProgressColumn.displayName = 'LauncherProgressColumn';

const BannerProgressColumn = ({
  original,
  eventList,
}: { original: BizSession; eventList: Event[] }) => {
  const { t } = useTranslation();
  const { bizEvent } = original;
  if (!eventList || !bizEvent || bizEvent.length === 0) {
    return <></>;
  }

  const isSeen = !!bizEvent.find((e) => e?.event?.codeName === BizEvents.BANNER_SEEN);
  const isDismissed = !!bizEvent.find((e) => e?.event?.codeName === BizEvents.BANNER_DISMISSED);

  if (!isSeen && !isDismissed) {
    return <></>;
  }

  return (
    <div className="flex flex-row items-center space-x-3">
      {!isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <PlayIcon className="text-success h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>{t('users.sessions.status.active')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <CancelIcon className="text-foreground/60 h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>{t('users.sessions.status.dismissed')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex flex-col">
        {!isDismissed && (
          <div className="text-muted-foreground">{t('users.sessions.status.seen')}</div>
        )}
        {isDismissed && (
          <div className="text-foreground/60">{t('users.sessions.status.dismissed')}</div>
        )}
      </div>
    </div>
  );
};
BannerProgressColumn.displayName = 'BannerProgressColumn';

const ChecklistProgressColumn = ({
  original,
  eventList,
  version,
}: { original: BizSession; eventList: Event[]; version: ContentVersion }) => {
  const { t } = useTranslation();
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
            <TooltipContent>{t('users.sessions.status.active')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <CancelIcon className="text-foreground/60 h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>{t('users.sessions.status.dismissed')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex flex-col">
        {!isComplete && <span>{progress}%</span>}
        {isComplete && (
          <div className="text-success font-bold text-left">
            {t('users.sessions.completedIn', { date: completeDate })}
          </div>
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
  const { t } = useTranslation();
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

  const checklistItems =
    data.items?.map((item) => ({
      ...item,
      ...(sessionItems?.find((i) => i.id === item.id) ?? {}),
    })) ?? [];

  return (
    <div className="flex flex-col gap-2">
      {checklistItems.map((item) => (
        <div
          key={item.id}
          className={cn(
            'flex items-center',
            !isUndefined(item.isVisible) && !item.isVisible ? 'opacity-30' : '',
          )}
        >
          <span
            className={cn(
              'flex-none w-8 h-8 border-2 border-transparent rounded-full flex justify-center items-center mr-3 text-sm text-white',
              checklistItemIds.includes(item.id)
                ? 'bg-success'
                : 'border border-foreground/25 bg-background dark:bg-muted',
            )}
          >
            {checklistItemIds.includes(item.id) && (
              <CheckmarkIcon className="w-5 h-5 stroke-white" />
            )}
          </span>
          <div className={cn('grow flex flex-col min-w-0')}>
            <span className="font-bold flex items-center gap-1.5 min-w-0 overflow-hidden">
              <span className="truncate flex-1">{item.name}</span>
              {item.isClicked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default flex-shrink-0">
                      <ClickIcon className="h-4 text-muted-foreground/70" />
                    </TooltipTrigger>
                    <TooltipContent usePortal={true}>
                      {t('users.sessions.taskClicked')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isUndefined(item.isVisible) && !item.isVisible && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default flex-shrink-0">
                      <EyeNoneIcon className="h-4 text-muted-foreground/70" />
                    </TooltipTrigger>
                    <TooltipContent usePortal={true}>
                      {t('users.sessions.taskHidden')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
            {item.description && (
              <span className="text-xs opacity-75 truncate">{item.description}</span>
            )}
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
  const { t } = useTranslation();
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
            <TooltipContent>{t('users.sessions.status.active')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <CancelIcon className="text-foreground/60 h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>{t('users.sessions.status.dismissed')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex flex-col min-w-0">
        {!isComplete && <span>{lastSeenBizEvent?.data?.flow_step_progress ?? 0}%</span>}
        {isComplete && (
          <div className="text-success font-bold text-left">
            {t('users.sessions.completedIn', { date: completeDate })}
          </div>
        )}
        {lastSeenBizEvent && (
          <div className="text-left text-muted-foreground truncate">
            {formatFlowStepDisplay(
              lastSeenBizEvent?.data?.flow_step_number,
              lastSeenBizEvent?.data?.flow_step_name,
              t,
            )}
          </div>
        )}
      </div>
    </div>
  );
};
FlowProgressColumn.displayName = 'FlowProgressColumn';

const ResourceCenterProgressColumn = ({
  original,
  eventList,
}: { original: BizSession; eventList: Event[] }) => {
  const { t } = useTranslation();
  const { bizEvent } = original;
  if (!eventList || !bizEvent || bizEvent.length === 0) {
    return <></>;
  }

  const isStarted = !!bizEvent.find(
    (e) => e?.event?.codeName === BizEvents.RESOURCE_CENTER_STARTED,
  );
  const isDismissed = !!bizEvent.find(
    (e) => e?.event?.codeName === BizEvents.RESOURCE_CENTER_DISMISSED,
  );

  if (!isStarted && !isDismissed) {
    return <></>;
  }

  return (
    <div className="flex flex-row items-center space-x-3">
      {!isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <PlayIcon className="text-success h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>{t('users.sessions.status.active')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDismissed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-default">
              <CancelIcon className="text-foreground/60 h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>{t('users.sessions.status.dismissed')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex flex-col">
        {!isDismissed && <div className="text-success">{t('users.sessions.status.active')}</div>}
        {isDismissed && (
          <div className="text-foreground/60">{t('users.sessions.status.dismissed')}</div>
        )}
      </div>
    </div>
  );
};
ResourceCenterProgressColumn.displayName = 'ResourceCenterProgressColumn';

export {
  BannerProgressColumn,
  LauncherProgressColumn,
  ChecklistProgressColumn,
  FlowProgressColumn,
  ChecklistItemsColumn,
  ResourceCenterProgressColumn,
};
