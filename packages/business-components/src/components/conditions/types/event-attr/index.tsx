import { EventTrackerIcon } from '@usertour/icons';
import { useListAttributeOnEventsQuery } from '@usertour/hooks';
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
  useConditionsZIndex,
  useSummaryTextClass,
} from '../../conditions-context';
import { ListInput } from '../../primitives/list-input';
import { OperatorSelect } from '../../primitives/operator-select';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateEventAttr } from '../../validators';
import { format } from 'date-fns';
import { DateTimePicker, Input } from '@usertour/ui';
import { ConditionCombobox, type ConditionComboboxItem } from '../../ui/condition-combobox';
import { useEventScope } from '../event/event-scope-context';
import {
  DATE_PICKER_OPERATORS,
  VALUELESS_OPERATORS,
  operatorsFor,
  splitOperatorTemplate,
} from '../user-attr/operator-mappings';

export interface EventAttrData {
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
  const eventId = useEventScope();
  const data = readData(condition);
  // Stay aligned with the editor: only resolve the attribute name when it's
  // actually bound to the parent event. If it isn't (stale data, attribute
  // unbound after creation, etc.) we render the placeholder so the chip
  // matches what the editor's combobox sees — instead of the chip claiming
  // an attribute the editor can't even surface.
  const { attributeOnEvents, loading } = useListAttributeOnEventsQuery(eventId);
  const attribute = useMemo<Attribute | undefined>(() => {
    if (!attributes || !data.attrId) return undefined;
    if (!eventId) {
      return attributes.find((a) => a.id === data.attrId && a.bizType === AttributeBizTypes.Event);
    }
    if (loading || !Array.isArray(attributeOnEvents)) return undefined;
    const ids = new Set(attributeOnEvents.map((aoe) => aoe.attributeId));
    return attributes.find(
      (a) => a.id === data.attrId && a.bizType === AttributeBizTypes.Event && ids.has(a.id),
    );
  }, [attributes, attributeOnEvents, data.attrId, eventId, loading]);

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
  const operatorLabel = operator ? t(operator.summaryLabelKey ?? operator.labelKey) : '';

  // Date attributes are stored as ISO `yyyy-MM-dd`; reformat to the
  // Apple-style label the picker trigger uses so chip and picker read
  // alike. See user-attr/index.tsx for the same formatStored helper.
  const formatStored = (raw: string): string => {
    if (!raw) return '';
    if (attribute.dataType !== AttributeDataType.DateTime) return raw;
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? raw : format(parsed, 'MMM d, yyyy');
  };

  // Valueless operators clear the value role — see user-attr/index.tsx.
  const isValueless = VALUELESS_OPERATORS.has(operator?.value ?? '');

  let valueText = '';
  if (!isValueless && attribute.dataType === AttributeDataType.List && data.listValues?.length) {
    valueText = data.listValues.join(', ');
  } else if (!isValueless && attribute.dataType !== AttributeDataType.Boolean) {
    valueText = formatStored(data.value ?? '');
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
            <span className="font-semibold">{formatStored(data.value2 ?? '')}</span>
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
  const { popover: popoverZIndex } = useConditionsZIndex();
  const eventId = useEventScope();
  const data = readData(condition);

  // Restrict the picker to attributes bound to the parent event. Until the
  // attributes-on-event query returns, surface an empty list rather than
  // falling back to every Event-bizType attribute — otherwise the user
  // could pick an attrId from a different event during the loading window
  // and the runtime would then filter on a field that doesn't exist on
  // this event, silently dropping the match. Mirrors v1 areEventAttributesReady.
  const { attributeOnEvents, loading } = useListAttributeOnEventsQuery(eventId);
  const eventAttributes = useMemo<Attribute[]>(() => {
    if (!attributes) return [];
    // No parent event scope — defensive fallback. event-attr is always
    // rendered inside an event editor's where section, so EventScopeContext
    // is normally populated; this branch only covers the (unsupported) case
    // of rendering event-attr standalone.
    if (!eventId) {
      return attributes.filter((a) => a.bizType === AttributeBizTypes.Event);
    }
    // Query in flight or hasn't returned — wait. Empty `items` makes the
    // combobox show its emptyText placeholder instead of letting the user
    // pick an unrelated attribute.
    if (loading || !Array.isArray(attributeOnEvents)) return [];
    const ids = new Set(attributeOnEvents.map((aoe) => aoe.attributeId));
    return attributes.filter((a) => ids.has(a.id) && a.bizType === AttributeBizTypes.Event);
  }, [attributes, attributeOnEvents, eventId, loading]);

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
      {showValueInput &&
        (showBetween ? (
          // Range endpoints share one row — see user-attr/index.tsx for the
          // reasoning; this mirrors the same layout for event-attr's
          // numeric-range case.
          <div className="flex items-center gap-2">
            <Input
              variant="compact"
              type={inputType}
              value={data.value ?? ''}
              onChange={(e) => onChange(writeData(condition, { value: e.target.value }))}
              placeholder={t('conditions.types.userAttr.valuePlaceholder')}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">{t('conditions.operators.and')}</span>
            <Input
              variant="compact"
              type={inputType}
              value={data.value2 ?? ''}
              onChange={(e) => onChange(writeData(condition, { value2: e.target.value }))}
              className="flex-1"
            />
          </div>
        ) : (
          <Input
            variant="compact"
            type={inputType}
            value={data.value ?? ''}
            onChange={(e) => onChange(writeData(condition, { value: e.target.value }))}
            placeholder={t('conditions.types.userAttr.valuePlaceholder')}
          />
        ))}
      {showListInput && (
        // Keep trailing empty rows so "Add value" works — see user-attr
        // for the rationale. Empties are stripped by schema.normalize on
        // popover close.
        <ListInput
          values={data.listValues ?? []}
          onChange={(listValues) => onChange(writeData(condition, { listValues }))}
          placeholder={t('conditions.types.userAttr.valuePlaceholder')}
        />
      )}
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={data.value ? new Date(`${data.value}T00:00:00`) : undefined}
          onChange={(d) =>
            onChange(writeData(condition, { value: d ? format(d, 'yyyy-MM-dd') : '' }))
          }
          zIndex={popoverZIndex}
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
  // Strip in-flight empty list rows on close — same pattern as user-attr.
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
  validate: (condition, ctx) => validateEventAttr(readData(condition), ctx.attributes),
};
