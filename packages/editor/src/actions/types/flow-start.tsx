import { ComboboxSelect } from '@usertour/ui';
import { EyeNoneIcon, ModelIcon, RiExternalLinkLine, TooltipIcon } from '@usertour/icons';
import {
  ContentActionsItemType,
  ContentDataType,
  type Content,
  type RulesCondition,
  type Step,
} from '@usertour/types';
import { useCallback, useMemo } from 'react';
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
    },
    [condition, data.logic, onChange],
  );

  const handleSelectStep = useCallback(
    (step: Step) => {
      onChange(writeData(condition, { stepCvid: step.cvid }));
    },
    [condition, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">
        {t(`actions.types.flowStart.heading.${isFlow ? 'flow' : 'checklist'}`)}
      </span>
      <ComboboxSelect
        size="compact"
        surface="raised"
        value={data.contentId}
        onValueChange={(contentId) => {
          const content = contents?.find((entry) => entry.id === contentId);
          if (content) {
            handleSelectContent(content);
          }
        }}
        placeholder={t('actions.types.flowStart.selectContent')}
        searchPlaceholder={t('actions.types.flowStart.searchContent')}
        emptyText={t('actions.types.flowStart.empty')}
        groups={[
          ...(flows.length > 0
            ? [
                {
                  heading: t('actions.types.flowStart.flow'),
                  options: flows.map((flow) => ({ value: flow.id, label: flow.name ?? '' })),
                },
              ]
            : []),
          ...(checklists.length > 0
            ? [
                {
                  heading: t('actions.types.flowStart.checklist'),
                  options: checklists.map((checklist) => ({
                    value: checklist.id,
                    label: checklist.name ?? '',
                  })),
                },
              ]
            : []),
        ]}
        contentStyle={{ zIndex: popoverZIndex }}
      />

      {isFlow && (
        <>
          <span className="text-sm">{t('actions.types.flowStart.stepLabel')}</span>
          <ComboboxSelect
            size="compact"
            surface="raised"
            value={data.stepCvid}
            onValueChange={(cvid) => {
              const step = steps.find((entry) => entry.cvid === cvid);
              if (step) {
                handleSelectStep(step);
              }
            }}
            placeholder={t('actions.types.flowStart.selectStep')}
            searchPlaceholder={t('actions.types.flowStart.searchStep')}
            emptyText={t('actions.types.flowStart.empty')}
            groups={[
              {
                heading: t('actions.types.flowStart.steps'),
                options: steps.map((step, index) => ({
                  value: step.cvid as string,
                  label: `${index + 1}. ${step.name ?? ''}`,
                  leading: getStepTypeIcon(step.type),
                })),
              },
            ]}
            contentStyle={{ zIndex: popoverZIndex }}
          />
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
