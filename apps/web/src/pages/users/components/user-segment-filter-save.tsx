import { useTranslation } from 'react-i18next';
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
import { Segment } from '@usertour/types';
import { useAppContext } from '@/contexts/app-context';
import { useSaveSegmentFilter } from '@/hooks/use-save-segment-filter';

export const UserSegmentFilterSave = (props: { currentSegment?: Segment }) => {
  const { currentSegment } = props;
  const { t } = useTranslation();
  const { isViewOnly } = useAppContext();
  const {
    open,
    isShowButton,
    loading,
    isRefetching,
    handleOpenDialog,
    handleCloseDialog,
    saveFilter,
  } = useSaveSegmentFilter(currentSegment);

  return (
    <>
      {isShowButton && (
        <Button
          className="h-8 ml-3 text-primary hover:text-primary"
          variant={'ghost'}
          onClick={handleOpenDialog}
          disabled={isViewOnly}
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
            <LoadingButton
              onClick={saveFilter}
              loading={loading || isRefetching}
              disabled={isViewOnly}
            >
              {t('users.filters.yesSave')}
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

UserSegmentFilterSave.displayName = 'UserSegmentFilterSave';
