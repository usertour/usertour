// Button popover content component

import { Conditions } from '@usertour/business-components';
import { BooleanField, Label, SelectField, type SelectFieldOption, TextField } from '@usertour/ui';
import { EDITOR_SELECT } from '@usertour/constants';
import type { Attribute, Content, ContentVersion, Segment, Step } from '@usertour/types';
import { RulesCondition, ButtonSemanticType } from '@usertour/types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Actions } from '../../../actions';
import type { ContentEditorButtonElement } from '../../../types/editor';
import { BUTTON_STYLES } from '../../constants';
import { ActionButtonsBase, MarginControls } from '../../shared';
import type { MarginPosition } from '../../types';

// Disable/Hide-button conditions evaluate at render time against the
// current viewer state, so per-event predicates ("user fired event X")
// don't make sense here — exclude `event` along with segment/content.
const BUTTON_CONDITION_FILTER_ITEMS = [
  'user-attr',
  'current-page',
  'element',
  'text-input',
  'text-fill',
  'time',
  'group',
];

export interface ButtonPopoverContentProps {
  element: ContentEditorButtonElement;
  zIndex: number;
  onButtonTextChange: (value: string) => void;
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

const noop = () => {};

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
    const { t } = useTranslation();

    const styleOptions: SelectFieldOption[] = [
      { value: BUTTON_STYLES.DEFAULT, label: t('contentBuilder.editor.button.stylePrimary') },
      { value: BUTTON_STYLES.SECONDARY, label: t('contentBuilder.editor.button.styleSecondary') },
    ];

    // SelectField returns a string; narrow it back to the semantic type.
    const handleStyleChange = (value: string) => {
      onButtonStyleChange(value as ButtonSemanticType);
    };

    return (
      <div className="flex flex-col gap-2.5">
        <TextField
          label={t('contentBuilder.editor.button.text')}
          value={element.data.text}
          onChange={onButtonTextChange}
          placeholder={t('contentBuilder.editor.button.textPlaceholder')}
        />

        <SelectField
          label={t('contentBuilder.editor.button.style')}
          options={styleOptions}
          value={element.data.type ?? BUTTON_STYLES.DEFAULT}
          onChange={handleStyleChange}
          placeholder={t('contentBuilder.editor.button.stylePlaceholder')}
          zIndex={zIndex + EDITOR_SELECT}
        />

        <MarginControls
          margin={element.margin}
          onMarginChange={onMarginChange}
          onMarginEnabledChange={onMarginEnabledChange}
        />

        <Label>{t('contentBuilder.editor.button.whenClicked')}</Label>
        <Actions
          baseZIndex={zIndex}
          currentStep={currentStep}
          currentVersion={currentVersion}
          onChange={onActionChange}
          conditions={element?.data?.actions ?? []}
          attributes={attributes}
          filterItems={actionItems}
          contents={contentList}
          createStep={createStep}
          t={t}
        />

        <div className="flex flex-col space-y-2">
          <BooleanField
            label={t('contentBuilder.editor.button.disableIf')}
            checked={element.data?.disableButton ?? false}
            onChange={onDisableButtonChange ?? noop}
          />
          {element.data?.disableButton && (
            <Conditions
              onChange={onDisableConditionsChange ?? noop}
              conditions={element.data?.disableButtonConditions ?? []}
              attributes={attributes}
              contents={contentList}
              segments={segments}
              token={token}
              baseZIndex={zIndex}
              filterItems={BUTTON_CONDITION_FILTER_ITEMS}
              t={t}
            />
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <BooleanField
            label={t('contentBuilder.editor.button.hideIf')}
            checked={element.data?.hideButton ?? false}
            onChange={onHideButtonChange ?? noop}
          />
          {element.data?.hideButton && (
            <Conditions
              onChange={onHideConditionsChange ?? noop}
              conditions={element.data?.hideButtonConditions ?? []}
              attributes={attributes}
              contents={contentList}
              segments={segments}
              token={token}
              baseZIndex={zIndex}
              filterItems={BUTTON_CONDITION_FILTER_ITEMS}
              t={t}
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
