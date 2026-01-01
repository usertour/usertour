import { useMutation } from '@apollo/client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { deleteBizCompanyOnSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';

interface BizCompanyRemoveDialogProps {
  bizCompanyIds: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => Promise<void>;
}

export const BizCompanyRemoveDialog = (props: BizCompanyRemoveDialogProps) => {
  const { bizCompanyIds, open, onOpenChange, onSubmit, segment } = props;
  const { t } = useTranslation();
  const [mutation, { loading }] = useMutation(deleteBizCompanyOnSegment);
  const { toast } = useToast();

  const handleSubmit = useCallback(async () => {
    if (bizCompanyIds.length === 0) {
      return;
    }
    const data = {
      bizCompanyIds,
      segmentId: segment.id,
    };
    try {
      const ret = await mutation({ variables: { data } });
      if (ret.data?.deleteBizCompanyOnSegment?.success) {
        toast({
          variant: 'success',
          title: t('companies.toast.segments.companiesRemoved', {
            count: ret.data?.deleteBizCompanyOnSegment.count,
          }),
        });
        await onSubmit(true);
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [bizCompanyIds, segment, mutation, toast, onSubmit]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('companies.dialogs.removeCompaniesFromSegment.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('companies.dialogs.removeCompaniesFromSegment.description', {
              segmentName: segment.name,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('companies.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleSubmit} loading={loading}>
            {t('companies.dialogs.removeCompaniesFromSegment.confirmButton', {
              count: bizCompanyIds.length,
            })}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizCompanyRemoveDialog.displayName = 'BizCompanyRemoveDialog';
