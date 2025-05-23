import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useMutation } from '@apollo/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';
import { Button } from '@usertour-ui/button';
import { updateSegment } from '@usertour-ui/gql';
import { conditionsIsSame, getErrorMessage } from '@usertour-ui/shared-utils';
import { Segment } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { useCallback, useEffect, useState } from 'react';

export const UserSegmentFilterSave = (props: { currentSegment?: Segment }) => {
  const { currentSegment } = props;
  const [mutation] = useMutation(updateSegment);
  const { refetch, currentConditions } = useSegmentListContext();

  const [open, setOpen] = useState(false);
  const [isShowButton, setIsShowButton] = useState(false);
  const { toast } = useToast();

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
      const ret = await mutation({ variables: { data } });
      if (ret.data?.updateSegment?.id) {
        await refetch();
      }
      if (ret.data?.updateSegment?.id) {
        toast({
          variant: 'success',
          title: `The segment ${currentSegment.name} filter has been successfully saved`,
        });
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
          Save filter
        </Button>
      )}
      <AlertDialog defaultOpen={open} open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save filter</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm saving <span className="font-bold">{currentSegment?.name}</span> filter?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Yes, save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

UserSegmentFilterSave.displayName = 'UserSegmentFilterSave';
