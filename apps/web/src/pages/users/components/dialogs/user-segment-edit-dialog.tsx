'use client';

import { SpinnerIcon } from '@usertour-packages/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour-packages/button';
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
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment | undefined;
}

export const UserSegmentEditDialog = (props: EditDialogProps) => {
  const { onClose, isOpen, segment } = props;
  const { updateSegmentAsync } = useUpdateSegment();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { t } = useTranslation();

  const form = useForm<EditSegmentFormValues>({
    resolver: zodResolver(editSegmentFormSchema),
    defaultValues: { name: segment?.name },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({ name: segment?.name });
  }, [isOpen, segment?.name]);

  const handleOnSubmit = React.useCallback(
    async (formValues: EditSegmentFormValues) => {
      if (!segment) {
        return;
      }

      setIsLoading(true);
      const success = await updateSegmentAsync(segment.id, formValues);
      setIsLoading(false);

      if (success) {
        onClose();
      }
    },
    [segment, updateSegmentAsync, onClose],
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
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('users.segments.form.createSegment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

UserSegmentEditDialog.displayName = 'UserSegmentEditDialog';
