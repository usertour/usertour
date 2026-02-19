// Button popover content component

import { SelectPopover, SelectPopoverOption, Rules } from '@usertour-packages/shared-components';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import type { Attribute, Content, ContentVersion, Segment, Step } from '@usertour/types';
import { RulesCondition, ButtonSemanticType } from '@usertour/types';
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

// Button condition filter items (exclude segment and content)
const BUTTON_CONDITION_FILTER_ITEMS = [
  'user-attr',
  'current-page',
  'event',
  'element',
  'text-input',
  'text-fill',
  'time',
  'group',
];

export interface ButtonPopoverContentProps {
  element: ContentEditorButtonElement;
  zIndex: number;
  onButtonTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onButtonStyleChange: (type: ButtonSemanticType) => void;
  onMarginChange: (position: MarginPosition, value: string) => void;
  onMarginEnabledChange: (enabled: boolean) => void;
  onActionChange: (actions: RulesCondition[]) => void;
  onDelete: () => void;
  onAddLeft: () => void;
  onAddRight: () => void;
  // Button condition props
  onDisableButtonChange?: (enabled: boolean) => void;
  onDisableConditionsChange?: (conditions: RulesCondition[]) => void;
  onHideButtonChange?: (enabled: boolean) => void;
  onHideConditionsChange?: (conditions: RulesCondition[]) => void;
  // ContentActions related props
  currentStep?: Step;
  currentVersion?: ContentVersion;
  attributes?: Attribute[];
  segments?: Segment[];
  token?: string;
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
    onDisableButtonChange,
    onDisableConditionsChange,
    onHideButtonChange,
    onHideConditionsChange,
    currentStep,
    currentVersion,
    attributes,
    segments,
    token,
    actionItems,
    contentList,
    createStep,
  }: ButtonPopoverContentProps) => {
    // Wrapper to handle SelectPopover's string return value
    const handleStyleChange = (value: string) => {
      onButtonStyleChange(value as ButtonSemanticType);
    };

    return (
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
          onValueChange={handleStyleChange}
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

        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="disable-button" className="font-normal">
              Disable button if...
            </Label>
            <Switch
              id="disable-button"
              className="data-[state=unchecked]:bg-input"
              checked={element.data?.disableButton ?? false}
              onCheckedChange={onDisableButtonChange}
            />
          </div>
          {element.data?.disableButton && (
            <Rules
              onDataChange={onDisableConditionsChange}
              defaultConditions={element.data?.disableButtonConditions ?? []}
              attributes={attributes}
              contents={contentList}
              segments={segments}
              token={token}
              baseZIndex={zIndex}
              filterItems={BUTTON_CONDITION_FILTER_ITEMS}
            />
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="hide-button" className="font-normal">
              Hide button if...
            </Label>
            <Switch
              id="hide-button"
              className="data-[state=unchecked]:bg-input"
              checked={element.data?.hideButton ?? false}
              onCheckedChange={onHideButtonChange}
            />
          </div>
          {element.data?.hideButton && (
            <Rules
              onDataChange={onHideConditionsChange}
              defaultConditions={element.data?.hideButtonConditions ?? []}
              attributes={attributes}
              contents={contentList}
              segments={segments}
              token={token}
              baseZIndex={zIndex}
              filterItems={BUTTON_CONDITION_FILTER_ITEMS}
            />
          )}
        </div>

        <ActionButtonsBase
          entityName="button"
          onDelete={onDelete}
          onAddLeft={onAddLeft}
          onAddRight={onAddRight}
        />
      </div>
    );
  },
);

ButtonPopoverContent.displayName = 'ButtonPopoverContent';
