import { useAppContext } from '@/contexts/app-context';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour/ui';
import { Button } from '@usertour/ui';
import { Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { LoadingButton } from '@usertour/ui';
import { useSaveCompanySegmentFilter } from '@/hooks/use-save-company-segment-filter';

export const CompanySegmentFilterSave = (props: { currentSegment?: Segment }) => {
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
  } = useSaveCompanySegmentFilter(currentSegment);

  return (
    <>
      {isShowButton && (
        <Button
          className="h-8 ml-3 text-primary hover:text-primary"
          variant={'ghost'}
          onClick={handleOpenDialog}
          disabled={isViewOnly}
        >
          {t('companies.filters.saveFilter')}
        </Button>
      )}
      <AlertDialog defaultOpen={open} open={open} onOpenChange={handleCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('companies.filters.saveFilter')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('companies.filters.confirmSave', { segmentName: currentSegment?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              {t('companies.actions.cancel')}
            </AlertDialogCancel>
            <LoadingButton onClick={saveFilter} loading={loading || isRefetching}>
              {t('companies.filters.yesSave')}
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

CompanySegmentFilterSave.displayName = 'CompanySegmentFilterSave';
