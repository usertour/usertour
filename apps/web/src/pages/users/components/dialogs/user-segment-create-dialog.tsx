'use client';

import { SpinnerIcon } from '@usertour/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import { useToast } from '@usertour/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { Input } from '@usertour/input';
import { RadioGroup, RadioGroupItem } from '@usertour/radio-group';
import { QuestionTooltip } from '@usertour/tooltip';
import { useCreateSegment } from '@/hooks/use-create-segment';
import {
  createSegmentFormSchema,
  createSegmentDefaultValues,
  CreateSegmentFormValues,
} from '../../types/segment-form-schema';
import { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { memo } from 'react';

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful create — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
  environmentId: string | undefined;
}

export const UserSegmentCreateDialog = memo((props: CreateDialogProps) => {
  const { open, onOpenChange, onSubmit, environmentId } = props;
  const { createSegmentAsync, loading } = useCreateSegment();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<CreateSegmentFormValues>({
    resolver: zodResolver(createSegmentFormSchema),
    defaultValues: createSegmentDefaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSuccess = useCallback(
    (segmentName: string) => {
      toast({
        variant: 'success',
        title: t('users.toast.segments.segmentCreated', { segmentName }),
      });
      onSubmit?.(true);
      onOpenChange(false);
    },
    [onSubmit, onOpenChange, toast, t],
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
    async (formValues: CreateSegmentFormValues) => {
      const result = await createSegmentAsync(formValues, environmentId);

      if (result.success) {
        handleSuccess(formValues.name);
      } else {
        handleError(result.error ?? t('common.unknownError'));
      }
    },
    [createSegmentAsync, environmentId, handleSuccess, handleError],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('users.segments.create')}</DialogTitle>
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
              <FormField
                control={form.control}
                name="dataType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row items-center">
                      {t('users.segments.form.segmentType')}
                      <QuestionTooltip className="ml-1">
                        {t('users.segments.form.segmentTypeTooltip')}
                      </QuestionTooltip>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="CONDITION" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t('users.segments.form.filter')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="MANUAL" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t('users.segments.form.manual')}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                {t('users.actions.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('users.segments.form.createSegment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

UserSegmentCreateDialog.displayName = 'UserSegmentCreateDialog';
