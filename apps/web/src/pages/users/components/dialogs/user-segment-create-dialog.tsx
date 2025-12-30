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
import { RadioGroup, RadioGroupItem } from '@usertour-packages/radio-group';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { useCreateSegment } from '@/hooks/use-create-segment';
import {
  createSegmentFormSchema,
  createSegmentDefaultValues,
  CreateSegmentFormValues,
} from '../../types/segment-form-schema';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface CreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  environmentId: string | undefined;
}

export const UserSegmentCreateDialog = (props: CreateDialogProps) => {
  const { onClose, isOpen, environmentId } = props;
  const { createSegmentAsync } = useCreateSegment();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { t } = useTranslation();

  const form = useForm<CreateSegmentFormValues>({
    resolver: zodResolver(createSegmentFormSchema),
    defaultValues: createSegmentDefaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset();
  }, [isOpen]);

  async function handleOnSubmit(formValues: CreateSegmentFormValues) {
    setIsLoading(true);
    const success = await createSegmentAsync(formValues, environmentId);
    setIsLoading(false);

    if (success) {
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl">
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

UserSegmentCreateDialog.displayName = 'UserSegmentCreateDialog';
