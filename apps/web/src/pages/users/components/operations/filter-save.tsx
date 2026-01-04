import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { Button } from '@usertour-packages/button';
import { Segment } from '@usertour/types';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useSaveSegmentFilter } from '@/hooks/use-save-segment-filter';

export const UserSegmentFilterSave = (props: { currentSegment?: Segment }) => {
  const { currentSegment } = props;
  const { t } = useTranslation();
  const { open, isShowButton, loading, handleOpenDialog, handleCloseDialog, saveFilter } =
    useSaveSegmentFilter(currentSegment);

  return (
    <>
      {isShowButton && (
        <Button
          className="h-8 ml-3 text-primary hover:text-primary"
          variant={'ghost'}
          onClick={handleOpenDialog}
        >
          {t('users.filters.saveFilter')}
        </Button>
      )}
      <AlertDialog defaultOpen={open} open={open} onOpenChange={handleCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.filters.saveFilter')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.filters.confirmSave', { segmentName: currentSegment?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t('users.actions.cancel')}</AlertDialogCancel>
            <LoadingButton onClick={saveFilter} loading={loading}>
              {t('users.filters.yesSave')}
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

UserSegmentFilterSave.displayName = 'UserSegmentFilterSave';
