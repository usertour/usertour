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
import { RiAlertFill } from '@usertour/icons';
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
      {/* Widen past AlertDialog's default max-w-lg (512px). The icon
          column eats ~56px on the left, so the default leaves a single
          short sentence wrapping mid-word ("cannot be / undone."). 576px
          fits the common case on one line; the global
          `[overflow-wrap:anywhere]` still catches extreme names. */}
      <AlertDialogContent className="max-w-xl">
        {/* Header overrides AlertDialogHeader's default column layout to
            row-align the warning badge with the title+description column.
            shadcn's `cn()` uses tailwind-merge so the override wins. */}
        <AlertDialogHeader className="flex-row gap-4 space-y-0 text-left sm:text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <RiAlertFill className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>
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
