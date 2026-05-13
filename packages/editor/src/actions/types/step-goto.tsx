import { Badge } from '@usertour/badge';
import {
  ArrowRightIcon,
  EyeNoneIcon,
  ModelIcon,
  RiMessageFill,
  SpinnerIcon,
  TooltipIcon,
} from '@usertour/icons';
import { ScrollArea } from '@usertour/scroll-area';
import { cn } from '@usertour/tailwind';
import {
  ContentActionsItemType,
  type ContentVersion,
  type RulesCondition,
  type Step,
  StepContentType,
} from '@usertour/types';
import { useCallback, useMemo, useState } from 'react';
import { useActionsContext, useActionsT, useSummaryTextClass } from '../actions-context';
import { registerActionSchema } from '../registry';
import type { ActionTypeSchema } from '../schema-types';
import {
  ActionDropdownMenu,
  ActionDropdownMenuContent,
  ActionDropdownMenuItem,
  ActionDropdownMenuTrigger,
} from '../ui';
import {
  DropdownMenuRadioGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSelectItem,
} from '@usertour/dropdown-menu';

interface StepGotoData {
  stepCvid?: string;
  // Legacy fields preserved for SDK compatibility — the runtime reads
  // `stepCvid` exclusively, but older saved data may carry `logic`/`type`.
  logic?: string;
  type?: string;
}

const readData = (condition: RulesCondition): StepGotoData =>
  (condition.data as StepGotoData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<StepGotoData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const getStepTypeIcon = (type: string) => {
  switch (type) {
    case StepContentType.BUBBLE:
      return <RiMessageFill className="h-4 w-4 shrink-0" />;
    case StepContentType.TOOLTIP:
      return <TooltipIcon className="h-4 w-4 shrink-0" />;
    case StepContentType.MODAL:
      return <ModelIcon className="h-4 w-4 shrink-0" />;
    case StepContentType.HIDDEN:
      return <EyeNoneIcon className="h-4 w-4 shrink-0" />;
    default:
      return null;
  }
};

const findStep = (
  currentVersion: ContentVersion | undefined,
  stepCvid: string | undefined,
): { step?: Step; index: number } => {
  if (!stepCvid || !currentVersion?.steps) return { index: -1 };
  const index = currentVersion.steps.findIndex((step) => step.cvid === stepCvid);
  if (index === -1) return { index };
  return { step: currentVersion.steps[index], index };
};

function StepGotoSummary({ condition }: { condition: RulesCondition }) {
  const t = useActionsT();
  const summaryTextClass = useSummaryTextClass();
  const { currentVersion } = useActionsContext();
  const data = readData(condition);
  const { step, index } = findStep(currentVersion, data.stepCvid);

  const hasStep = Boolean(step);
  const stepText = step ? `${index + 1}. ${step.name}` : '';

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        <span className="text-muted-foreground">{t('actions.types.stepGoto.prefix')}</span>{' '}
        {hasStep ? (
          <span className="font-semibold">{stepText}</span>
        ) : (
          <span className="text-muted-foreground">{t('actions.types.stepGoto.placeholder')}</span>
        )}
      </span>
    </span>
  );
}

function StepGotoEditor({
  condition,
  onChange,
  onClose,
}: {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onClose: () => void;
}) {
  const t = useActionsT();
  const { currentVersion, currentStep, createStep } = useActionsContext();
  const data = readData(condition);
  const [isLoading, setIsLoading] = useState(false);

  // Open this editor as a controlled dropdown — distinct from ActionRow's
  // chip popover. ActionRow's popover renders the dropdown trigger; the
  // dropdown opens to one side and closes on selection.
  const [open, setOpen] = useState(true);

  const availableSteps = useMemo(
    () => currentVersion?.steps?.filter((step) => step.cvid !== currentStep?.cvid) ?? [],
    [currentVersion?.steps, currentStep?.cvid],
  );

  const handleSelect = useCallback(
    (cvid: string) => {
      onChange(writeData(condition, { stepCvid: cvid }));
      setOpen(false);
      onClose();
    },
    [condition, onChange, onClose],
  );

  const handleCreate = useCallback(
    async (stepType?: string) => {
      if (!createStep || !currentVersion) return;
      setIsLoading(true);
      const seq = currentStep?.sequence ?? 0;
      const newStep = await createStep(currentVersion, seq + 1, stepType);
      setIsLoading(false);
      if (newStep?.cvid) {
        handleSelect(newStep.cvid);
      }
    },
    [createStep, currentVersion, currentStep, handleSelect],
  );

  const handleDuplicate = useCallback(
    async (cvid: string) => {
      if (!createStep || !currentVersion?.steps) return;
      const source = currentVersion.steps.find((step) => step.cvid === cvid);
      if (!source) return;
      setIsLoading(true);
      const seq = currentStep?.sequence ?? 0;
      const newStep = await createStep(currentVersion, seq + 1, undefined, source);
      setIsLoading(false);
      if (newStep?.cvid) {
        handleSelect(newStep.cvid);
      }
    },
    [createStep, currentVersion, currentStep, handleSelect],
  );

  return (
    <ActionDropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClose();
      }}
    >
      <ActionDropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input/60 bg-background px-2 text-sm shadow-sm"
        >
          <span className="flex items-center gap-2">
            <ArrowRightIcon className="h-3.5 w-3.5" />
            <span>{t('actions.types.stepGoto.prefix')}</span>
          </span>
          {isLoading && <SpinnerIcon className="h-4 w-4 animate-spin" />}
        </button>
      </ActionDropdownMenuTrigger>
      <ActionDropdownMenuContent align="start" className="w-[var(--radix-popper-anchor-width)]">
        <DropdownMenuRadioGroup value={data.stepCvid}>
          <ScrollArea className={cn(availableSteps.length > 9 ? 'h-72' : '')}>
            {availableSteps.map((step) => {
              const realIndex =
                currentVersion?.steps?.findIndex((entry) => entry.cvid === step.cvid) ?? 0;
              return (
                <DropdownMenuSelectItem
                  key={step.cvid}
                  value={step.cvid as string}
                  onSelect={() => handleSelect(step.cvid as string)}
                  className="cursor-pointer"
                >
                  <div className="flex w-full min-w-0 items-center gap-1">
                    {getStepTypeIcon(step.type)}
                    <span className="shrink-0">{realIndex + 1}.</span>
                    <span className="min-w-0 truncate">{step.name}</span>
                  </div>
                </DropdownMenuSelectItem>
              );
            })}
            {createStep && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  {t('actions.types.stepGoto.addNewStep')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <ActionDropdownMenuItem onSelect={() => handleCreate(StepContentType.BUBBLE)}>
                    <RiMessageFill className="h-4 w-4 shrink-0" />
                    {t('actions.types.stepGoto.bubble')}
                  </ActionDropdownMenuItem>
                  <ActionDropdownMenuItem onSelect={() => handleCreate(StepContentType.TOOLTIP)}>
                    <TooltipIcon className="h-4 w-4 shrink-0" />
                    {t('actions.types.stepGoto.tooltip')}
                  </ActionDropdownMenuItem>
                  <ActionDropdownMenuItem onSelect={() => handleCreate(StepContentType.MODAL)}>
                    <ModelIcon className="h-4 w-4 shrink-0" />
                    {t('actions.types.stepGoto.modal')}
                  </ActionDropdownMenuItem>
                  <ActionDropdownMenuItem onSelect={() => handleCreate(StepContentType.HIDDEN)}>
                    <EyeNoneIcon className="h-4 w-4 shrink-0" />
                    {t('actions.types.stepGoto.hidden')}
                  </ActionDropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {createStep && (currentVersion?.steps?.length ?? 0) > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  {t('actions.types.stepGoto.duplicateStep')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-[240px]">
                  <ScrollArea
                    className={cn(
                      currentVersion?.steps?.length && currentVersion.steps.length > 9
                        ? 'h-72'
                        : '',
                    )}
                  >
                    {currentVersion?.steps?.map((step, stepIndex) => (
                      <ActionDropdownMenuItem
                        key={step.cvid}
                        onSelect={() => step.cvid && handleDuplicate(step.cvid)}
                      >
                        <div className="flex w-full min-w-0 items-center gap-1">
                          {getStepTypeIcon(step.type)}
                          <span className="shrink-0">{stepIndex + 1}.</span>
                          <span className="min-w-0 truncate">{step.name}</span>
                          {currentStep?.cvid === step.cvid && (
                            <Badge variant="secondary" className="ml-2 shrink-0">
                              {t('actions.types.stepGoto.currentBadge')}
                            </Badge>
                          )}
                        </div>
                      </ActionDropdownMenuItem>
                    ))}
                  </ScrollArea>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </ScrollArea>
        </DropdownMenuRadioGroup>
      </ActionDropdownMenuContent>
    </ActionDropdownMenu>
  );
}

export const stepGotoSchema: ActionTypeSchema<StepGotoData> = {
  type: ContentActionsItemType.STEP_GOTO,
  labelKey: 'actions.types.stepGoto.label',
  Icon: ArrowRightIcon,
  defaultData: () => ({}),
  Summary: StepGotoSummary,
  Editor: StepGotoEditor,
  validate: (condition) => {
    const data = readData(condition);
    if (!data.stepCvid) {
      return { key: 'actions.errors.stepGoto.selectStep' };
    }
    // Intentionally NOT cross-checking "step still exists in currentVersion"
    // here. Add-new-step / Duplicate-step flows commit the new stepCvid and
    // immediately trigger an upstream currentVersion refresh that is async
    // — validate runs in the same tick as onChange/onClose, so the freshly
    // minted step isn't yet in `ctx.currentVersion.steps` and a valid
    // reference would flash red until the next interaction. v1
    // actions-step.tsx surfaced "selected step no longer exists" as a
    // display-time hint, not a save-blocking error — matching that here.
    return undefined;
  },
};

registerActionSchema(stepGotoSchema);
