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
import type { CurrentConditions, Segment } from '@usertour/types';
import { useAppContext } from '@/contexts/app-context';
import type { EntityConfig } from './entity-config';

interface EntitySegmentFilterSaveProps {
  config: EntityConfig<any>;
  currentSegment: Segment | undefined;
  currentConditions: CurrentConditions | undefined;
  refetchSegments: () => Promise<unknown>;
  isRefetching: boolean;
}

export const EntitySegmentFilterSave = (props: EntitySegmentFilterSaveProps) => {
  const { config, currentSegment, currentConditions, refetchSegments, isRefetching } = props;
  const { t } = useTranslation();
  const { isViewOnly } = useAppContext();
  const { open, isShowButton, loading, handleOpenDialog, handleCloseDialog, saveFilter } =
    config.useSaveFilter({ currentSegment, currentConditions, refetchSegments });

  return (
    <>
      {isShowButton && (
        <Button
          className="h-8 ml-3 text-primary hover:text-primary"
          variant={'ghost'}
          onClick={handleOpenDialog}
          disabled={isViewOnly}
        >
          {t(config.i18n.saveFilter)}
        </Button>
      )}
      <AlertDialog defaultOpen={open} open={open} onOpenChange={handleCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(config.i18n.saveFilter)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(config.i18n.confirmSave, { segmentName: currentSegment?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t(config.i18n.cancel)}</AlertDialogCancel>
            <LoadingButton
              onClick={saveFilter}
              loading={loading || isRefetching}
              disabled={isViewOnly}
            >
              {t(config.i18n.yesSave)}
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

EntitySegmentFilterSave.displayName = 'EntitySegmentFilterSave';
