import { TextInputIcon } from '@usertour/icons';
import type { ElementSelectorPropsData, RulesCondition } from '@usertour/types';
import { useMemo } from 'react';
import { useConditionsT, useSummaryTextClass } from '../../conditions-context';
import { FORM_CONTROL_PICK_TARGETS } from '../../../element-picker';
import { ConditionElementSelector } from '../../primitives/condition-element-selector';
import { OperatorSelect } from '../../primitives/operator-select';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateTextInput } from '../../validators';
import { Input } from '@usertour/ui';

export interface TextInputData {
  elementData?: ElementSelectorPropsData;
  logic?: string;
  value?: string;
}

const DEFAULT_ELEMENT_DATA: ElementSelectorPropsData = {
  type: 'auto',
  precision: 'strict',
  isDynamicContent: false,
  sequence: '1st',
};

const VALUELESS_OPERATORS = new Set(['any', 'empty']);

const OPERATOR_KEYS = [
  { value: 'is', labelKey: 'conditions.operators.is' },
  { value: 'not', labelKey: 'conditions.operators.isNot' },
  { value: 'contains', labelKey: 'conditions.operators.contains' },
  { value: 'notContain', labelKey: 'conditions.operators.doesNotContain' },
  { value: 'startsWith', labelKey: 'conditions.operators.startsWith' },
  { value: 'endsWith', labelKey: 'conditions.operators.endsWith' },
  { value: 'match', labelKey: 'conditions.operators.matchesRegex' },
  { value: 'unmatch', labelKey: 'conditions.operators.doesNotMatchRegex' },
  { value: 'any', labelKey: 'conditions.operators.hasAnyValue' },
  { value: 'empty', labelKey: 'conditions.operators.isEmpty' },
];

const readData = (condition: RulesCondition): TextInputData =>
  (condition.data as TextInputData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<TextInputData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const isElementSelected = (data: ElementSelectorPropsData | undefined): boolean => {
  if (!data) return false;
  if (data.type === 'auto') return Boolean(data.selectors);
  if (data.type === 'manual') return Boolean(data.customSelector);
  return false;
};

// ---------- Summary ----------

function TextInputSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const summaryTextClass = useSummaryTextClass();
  const data = readData(condition);
  const operator = OPERATOR_KEYS.find((o) => o.value === data.logic) ?? OPERATOR_KEYS[0];
  const elSelected = isElementSelected(data.elementData);

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <TextInputIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        <span>{t('conditions.types.textInput.prefix')}</span>{' '}
        {elSelected ? (
          <span className="font-semibold">
            {data.elementData?.content ||
              data.elementData?.customSelector ||
              t('conditions.types.element.element')}
          </span>
        ) : (
          <span className="text-destructive">{t('conditions.types.element.notSelected')}</span>
        )}{' '}
        <span className="text-muted-foreground">{t(operator.labelKey)}</span>
        {!VALUELESS_OPERATORS.has(operator.value) && data.value && (
          <>
            {' '}
            <span className="font-semibold">{data.value}</span>
          </>
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

function TextInputEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const data = readData(condition);
  const elementData = data.elementData ?? DEFAULT_ELEMENT_DATA;

  const operatorOptions = useMemo(
    () => OPERATOR_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  const showValueInput = !VALUELESS_OPERATORS.has(data.logic ?? 'is');

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-muted-foreground">
        {t('conditions.types.textInput.editorTitle')}
      </div>
      <ConditionElementSelector
        data={elementData}
        onDataChange={(next) => onChange(writeData(condition, { elementData: next }))}
        pickMustMatch={FORM_CONTROL_PICK_TARGETS}
      />
      <OperatorSelect
        value={data.logic ?? 'is'}
        onChange={(logic) => onChange(writeData(condition, { logic }))}
        options={operatorOptions}
      />
      {showValueInput && (
        <Input
          variant="compact-surface"
          value={data.value ?? ''}
          onChange={(e) => onChange(writeData(condition, { value: e.target.value }))}
          placeholder={t('conditions.types.textInput.valuePlaceholder')}
        />
      )}
    </div>
  );
}

// ---------- Schema ----------

export const textInputSchema: ConditionTypeSchema<TextInputData> = {
  type: 'text-input',
  labelKey: 'conditions.types.textInput.label',
  Icon: TextInputIcon,
  defaultData: () => ({ logic: 'is', value: '', elementData: { ...DEFAULT_ELEMENT_DATA } }),
  Summary: TextInputSummary,
  Editor: TextInputEditor,
  validate: (condition) => validateTextInput(readData(condition)),
};
