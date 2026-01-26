// Button popover content component

import { SelectPopover, SelectPopoverOption } from '@usertour-packages/shared-components';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import type { Attribute, Content, ContentVersion, Step } from '@usertour/types';
import { RulesCondition } from '@usertour/types';
import { memo } from 'react';

import { ContentActions } from '../../..';
import type { ContentEditorButtonElement } from '../../../types/editor';
import { BUTTON_STYLES } from '../../constants';
import { ActionButtonsBase, MarginControls } from '../../shared';
import type { MarginPosition } from '../../types';

// SelectPopover options
const BUTTON_STYLE_OPTIONS: SelectPopoverOption[] = [
  { value: BUTTON_STYLES.DEFAULT, name: 'Primary' },
  { value: BUTTON_STYLES.SECONDARY, name: 'Secondary' },
];

export interface ButtonPopoverContentProps {
  element: ContentEditorButtonElement;
  zIndex: number;
  onButtonTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onButtonStyleChange: (type: string) => void;
  onMarginChange: (position: MarginPosition, value: string) => void;
  onMarginEnabledChange: (enabled: boolean) => void;
  onActionChange: (actions: RulesCondition[]) => void;
  onDelete: () => void;
  onAddLeft: () => void;
  onAddRight: () => void;
  // ContentActions related props
  currentStep?: Step;
  currentVersion?: ContentVersion;
  attributes?: Attribute[];
  actionItems?: string[];
  contentList?: Content[];
  createStep?: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;
}

export const ButtonPopoverContent = memo(
  ({
    element,
    zIndex,
    onButtonTextChange,
    onButtonStyleChange,
    onMarginChange,
    onMarginEnabledChange,
    onActionChange,
    onDelete,
    onAddLeft,
    onAddRight,
    currentStep,
    currentVersion,
    attributes,
    actionItems,
    contentList,
    createStep,
  }: ButtonPopoverContentProps) => (
    <div className="flex flex-col gap-2.5">
      <Label htmlFor="button-text">Button text</Label>
      <Input
        type="text"
        className="bg-background"
        id="button-text"
        value={element.data.text}
        placeholder="Enter button text"
        onChange={onButtonTextChange}
      />

      <Label>Button style</Label>
      <SelectPopover
        options={BUTTON_STYLE_OPTIONS}
        value={element.data.type}
        onValueChange={onButtonStyleChange}
        placeholder="Select a style"
        contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
      />

      <MarginControls
        margin={element.margin}
        onMarginChange={onMarginChange}
        onMarginEnabledChange={onMarginEnabledChange}
      />

      <Label>When button is clicked</Label>
      <ContentActions
        zIndex={zIndex}
        isShowIf={false}
        isShowLogic={false}
        currentStep={currentStep}
        currentVersion={currentVersion}
        onDataChange={onActionChange}
        defaultConditions={element?.data?.actions ?? []}
        attributes={attributes}
        filterItems={actionItems}
        contents={contentList}
        createStep={createStep}
      />

      <ActionButtonsBase
        entityName="button"
        onDelete={onDelete}
        onAddLeft={onAddLeft}
        onAddRight={onAddRight}
      />
    </div>
  ),
);

ButtonPopoverContent.displayName = 'ButtonPopoverContent';
