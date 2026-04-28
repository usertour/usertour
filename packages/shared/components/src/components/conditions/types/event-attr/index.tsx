import { EventTrackerIcon } from '@usertour-packages/icons';
import { useListAttributeOnEventsQuery } from '@usertour-packages/shared-hooks';
import {
  type Attribute,
  AttributeBizTypes,
  AttributeDataType,
  type RulesCondition,
} from '@usertour/types';
import { useMemo } from 'react';
import { useConditionsContext, useConditionsT } from '../../conditions-context';
import { ListInput } from '../../primitives/list-input';
import { OperatorSelect } from '../../primitives/operator-select';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateEventAttr } from '../../validators';
import { ConditionCombobox, type ConditionComboboxItem } from '../../ui/condition-combobox';
import { ConditionInput } from '../../ui/condition-input';
import {
  DATE_PICKER_OPERATORS,
  VALUELESS_OPERATORS,
  operatorsFor,
} from '../user-attr/operator-mappings';

export interface EventAttrData {
  eventId?: string;
  attrId?: string;
  logic?: string;
  value?: string;
  value2?: string;
  listValues?: string[];
}

const readData = (condition: RulesCondition): EventAttrData =>
  (condition.data as EventAttrData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<EventAttrData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

// ---------- Summary ----------

function EventAttrSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const { attributes } = useConditionsContext();
  const data = readData(condition);
  const attribute = attributes?.find(
    (a) => a.id === data.attrId && a.bizType === AttributeBizTypes.Event,
  );

  if (!attribute) {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <EventTrackerIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{t('conditions.types.eventAttr.placeholder')}</span>
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

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <EventTrackerIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">
        <span className="font-semibold">{attribute.displayName || attribute.codeName}</span>{' '}
        <span className="text-muted-foreground">{operatorLabel}</span>
        {valueText && (
          <>
            {' '}
            <span className="font-semibold">{valueText}</span>
          </>
        )}
        {data.logic === 'between' && (
          <>
            {' '}
            <span className="text-muted-foreground">{t('conditions.operators.and')}</span>{' '}
            <span className="font-semibold">{data.value2}</span>
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

function EventAttrEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const { attributes } = useConditionsContext();
  const data = readData(condition);

  // Restrict the picker to attributes that are bound to this specific event
  // (mirrors v1 behavior — event-attribute conditions live inside an event's
  // `where` group and so know their parent eventId).
  const { attributeOnEvents } = useListAttributeOnEventsQuery(data.eventId);
  const eventAttributes = useMemo<Attribute[]>(() => {
    if (!attributes) return [];
    if (!attributeOnEvents) {
      return attributes.filter((a) => a.bizType === AttributeBizTypes.Event);
    }
    const ids = new Set(attributeOnEvents.map((aoe) => aoe.attributeId));
    return attributes.filter((a) => ids.has(a.id) && a.bizType === AttributeBizTypes.Event);
  }, [attributes, attributeOnEvents]);

  const attribute = eventAttributes.find((a) => a.id === data.attrId);

  const operatorOptions = useMemo(
    () =>
      operatorsFor(attribute?.dataType).map((o) => ({
        value: o.value,
        label: t(o.labelKey),
      })),
    [attribute?.dataType, t],
  );

  const items = useMemo<ConditionComboboxItem[]>(
    () =>
      eventAttributes.map((a) => ({
        value: a.id,
        label: a.displayName || a.codeName,
        hint: a.codeName,
      })),
    [eventAttributes],
  );

  const handleAttrChange = (attrId: string) => {
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
        onChange={handleAttrChange}
        items={items}
        placeholder={t('conditions.types.eventAttr.selectPlaceholder')}
        searchPlaceholder={t('conditions.types.eventAttr.searchPlaceholder')}
        emptyText={t('conditions.types.eventAttr.empty')}
      />
      {attribute && (
        <OperatorSelect
          value={data.logic}
          onChange={(logic) => onChange(writeData(condition, { logic, value: '', value2: '' }))}
          options={operatorOptions}
          placeholder={t('conditions.types.userAttr.operatorPlaceholder')}
        />
      )}
      {showValueInput && (
        <ConditionInput
          type={inputType}
          value={data.value ?? ''}
          onChange={(e) => onChange(writeData(condition, { value: e.target.value }))}
          placeholder={t('conditions.types.userAttr.valuePlaceholder')}
        />
      )}
      {showValueInput && showBetween && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{t('conditions.operators.and')}</span>
          <ConditionInput
            type={inputType}
            value={data.value2 ?? ''}
            onChange={(e) => onChange(writeData(condition, { value2: e.target.value }))}
          />
        </div>
      )}
      {showListInput && (
        <ListInput
          values={data.listValues ?? []}
          onChange={(listValues) =>
            onChange(writeData(condition, { listValues: listValues.filter(Boolean) }))
          }
          placeholder={t('conditions.types.userAttr.valuePlaceholder')}
        />
      )}
      {showDatePicker && (
        <ConditionInput
          type="date"
          value={data.value ?? ''}
          onChange={(e) => onChange(writeData(condition, { value: e.target.value }))}
        />
      )}
    </div>
  );
}

// ---------- Schema ----------

export const eventAttrSchema: ConditionTypeSchema<EventAttrData> = {
  type: 'event-attr',
  labelKey: 'conditions.types.eventAttr.label',
  Icon: EventTrackerIcon,
  defaultData: () => ({}),
  Summary: EventAttrSummary,
  Editor: EventAttrEditor,
  validate: (condition, ctx) => validateEventAttr(readData(condition), ctx.attributes),
};
