import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useUpdateSegmentMutation } from '@usertour/hooks';
import { conditionsIsSame, getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/ui';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';

export const useSaveSegmentFilter = (currentSegment?: Segment) => {
  const { invoke: updateSegment, loading } = useUpdateSegmentMutation();
  const { refetch, currentConditions, isRefetching } = useSegmentListContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [isShowButton, setIsShowButton] = useState(false);

  const handleOpenDialog = useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpen(false);
  }, []);

  const saveFilter = useCallback(async (): Promise<boolean> => {
    if (
      !currentSegment ||
      !currentConditions ||
      currentConditions.segmentId !== currentSegment.id
    ) {
      return false;
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
        // Fire-and-forget; `.catch` swallows the rejection so a refetch
        // failure doesn't bubble to window.unhandledrejection (the save
        // itself already succeeded server-side).
        refetch().catch(() => undefined);
        return true;
      }
      return false;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      return false;
    }
  }, [currentSegment, currentConditions, updateSegment, toast, t, refetch]);

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

  return {
    open,
    isShowButton,
    loading,
    isRefetching,
    handleOpenDialog,
    handleCloseDialog,
    saveFilter,
  };
};
