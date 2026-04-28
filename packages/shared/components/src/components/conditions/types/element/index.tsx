import { ElementIcon } from '@usertour-packages/icons';
import type { ElementSelectorPropsData, RulesCondition } from '@usertour/types';
import { useMemo } from 'react';
import { ElementSelector } from '../../../selector/element-selector';
import { useConditionsContext, useConditionsT } from '../../conditions-context';
import { OperatorSelect } from '../../primitives/operator-select';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateElement } from '../../validators';

export interface ElementData {
  elementData?: ElementSelectorPropsData;
  logic?: string;
}

const DEFAULT_ELEMENT_DATA: ElementSelectorPropsData = {
  type: 'auto',
  precision: 'strict',
  isDynamicContent: false,
  sequence: '1st',
};

const readData = (condition: RulesCondition): ElementData =>
  (condition.data as ElementData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<ElementData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const isElementSelected = (data: ElementSelectorPropsData | undefined): boolean => {
  if (!data) return false;
  if (data.type === 'auto') return Boolean(data.screenshot);
  if (data.type === 'manual') return Boolean(data.content || data.customSelector);
  return false;
};

const OPERATOR_KEYS = [
  { value: 'present', labelKey: 'conditions.types.element.operators.present' },
  { value: 'unpresent', labelKey: 'conditions.types.element.operators.unpresent' },
  { value: 'disabled', labelKey: 'conditions.types.element.operators.disabled' },
  { value: 'undisabled', labelKey: 'conditions.types.element.operators.undisabled' },
  { value: 'clicked', labelKey: 'conditions.types.element.operators.clicked' },
  { value: 'unclicked', labelKey: 'conditions.types.element.operators.unclicked' },
];

// ---------- Summary ----------

function ElementSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const data = readData(condition);
  const operator = OPERATOR_KEYS.find((o) => o.value === data.logic) ?? OPERATOR_KEYS[0];
  const selected = isElementSelected(data.elementData);

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <ElementIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">
        <span>{t('conditions.types.element.prefix')}</span>{' '}
        {selected ? (
          <span className="font-semibold">
            {data.elementData?.content ||
              data.elementData?.customSelector ||
              t('conditions.types.element.element')}
          </span>
        ) : (
          <span className="text-destructive">{t('conditions.types.element.notSelected')}</span>
        )}{' '}
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

function ElementEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const { currentContent, token, onElementChange } = useConditionsContext();
  const data = readData(condition);
  const elementData = data.elementData ?? DEFAULT_ELEMENT_DATA;

  const operatorOptions = useMemo(
    () => OPERATOR_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-medium text-muted-foreground">
        {t('conditions.types.element.editorTitle')}
      </div>
      <ElementSelector
        data={elementData}
        onDataChange={(next) => onChange(writeData(condition, { elementData: next }))}
        currentContent={currentContent}
        token={token ?? ''}
        onElementChange={onElementChange ? () => onElementChange(0, condition.type) : undefined}
      />
      <OperatorSelect
        value={data.logic ?? 'present'}
        onChange={(logic) => onChange(writeData(condition, { logic }))}
        options={operatorOptions}
      />
    </div>
  );
}

// ---------- Schema ----------

export const elementSchema: ConditionTypeSchema<ElementData> = {
  type: 'element',
  labelKey: 'conditions.types.element.label',
  Icon: ElementIcon,
  defaultData: () => ({ logic: 'present', elementData: { ...DEFAULT_ELEMENT_DATA } }),
  Summary: ElementSummary,
  Editor: ElementEditor,
  validate: (condition) => validateElement(readData(condition)),
};
