'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@usertour/ui';

// Three-way leave confirmation. Mounted by BuilderLeaveGuard when
// useBlocker has caught an attempted SPA navigation away from the
// builder while there are unsaved local edits or an in-flight save.
//
// Save & Leave: await saveContent, then proceed with navigation.
// Discard: navigate immediately, drop local edits.
// Stay: cancel the navigation.
//
// AlertDialog has no close-on-outside-click by default — keeps the
// modal sticky so an accidental backdrop tap doesn't quietly cancel
// a navigation the user actually intended.

export interface LeaveConfirmDialogProps {
  open: boolean;
  onSaveAndLeave: () => void;
  onDiscardAndLeave: () => void;
  onStay: () => void;
}

export const LeaveConfirmDialog = (props: LeaveConfirmDialogProps) => {
  const { open, onSaveAndLeave, onDiscardAndLeave, onStay } = props;
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved edits. Save them, discard them, or stay on this page?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>Stay</AlertDialogCancel>
          <Button variant="outline" onClick={onDiscardAndLeave}>
            Discard
          </Button>
          <AlertDialogAction onClick={onSaveAndLeave}>Save &amp; Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

LeaveConfirmDialog.displayName = 'LeaveConfirmDialog';
