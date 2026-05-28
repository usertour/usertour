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
import { CurrentConditions, Segment } from '@usertour/types';
import { useAppContext } from '@/contexts/app-context';
import { useSaveSegmentFilter } from '@/hooks/use-save-segment-filter';

interface UserSegmentFilterSaveProps {
  currentSegment?: Segment;
  currentConditions: CurrentConditions | undefined;
  refetchSegments: () => Promise<unknown>;
  isRefetching: boolean;
}

export const UserSegmentFilterSave = (props: UserSegmentFilterSaveProps) => {
  const { currentSegment, currentConditions, refetchSegments, isRefetching } = props;
  const { t } = useTranslation();
  const { isViewOnly } = useAppContext();
  const { open, isShowButton, loading, handleOpenDialog, handleCloseDialog, saveFilter } =
    useSaveSegmentFilter({ currentSegment, currentConditions, refetchSegments });

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
