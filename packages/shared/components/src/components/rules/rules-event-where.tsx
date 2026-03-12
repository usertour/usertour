import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { RiFlashlightFill, GroupIcon, PlusIcon } from '@usertour-packages/icons';
import { RulesCondition, RulesType } from '@usertour/types';
import { cuid } from '@usertour/helpers';
import { ReactNode } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useRulesZIndex } from './rules-context';
import { RulesGroupContext } from '../contexts/rules-group-context';
import { RulesEventAttribute } from './rules-event-attribute';
import { RulesLogic } from './rules-logic';
import { RulesRemove } from './rules-remove';
import isEqual from 'fast-deep-equal';

// ============================================================================
// Where Condition Item
// ============================================================================

interface WhereConditionItemProps {
  condition: RulesCondition;
  index: number;
  eventId: string;
  onSubGroupChange: (index: number, conditions: RulesCondition[]) => void;
}

const WhereConditionItem = memo(
  ({ condition, index, eventId, onSubGroupChange }: WhereConditionItemProps) => {
    const isGroup = condition.type === RulesType.GROUP && condition.conditions;

    const handleSubGroupChange = useCallback(
      (conditions: RulesCondition[]) => {
        onSubGroupChange(index, conditions);
      },
      [index, onSubGroupChange],
    );

    if (isGroup) {
      return (
        <div className="flex flex-col space-y-2">
          <RulesLogic index={index} disabled={false} />
          <div className="p-2 pr-6 border border-input border-dashed rounded-md w-fit relative">
            <RulesEventWhereGroup
              eventId={eventId}
              conditions={condition.conditions ?? []}
              onChange={handleSubGroupChange}
              isSubGroup={true}
            />
            <RulesRemove index={index} />
          </div>
        </div>
      );
    }

    if (condition.type === RulesType.EVENT_ATTR) {
      return (
        <div className="flex flex-row space-x-2">
          <RulesLogic index={index} disabled={false} />
          <RulesEventAttribute
            index={index}
            data={condition.data}
            type={condition.type}
            conditionId={condition.id}
            eventId={eventId}
          />
        </div>
      );
    }

    return null;
  },
);

WhereConditionItem.displayName = 'WhereConditionItem';

// ============================================================================
// Where Add Dropdown
// ============================================================================

interface WhereAddDropdownProps {
  onSelect: (type: string) => void;
  isSubGroup?: boolean;
}

const WhereAddDropdown = memo(({ onSelect, isSubGroup = false }: WhereAddDropdownProps) => {
  const { dropdown: zIndex } = useRulesZIndex();
  const pendingSelectionRef = useRef<string | null>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && pendingSelectionRef.current !== null) {
        const type = pendingSelectionRef.current;
        pendingSelectionRef.current = null;
        onSelect(type);
      }
    },
    [onSelect],
  );

  const handleItemSelect = useCallback((type: string) => {
    pendingSelectionRef.current = type;
  }, []);

  const items: { type: string; text: string; icon: ReactNode }[] = useMemo(() => {
    const base = [
      {
        type: RulesType.EVENT_ATTR,
        text: 'Event attribute',
        icon: <RiFlashlightFill size={16} className="mx-1" />,
      },
    ];
    if (!isSubGroup) {
      base.push({
        type: RulesType.GROUP,
        text: 'Logic group (and, or)',
        icon: <GroupIcon width={16} height={16} className="mx-1" />,
      });
    }
    return base;
  }, [isSubGroup]);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-primary h-7 text-xs px-2">
          <PlusIcon width={14} height={14} />
          Add condition
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        style={{ zIndex }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {items.map(({ type, text, icon }) => (
          <DropdownMenuItem
            key={type}
            className="cursor-pointer min-w-[180px]"
            onSelect={() => handleItemSelect(type)}
          >
            {icon}
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

WhereAddDropdown.displayName = 'WhereAddDropdown';

// ============================================================================
// Main Where Group
// ============================================================================

interface RulesEventWhereGroupProps {
  eventId: string;
  conditions: RulesCondition[];
  onChange: (conditions: RulesCondition[]) => void;
  isSubGroup?: boolean;
}

export const RulesEventWhereGroup = ({
  eventId,
  conditions,
  onChange,
  isSubGroup = false,
}: RulesEventWhereGroupProps) => {
  const [conditionType, setConditionTypeRaw] = useState<'and' | 'or'>(
    conditions.length > 0 && conditions[0].operators ? conditions[0].operators : 'and',
  );

  const setConditionType = useCallback(
    (newType: 'and' | 'or') => {
      setConditionTypeRaw(newType);
      if (conditions.length > 0) {
        const updated = conditions.map((c) => ({ ...c, operators: newType }));
        onChange(updated);
      }
    },
    [conditions, onChange],
  );

  const newlyAddedIdRef = useRef<string | null>(null);

  const setNewConditions = useCallback(
    (newConditions: RulesCondition[]) => {
      onChange(newConditions);
    },
    [onChange],
  );

  const updateConditionData = useCallback(
    (index: number, data: Record<string, unknown>) => {
      const newConds = conditions.map((condition, i) => {
        if (i === index) {
          return {
            ...condition,
            ...(data && { data }),
            operators: conditionType,
          };
        }
        return condition;
      });
      if (!isEqual(conditions, newConds)) {
        onChange(newConds);
      }
    },
    [conditions, conditionType, onChange],
  );

  const handleOnSelect = useCallback(
    (type: string) => {
      const newId = cuid();
      newlyAddedIdRef.current = newId;
      if (type === RulesType.GROUP) {
        onChange([
          ...conditions,
          { type, data: {}, conditions: [], id: newId, operators: conditionType },
        ]);
      } else {
        onChange([...conditions, { type, data: { eventId }, operators: conditionType, id: newId }]);
      }
    },
    [conditions, conditionType, eventId, onChange],
  );

  const handleSubGroupChange = useCallback(
    (index: number, subConditions: RulesCondition[]) => {
      const newConds = conditions.map((condition, i) => {
        if (i === index) {
          return {
            ...condition,
            conditions: [...subConditions],
          };
        }
        return condition;
      });
      if (!isEqual(conditions, newConds)) {
        onChange(newConds);
      }
    },
    [conditions, onChange],
  );

  const contextValue = useMemo(
    () => ({
      conditionType,
      setConditionType,
      conditions,
      setNewConditions,
      updateConditionData,
      newlyAddedIdRef,
    }),
    [conditionType, conditions, setNewConditions, updateConditionData],
  );

  return (
    <RulesGroupContext.Provider value={contextValue}>
      <div className="flex flex-col space-y-2">
        {conditions.map((condition, i) => (
          <WhereConditionItem
            key={condition.id}
            condition={condition}
            index={i}
            eventId={eventId}
            onSubGroupChange={handleSubGroupChange}
          />
        ))}
        <div className="flex flex-row items-center gap-1">
          {!isSubGroup && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Where
            </span>
          )}
          <WhereAddDropdown onSelect={handleOnSelect} isSubGroup={isSubGroup} />
        </div>
      </div>
    </RulesGroupContext.Provider>
  );
};

RulesEventWhereGroup.displayName = 'RulesEventWhereGroup';
