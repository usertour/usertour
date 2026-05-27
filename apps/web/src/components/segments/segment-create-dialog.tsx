'use client';

import { memo, useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { Input } from '@usertour/input';
import { RadioGroup, RadioGroupItem } from '@usertour/radio-group';
import { QuestionTooltip } from '@usertour/tooltip';
import { SpinnerIcon } from '@usertour/icons';
import { useToast } from '@usertour/use-toast';
import { useCreateSegment } from '@/hooks/use-create-segment';
import { useCreateCompanySegment } from '@/hooks/use-create-company-segment';
import {
  createSegmentFormSchema,
  createSegmentDefaultValues,
  CreateSegmentFormValues,
} from './segment-form-schema';
import { segmentNamespace } from './segment-i18n';
import type { SegmentEntity } from './types';

export interface SegmentCreateDialogProps {
  entity: SegmentEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires after the action settles. Consumers refetch on success. */
  onSubmit?: (success: boolean) => void;
  environmentId: string | undefined;
}

export const SegmentCreateDialog = memo((props: SegmentCreateDialogProps) => {
  const { entity, open, onOpenChange, onSubmit, environmentId } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  // React requires both hooks be called unconditionally; the unused one
  // is an idle mutation (no network cost). Branching on `entity` below
  // picks the matching async + loading.
  const user = useCreateSegment();
  const company = useCreateCompanySegment();
  const { createSegmentAsync, loading } = entity === 'user' ? user : company;
  const ns = segmentNamespace(entity);

  const form = useForm<CreateSegmentFormValues>({
    resolver: zodResolver(createSegmentFormSchema),
    defaultValues: createSegmentDefaultValues,
    mode: 'onChange',
  });

  // Reset only on dialog open — depending on form here would clobber
  // typing across renders.
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open]);

  const handleSuccess = useCallback(
    (segmentName: string) => {
      toast({
        variant: 'success',
        title: t(`${ns}.toast.segments.segmentCreated`, { segmentName }),
      });
      onSubmit?.(true);
      onOpenChange(false);
    },
    [onSubmit, onOpenChange, toast, t, ns],
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      toast({ variant: 'destructive', title: errorMessage });
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
    [createSegmentAsync, environmentId, handleSuccess, handleError, t],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t(`${ns}.segments.create`)}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-4 mt-4 mb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">{t(`${ns}.segments.form.name`)}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(`${ns}.segments.form.namePlaceholder`)}
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
                      {t(`${ns}.segments.form.segmentType`)}
                      <QuestionTooltip className="ml-1">
                        {t(`${ns}.segments.form.segmentTypeTooltip`)}
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
                            {t(`${ns}.segments.form.filter`)}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="MANUAL" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t(`${ns}.segments.form.manual`)}
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
                {t(`${ns}.actions.cancel`)}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t(`${ns}.segments.form.createSegment`)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

SegmentCreateDialog.displayName = 'SegmentCreateDialog';
