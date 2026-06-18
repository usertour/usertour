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
} from '@usertour/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveState } from '@/pages/contents/components/builder/core';

// Shown once saveState reaches 'conflict' (the server refused the save —
// version forked or saved elsewhere; see SaveState). Refresh is the only
// real exit; "Later" lets the user copy unsaved work out of the editor
// first. The conflict state itself stays terminal either way — auto-save is
// stopped and nothing in this mount can persist.
export const VersionConflictDialog = () => {
  const saveState = useSaveState();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  return (
    <AlertDialog open={saveState.status === 'conflict' && !dismissed}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('contentBuilder.versionConflict.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('contentBuilder.versionConflict.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDismissed(true)}>
            {t('contentBuilder.versionConflict.later')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => window.location.reload()}>
            {t('contentBuilder.versionConflict.refresh')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

VersionConflictDialog.displayName = 'VersionConflictDialog';
