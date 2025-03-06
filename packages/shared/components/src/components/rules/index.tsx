import { hasError } from '@usertour-ui/shared-utils';
import { Attribute, Content, RulesCondition, Segment } from '@usertour-ui/types';
import { createContext, useContext } from 'react';
import { RulesGroup } from './rules-group';

interface RulesProps {
  onDataChange?: (conds: RulesCondition[], hasError: boolean) => void;
  defaultConditions: RulesCondition[];
  isHorizontal?: boolean;
  isShowIf?: boolean;
  filterItems?: string[];
  addButtonText?: string;
  attributes?: Attribute[] | undefined;
  segments?: Segment[] | undefined;
  contents?: Content[] | undefined;
  currentContent?: Content | undefined;
  saveBuildUrl?: () => boolean;
  token?: string;
  onElementChange?: (conditionIndex: number, type: string) => void;
  disabled?: boolean;
}

interface RulesContextValue {
  isHorizontal: boolean;
  isShowIf: boolean;
  filterItems: string[];
  addButtonText: string;
  attributes: Attribute[] | undefined;
  segments: Segment[] | undefined;
  contents: Content[];
  currentContent?: Content | undefined;
  saveBuildUrl?: () => boolean;
  onElementChange?: (conditionIndex: number, type: string) => void;
  token: string;
  disabled: boolean;
}

export const RulesContext = createContext<RulesContextValue | undefined>(undefined);

export function useRulesContext(): RulesContextValue {
  const context = useContext(RulesContext);
  if (!context) {
    throw new Error('useRulesContext must be used within a RulesProvider.');
  }
  return context;
}

export const defaultRulesItems: string[] = [
  'user-attr',
  'current-page',
  'event',
  'segment',
  'content',
  'element',
  'text-input',
  'text-fill',
  'time',
  'group',
];
export const Rules = (props: RulesProps) => {
  const {
    onDataChange,
    defaultConditions,
    isHorizontal = false,
    isShowIf = true,
    filterItems = [...defaultRulesItems],
    addButtonText = 'Add condition',
    attributes = [],
    segments = [],
    contents = [],
    currentContent,
    saveBuildUrl,
    token = '',
    onElementChange,
    disabled = false,
  } = props;

  const handleOnChange = (conds: RulesCondition[]) => {
    const isHasError = hasError(conds, attributes);
    if (onDataChange) {
      onDataChange(conds, isHasError);
    }
  };

  const value = {
    isHorizontal,
    isShowIf,
    filterItems,
    addButtonText,
    attributes,
    segments,
    contents,
    currentContent,
    saveBuildUrl,
    token,
    onElementChange,
    disabled,
  };

  return (
    <RulesContext.Provider value={value}>
      <RulesGroup defaultConditions={defaultConditions} onChange={handleOnChange} />
    </RulesContext.Provider>
  );
};

Rules.displayName = 'Rules';
