import { CodeIcon, Link2Icon, OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { EDITOR_RICH_ACTION } from '@usertour-packages/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { ArrowRightIcon, CloseCircleIcon, PlusIcon } from '@usertour-packages/icons';
import { hasActionError } from '@usertour-packages/utils';
import { ContentActionsItemType, RulesCondition } from '@usertour-packages/types';
import { ReactNode, useCallback, useEffect } from 'react';
import { useState } from 'react';
import { ActionsGroupContext } from '../contexts/actions-group-context';
import { useContentActionsContext } from '../contexts/content-actions-context';
import { ContentActionsCode } from './actions-code';
import { ContentActionsContents } from './actions-content';
import { ContentActionsDismiss } from './actions-dismis';
import { ContentActionsNavigate } from './actions-navigate';
import { ContentActionsStep } from './actions-step';

const contentActionsItem = [
  {
    type: ContentActionsItemType.STEP_GOTO,
    text: 'Go to step',
    IconElement: ArrowRightIcon,
    RulesElement: ContentActionsStep,
  },
  {
    type: ContentActionsItemType.FLOW_DISMIS,
    text: 'Dismiss flow',
    IconElement: CloseCircleIcon,
    RulesElement: ContentActionsDismiss,
  },
  {
    type: ContentActionsItemType.LAUNCHER_DISMIS,
    text: 'Dismiss launcher',
    IconElement: CloseCircleIcon,
    RulesElement: ContentActionsDismiss,
  },
  {
    type: ContentActionsItemType.CHECKLIST_DISMIS,
    text: 'Dismiss checklist',
    IconElement: CloseCircleIcon,
    RulesElement: ContentActionsDismiss,
  },
  {
    type: ContentActionsItemType.FLOW_START,
    text: 'Start new flow/checklist',
    IconElement: OpenInNewWindowIcon,
    RulesElement: ContentActionsContents,
  },
  {
    type: ContentActionsItemType.PAGE_NAVIGATE,
    text: 'Navigate to page',
    IconElement: Link2Icon,
    RulesElement: ContentActionsNavigate,
  },
  // {
  //   type: "user-attribute-set",
  //   text: "Set user attribute",
  //   IconElement: UserProfile,
  //   RulesElement: RulesSegment,
  // },
  {
    type: ContentActionsItemType.JAVASCRIPT_EVALUATE,
    text: 'Evaluate JavaScript',
    IconElement: CodeIcon,
    RulesElement: ContentActionsCode,
  },
];

interface ContentActionsAddDropdownProps {
  children: ReactNode;
  onSelect: (type: string) => void;
  items: typeof contentActionsItem;
  zIndex: number;
}

const ContentActionsAddDropdown = (props: ContentActionsAddDropdownProps) => {
  const { children, onSelect, items, zIndex } = props;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" style={{ zIndex: zIndex }}>
        {items.map(({ type, text, IconElement }, index) => (
          <DropdownMenuItem
            key={index}
            className="cursor-pointer min-w-[180px]"
            onSelect={() => {
              onSelect(type);
            }}
          >
            <IconElement width={16} height={16} className="mx-1" />
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export type ContentActionsGroupItemProps = {
  index: number;
};

export const ContentActionsGroup = () => {
  const {
    filterItems,
    addButtonText,
    onDataChange,
    defaultConditions,
    zIndex = 1000,
  } = useContentActionsContext();

  const [conditions, setConditions] = useState<RulesCondition[]>(defaultConditions);
  const [rulesItems, _] = useState<typeof contentActionsItem>(
    contentActionsItem.filter((item) => {
      if (filterItems && filterItems.length > 0) {
        return filterItems.includes(item.type);
      }
      return (
        item.type !== ContentActionsItemType.LAUNCHER_DISMIS &&
        item.type !== ContentActionsItemType.CHECKLIST_DISMIS
      );
    }),
  );

  const [dropdownItems, setDropdownItems] = useState<typeof contentActionsItem>(rulesItems);

  useEffect(() => {
    const newItems = rulesItems
      .filter((item) => {
        if (conditions.find((cond) => cond.type === ContentActionsItemType.STEP_GOTO)) {
          return (
            item.type !== ContentActionsItemType.FLOW_DISMIS &&
            item.type !== ContentActionsItemType.FLOW_START
          );
        }
        if (
          conditions.find(
            (cond) =>
              cond.type === ContentActionsItemType.FLOW_DISMIS ||
              cond.type === ContentActionsItemType.FLOW_START,
          )
        ) {
          return item.type !== ContentActionsItemType.STEP_GOTO;
        }
        return true;
      })
      .filter((item) => {
        if (item.type !== ContentActionsItemType.JAVASCRIPT_EVALUATE) {
          return !conditions.find((condition) => condition.type === item.type);
        }
        return true;
      });
    setDropdownItems(newItems);
  }, [conditions, rulesItems]);

  const [conditionType, setConditionType] = useState(
    (defaultConditions.length > 0 && defaultConditions[0].operators
      ? defaultConditions[0].operators
      : 'and') ?? 'and',
  );

  const setNewConditions = (newConditions: RulesCondition[]) => {
    const isHasError = hasActionError(newConditions);
    setConditions(newConditions);
    if (onDataChange) {
      onDataChange(newConditions, isHasError);
    }
  };

  const handleOnSelect = useCallback(
    (type: string) => {
      if (type === 'group') {
        setNewConditions([...conditions, { type, data: {}, conditions: [] }]);
      } else {
        setNewConditions([...conditions, { type, data: {}, operators: conditionType }]);
      }
    },
    [conditionType, conditions],
  );

  useEffect(() => {
    setNewConditions(
      conditions.map((cond) => ({
        ...cond,
        operators: conditionType,
      })),
    );
  }, [conditionType]);

  const updateConditionData = useCallback(
    (index: number, data: any) => {
      const newConds = conditions.map((condition, i) => {
        if (i === index) {
          if (data) {
            condition.data = data;
          }
          condition.operators = conditionType;
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
  };

  return (
    <ActionsGroupContext.Provider value={value}>
      <div className={'flex flex-col space-y-1'}>
        {conditions.map((condition, i) => {
          const rulesItem = rulesItems.find((item) => condition.type === item.type);
          if (rulesItem?.RulesElement) {
            if (
              rulesItem.type === ContentActionsItemType.LAUNCHER_DISMIS ||
              rulesItem.type === ContentActionsItemType.CHECKLIST_DISMIS
            ) {
              return (
                <rulesItem.RulesElement
                  key={i}
                  index={i}
                  data={condition.data}
                  type={rulesItem.type}
                  text={rulesItem.text}
                />
              );
            }
            return (
              <rulesItem.RulesElement
                key={i}
                index={i}
                data={condition.data}
                type={rulesItem.type}
              />
            );
          }
          return null;
        })}
        <div className="flex flex-row space-x-3">
          <ContentActionsAddDropdown
            onSelect={handleOnSelect}
            zIndex={zIndex + EDITOR_RICH_ACTION}
            items={dropdownItems}
          >
            <div className="h-8 text-primary items-center flex flex-row justify-center rounded-md text-sm font-medium cursor-pointer">
              <PlusIcon width={16} height={16} />
              {addButtonText}
            </div>
          </ContentActionsAddDropdown>
        </div>
      </div>
    </ActionsGroupContext.Provider>
  );
};

ContentActionsGroup.displayName = 'ContentActionsGroup';
