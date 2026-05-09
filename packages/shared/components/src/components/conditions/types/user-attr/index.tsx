import { UserIcon } from '@usertour-packages/icons';
import {
  type Attribute,
  AttributeBizTypes,
  AttributeDataType,
  type RulesCondition,
} from '@usertour/types';
import { useMemo } from 'react';
import {
  useConditionsContext,
  useConditionsT,
  useSummaryTextClass,
} from '../../conditions-context';
import { ListInput } from '../../primitives/list-input';
import { OperatorSelect } from '../../primitives/operator-select';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateUserAttr } from '../../validators';
import { format } from 'date-fns';
import { DateTimePicker } from '../../../date-time-picker';
import { ConditionCombobox, type ConditionComboboxItem } from '../../ui/condition-combobox';
import { Input } from '@usertour-packages/input';
import {
  DATE_PICKER_OPERATORS,
  VALUELESS_OPERATORS,
  operatorsFor,
  splitOperatorTemplate,
} from './operator-mappings';

export interface UserAttrData {
  attrId?: string;
  logic?: string;
  value?: string;
  value2?: string;
  listValues?: string[];
}

const readData = (condition: RulesCondition): UserAttrData =>
  (condition.data as UserAttrData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<UserAttrData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const findAttribute = (
  attributes: Attribute[] | undefined,
  attrId: string | undefined,
): Attribute | undefined => attributes?.find((a) => a.id === attrId);

// ---------- Summary (collapsed row) ----------

function UserAttrSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const summaryTextClass = useSummaryTextClass();
  const { attributes } = useConditionsContext();
  const data = readData(condition);
  const attribute = findAttribute(attributes, data.attrId);

  if (!attribute) {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <UserIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{t('conditions.types.userAttr.placeholder')}</span>
      </span>
    );
  }

  const operatorOptions = operatorsFor(attribute.dataType);
  const operator = operatorOptions.find((o) => o.value === data.logic) ?? operatorOptions[0];
  const operatorLabel = operator ? t(operator.labelKey) : '';

  // Date attributes are stored as ISO `yyyy-MM-dd` for portability but the
  // chip should read with the same Apple-style label the picker trigger
  // uses (`MMM d, yyyy`). Parse the stored ISO into a Date and reformat
  // for display only — does not touch the persisted value. Falls back to
  // the raw string if parsing fails (defensive: legacy data could carry
  // non-ISO strings).
  const formatStored = (raw: string): string => {
    if (!raw) return '';
    if (attribute.dataType !== AttributeDataType.DateTime) return raw;
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? raw : format(parsed, 'MMM d, yyyy');
  };

  // Valueless operators (`is empty` / `has any value`) make the value
  // irrelevant — the chip should read just "<attr> is empty", not still
  // show the leftover values the user typed before switching operators.
  // Gate both the List and the scalar branch on this check.
  const isValueless = VALUELESS_OPERATORS.has(operator?.value ?? '');

  let valueText = '';
  if (!isValueless && attribute.dataType === AttributeDataType.List && data.listValues?.length) {
    valueText = data.listValues.join(', ');
  } else if (!isValueless && attribute.dataType !== AttributeDataType.Boolean) {
    valueText = formatStored(data.value ?? '');
  }

  const between = data.logic === 'between' ? formatStored(data.value2 ?? '') : '';
  const template = valueText ? splitOperatorTemplate(operatorLabel) : null;

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        <span className="font-semibold">{attribute.displayName || attribute.codeName}</span>{' '}
        {template ? (
          <>
            <span className="text-muted-foreground">{template.prefix}</span>
            <span className="font-semibold">{valueText}</span>
            <span className="text-muted-foreground">{template.suffix}</span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">{operatorLabel}</span>
            {valueText && (
              <>
                {' '}
                <span className="font-semibold">{valueText}</span>
              </>
            )}
          </>
        )}
        {between && (
          <>
            {' '}
            <span className="text-muted-foreground">{t('conditions.operators.and')}</span>{' '}
            <span className="font-semibold">{between}</span>
          </>
        )}
      </span>
    </span>
  );
}

// ---------- Editor (popover content) ----------

interface EditorProps {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onClose: () => void;
}

const BIZ_GROUP_KEYS: { biz: number; headingKey: string }[] = [
  { biz: AttributeBizTypes.User, headingKey: 'conditions.types.userAttr.groups.user' },
  { biz: AttributeBizTypes.Company, headingKey: 'conditions.types.userAttr.groups.company' },
  { biz: AttributeBizTypes.Membership, headingKey: 'conditions.types.userAttr.groups.membership' },
];

function UserAttrEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const { attributes } = useConditionsContext();
  const data = readData(condition);
  const attribute = findAttribute(attributes, data.attrId);

  const operatorOptions = useMemo(() => {
    return operatorsFor(attribute?.dataType).map((entry) => ({
      value: entry.value,
      label: t(entry.labelKey),
    }));
  }, [attribute?.dataType, t]);

  const groups = useMemo(() => {
    if (!attributes) return undefined;
    const formatted = BIZ_GROUP_KEYS.map(({ biz, headingKey }) => ({
      heading: t(headingKey),
      items: attributes
        .filter((a) => a.bizType === biz)
        .map<ConditionComboboxItem>((a) => ({
          value: a.id,
          label: a.displayName || a.codeName,
          hint: a.codeName,
        })),
    })).filter((g) => g.items.length > 0);
    return formatted.length > 0 ? formatted : undefined;
  }, [attributes, t]);

  const allItems = useMemo<ConditionComboboxItem[]>(() => {
    return (attributes ?? []).map((a) => ({
      value: a.id,
      label: a.displayName || a.codeName,
      hint: a.codeName,
    }));
  }, [attributes]);

  const handleAttributeChange = (attrId: string) => {
    // Reset value-shaped fields when the attribute (and so the datatype)
    // changes — operator semantics differ across datatypes so old values
    // would be meaningless.
    onChange(
      writeData(condition, {
        attrId,
        logic: undefined,
        value: '',
        value2: '',
        listValues: undefined,
      }),
    );
  };

  const handleLogicChange = (logic: string) => {
    onChange(writeData(condition, { logic, value: '', value2: '' }));
  };

  const handleValueChange = (value: string) => {
    onChange(writeData(condition, { value }));
  };

  const handleValue2Change = (value2: string) => {
    onChange(writeData(condition, { value2 }));
  };

  // Keep trailing empty rows in state while editing — ListInput appends an
  // empty slot when the user clicks "Add value", and stripping empties on
  // every change would cancel that out (the new slot would land empty,
  // get filtered, ListInput re-renders the same single placeholder, and
  // the click looks dead). Empties are stripped on popover close via
  // schema.normalize, so persisted data still has no empties.
  const handleListChange = (listValues: string[]) => {
    onChange(writeData(condition, { listValues }));
  };

  const showValueInput =
    attribute &&
    !VALUELESS_OPERATORS.has(data.logic ?? '') &&
    attribute.dataType !== AttributeDataType.Boolean &&
    attribute.dataType !== AttributeDataType.List &&
    !(
      attribute.dataType === AttributeDataType.DateTime &&
      DATE_PICKER_OPERATORS.has(data.logic ?? '')
    );

  const showBetween = data.logic === 'between';
  const showListInput =
    attribute?.dataType === AttributeDataType.List && !VALUELESS_OPERATORS.has(data.logic ?? '');
  const showDatePicker =
    attribute?.dataType === AttributeDataType.DateTime &&
    DATE_PICKER_OPERATORS.has(data.logic ?? '');

  const inputType = attribute?.dataType === AttributeDataType.Number ? 'number' : 'text';

  return (
    <div className="flex flex-col gap-2">
      <ConditionCombobox
        value={data.attrId}
        onChange={handleAttributeChange}
        items={allItems}
        groups={groups}
        placeholder={t('conditions.types.userAttr.selectPlaceholder')}
        searchPlaceholder={t('conditions.types.userAttr.searchPlaceholder')}
        emptyText={t('conditions.types.userAttr.empty')}
      />

      {attribute && (
        <OperatorSelect
          value={data.logic}
          onChange={handleLogicChange}
          options={operatorOptions}
          placeholder={t('conditions.types.userAttr.operatorPlaceholder')}
        />
      )}

      {showValueInput &&
        (showBetween ? (
          // Range endpoints share one row with "and" between — visually
          // mirrors the natural reading "between 2 and 3" and matches v1's
          // RulesUserAttribute layout. flex-1 splits the row so each input
          // gets equal width without crowding the connector word.
          <div className="flex items-center gap-2">
            <Input
              variant="compact"
              type={inputType}
              value={data.value ?? ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={t('conditions.types.userAttr.valuePlaceholder')}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">{t('conditions.operators.and')}</span>
            <Input
              variant="compact"
              type={inputType}
              value={data.value2 ?? ''}
              onChange={(e) => handleValue2Change(e.target.value)}
              className="flex-1"
            />
          </div>
        ) : (
          <Input
            variant="compact"
            type={inputType}
            value={data.value ?? ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={t('conditions.types.userAttr.valuePlaceholder')}
          />
        ))}

      {showListInput && (
        <ListInput
          values={data.listValues ?? []}
          onChange={handleListChange}
          placeholder={t('conditions.types.userAttr.valuePlaceholder')}
        />
      )}

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={data.value ? new Date(`${data.value}T00:00:00`) : undefined}
          onChange={(d) => handleValueChange(d ? format(d, 'yyyy-MM-dd') : '')}
        />
      )}
    </div>
  );
}

// ---------- Schema ----------

export const userAttrSchema: ConditionTypeSchema<UserAttrData> = {
  type: 'user-attr',
  labelKey: 'conditions.types.userAttr.label',
  Icon: UserIcon,
  defaultData: () => ({}),
  Summary: UserAttrSummary,
  Editor: UserAttrEditor,
  // Strip in-flight empty list rows on close so persisted data is clean.
  // The editor keeps trailing empties in state to make the "Add value"
  // affordance work; this is the place to compact them.
  normalize: (condition) => {
    const data = readData(condition);
    if (!data.listValues || data.listValues.every((v) => v !== '')) {
      return condition;
    }
    return {
      ...condition,
      data: { ...data, listValues: data.listValues.filter((v) => v !== '') },
    };
  },
  validate: (condition, ctx) => validateUserAttr(readData(condition), ctx.attributes),
};
