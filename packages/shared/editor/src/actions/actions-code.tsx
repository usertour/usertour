import { javascript } from '@codemirror/lang-javascript';
import { CodeIcon } from '@radix-ui/react-icons';
import CodeMirror from '@uiw/react-codemirror';
import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-ui/constants';
import { getCodeError } from '@usertour-ui/shared-utils';
import { useEffect, useState } from 'react';
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

export interface ContentActionsCodeProps {
  index: number;
  type: string;
  data?: {
    openType: string;
    value: string;
  };
}

export const ContentActionsCode = (props: ContentActionsCodeProps) => {
  const { data, index } = props;
  const { updateConditionData } = useActionsGroupContext();
  const { zIndex } = useContentActionsContext();

  const [state, setState] = useState({
    open: false,
    openError: false,
    errorInfo: '',
    value: data?.value || '',
  });

  useEffect(() => {
    if (state.open) return;

    const updates = { value: state.value };
    const { showError, errorInfo } = getCodeError(updates);

    setState((prev) => ({
      ...prev,
      openError: showError,
      errorInfo,
    }));

    updateConditionData(index, updates);
  }, [state.open, state.value, index, updateConditionData]);

  const handleOpenChange = (open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  };

  const handleChange = (newValue: string) => {
    setState((prev) => ({ ...prev, value: newValue }));
  };

  return (
    <ContentActionsError open={state.openError}>
      <div className="flex flex-row space-x-3">
        <ContentActionsErrorAnchor>
          <ActionsConditionRightContent className="w-fit pr-5">
            <ContentActionsPopover onOpenChange={handleOpenChange} open={state.open}>
              <ContentActionsPopoverTrigger className="flex flex-row items-center w-fit">
                <ContentActionsConditionIcon>
                  <CodeIcon width={16} height={16} />
                </ContentActionsConditionIcon>
                <span className="break-words" style={{ wordBreak: 'break-word' }}>
                  {' '}
                  Evaluate {state.value}
                </span>
              </ContentActionsPopoverTrigger>
              <ContentActionsPopoverContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}>
                <CodeMirror
                  value={state.value}
                  height="200px"
                  basicSetup={{ lineNumbers: false }}
                  extensions={[javascript({ jsx: false, typescript: false })]}
                  onChange={handleChange}
                />
              </ContentActionsPopoverContent>
            </ContentActionsPopover>
            <ContentActionsRemove index={index} />
          </ActionsConditionRightContent>
        </ContentActionsErrorAnchor>
        <ContentActionsErrorContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 3 }}>
          {state.errorInfo}
        </ContentActionsErrorContent>
      </div>
    </ContentActionsError>
  );
};

ContentActionsCode.displayName = 'ContentActionsCode';
