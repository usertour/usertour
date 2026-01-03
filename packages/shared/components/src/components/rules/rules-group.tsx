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
import React, { ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// Memoized dropdown component to prevent unnecessary re-renders
const RulesAddDropdown = memo(
  ({ children, onSelect, items, disabled = false }: RulesAddDropdownProps) => {
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
          {items?.map(({ type, text, IconElement }) => (
            <DropdownMenuItem
              key={type}
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
  },
);

RulesAddDropdown.displayName = 'RulesAddDropdown';

export type RulesGroupItemProps = {
  index: number;
};

// Props for the extracted RulesGroupItem component
interface RulesConditionItemProps {
  condition: RulesCondition;
  index: number;
  isHorizontal: boolean;
  disabled?: boolean;
  rulesItems: typeof RULES_ITEMS;
  onSubGroupChange: (index: number, conditions: RulesCondition[]) => void;
}

// Extracted component to avoid inline functions in map loop
const RulesConditionItem = memo(
  ({
    condition,
    index,
    isHorizontal,
    disabled,
    rulesItems,
    onSubGroupChange,
  }: RulesConditionItemProps) => {
    const ITEM = rulesItems.find((item) => condition.type === item.type);
    const isGroup = condition.type === RulesType.GROUP && condition.conditions;

    // Memoize the onChange handler to prevent unnecessary re-renders
    const handleSubGroupChange = useCallback(
      (conditions: RulesCondition[]) => {
        onSubGroupChange(index, conditions);
      },
      [index, onSubGroupChange],
    );

    // Render group content (shared between horizontal and vertical layouts)
    const renderGroupContent = () => (
      <div className="p-2 pr-6 border border-input border-dashed rounded-md w-fit relative">
        <RulesGroup
          isSubItems={true}
          defaultConditions={condition.conditions ?? []}
          onChange={handleSubGroupChange}
        />
        <RulesRemove index={index} />
      </div>
    );

    // Render rules element content
    const renderRulesElement = () =>
      ITEM?.RulesElement ? (
        <ITEM.RulesElement
          index={index}
          data={condition.data}
          type={ITEM.type}
          conditionId={condition.id}
        />
      ) : null;

    if (isHorizontal) {
      return (
        <>
          <RulesLogic index={index} disabled={disabled} />
          {isGroup ? renderGroupContent() : renderRulesElement()}
        </>
      );
    }

    // Vertical layout
    if (isGroup) {
      return (
        <div className="flex flex-col space-y-2">
          <RulesLogic index={index} disabled={disabled} />
          {renderGroupContent()}
        </div>
      );
    }

    return ITEM?.RulesElement ? (
      <div className="flex flex-row space-x-3">
        <RulesLogic index={index} disabled={disabled} />
        {renderRulesElement()}
      </div>
    ) : null;
  },
);

RulesConditionItem.displayName = 'RulesConditionItem';

interface RulesGroupProps {
  isSubItems?: boolean;
  defaultConditions: RulesCondition[];
  onChange?: (conditions: RulesCondition[]) => void;
}
export const RulesGroup = (props: RulesGroupProps) => {
  const { isSubItems = false, onChange, defaultConditions } = props;
  const { isHorizontal, filterItems, addButtonText, disabled } = useRulesContext();

  const [conditions, setConditions] = useState<RulesCondition[]>(deepClone(defaultConditions));

  // Use useMemo instead of useState for derived computed value
  const rulesItems = useMemo(
    () =>
      RULES_ITEMS.filter((item) => {
        if (filterItems.length > 0) {
          return filterItems.includes(item.type);
        }
        return true;
      }),
    [filterItems],
  );

  const [conditionType, setConditionType] = useState(
    (defaultConditions.length > 0 && defaultConditions[0].operators
      ? defaultConditions[0].operators
      : 'and') ?? 'and',
  );

  // Use ref to store newlyAddedId to avoid being affected by external state updates
  const newlyAddedIdRef = useRef<string | null>(null);

  // Memoize setNewConditions to maintain stable reference in context
  const setNewConditions = useCallback((newConditions: RulesCondition[]) => {
    setConditions((prev) => {
      if (isEqual(prev, newConditions)) {
        return prev;
      }
      return newConditions;
    });
  }, []);

  const handleOnSelect = useCallback(
    (type: string) => {
      const newId = cuid();
      if (type === RulesType.GROUP) {
        setConditions((prev) => [...prev, { type, data: {}, conditions: [], id: newId }]);
      } else {
        newlyAddedIdRef.current = newId;
        // Use functional update to avoid depending on conditions
        setConditions((prev) => [...prev, { type, data: {}, operators: conditionType, id: newId }]);
      }
    },
    [conditionType],
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
    (index: number, data: Record<string, unknown>) => {
      // Use functional update to avoid depending on conditions
      setConditions((prev) => {
        const newConds = prev.map((condition, i) => {
          if (i === index) {
            return {
              ...condition,
              ...(data && { data }),
              operators: conditionType,
            };
          }
          return condition;
        });
        if (isEqual(prev, newConds)) {
          return prev;
        }
        return newConds;
      });
    },
    [conditionType],
  );

  // Memoize context value to prevent unnecessary re-renders of consumers
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
      <div
        className={
          isHorizontal ? 'flex flex-wrap gap-2 items-start w-full' : 'flex flex-col space-y-2'
        }
      >
        {conditions.map((condition, i) => (
          <React.Fragment key={condition.id}>
            <RulesConditionItem
              condition={condition}
              index={i}
              isHorizontal={isHorizontal}
              disabled={disabled}
              rulesItems={rulesItems}
              onSubGroupChange={handleOnChange}
            />
          </React.Fragment>
        ))}
        <div className="flex flex-row space-x-3">
          <RulesLogic index={conditions.length} disabled={conditions.length > 0 || disabled} />
          <RulesAddDropdown
            onSelect={handleOnSelect}
            disabled={disabled}
            items={
              isSubItems ? rulesItems.filter((item) => item.type !== RulesType.GROUP) : rulesItems
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
