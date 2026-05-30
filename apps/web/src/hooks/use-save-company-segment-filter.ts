import { useUpdateSegmentMutation } from '@usertour/hooks';
import { conditionsIsSame, getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/ui';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CurrentConditions, Segment } from '@usertour/types';

interface UseSaveCompanySegmentFilterArgs {
  currentSegment: Segment | undefined;
  currentConditions: CurrentConditions | undefined;
  refetchSegments: () => Promise<unknown>;
}

/**
 * Company-side mirror of `useSaveSegmentFilter`. Same shape; uses the
 * `companies.toast.filters.saveSuccess` key for entity-specific toast.
 */
export const useSaveCompanySegmentFilter = (args: UseSaveCompanySegmentFilterArgs) => {
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
          title: t('companies.toast.filters.saveSuccess', { segmentName: currentSegment.name }),
        });
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
