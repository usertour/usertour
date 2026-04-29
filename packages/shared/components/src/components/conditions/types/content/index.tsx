import {
  CheckboxCircleFillIcon,
  ContentIcon,
  EyeFillIcon,
  EyeNoneIcon,
  ForbidFillIcon,
  PlayCircleFillIcon,
  StopCircleFillIcon,
} from '@usertour-packages/icons';
import { ContentDataType, type Content, type RulesCondition } from '@usertour/types';
import { useMemo, type ComponentType } from 'react';
import {
  useConditionsContext,
  useConditionsT,
  useSummaryTextClass,
} from '../../conditions-context';
import { OperatorSelect } from '../../primitives/operator-select';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateContent } from '../../validators';
import { ConditionCombobox, type ConditionComboboxItem } from '../../ui/condition-combobox';

export interface ContentData {
  contentId?: string;
  logic?: string;
}

const readData = (condition: RulesCondition): ContentData =>
  (condition.data as ContentData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<ContentData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

interface OperatorMeta {
  value: string;
  labelKey: string;
  Icon: ComponentType<{ className?: string }>;
}

const OPERATORS: OperatorMeta[] = [
  { value: 'seen', labelKey: 'conditions.types.content.operators.seen', Icon: EyeFillIcon },
  { value: 'unseen', labelKey: 'conditions.types.content.operators.unseen', Icon: EyeNoneIcon },
  {
    value: 'completed',
    labelKey: 'conditions.types.content.operators.completed',
    Icon: CheckboxCircleFillIcon,
  },
  {
    value: 'uncompleted',
    labelKey: 'conditions.types.content.operators.uncompleted',
    Icon: ForbidFillIcon,
  },
  {
    value: 'actived',
    labelKey: 'conditions.types.content.operators.actived',
    Icon: PlayCircleFillIcon,
  },
  {
    value: 'unactived',
    labelKey: 'conditions.types.content.operators.unactived',
    Icon: StopCircleFillIcon,
  },
];

const findContent = (
  contents: Content[] | undefined,
  id: string | undefined,
): Content | undefined => contents?.find((c) => c.id === id);

const contentTypeLabelKey = (content: Content | undefined): string => {
  if (content?.type === ContentDataType.CHECKLIST) return 'conditions.types.content.checklist';
  if (content?.type === ContentDataType.FLOW) return 'conditions.types.content.flow';
  return 'conditions.types.content.flowOrChecklist';
};

// ---------- Summary ----------

function ContentSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const summaryTextClass = useSummaryTextClass();
  const { contents } = useConditionsContext();
  const data = readData(condition);
  const content = findContent(contents, data.contentId);
  const operator = OPERATORS.find((o) => o.value === data.logic) ?? OPERATORS[0];
  const Icon = operator.Icon;

  if (!content) {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <ContentIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{t('conditions.types.content.placeholder')}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        <span>{t(contentTypeLabelKey(content))}</span>{' '}
        <span className="font-semibold">{content.name}</span>{' '}
        <span className="text-muted-foreground">{t(operator.labelKey)}</span>
      </span>
    </span>
  );
}

// ---------- Editor ----------

interface EditorProps {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
}

function ContentEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const { contents } = useConditionsContext();
  const data = readData(condition);

  const operatorOptions = useMemo(
    () => OPERATORS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  const groups = useMemo(() => {
    if (!contents) return undefined;
    const flowItems: ConditionComboboxItem[] = contents
      .filter((c) => c.type === ContentDataType.FLOW)
      .map((c) => ({ value: c.id, label: c.name || c.id }));
    const checklistItems: ConditionComboboxItem[] = contents
      .filter((c) => c.type === ContentDataType.CHECKLIST)
      .map((c) => ({ value: c.id, label: c.name || c.id }));
    const formatted = [
      { heading: t('conditions.types.content.flow'), items: flowItems },
      { heading: t('conditions.types.content.checklist'), items: checklistItems },
    ].filter((g) => g.items.length > 0);
    return formatted.length > 0 ? formatted : undefined;
  }, [contents, t]);

  const allItems = useMemo<ConditionComboboxItem[]>(
    () => (contents ?? []).map((c) => ({ value: c.id, label: c.name || c.id })),
    [contents],
  );

  const handleContentChange = (contentId: string) => {
    onChange(writeData(condition, { contentId }));
  };

  return (
    <div className="flex flex-col gap-2">
      <ConditionCombobox
        value={data.contentId}
        onChange={handleContentChange}
        items={allItems}
        groups={groups}
        placeholder={t('conditions.types.content.selectPlaceholder')}
        searchPlaceholder={t('conditions.types.content.searchPlaceholder')}
        emptyText={t('conditions.types.content.empty')}
      />
      <OperatorSelect
        value={data.logic ?? 'seen'}
        onChange={(logic) => onChange(writeData(condition, { logic }))}
        options={operatorOptions}
      />
    </div>
  );
}

// ---------- Schema ----------

export const contentSchema: ConditionTypeSchema<ContentData> = {
  type: 'content',
  labelKey: 'conditions.types.content.label',
  Icon: ContentIcon,
  defaultData: () => ({ logic: 'seen' }),
  Summary: ContentSummary,
  Editor: ContentEditor,
  validate: (condition, ctx) => validateContent(readData(condition), ctx.contents),
};
