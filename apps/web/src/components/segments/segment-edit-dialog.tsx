'use client';

import { memo, useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useToast,
} from '@usertour/ui';
import { SpinnerIcon } from '@usertour/icons';
import { Segment } from '@usertour/types';
import { useUpdateSegment } from '@/hooks/use-update-segment';
import { useUpdateCompanySegment } from '@/hooks/use-update-company-segment';
import { editSegmentFormSchema, EditSegmentFormValues } from './segment-form-schema';
import { segmentNamespace } from './segment-i18n';
import type { SegmentEntity } from './types';

export interface SegmentEditDialogProps {
  entity: SegmentEntity;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Fires after the action settles. Consumers refetch on success.
   * Distinct from onClose so cancel/escape/x-click doesn't trigger
   * a list refetch (caused the table to jitter on dismiss). Required
   * to match the sibling destructive dialogs and to fail-loud at
   * compile time if a future consumer forgets to wire it (silently
   * skipping the refetch would regress the rename-not-reflected bug).
   */
  onSubmit: (success: boolean) => void;
  segment: Segment | undefined;
}

export const SegmentEditDialog = memo((props: SegmentEditDialogProps) => {
  const { entity, isOpen, onClose, onSubmit, segment } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useUpdateSegment();
  const company = useUpdateCompanySegment();
  const { updateSegmentAsync, loading } = entity === 'user' ? user : company;
  const ns = segmentNamespace(entity);

  const form = useForm<EditSegmentFormValues>({
    resolver: zodResolver(editSegmentFormSchema),
    defaultValues: { name: segment?.name },
    mode: 'onChange',
  });

  // Depend only on `isOpen` — re-seeding the form when `segment.name`
  // changes (via Apollo refetch / cache write while the dialog is open)
  // would clobber whatever the user is currently typing.
  useEffect(() => {
    form.reset({ name: segment?.name });
  }, [isOpen]);

  const handleSuccess = useCallback(
    (segmentName: string) => {
      toast({
        variant: 'success',
        title: t(`${ns}.toast.segments.segmentUpdated`, { segmentName }),
      });
      onSubmit(true);
      onClose();
    },
    [onSubmit, onClose, toast, t, ns],
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      toast({ variant: 'destructive', title: errorMessage });
    },
    [toast],
  );

  const handleOnSubmit = useCallback(
    async (formValues: EditSegmentFormValues) => {
      if (!segment?.id) {
        // Match the SegmentDeleteDialog guard — Save without a segment id
        // should surface the same error toast and the same onSubmit(false)
        // signal so callers tracking the action see a settled state.
        handleError(t(`${ns}.toast.segments.invalidSegment`));
        onSubmit(false);
        return;
      }
      const result = await updateSegmentAsync(segment.id, formValues);
      if (result.success) {
        handleSuccess(formValues.name);
      } else {
        handleError(result.error ?? t('common.unknownError'));
      }
    },
    [segment?.id, updateSegmentAsync, handleSuccess, handleError, onSubmit, t, ns],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t(`${ns}.segments.update`)}</DialogTitle>
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
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t(`${ns}.actions.cancel`)}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t(`${ns}.segments.form.updateSegment`)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

SegmentEditDialog.displayName = 'SegmentEditDialog';
