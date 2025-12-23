import { javascript } from '@codemirror/lang-javascript';
import { CodeIcon } from '@radix-ui/react-icons';
import CodeMirror from '@uiw/react-codemirror';
import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-packages/constants';
import { getCodeError } from '@usertour/helpers';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

export interface ContentActionsCodeProps {
  index: number;
  type: string;
  data?: {
    openType: string;
    value: string;
  };
  conditionId?: string;
}

// Custom hook for code error handling
const useCodeErrorHandling = (value: string, open: boolean, index: number) => {
  const { updateConditionData } = useActionsGroupContext();
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  useEffect(() => {
    const updates = { value };
    const { showError, errorInfo } = getCodeError(updates);
    if (showError && !open) {
      setErrorInfo(errorInfo);
      setOpenError(true);
      return;
    }
  }, [open, value]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setOpenError(false);
        setErrorInfo('');
        return;
      }

      const updates = { value };
      const { showError, errorInfo } = getCodeError(updates);

      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }
      updateConditionData(index, updates);
    },
    [value, index, updateConditionData, setErrorInfo, setOpenError],
  );

  return { openError, errorInfo, handleOpenChange };
};

// Memoized CodeMirror component for better performance
const CodeEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const extensions = useMemo(() => [javascript({ jsx: false, typescript: false })], []);

  return (
    <CodeMirror
      value={value}
      height="200px"
      basicSetup={{ lineNumbers: false }}
      extensions={extensions}
      onChange={onChange}
    />
  );
};

// Memoized display text component
const CodeDisplayText = ({ value }: { value: string }) => {
  const displayText = useMemo(() => {
    if (!value.trim()) {
      return 'Evaluate code...';
    }

    // Truncate long code for display
    const maxLength = 50;
    const trimmedValue = value.trim();
    return trimmedValue.length > maxLength
      ? `Evaluate ${trimmedValue.substring(0, maxLength)}...`
      : `Evaluate ${trimmedValue}`;
  }, [value]);

  return (
    <span className="break-words" style={{ wordBreak: 'break-word' }}>
      {displayText}
    </span>
  );
};

export const ContentActionsCode = (props: ContentActionsCodeProps) => {
  const { data, index, conditionId } = props;
  const { zIndex } = useContentActionsContext();

  // Initialize state with memoized initial value
  const initialValue = useMemo(() => data?.value || '', [data?.value]);
  const [open, setOpen] = useAutoOpenPopover(conditionId);
  const [value, setValue] = useState(initialValue);

  // Handle error state
  const { openError, errorInfo, handleOpenChange } = useCodeErrorHandling(value, open, index);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const handleOpenChangeWrapper = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      handleOpenChange(isOpen);
    },
    [handleOpenChange],
  );

  // Memoize trigger content
  const triggerContent = useMemo(
    () => (
      <ContentActionsPopoverTrigger className="flex flex-row items-center w-fit">
        <ContentActionsConditionIcon>
          <CodeIcon width={16} height={16} />
        </ContentActionsConditionIcon>
        <CodeDisplayText value={value} />
      </ContentActionsPopoverTrigger>
    ),
    [value],
  );

  return (
    <ContentActionsError open={openError}>
      <div className="flex flex-row space-x-3">
        <ContentActionsErrorAnchor>
          <ActionsConditionRightContent className="w-fit pr-5">
            <ContentActionsPopover onOpenChange={handleOpenChangeWrapper} open={open}>
              {triggerContent}
              <ContentActionsPopoverContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}>
                <CodeEditor value={value} onChange={handleChange} />
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

ContentActionsCode.displayName = 'ContentActionsCode';
