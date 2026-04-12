import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { EventCreateDialog } from '@/components/events/event-create-dialog';
import { useContentVersionUpdate } from '@/hooks/use-content-version-update';
import { useMutation } from '@apollo/client';
import { updateContentVersion } from '@usertour-packages/gql';
import { isVersionPublished } from '@/utils/content';
import { createContentVersion } from '@usertour-packages/gql';
import { buildConfig, getErrorMessage } from '@usertour/helpers';
import { Event, RulesCondition } from '@usertour/types';
import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { Button } from '@usertour-packages/button';
import { EventTrackerIcon } from '@usertour-packages/icons';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { useToast } from '@usertour-packages/use-toast';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';
import { Input } from '@usertour-packages/input';
import { XIcon, SearchIcon, CheckIcon } from 'lucide-react';

// ============================================================================
// Event Selector Component
// ============================================================================

interface TrackerEventSelectorProps {
  selectedEventId: string | undefined;
  onEventSelect: (eventId: string | undefined) => void;
  disabled?: boolean;
}

const TrackerEventSelector = ({
  selectedEventId,
  onEventSelect,
  disabled = false,
}: TrackerEventSelectorProps) => {
  const { eventList, refetch } = useEventListContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const events: Event[] = eventList ?? [];

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) => e.displayName.toLowerCase().includes(q) || e.codeName.toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId],
  );

  const handleCreated = useCallback(
    async (createdEvent: { id: string }) => {
      await refetch();
      onEventSelect(createdEvent.id);
    },
    [onEventSelect, refetch],
  );

  // If an event is selected, show the summary card
  if (selectedEvent) {
    return (
      <div className="space-y-3">
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 flex-none rounded-md bg-primary/10 p-2">
                <EventTrackerIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 w-full overflow-hidden">
                <div className="font-medium text-sm truncate max-w-full">
                  {selectedEvent.displayName}
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate max-w-full">
                  {selectedEvent.codeName}
                </div>
                {selectedEvent.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2 break-all overflow-hidden">
                    {selectedEvent.description}
                  </div>
                )}
              </div>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-none h-6 w-6"
                onClick={() => onEventSelect(undefined)}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show the search/select UI
  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Find or create an event..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
          disabled={disabled}
        />
      </div>
      <div className="border rounded-md overflow-hidden">
        <div className="max-h-48 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {events.length === 0 ? 'No events defined yet.' : 'No matching events found.'}
            </div>
          ) : (
            filteredEvents.map((event) => (
              <button
                type="button"
                key={event.id}
                disabled={disabled}
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm border-b last:border-b-0 flex items-center justify-between"
                onClick={() => onEventSelect(event.id)}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{event.displayName}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {event.codeName}
                  </div>
                </div>
                {event.id === selectedEventId && (
                  <CheckIcon className="h-4 w-4 text-primary flex-none" />
                )}
              </button>
            ))
          )}
        </div>
        {!disabled && (
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm border-t hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer"
            onClick={() => setOpenCreateDialog(true)}
          >
            <span className="font-medium">+ Create new event</span>
          </button>
        )}
      </div>
      <EventCreateDialog
        isOpen={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

// ============================================================================
// Tracker Editor (Two-Column Layout)
// ============================================================================

export const ContentDetailTrackerEditor = () => {
  const { version, refetch: refetchVersion, setIsSaving } = useContentVersionContext();
  const { content, refetch: refetchContent } = useContentDetailContext();
  const { isViewOnly } = useAppContext();
  const { toast } = useToast();
  const [mutation] = useMutation(updateContentVersion);
  const [createVersion] = useMutation(createContentVersion);
  const { debouncedUpdateVersion } = useContentVersionUpdate();

  const config = buildConfig(version?.config);
  const versionData = (version?.data ?? {}) as Record<string, any>;
  const selectedEventId = versionData.eventId as string | undefined;

  // Handle event selection change - update version data
  const handleEventSelect = useCallback(
    async (eventId: string | undefined) => {
      if (!version || !content) return;
      try {
        setIsSaving(true);
        const newData = { ...versionData, eventId: eventId ?? null };

        if (isVersionPublished(content, version.id)) {
          await createVersion({
            variables: {
              data: {
                versionId: version.id,
                config: version.config,
              },
            },
          });
        } else {
          await mutation({
            variables: {
              versionId: version.id,
              content: {
                themeId: version.themeId,
                data: newData,
                config: version.config,
              },
            },
          });
        }

        await Promise.all([refetchContent(), refetchVersion()]);
        toast({ variant: 'success', title: 'Event selection updated.' });
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
      } finally {
        setIsSaving(false);
      }
    },
    [
      version,
      content,
      versionData,
      mutation,
      createVersion,
      refetchContent,
      refetchVersion,
      setIsSaving,
      toast,
    ],
  );

  // Handle conditions change - update config
  const handleAutoStartRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
      const newConfig = {
        ...config,
        enabledAutoStartRules: enabled,
        autoStartRules: conditions,
        autoStartRulesSetting: setting,
      };
      debouncedUpdateVersion(newConfig);
    },
    [config, debouncedUpdateVersion],
  );

  if (!version || !content) return null;

  return (
    <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto w-full items-start">
      {/* Left panel: Conditions */}
      <div className="flex flex-col space-y-6 flex-none w-[420px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1">
              <span>When this happens</span>
              <QuestionTooltip contentClassName="max-w-sm">
                This event is tracked once the condition is satisfied. For example, when a button in
                your app is clicked.
              </QuestionTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ContentDetailAutoStartRules
              defaultConditions={config.autoStartRules}
              defaultEnabled={config.enabledAutoStartRules}
              setting={config.autoStartRulesSetting}
              name="Trigger conditions"
              showEnabledSwitch={false}
              onDataChange={handleAutoStartRulesDataChange}
              content={content}
              type={ContentDetailAutoStartRulesType.START_RULES}
              showIfCompleted={false}
              showFrequency={false}
              showWait={false}
              showPriority={false}
              showAtLeast={false}
              disabled={isViewOnly}
              filterItems={[
                'user-attr',
                'current-page',
                'element',
                'text-input',
                'text-fill',
                'time',
                'group',
              ]}
              featureTooltip={
                <>
                  Define the conditions that must be met for the tracker to fire. When these
                  conditions become true, the selected event will be tracked.
                </>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Right panel: Event Selection */}
      <div className="flex flex-col space-y-6 flex-1 min-w-0 max-w-[560px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1">
              <span>Then track this event</span>
              <QuestionTooltip contentClassName="max-w-sm">
                Select the event name to track. You can reuse this event in other flows and
                checklists, and it will be sent to analytics providers connected in Settings
                Integrations.
              </QuestionTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrackerEventSelector
              selectedEventId={selectedEventId}
              onEventSelect={handleEventSelect}
              disabled={isViewOnly}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

ContentDetailTrackerEditor.displayName = 'ContentDetailTrackerEditor';
