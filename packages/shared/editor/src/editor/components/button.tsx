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
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { RulesCondition } from '@usertour-ui/types';
import { useCallback, useEffect, useState } from 'react';
import { ContentActions } from '../..';
import { EditorError, EditorErrorAnchor, EditorErrorContent } from '../../components/editor-error';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorButtonElement,
  ContentEditorElementInsertDirection,
} from '../../types/editor';

const marginKeyMapping = {
  left: 'marginLeft',
  top: 'marginTop',
  bottom: 'marginBottom',
  right: 'marginRight',
};
const transformsStyle = (element: ContentEditorButtonElement) => {
  const _style: any = {};
  if (element.margin) {
    for (const k in marginKeyMapping) {
      const key = k as keyof typeof marginKeyMapping;
      const marginName = marginKeyMapping[key];
      if (element.margin[key]) {
        if (element.margin.enabled) {
          _style[marginName] = `${element.margin[key]}px`;
        } else {
          _style[marginName] = null;
        }
      }
    }
  }
  return _style;
};

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

  const handleDelete = () => {
    deleteElementInColumn(path);
  };
  const handleAddLeft = () => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.LEFT);
  };
  const handleAddRight = () => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.RIGHT);
  };

  const handleButtonStyleChange = (type: string) => {
    updateElement({ ...element, data: { ...element.data, type } }, id);
  };

  const handleButtonTextChange = useCallback(
    (e: any) => {
      const value = e.target.value;
      updateElement({ ...element, data: { ...element.data, text: value } }, id);
    },
    [element, path],
  );

  const handleMarginValueChange = (e: any, position: string) => {
    const value = e.target.value;
    const margin = { ...element.margin, [position]: value };
    updateElement({ ...element, margin } as any, id);
  };

  const handleMarginCheckedChange = (enabled: boolean) => {
    updateElement({ ...element, margin: { top: 0, left: 0, bottom: 0, right: 0, enabled } }, id);
  };

  const handleActionChange = (actions: RulesCondition[]) => {
    updateElement({ ...element, data: { ...element.data, actions } }, id);
  };

  useEffect(() => {
    const isEmptyActions = !element?.data?.actions || element?.data?.actions.length === 0;
    setIsShowError(isEmptyActions);
  }, [element?.data?.actions]);

  return (
    <EditorError open={isShowError}>
      <EditorErrorAnchor>
        <Popover.Root modal={true} onOpenChange={setIsOpen} open={isOpen}>
          <Popover.Trigger asChild>
            <Button
              forSdk={true}
              variant={element.data.type as any}
              contentEditable={false}
              className="h-fit"
              style={{ ...transformsStyle(element) }}
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
                  type="button-text"
                  className="bg-background"
                  id="button-text"
                  value={element.data.text}
                  placeholder="Enter button text"
                  onChange={handleButtonTextChange}
                />
                <Label>Button style</Label>
                <Select onValueChange={handleButtonStyleChange} defaultValue={element.data.type}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a distribute" />
                  </SelectTrigger>
                  <SelectPortal style={{ zIndex: zIndex + EDITOR_SELECT }}>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="default">Primary</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                        {/* <SelectItem value="destructive">Destructive</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem> */}
                      </SelectGroup>
                    </SelectContent>
                  </SelectPortal>
                </Select>
                <div className="flex gap-x-2">
                  <Checkbox
                    id="margin"
                    checked={element.margin?.enabled}
                    onCheckedChange={handleMarginCheckedChange}
                  />
                  <Label htmlFor="margin">Margin</Label>
                </div>
                {element.margin?.enabled && (
                  <div className="flex gap-x-2">
                    <div className="flex flex-col justify-center">
                      <Input
                        value={element.margin?.left}
                        placeholder="Left"
                        onChange={(e) => {
                          handleMarginValueChange(e, 'left');
                        }}
                        className="bg-background flex-none w-20"
                      />
                    </div>
                    <div className="flex flex-col justify-center gap-y-2">
                      <Input
                        value={element.margin?.top}
                        onChange={(e) => {
                          handleMarginValueChange(e, 'top');
                        }}
                        placeholder="Top"
                        className="bg-background flex-none w-20"
                      />
                      <Input
                        value={element.margin?.bottom}
                        onChange={(e) => {
                          handleMarginValueChange(e, 'bottom');
                        }}
                        placeholder="Bottom"
                        className="bg-background flex-none w-20"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <Input
                        value={element.margin?.right}
                        placeholder="Right"
                        onChange={(e) => {
                          handleMarginValueChange(e, 'right');
                        }}
                        className="bg-background flex-none w-20"
                      />
                    </div>
                  </div>
                )}

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
                  // segments={segmentList || []}
                  contents={contentList}
                  createStep={createStep}
                />
                <div className="flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="flex-none hover:bg-red-200"
                          variant="ghost"
                          size="icon"
                          onClick={handleDelete}
                        >
                          <DeleteIcon className="fill-red-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Delete button</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="grow" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="flex-none"
                          variant="ghost"
                          size="icon"
                          onClick={handleAddLeft}
                        >
                          <InsertColumnLeftIcon className="fill-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Insert button to the left</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex-none mx-1 leading-10">Insert button</div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="flex-none"
                          variant="ghost"
                          size="icon"
                          onClick={handleAddRight}
                        >
                          <InsertColumnRightIcon className="fill-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Insert button to the right</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              {/* <Popover.Arrow className="fill-slate-900" /> */}
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

export type ContentEditorButtonSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorButtonElement;
  onClick?: (element: ContentEditorButtonElement) => void;
};

export const ContentEditorButtonSerialize = (props: ContentEditorButtonSerializeType) => {
  const { element, onClick } = props;

  const handleOnClick = () => {
    if (onClick) {
      onClick(element);
    }
  };
  return (
    <>
      <Button
        variant={element.data?.type as any}
        forSdk={true}
        onClick={handleOnClick}
        className="h-fit"
        style={{ ...transformsStyle(element) }}
      >
        <span>{element.data?.text}</span>
      </Button>
    </>
  );
};

ContentEditorButtonSerialize.displayName = 'ContentEditorButtonSerialize';
