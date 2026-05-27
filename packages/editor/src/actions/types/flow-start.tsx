import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '@usertour/ui';
import {
  EyeNoneIcon,
  ModelIcon,
  RiExternalLinkLine,
  RiCheckLine,
  TooltipIcon,
} from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import {
  ContentActionsItemType,
  ContentDataType,
  type Content,
  type RulesCondition,
  type Step,
} from '@usertour/types';
import { useCallback, useMemo, useState } from 'react';
import {
  useActionsContext,
  useActionsT,
  useActionsZIndex,
  useSummaryTextClass,
} from '../actions-context';
import { registerActionSchema } from '../registry';
import type { ActionTypeSchema } from '../schema-types';

interface FlowStartData {
  contentId?: string;
  stepCvid?: string;
  type?: string;
  logic?: string;
}

const readData = (condition: RulesCondition): FlowStartData =>
  (condition.data as FlowStartData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<FlowStartData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

// Step type icons mirror v1 actions-content.tsx — narrow to the three step
// shapes that v1 explicitly rendered. BUBBLE wasn't in v1's list, so
// keeping the same scoped switch instead of expanding.
const getStepTypeIcon = (type: string) => {
  switch (type) {
    case 'hidden':
      return <EyeNoneIcon className="h-4 w-4 shrink-0" />;
    case 'tooltip':
      return <TooltipIcon className="h-4 w-4 shrink-0" />;
    case 'modal':
      return <ModelIcon className="h-4 w-4 shrink-0" />;
    default:
      return null;
  }
};

function FlowStartSummary({ condition }: { condition: RulesCondition }) {
  const t = useActionsT();
  const summaryTextClass = useSummaryTextClass();
  const { contents } = useActionsContext();
  const data = readData(condition);
  const content = contents?.find((entry) => entry.id === data.contentId);
  const isFlow = content?.type === ContentDataType.FLOW;
  const stepIndex = isFlow
    ? (content?.steps?.findIndex((step) => step.cvid === data.stepCvid) ?? -1)
    : -1;

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <RiExternalLinkLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        {content ? (
          <>
            <span className="text-muted-foreground">
              {t(`actions.types.flowStart.start.${isFlow ? 'flow' : 'checklist'}`)}
            </span>{' '}
            <span className="font-semibold">{content.name}</span>
            {isFlow && data.stepCvid && stepIndex !== -1 && (
              <>
                <span className="text-muted-foreground">{t('actions.types.flowStart.atStep')}</span>
                <span className="font-semibold">{stepIndex + 1}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{t('actions.types.flowStart.placeholder')}</span>
        )}
      </span>
    </span>
  );
}

// Reusable picker shell — header, search box, scroll area. The two pickers
// inside FlowStart (content + step) only differ in their item list; reusing
// the same shell keeps them visually consistent.
function PickerPopover({
  open,
  onOpenChange,
  triggerLabel,
  searchPlaceholder,
  emptyLabel,
  children,
  zIndex,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  triggerLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  children: React.ReactNode;
  zIndex: number;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between overflow-hidden">
          <span className="min-w-0 truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popper-anchor-width)] p-0" style={{ zIndex }}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyLabel}</CommandEmpty>
          <ScrollArea className="h-72">{children}</ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FlowStartEditor({
  condition,
  onChange,
}: {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onClose: () => void;
}) {
  const t = useActionsT();
  const { contents } = useActionsContext();
  const { popover: popoverZIndex } = useActionsZIndex();
  const data = readData(condition);

  const [contentPickerOpen, setContentPickerOpen] = useState(false);
  const [stepPickerOpen, setStepPickerOpen] = useState(false);

  const { flows, checklists } = useMemo(() => {
    if (!contents || contents.length === 0) return { flows: [], checklists: [] };
    return {
      flows: contents.filter((entry) => entry.type === ContentDataType.FLOW),
      checklists: contents.filter((entry) => entry.type === ContentDataType.CHECKLIST),
    };
  }, [contents]);

  const selectedContent = useMemo(
    () => contents?.find((entry) => entry.id === data.contentId),
    [contents, data.contentId],
  );

  const isFlow = selectedContent?.type === ContentDataType.FLOW;
  const steps = (isFlow ? selectedContent?.steps : []) ?? [];

  const stepIndex = steps.findIndex((step) => step.cvid === data.stepCvid);

  const handleSelectContent = useCallback(
    (content: Content) => {
      // Switching content invalidates any previously chosen stepCvid — clear
      // it. `type` and `logic` are kept on the data for SDK back-compat
      // (action-handlers don't read them but legacy saved data carries them).
      const nextType = content.type === ContentDataType.FLOW ? 'flow' : 'checklist';
      onChange(
        writeData(condition, {
          contentId: content.id,
          stepCvid: undefined,
          type: nextType,
          logic: data.logic ?? 'and',
        }),
      );
      setContentPickerOpen(false);
    },
    [condition, data.logic, onChange],
  );

  const handleSelectStep = useCallback(
    (step: Step) => {
      onChange(writeData(condition, { stepCvid: step.cvid }));
      setStepPickerOpen(false);
    },
    [condition, onChange],
  );

  const contentTriggerLabel = selectedContent?.name || t('actions.types.flowStart.selectContent');
  const stepTriggerLabel = (() => {
    if (!isFlow) return '';
    if (data.stepCvid && stepIndex !== -1) {
      return `${stepIndex + 1}. ${steps[stepIndex].name}`;
    }
    return t('actions.types.flowStart.selectStep');
  })();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">
        {t(`actions.types.flowStart.heading.${isFlow ? 'flow' : 'checklist'}`)}
      </span>
      <PickerPopover
        open={contentPickerOpen}
        onOpenChange={setContentPickerOpen}
        triggerLabel={contentTriggerLabel}
        searchPlaceholder={t('actions.types.flowStart.searchContent')}
        emptyLabel={t('actions.types.flowStart.empty')}
        zIndex={popoverZIndex}
      >
        {flows.length > 0 && (
          <CommandGroup heading={t('actions.types.flowStart.flow')}>
            {flows.map((flow) => (
              <CommandItem
                key={flow.id}
                value={flow.id}
                onSelect={() => handleSelectContent(flow)}
                className="cursor-pointer"
              >
                <span className="min-w-0 truncate">{flow.name}</span>
                <RiCheckLine
                  className={cn(
                    'ml-auto h-4 w-4',
                    data.contentId === flow.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {checklists.length > 0 && (
          <CommandGroup heading={t('actions.types.flowStart.checklist')}>
            {checklists.map((checklist) => (
              <CommandItem
                key={checklist.id}
                value={checklist.id}
                onSelect={() => handleSelectContent(checklist)}
                className="cursor-pointer"
              >
                <span className="min-w-0 truncate">{checklist.name}</span>
                <RiCheckLine
                  className={cn(
                    'ml-auto h-4 w-4',
                    data.contentId === checklist.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </PickerPopover>

      {isFlow && (
        <>
          <span className="text-sm">{t('actions.types.flowStart.stepLabel')}</span>
          <PickerPopover
            open={stepPickerOpen}
            onOpenChange={setStepPickerOpen}
            triggerLabel={stepTriggerLabel}
            searchPlaceholder={t('actions.types.flowStart.searchStep')}
            emptyLabel={t('actions.types.flowStart.empty')}
            zIndex={popoverZIndex}
          >
            <CommandGroup heading={t('actions.types.flowStart.steps')}>
              {steps.map((step, index) => (
                <CommandItem
                  key={step.cvid}
                  value={step.cvid as string}
                  onSelect={() => handleSelectStep(step)}
                  className="cursor-pointer"
                >
                  <div className="flex w-full min-w-0 items-center gap-1">
                    {getStepTypeIcon(step.type)}
                    <span className="shrink-0">{index + 1}.</span>
                    <span className="min-w-0 truncate">{step.name}</span>
                  </div>
                  <RiCheckLine
                    className={cn(
                      'ml-auto h-4 w-4',
                      data.stepCvid === step.cvid ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </PickerPopover>
        </>
      )}
    </div>
  );
}

export const flowStartSchema: ActionTypeSchema<FlowStartData> = {
  type: ContentActionsItemType.FLOW_START,
  labelKey: 'actions.types.flowStart.label',
  Icon: RiExternalLinkLine,
  defaultData: () => ({ type: 'flow', logic: 'and' }),
  Summary: FlowStartSummary,
  Editor: FlowStartEditor,
  editorWidthClassName: 'w-96',
  validate: (condition) => {
    const data = readData(condition);
    if (!data.contentId) {
      return {
        key:
          data.type === 'checklist'
            ? 'actions.errors.flowStart.selectChecklist'
            : 'actions.errors.flowStart.selectFlow',
      };
    }
    return undefined;
  },
};

registerActionSchema(flowStartSchema);
