import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour/alert-dialog';
import { LoadingButton } from '../loading-button';

export interface DeleteConfirmDialogProps {
  /**
   * Resource type singular, used in the default description copy
   * ("permanently delete the {resourceLabel} {name}"). Pass a label that
   * reads naturally inline: "attribute", "event", "localization", "API key".
   */
  resourceLabel: string;
  /**
   * Display name of the specific record being deleted — rendered emphasised
   * inside the description. Ignored when `description` is provided.
   */
  name?: ReactNode;
  /**
   * Override for the entire description block. Use when the default
   * "This action cannot be undone..." copy doesn't fit (e.g. delete that
   * also disables an integration).
   */
  description?: ReactNode;
  /**
   * Override for the title. Defaults to "Are you absolutely sure?".
   */
  title?: ReactNode;
  /**
   * Confirm button label. Defaults to "Delete".
   */
  confirmLabel?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

/**
 * Standard destructive confirmation dialog used across Settings list pages
 * and elsewhere. Wraps the AlertDialog primitive with the shared
 * "permanently delete X" copy and a `LoadingButton` confirm action.
 */
export const DeleteConfirmDialog = ({
  resourceLabel,
  name,
  description,
  title,
  confirmLabel,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: DeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? 'Are you absolutely sure?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? (
              <>
                This action cannot be undone. This will permanently delete the {resourceLabel}
                {name ? (
                  <>
                    {' '}
                    <span className="font-bold text-foreground">{name}</span>
                  </>
                ) : null}
                .
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={onConfirm} loading={loading}>
            {confirmLabel ?? 'Delete'}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';
