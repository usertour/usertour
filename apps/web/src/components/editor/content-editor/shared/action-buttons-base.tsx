// Shared ActionButtonsBase component for content editor elements

import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour/icons';
import { memo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { TooltipActionButton } from './tooltip-action-button';

export interface ActionButtonsBaseProps {
  entityName: string;
  onDelete: () => void;
  onAddLeft: () => void;
  onAddRight: () => void;
  disabled?: boolean;
  // Optional render prop for custom middle actions (e.g., replace image button)
  renderMiddleActions?: () => ReactNode;
}

export const ActionButtonsBase = memo(
  ({
    entityName,
    onDelete,
    onAddLeft,
    onAddRight,
    disabled,
    renderMiddleActions,
  }: ActionButtonsBaseProps) => {
    const { t } = useTranslation();
    const entity = t(`contentBuilder.editor.actionButtons.entity.${entityName}`);
    return (
      <div className="flex items-center">
        <TooltipActionButton
          tooltip={t('contentBuilder.editor.actionButtons.delete', { entity })}
          icon={<DeleteIcon className="fill-destructive" />}
          onClick={onDelete}
          disabled={disabled}
          destructive
        />

        {renderMiddleActions?.()}

        <div className="grow" />

        <TooltipActionButton
          tooltip={t('contentBuilder.editor.actionButtons.insertLeft', { entity })}
          icon={<InsertColumnLeftIcon className="fill-foreground" />}
          onClick={onAddLeft}
          disabled={disabled}
        />

        <div className="flex-none mx-1 leading-10">
          {t('contentBuilder.editor.actionButtons.insert', { entity })}
        </div>

        <TooltipActionButton
          tooltip={t('contentBuilder.editor.actionButtons.insertRight', { entity })}
          icon={<InsertColumnRightIcon className="fill-foreground" />}
          onClick={onAddRight}
          disabled={disabled}
        />
      </div>
    );
  },
);

ActionButtonsBase.displayName = 'ActionButtonsBase';
