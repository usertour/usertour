import { useUpdateSegmentMutation } from '@usertour/hooks';
import { conditionsIsSame, getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/ui';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CurrentConditions, Segment } from '@usertour/types';

interface UseSaveSegmentFilterArgs {
  currentSegment: Segment | undefined;
  currentConditions: CurrentConditions | undefined;
  refetchSegments: () => Promise<unknown>;
}

// Save-the-filter dialog state machine. Caller owns the source data
// (currentSegment, currentConditions, refetch fn) — this hook stays
// focused on the open/close + save + button-visibility logic.
export const useSaveSegmentFilter = (args: UseSaveSegmentFilterArgs) => {
  const { currentSegment, currentConditions, refetchSegments } = args;
  const { invoke: updateSegment, loading } = useUpdateSegmentMutation();
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
        Promise.resolve(refetchSegments()).catch(() => undefined);
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
  }, [currentSegment, currentConditions, updateSegment, toast, t, refetchSegments]);

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
    handleOpenDialog,
    handleCloseDialog,
    saveFilter,
  };
};
