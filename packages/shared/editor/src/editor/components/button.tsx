import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { Checkbox } from '@usertour-ui/checkbox';
import { EDITOR_SELECT } from '@usertour-ui/constants';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { RulesCondition } from '@usertour-ui/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContentActions } from '../..';
import { EditorError, EditorErrorAnchor, EditorErrorContent } from '../../components/editor-error';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorButtonElement,
  ContentEditorElementInsertDirection,
} from '../../types/editor';

// Constants
const MARGIN_KEY_MAPPING = {
  left: 'marginLeft',
  top: 'marginTop',
  bottom: 'marginBottom',
  right: 'marginRight',
} as const;

const BUTTON_STYLES = {
  DEFAULT: 'default',
  SECONDARY: 'secondary',
} as const;

const MARGIN_POSITIONS = ['left', 'top', 'bottom', 'right'] as const;

// Types
type MarginPosition = keyof typeof MARGIN_KEY_MAPPING;

interface ButtonStyleProps {
  marginLeft?: string;
  marginTop?: string;
  marginBottom?: string;
  marginRight?: string;
}

// Utility functions
const transformsStyle = (element: ContentEditorButtonElement): ButtonStyleProps => {
  const style: ButtonStyleProps = {};

  // Handle margins
  if (element.margin) {
    for (const position of MARGIN_POSITIONS) {
      const marginName = MARGIN_KEY_MAPPING[position];
      if (element.margin?.[position]) {
        style[marginName] = element.margin.enabled ? `${element.margin[position]}px` : undefined;
      }
    }
  }

  return style;
};

// Margin controls component
const MarginControls = ({
  element,
  onMarginChange,
  onMarginEnabledChange,
}: {
  element: ContentEditorButtonElement;
  onMarginChange: (position: MarginPosition, value: string) => void;
  onMarginEnabledChange: (enabled: boolean) => void;
}) => (
  <>
    <div className="flex gap-x-2">
      <Checkbox
        id="margin"
        checked={element.margin?.enabled}
        onCheckedChange={onMarginEnabledChange}
      />
      <Label htmlFor="margin">Margin</Label>
    </div>
    {element.margin?.enabled && (
      <div className="flex gap-x-2">
        <div className="flex flex-col justify-center">
          <Input
            value={element.margin?.left}
            placeholder="Left"
            onChange={(e) => onMarginChange('left', e.target.value)}
            className="bg-background flex-none w-20"
          />
        </div>
        <div className="flex flex-col justify-center gap-y-2">
          <Input
            value={element.margin?.top}
            onChange={(e) => onMarginChange('top', e.target.value)}
            placeholder="Top"
            className="bg-background flex-none w-20"
          />
          <Input
            value={element.margin?.bottom}
            onChange={(e) => onMarginChange('bottom', e.target.value)}
            placeholder="Bottom"
            className="bg-background flex-none w-20"
          />
        </div>
        <div className="flex flex-col justify-center">
          <Input
            value={element.margin?.right}
            placeholder="Right"
            onChange={(e) => onMarginChange('right', e.target.value)}
            className="bg-background flex-none w-20"
          />
        </div>
      </div>
    )}
  </>
);

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="flex-none hover:bg-red-200"
            variant="ghost"
            size="icon"
            onClick={onDelete}
          >
            <DeleteIcon className="fill-red-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Delete button</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <div className="grow" />
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="flex-none" variant="ghost" size="icon" onClick={onAddLeft}>
            <InsertColumnLeftIcon className="fill-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Insert button to the left</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <div className="flex-none mx-1 leading-10">Insert button</div>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="flex-none" variant="ghost" size="icon" onClick={onAddRight}>
            <InsertColumnRightIcon className="fill-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Insert button to the right</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      const margin = { ...element.margin, [position]: value };
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
        <Popover.Root onOpenChange={setIsOpen} open={isOpen}>
          <Popover.Trigger asChild>
            <Button
              forSdk={true}
              variant={element.data.type as any}
              contentEditable={false}
              className="h-fit"
              style={buttonStyle}
            >
              <span>{element.data.text}</span>
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none"
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
                <Select onValueChange={handleButtonStyleChange} value={element.data.type}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a distribute" />
                  </SelectTrigger>
                  <SelectContent style={{ zIndex: zIndex + EDITOR_SELECT }}>
                    <SelectGroup>
                      <SelectItem value={BUTTON_STYLES.DEFAULT}>Primary</SelectItem>
                      <SelectItem value={BUTTON_STYLES.SECONDARY}>Secondary</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <MarginControls
                  element={element}
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
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
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
    <Button
      variant={element.data?.type as any}
      forSdk={true}
      onClick={handleOnClick}
      className="h-fit"
      style={buttonStyle}
      disabled={loading}
    >
      <span>{element.data?.text}</span>
    </Button>
  );
};

ContentEditorButtonSerialize.displayName = 'ContentEditorButtonSerialize';
