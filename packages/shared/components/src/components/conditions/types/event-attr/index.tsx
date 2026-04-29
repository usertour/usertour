import { EventTrackerIcon } from '@usertour-packages/icons';
import { useListAttributeOnEventsQuery } from '@usertour-packages/shared-hooks';
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
import { validateEventAttr } from '../../validators';
import { ConditionCombobox, type ConditionComboboxItem } from '../../ui/condition-combobox';
import { ConditionInput } from '../../ui/condition-input';
import {
  DATE_PICKER_OPERATORS,
  VALUELESS_OPERATORS,
  operatorsFor,
  splitOperatorTemplate,
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
  const summaryTextClass = useSummaryTextClass();
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

  const template = valueText ? splitOperatorTemplate(operatorLabel) : null;

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <EventTrackerIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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

  // Restrict the picker to attributes bound to this event. Until the
  // attributes-on-event query returns, surface an empty list rather than
  // falling back to every Event-bizType attribute — otherwise the user
  // could pick an attrId from a different event during the loading window
  // and the runtime would then filter on a field that doesn't exist on
  // this event, silently dropping the match. Mirrors v1 areEventAttributesReady.
  const { attributeOnEvents, loading } = useListAttributeOnEventsQuery(data.eventId);
  const eventAttributes = useMemo<Attribute[]>(() => {
    if (!attributes) return [];
    // No parent event yet — surface every Event-bizType attribute (this
    // case shouldn't normally happen because EventWhereSection injects
    // the parent eventId on add).
    if (!data.eventId) {
      return attributes.filter((a) => a.bizType === AttributeBizTypes.Event);
    }
    // Query in flight or hasn't returned — wait. Empty `items` makes the
    // combobox show its emptyText placeholder instead of letting the user
    // pick an unrelated attribute.
    if (loading || !Array.isArray(attributeOnEvents)) return [];
    const ids = new Set(attributeOnEvents.map((aoe) => aoe.attributeId));
    return attributes.filter((a) => ids.has(a.id) && a.bizType === AttributeBizTypes.Event);
  }, [attributes, attributeOnEvents, data.eventId, loading]);

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
