import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-packages/constants';
import { PagesIcon } from '@usertour-packages/icons';
import { getNavitateError } from '@usertour/helpers';
import { Tabs, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Descendant } from 'slate';
import { PopperEditorMini, serializeMini } from '../richtext-editor/editor';
import { useActionsGroupContext } from '../contexts/actions-group-context';
import { useContentActionsContext } from '../contexts/content-actions-context';
import {
  ContentActionsError,
  ContentActionsErrorAnchor,
  ContentActionsErrorContent,
} from './actions-error';
import {
  ContentActionsPopover,
  ContentActionsPopoverContent,
  ContentActionsPopoverTrigger,
} from './actions-popper';
import { ContentActionsRemove } from './actions-remove';
import { ActionsConditionRightContent, ContentActionsConditionIcon } from './actions-template';
import { useAutoOpenPopover } from './use-auto-open-popover';

export interface ContentActionsNavigateProps {
  index: number;
  type: string;
  data?: {
    openType: string;
    value: Descendant[];
  };
  conditionId?: string;
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'https://' }],
  },
];

// Custom hook for navigation error handling
const useNavigationErrorHandling = (
  openType: string,
  value: Descendant[],
  open: boolean,
  index: number,
) => {
  const { updateConditionData } = useActionsGroupContext();
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  // Memoize serialized value to avoid unnecessary recalculations
  const serializedValue = useMemo(() => value.map((v) => serializeMini(v)).join(''), [value]);

  useEffect(() => {
    const { showError, errorInfo } = getNavitateError({
      openType,
      value: serializedValue,
    });
    if (showError && !open) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    }
  }, [openType, serializedValue, open]);

  const handleOnOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setOpenError(false);
        setErrorInfo('');
        return;
      }

      const { showError, errorInfo } = getNavitateError({
        openType,
        value: serializedValue,
      });
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }
      const updates = {
        openType,
        value,
      };
      updateConditionData(index, updates);
    },
    [openType, value, serializedValue, index, updateConditionData],
  );

  return { openError, errorInfo, handleOnOpenChange };
};

// Memoized editor component for better performance
const NavigationEditor = ({
  value,
  onValueChange,
  zIndex,
  attributes,
}: {
  value: Descendant[];
  onValueChange: (value: Descendant[]) => void;
  zIndex: number;
  attributes: any;
}) => {
  return (
    <PopperEditorMini
      zIndex={zIndex + EDITOR_RICH_ACTION_CONTENT + 1}
      attributes={attributes}
      onValueChange={onValueChange}
      initialValue={value}
    />
  );
};

// Memoized tabs component
const NavigationTabs = ({
  openType,
  onOpenTypeChange,
}: {
  openType: string;
  onOpenTypeChange: (value: string) => void;
}) => {
  return (
    <Tabs className="w-full" defaultValue={openType} onValueChange={onOpenTypeChange}>
      <TabsList className="h-auto w-full">
        <TabsTrigger
          value="same"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground w-1/2"
        >
          Same tab
        </TabsTrigger>
        <TabsTrigger
          value="new"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground w-1/2"
        >
          New tab
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

// Memoized display text component
const NavigationDisplayText = ({ value }: { value: Descendant[] }) => {
  const displayText = useMemo(() => {
    const serializedValue = value.map((v) => serializeMini(v)).join('');
    if (!serializedValue.trim() || serializedValue.trim() === 'https://') {
      return 'Navigate to URL...';
    }

    // Truncate long URL for display
    const maxLength = 50;
    const trimmedValue = serializedValue.trim();
    return trimmedValue.length > maxLength
      ? `Navigate to ${trimmedValue.substring(0, maxLength)}...`
      : `Navigate to ${trimmedValue}`;
  }, [value]);

  return (
    <span className="break-words" style={{ wordBreak: 'break-word' }}>
      {displayText}
    </span>
  );
};

export const ContentActionsNavigate = (props: ContentActionsNavigateProps) => {
  const { data, index, conditionId } = props;
  const { attributes, zIndex } = useContentActionsContext();

  // Initialize state with memoized initial values
  const initialValueMemo = useMemo(() => data?.value || initialValue, [data?.value]);
  const initialOpenType = useMemo(() => data?.openType || 'same', [data?.openType]);

  const [value, setValue] = useState(initialValueMemo);
  const [openType, setOpenType] = useState(initialOpenType);
  const [open, setOpen] = useAutoOpenPopover(conditionId);

  // Handle error state
  const { openError, errorInfo, handleOnOpenChange } = useNavigationErrorHandling(
    openType,
    value,
    open,
    index,
  );

  const handleValueChange = useCallback((newValue: Descendant[]) => {
    setValue(newValue);
  }, []);

  const handleOpenTypeChange = useCallback((newOpenType: string) => {
    setOpenType(newOpenType);
  }, []);

  const handleOpenChangeWrapper = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      handleOnOpenChange(isOpen);
    },
    [handleOnOpenChange],
  );

  // Memoize trigger content
  const triggerContent = useMemo(
    () => (
      <ContentActionsPopoverTrigger className="flex flex-row items-center w-fit">
        <ContentActionsConditionIcon>
          <PagesIcon width={16} height={16} />
        </ContentActionsConditionIcon>
        <NavigationDisplayText value={value} />
      </ContentActionsPopoverTrigger>
    ),
    [value],
  );

  // Memoize popover content
  const popoverContent = useMemo(
    () => (
      <div className="flex flex-col space-y-2">
        <div className="flex flex-col space-y-1">
          <div>URL to navigate to</div>
          <NavigationEditor
            value={value}
            onValueChange={handleValueChange}
            zIndex={zIndex}
            attributes={attributes}
          />
        </div>
        <NavigationTabs openType={openType} onOpenTypeChange={handleOpenTypeChange} />
      </div>
    ),
    [value, handleValueChange, zIndex, attributes, openType, handleOpenTypeChange],
  );

  return (
    <ContentActionsError open={openError}>
      <div className="flex flex-row space-x-3">
        <ContentActionsErrorAnchor>
          <ActionsConditionRightContent>
            <ContentActionsPopover onOpenChange={handleOpenChangeWrapper} open={open}>
              {triggerContent}
              <ContentActionsPopoverContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}>
                {popoverContent}
              </ContentActionsPopoverContent>
            </ContentActionsPopover>
            <ContentActionsRemove index={index} />
          </ActionsConditionRightContent>
        </ContentActionsErrorAnchor>
        <ContentActionsErrorContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 3 }}>
          {errorInfo}
        </ContentActionsErrorContent>
      </div>
    </ContentActionsError>
  );
};

ContentActionsNavigate.displayName = 'ContentActionsNavigate';
