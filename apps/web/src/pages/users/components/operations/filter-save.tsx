import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useUpdateSegmentMutation } from '@usertour-packages/shared-hooks';
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
import { conditionsIsSame, getErrorMessage } from '@usertour/helpers';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback, useEffect, useState } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';

export const UserSegmentFilterSave = (props: { currentSegment?: Segment }) => {
  const { currentSegment } = props;
  const { invoke: updateSegment, loading } = useUpdateSegmentMutation();
  const { refetch, currentConditions } = useSegmentListContext();

  const [open, setOpen] = useState(false);
  const [isShowButton, setIsShowButton] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleOnClick = () => {
    setOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    if (
      !currentSegment ||
      !currentConditions ||
      currentConditions.segmentId !== currentSegment.id
    ) {
      return;
    }
    const data = {
      id: currentSegment.id,
      data: currentConditions.data,
      name: currentSegment.name,
    };
    try {
      const success = await updateSegment(data);
      if (success) {
        setOpen(false);
        toast({
          variant: 'success',
          title: t('users.toast.filters.saveSuccess', { segmentName: currentSegment.name }),
        });
        refetch();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [currentSegment, currentConditions]);

  useEffect(() => {
    if (
      currentSegment?.data &&
      currentConditions &&
      !conditionsIsSame(currentSegment.data, currentConditions.data) &&
      currentSegment.dataType === 'CONDITION'
    ) {
      setIsShowButton(true);
    } else {
      setIsShowButton(false);
    }
  }, [currentSegment, currentConditions]);

  return (
    <>
      {isShowButton && (
        <Button
          className="h-8 ml-3 text-primary hover:text-primary"
          variant={'ghost'}
          onClick={handleOnClick}
        >
          {t('users.filters.saveFilter')}
        </Button>
      )}
      <AlertDialog defaultOpen={open} open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.filters.saveFilter')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.filters.confirmSave', { segmentName: currentSegment?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t('users.actions.cancel')}</AlertDialogCancel>
            <LoadingButton onClick={handleSubmit} loading={loading}>
              {t('users.filters.yesSave')}
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

UserSegmentFilterSave.displayName = 'UserSegmentFilterSave';
