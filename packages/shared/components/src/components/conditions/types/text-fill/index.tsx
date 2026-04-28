import { TextFillIcon } from '@usertour-packages/icons';
import type { ElementSelectorPropsData, RulesCondition } from '@usertour/types';
import { useConditionsT } from '../../conditions-context';
import { ConditionElementSelector } from '../../primitives/condition-element-selector';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateTextFill } from '../../validators';

export interface TextFillData {
  elementData?: ElementSelectorPropsData;
}

const DEFAULT_ELEMENT_DATA: ElementSelectorPropsData = {
  type: 'auto',
  precision: 'strict',
  isDynamicContent: false,
  sequence: '1st',
};

const readData = (condition: RulesCondition): TextFillData =>
  (condition.data as TextFillData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<TextFillData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const isElementSelected = (data: ElementSelectorPropsData | undefined): boolean => {
  if (!data) return false;
  if (data.type === 'auto') return Boolean(data.screenshot);
  if (data.type === 'manual') return Boolean(data.content || data.customSelector);
  return false;
};

// ---------- Summary ----------

function TextFillSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const data = readData(condition);
  const elSelected = isElementSelected(data.elementData);

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <TextFillIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">
        <span>{t('conditions.types.textFill.prefix')}</span>{' '}
        {elSelected ? (
          <span className="font-semibold">
            {data.elementData?.content ||
              data.elementData?.customSelector ||
              t('conditions.types.element.element')}
          </span>
        ) : (
          <span className="text-destructive">{t('conditions.types.element.notSelected')}</span>
        )}
      </span>
    </span>
  );
}

// ---------- Editor ----------

interface EditorProps {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
}

function TextFillEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const data = readData(condition);
  const elementData = data.elementData ?? DEFAULT_ELEMENT_DATA;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-medium text-muted-foreground">
        {t('conditions.types.textFill.editorTitle')}
      </div>
      <ConditionElementSelector
        data={elementData}
        onDataChange={(next) => onChange(writeData(condition, { elementData: next }))}
      />
    </div>
  );
}

// ---------- Schema ----------

export const textFillSchema: ConditionTypeSchema<TextFillData> = {
  type: 'text-fill',
  labelKey: 'conditions.types.textFill.label',
  Icon: TextFillIcon,
  defaultData: () => ({ elementData: { ...DEFAULT_ELEMENT_DATA } }),
  Summary: TextFillSummary,
  Editor: TextFillEditor,
  validate: (condition) => validateTextFill(readData(condition)),
};
