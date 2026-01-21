import { ComboBox, ComboBoxOption } from '@usertour-packages/combo-box';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import * as Widget from '@usertour-packages/widget';
import { RulesCondition } from '@usertour/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ContentActions } from '../..';
import {
  EditorError,
  EditorErrorAnchor,
  EditorErrorContent,
} from '../../richtext-editor/editor-error';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorButtonElement,
  ContentEditorElementInsertDirection,
} from '../../types/editor';
import { BUTTON_STYLES } from '../constants';
import { MarginControls, TooltipActionButton } from '../shared';
import type { MarginPosition, MarginStyleProps } from '../types';
import { transformMarginStyle } from '../utils';

// ComboBox options
const BUTTON_STYLE_OPTIONS: ComboBoxOption[] = [
  { value: BUTTON_STYLES.DEFAULT, name: 'Primary' },
  { value: BUTTON_STYLES.SECONDARY, name: 'Secondary' },
];

// Utility function for transforming element to style
const transformsStyle = (element: ContentEditorButtonElement): MarginStyleProps => {
  return transformMarginStyle(element.margin);
};

// Action buttons component
const ActionButtons = ({
  onDelete,
  onAddLeft,
  onAddRight,
}: {
  onDelete: () => void;
  onAddLeft: () => void;
  onAddRight: () => void;
}) => (
  <div className="flex items-center">
    <TooltipActionButton
      tooltip="Delete button"
      icon={<DeleteIcon className="fill-destructive" />}
      onClick={onDelete}
      destructive
    />
    <div className="grow" />
    <TooltipActionButton
      tooltip="Insert button to the left"
      icon={<InsertColumnLeftIcon className="fill-foreground" />}
      onClick={onAddLeft}
    />
    <div className="flex-none mx-1 leading-10">Insert button</div>
    <TooltipActionButton
      tooltip="Insert button to the right"
      icon={<InsertColumnRightIcon className="fill-foreground" />}
      onClick={onAddRight}
    />
  </div>
);

// Main editable button component
export interface ContentEditorButtonProps {
  element: ContentEditorButtonElement;
  id: string;
  path: number[];
}

export const ContentEditorButton = (props: ContentEditorButtonProps) => {
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
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="button-text">Button text</Label>
              <Input
                type="text"
                className="bg-background"
                id="button-text"
                value={element.data.text}
                placeholder="Enter button text"
                onChange={handleButtonTextChange}
              />

              <Label>Button style</Label>
              <ComboBox
                options={BUTTON_STYLE_OPTIONS}
                value={element.data.type}
                onValueChange={handleButtonStyleChange}
                placeholder="Select a style"
                contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
              />

              <MarginControls
                margin={element.margin}
                onMarginChange={handleMarginValueChange}
                onMarginEnabledChange={handleMarginCheckedChange}
              />

              <Label>When button is clicked</Label>
              <ContentActions
                zIndex={zIndex}
                isShowIf={false}
                isShowLogic={false}
                currentStep={currentStep}
                currentVersion={currentVersion}
                onDataChange={handleActionChange}
                defaultConditions={element?.data?.actions || []}
                attributes={attributes}
                filterItems={actionItems}
                contents={contentList}
                createStep={createStep}
              />

              <ActionButtons
                onDelete={handleDelete}
                onAddLeft={handleAddLeft}
                onAddRight={handleAddRight}
              />
            </div>
          </PopoverContent>
        </Popover>
      </EditorErrorAnchor>
      <EditorErrorContent style={{ zIndex: zIndex }}>
        please select at least one action
      </EditorErrorContent>
    </EditorError>
  );
};

ContentEditorButton.displayName = 'ContentEditorButton';

// Read-only serialized component for SDK
export type ContentEditorButtonSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorButtonElement;
  onClick?: (element: ContentEditorButtonElement) => Promise<void>;
};

export const ContentEditorButtonSerialize = (props: ContentEditorButtonSerializeType) => {
  const { element, onClick } = props;

  const [loading, setLoading] = useState(false);

  const handleOnClick = useCallback(async () => {
    if (onClick) {
      setLoading(true);
      try {
        await onClick(element);
      } finally {
        setLoading(false);
      }
    }
  }, [onClick, element]);

  const buttonStyle = useMemo(() => transformsStyle(element), [element.margin]);

  return (
    <Widget.Button
      variant={element.data?.type as any}
      onClick={handleOnClick}
      className="h-fit"
      style={buttonStyle}
      disabled={loading}
    >
      <span>{element.data?.text}</span>
    </Widget.Button>
  );
};

ContentEditorButtonSerialize.displayName = 'ContentEditorButtonSerialize';
