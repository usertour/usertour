'use client';

import { SpinnerIcon } from '@usertour-packages/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour-packages/button';
import { useToast } from '@usertour-packages/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { Input } from '@usertour-packages/input';
import { Segment } from '@usertour/types';
import { useUpdateSegment } from '@/hooks/use-update-segment';
import { editSegmentFormSchema, EditSegmentFormValues } from '../../types/segment-form-schema';
import { useForm } from 'react-hook-form';
import { memo, useEffect, useCallback } from 'react';

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment | undefined;
}

export const UserSegmentEditDialog = memo((props: EditDialogProps) => {
  const { onClose, isOpen, segment } = props;
  const { updateSegmentAsync, loading } = useUpdateSegment();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<EditSegmentFormValues>({
    resolver: zodResolver(editSegmentFormSchema),
    defaultValues: { name: segment?.name },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({ name: segment?.name });
  }, [isOpen, segment?.name]);

  const handleSuccess = useCallback(
    (segmentName: string) => {
      toast({
        variant: 'success',
        title: t('users.toast.segments.segmentUpdated', { segmentName }),
      });
      onClose();
    },
    [onClose, toast, t],
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      toast({
        variant: 'destructive',
        title: errorMessage,
      });
    },
    [toast],
  );

  const handleOnSubmit = useCallback(
    async (formValues: EditSegmentFormValues) => {
      if (!segment?.id) {
        handleError('Invalid segment data');
        return;
      }

      const result = await updateSegmentAsync(segment.id, formValues);

      if (result.success) {
        handleSuccess(formValues.name);
      } else {
        handleError(result.error ?? 'Unknown error');
      }
    },
    [segment?.id, updateSegmentAsync, handleSuccess, handleError],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('users.segments.update')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-4 mt-4 mb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">{t('users.segments.form.name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('users.segments.form.namePlaceholder')}
                        className="w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t('users.actions.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('users.segments.form.updateSegment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

UserSegmentEditDialog.displayName = 'UserSegmentEditDialog';
