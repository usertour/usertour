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

  let valueText = '';
  if (attribute.dataType === AttributeDataType.List && data.listValues?.length) {
    valueText = data.listValues.join(', ');
  } else if (
    !VALUELESS_OPERATORS.has(operator?.value ?? '') &&
    attribute.dataType !== AttributeDataType.Boolean
  ) {
    valueText = data.value ?? '';
  }

  const between = data.logic === 'between' ? (data.value2 ?? '') : '';
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

  const handleListChange = (listValues: string[]) => {
    onChange(writeData(condition, { listValues: listValues.filter((v) => v !== '') }));
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

      {showValueInput && (
        <Input
          variant="compact"
          type={inputType}
          value={data.value ?? ''}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={t('conditions.types.userAttr.valuePlaceholder')}
        />
      )}

      {showValueInput && showBetween && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{t('conditions.operators.and')}</span>
          <Input
            variant="compact"
            type={inputType}
            value={data.value2 ?? ''}
            onChange={(e) => handleValue2Change(e.target.value)}
          />
        </div>
      )}

      {showListInput && (
        <ListInput
          values={data.listValues ?? []}
          onChange={handleListChange}
          placeholder={t('conditions.types.userAttr.valuePlaceholder')}
        />
      )}

      {showDatePicker && (
        <Input
          variant="compact"
          type="date"
          value={data.value ?? ''}
          onChange={(e) => handleValueChange(e.target.value)}
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
  validate: (condition, ctx) => validateUserAttr(readData(condition), ctx.attributes),
};
