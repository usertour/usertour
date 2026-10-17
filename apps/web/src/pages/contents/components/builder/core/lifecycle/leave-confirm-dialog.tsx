'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  LoadingButton,
} from '@usertour/ui';
import { useTranslation } from 'react-i18next';

// Three-way leave confirmation. Mounted by BuilderLeaveGuard when
// useBlocker has caught an attempted SPA navigation away from the
// builder while there are unsaved local edits or an in-flight save.
//
// Save & Leave: await saveContent, then proceed with navigation. While that
// save runs (`leaving`) both leave buttons are disabled; Stay remains
// available and cancels the leave along with the navigation.
// Discard: navigate immediately, drop local edits.
// Stay: cancel the navigation.
//
// AlertDialog has no close-on-outside-click by default — keeps the
// modal sticky so an accidental backdrop tap doesn't quietly cancel
// a navigation the user actually intended.

export interface LeaveConfirmDialogProps {
  open: boolean;
  // Save & Leave in flight.
  leaving: boolean;
  onSaveAndLeave: () => void;
  onDiscardAndLeave: () => void;
  onStay: () => void;
}

export const LeaveConfirmDialog = (props: LeaveConfirmDialogProps) => {
  const { open, leaving, onSaveAndLeave, onDiscardAndLeave, onStay } = props;
  const { t } = useTranslation();
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('contentBuilder.common.unsavedTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('contentBuilder.common.unsavedDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>{t('contentBuilder.common.stay')}</AlertDialogCancel>
          <Button variant="outline" disabled={leaving} onClick={onDiscardAndLeave}>
            {t('contentBuilder.common.discard')}
          </Button>
          <LoadingButton type="button" loading={leaving} onClick={onSaveAndLeave}>
            {t('contentBuilder.common.saveAndLeave')}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

LeaveConfirmDialog.displayName = 'LeaveConfirmDialog';
