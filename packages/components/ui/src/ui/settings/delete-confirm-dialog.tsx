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
  /** Localised dialog title. */
  title: ReactNode;
  /** Localised description body. Consumers compose this with their own resource/name copy. */
  description: ReactNode;
  /** Localised confirm-button label. Defaults to 'Delete' as a non-translated fallback. */
  confirmLabel?: ReactNode;
  /** Localised cancel-button label. Defaults to 'Cancel' as a non-translated fallback. */
  cancelLabel?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

/**
 * Destructive confirmation shell wrapping AlertDialog + LoadingButton.
 * The primitive deliberately holds no copy of its own — every string is
 * supplied by the consumer so the surrounding i18n layer owns translation.
 */
export const DeleteConfirmDialog = ({
  title,
  description,
  confirmLabel,
  cancelLabel,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: DeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel ?? 'Cancel'}</AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={onConfirm} loading={loading}>
            {confirmLabel ?? 'Delete'}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';
