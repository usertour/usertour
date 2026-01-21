// Main editable button component

import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import * as Widget from '@usertour-packages/widget';
import { RulesCondition } from '@usertour/types';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import {
  EditorError,
  EditorErrorAnchor,
  EditorErrorContent,
} from '../../../richtext-editor/editor-error';
import { useContentEditorContext } from '../../../contexts/content-editor-context';
import {
  ContentEditorButtonElement,
  ContentEditorElementInsertDirection,
} from '../../../types/editor';
import type { MarginPosition, MarginStyleProps } from '../../types';
import { transformMarginStyle } from '../../utils';
import { ButtonPopoverContent } from './button-popover-content';

// Utility function for transforming element to style
const transformsStyle = (element: ContentEditorButtonElement): MarginStyleProps => {
  return transformMarginStyle(element.margin);
};

export interface ContentEditorButtonProps {
  element: ContentEditorButtonElement;
  id: string;
  path: number[];
}

export const ContentEditorButton = memo((props: ContentEditorButtonProps) => {
  const { element, path, id } = props;
  const {
    zIndex,
    insertElementInColumn,
    deleteElementInColumn,
    updateElement,
    currentVersion,
    contentList,
    attributes,
    currentStep,
    createStep,
    actionItems,
  } = useContentEditorContext();
  const [isShowError, setIsShowError] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean | undefined>();

  // Memoized style calculation
  const buttonStyle = useMemo(() => transformsStyle(element), [element.margin]);

  // Event handlers
  const handleDelete = useCallback(() => {
    deleteElementInColumn(path);
  }, [deleteElementInColumn, path]);

  const handleAddLeft = useCallback(() => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.LEFT);
  }, [insertElementInColumn, element, path]);

  const handleAddRight = useCallback(() => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.RIGHT);
  }, [insertElementInColumn, element, path]);

  const handleButtonStyleChange = useCallback(
    (type: string) => {
      updateElement({ ...element, data: { ...element.data, type } }, id);
    },
    [element, id, updateElement],
  );

  const handleButtonTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      updateElement({ ...element, data: { ...element.data, text: value } }, id);
    },
    [element, id, updateElement],
  );

  const handleMarginValueChange = useCallback(
    (position: MarginPosition, value: string) => {
      const numericValue = value === '' ? 0 : Number(value);
      const margin = { ...element.margin, [position]: numericValue };
      updateElement({ ...element, margin } as any, id);
    },
    [element, id, updateElement],
  );

  const handleMarginCheckedChange = useCallback(
    (enabled: boolean) => {
      updateElement(
        {
          ...element,
          margin: {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            enabled,
          },
        },
        id,
      );
    },
    [element, id, updateElement],
  );

  const handleActionChange = useCallback(
    (actions: RulesCondition[]) => {
      updateElement({ ...element, data: { ...element.data, actions } }, id);
    },
    [element, id, updateElement],
  );

  // Error state effect
  useEffect(() => {
    const isEmptyActions = !element?.data?.actions || element?.data?.actions.length === 0;
    setIsShowError(isEmptyActions && !isOpen);
  }, [element?.data?.actions, isOpen]);

  return (
    <EditorError open={isShowError}>
      <EditorErrorAnchor>
        <Popover onOpenChange={setIsOpen} open={isOpen}>
          <PopoverTrigger asChild>
            <Widget.Button
              variant={element.data.type as any}
              contentEditable={false}
              className="h-fit"
              style={buttonStyle}
            >
              <span>{element.data.text}</span>
            </Widget.Button>
          </PopoverTrigger>
          <PopoverContent
            className="bg-background"
            side="right"
            style={{ zIndex: zIndex }}
            sideOffset={10}
            alignOffset={-2}
          >
            <ButtonPopoverContent
              element={element}
              zIndex={zIndex}
              onButtonTextChange={handleButtonTextChange}
              onButtonStyleChange={handleButtonStyleChange}
              onMarginChange={handleMarginValueChange}
              onMarginEnabledChange={handleMarginCheckedChange}
              onActionChange={handleActionChange}
              onDelete={handleDelete}
              onAddLeft={handleAddLeft}
              onAddRight={handleAddRight}
              currentStep={currentStep}
              currentVersion={currentVersion}
              attributes={attributes}
              actionItems={actionItems}
              contentList={contentList}
              createStep={createStep}
            />
          </PopoverContent>
        </Popover>
      </EditorErrorAnchor>
      <EditorErrorContent style={{ zIndex: zIndex }}>
        please select at least one action
      </EditorErrorContent>
    </EditorError>
  );
});

ContentEditorButton.displayName = 'ContentEditorButton';
