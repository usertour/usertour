// Shared ActionButtonsBase component for content editor elements

import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-packages/icons';
import { memo } from 'react';
import type { ReactNode } from 'react';

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
  }: ActionButtonsBaseProps) => (
    <div className="flex items-center">
      <TooltipActionButton
        tooltip={`Delete ${entityName}`}
        icon={<DeleteIcon className="fill-destructive" />}
        onClick={onDelete}
        disabled={disabled}
        destructive
      />

      {renderMiddleActions?.()}

      <div className="grow" />

      <TooltipActionButton
        tooltip={`Insert ${entityName} to the left`}
        icon={<InsertColumnLeftIcon className="fill-foreground" />}
        onClick={onAddLeft}
        disabled={disabled}
      />

      <div className="flex-none mx-1 leading-10">Insert {entityName}</div>

      <TooltipActionButton
        tooltip={`Insert ${entityName} to the right`}
        icon={<InsertColumnRightIcon className="fill-foreground" />}
        onClick={onAddRight}
        disabled={disabled}
      />
    </div>
  ),
);

ActionButtonsBase.displayName = 'ActionButtonsBase';
