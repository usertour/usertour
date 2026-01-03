import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { PlusIcon, TaskClickedIcon } from '@usertour-packages/icons';
import {
  ContentIcon,
  ElementIcon,
  GroupIcon,
  PagesIcon,
  SegmentIcon,
  TextFillIcon,
  TextInputIcon,
  TimeIcon,
  UserIcon,
} from '@usertour-packages/icons';
import { RulesCondition, RulesType } from '@usertour/types';
import { cuid, deepClone } from '@usertour/helpers';
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRulesContext, useRulesZIndex } from './rules-context';
import { RulesGroupContext } from '../contexts/rules-group-context';
import { RulesContent } from './rules-content';
import { RulesCurrentTime } from './rules-current-time';
import { RulesElement } from './rules-element';
import { RulesLogic } from './rules-logic';
import { RulesRemove } from './rules-remove';
import { RulesSegment } from './rules-segment';
import { RulesTextInput } from './rules-text-input';
import { RulesUrlPattern } from './rules-url-pattern';
import { RulesUserAttribute } from './rules-user-attribute';
import { RulesUserFills } from './rules-user-fills';
import { RulesTaskIsClicked } from './task-clicked';
import isEqual from 'fast-deep-equal';

export const RULES_ITEMS = [
  {
    type: RulesType.USER_ATTR,
    text: 'Attribute',
    IconElement: UserIcon,
    RulesElement: RulesUserAttribute,
  },
  {
    type: RulesType.CURRENT_PAGE,
    text: 'Current page(Url)',
    IconElement: PagesIcon,
    RulesElement: RulesUrlPattern,
  },
  // {
  //   type: "event",
  //   text: "Event",
  //   IconElement: EventIcon,
  //   RulesElement: null,
  // },
  {
    type: RulesType.SEGMENT,
    text: 'Segment',
    IconElement: SegmentIcon,
    RulesElement: RulesSegment,
  },
  {
    type: RulesType.CONTENT,
    text: 'Flow/Checklist',
    IconElement: ContentIcon,
    RulesElement: RulesContent,
  },
  {
    type: RulesType.TASK_IS_CLICKED,
    text: 'Task is clicked',
    IconElement: TaskClickedIcon,
    RulesElement: RulesTaskIsClicked,
  },
  {
    type: RulesType.ELEMENT,
    text: 'Element (present, clicked, disabled)',
    IconElement: ElementIcon,
    RulesElement: RulesElement,
  },
  {
    type: RulesType.TEXT_INPUT,
    text: 'Text input value',
    IconElement: TextInputIcon,
    RulesElement: RulesTextInput,
  },
  {
    type: RulesType.TEXT_FILL,
    text: 'User fills in input',
    IconElement: TextFillIcon,
    RulesElement: RulesUserFills,
  },
  {
    type: RulesType.TIME,
    text: 'Current time',
    IconElement: TimeIcon,
    RulesElement: RulesCurrentTime,
  },
  {
    type: RulesType.GROUP,
    text: 'Logic group (and, or)',
    IconElement: GroupIcon,
    RulesElement: null,
  },
];

interface RulesAddDropdownProps {
  children: ReactNode;
  onSelect: (type: string) => void;
  items: typeof RULES_ITEMS;
  disabled?: boolean;
}

const RulesAddDropdown = (props: RulesAddDropdownProps) => {
  const { children, onSelect, items, disabled = false } = props;
  const { dropdown: zIndex } = useRulesZIndex();

  // Store pending selection, will be executed after dropdown closes
  const pendingSelectionRef = useRef<string | null>(null);

  // Handle dropdown open state change
  // When dropdown closes and we have a pending selection, execute it
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

  // Handle item selection - store selection but don't execute yet
  const handleItemSelect = useCallback((type: string) => {
    pendingSelectionRef.current = type;
  }, []);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        style={{ zIndex }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {items?.map(({ type, text, IconElement }, index) => (
          <DropdownMenuItem
            key={index}
            className="cursor-pointer min-w-[180px]"
            onSelect={() => handleItemSelect(type)}
          >
            <IconElement width={16} height={16} className="mx-1" />
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export type RulesGroupItemProps = {
  index: number;
};

interface RulesGroupProps {
  isSubItems?: boolean;
  defaultConditions: RulesCondition[];
  onChange?: (conditions: RulesCondition[]) => void;
}
export const RulesGroup = (props: RulesGroupProps) => {
  const { isSubItems = false, onChange, defaultConditions } = props;
  const { isHorizontal, filterItems, addButtonText, disabled } = useRulesContext();

  const [conditions, setConditions] = useState<RulesCondition[]>(deepClone(defaultConditions));
  const [rulesItems, _] = useState<typeof RULES_ITEMS>(
    RULES_ITEMS.filter((item) => {
      if (filterItems.length > 0) {
        return filterItems.includes(item.type);
      }
      return true;
    }),
  );

  const [conditionType, setConditionType] = useState(
    (defaultConditions.length > 0 && defaultConditions[0].operators
      ? defaultConditions[0].operators
      : 'and') ?? 'and',
  );

  // Use ref to store newlyAddedId to avoid being affected by external state updates
  const newlyAddedIdRef = useRef<string | null>(null);

  const setNewConditions = (newConditions: RulesCondition[]) => {
    setConditions((prev) => {
      if (isEqual(prev, newConditions)) {
        return prev;
      }
      return newConditions;
    });
  };

  const handleOnSelect = useCallback(
    (type: string) => {
      const newId = cuid();
      if (type === 'group') {
        setNewConditions([...conditions, { type, data: {}, conditions: [], id: newId }]);
      } else {
        newlyAddedIdRef.current = newId;
        setNewConditions([...conditions, { type, data: {}, operators: conditionType, id: newId }]);
      }
    },
    [conditionType, conditions],
  );

  const handleOnChange = useCallback((index: number, conds: RulesCondition[]) => {
    setConditions((prev) => {
      const newConds = prev.map((condition, i) => {
        if (i === index) {
          return {
            ...condition,
            conditions: [...conds],
          };
        }
        return condition;
      });
      if (isEqual(prev, newConds)) {
        return prev;
      }
      return newConds;
    });
  }, []);

  useEffect(() => {
    setNewConditions(
      conditions.map((cond) => ({
        ...cond,
        operators: conditionType,
      })),
    );
  }, [conditionType]);

  // Track if it's the initial render to skip calling onChange on mount
  const isInitialRenderRef = useRef(true);

  // Call onChange when conditions change, but skip initial render
  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }
    if (onChange) {
      onChange(conditions);
    }
  }, [conditions, onChange]);

  const updateConditionData = useCallback(
    (index: number, data: any) => {
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
      setNewConditions(newConds);
    },
    [conditionType, conditions],
  );

  const value = {
    conditionType,
    setConditionType,
    conditions,
    setNewConditions,
    updateConditionData,
    newlyAddedIdRef,
  };

  return (
    <RulesGroupContext.Provider value={value}>
      <div
        className={
          isHorizontal ? 'flex flex-wrap gap-2 items-start w-full' : 'flex flex-col space-y-2'
        }
      >
        {conditions.map((condition, i) => {
          const ITEM = rulesItems.find((item) => condition.type === item.type);

          return (
            <React.Fragment key={condition.id}>
              {isHorizontal ? (
                <>
                  <RulesLogic index={i} disabled={disabled} />
                  {condition.type === 'group' && condition.conditions ? (
                    <div className="p-2 pr-6 border border-input border-dashed rounded-md w-fit relative">
                      <RulesGroup
                        isSubItems={true}
                        defaultConditions={condition.conditions}
                        onChange={(conditions: RulesCondition[]) => {
                          handleOnChange(i, conditions);
                        }}
                      />
                      <RulesRemove index={i} />
                    </div>
                  ) : ITEM?.RulesElement ? (
                    <ITEM.RulesElement
                      index={i}
                      data={condition.data}
                      type={ITEM.type}
                      conditionId={condition.id}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {condition.type === 'group' && condition.conditions ? (
                    <div className="flex flex-col space-y-2">
                      <RulesLogic index={i} disabled={disabled} />
                      <div className="p-2 pr-6 border border-input border-dashed rounded-md w-fit relative">
                        <RulesGroup
                          isSubItems={true}
                          defaultConditions={condition.conditions}
                          onChange={(conditions: RulesCondition[]) => {
                            handleOnChange(i, conditions);
                          }}
                        />
                        <RulesRemove index={i} />
                      </div>
                    </div>
                  ) : ITEM?.RulesElement ? (
                    <div className="flex flex-row space-x-3">
                      <RulesLogic index={i} disabled={disabled} />
                      <ITEM.RulesElement
                        index={i}
                        data={condition.data}
                        type={ITEM.type}
                        conditionId={condition.id}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </React.Fragment>
          );
        })}
        <div className="flex flex-row space-x-3">
          <RulesLogic index={conditions.length} disabled={conditions.length > 0 || disabled} />
          <RulesAddDropdown
            onSelect={handleOnSelect}
            disabled={disabled}
            items={
              isSubItems
                ? rulesItems.filter(
                    (item) => item.type !== RulesType.GROUP && item.type !== RulesType.WAIT,
                  )
                : rulesItems
            }
          >
            <Button variant="ghost" className="text-primary">
              <PlusIcon width={16} height={16} />
              {addButtonText}
            </Button>
          </RulesAddDropdown>
        </div>
      </div>
    </RulesGroupContext.Provider>
  );
};

RulesGroup.displayName = 'RulesGroup';
