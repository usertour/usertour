'use client';

import { SpinnerIcon } from '@usertour-packages/icons';
import { useMutation } from '@apollo/client';
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
import { createSegment } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { RadioGroup, RadioGroupItem } from '@usertour-packages/radio-group';
import { getErrorMessage } from '@usertour/helpers';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { useToast } from '@usertour-packages/use-toast';
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

export const CompanySegmentCreateDialog = (props: CreateDialogProps) => {
  const { onClose, isOpen, environmentId } = props;
  const { t } = useTranslation();
  const [createMutation] = useMutation(createSegment);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

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
    try {
      const data = {
        ...formValues,
        bizType: 'COMPANY',
        data: [],
        environmentId,
      };
      const response = await createMutation({ variables: { data } });
      if (response.data?.createSegment?.id) {
        onClose();
      }
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('companies.segments.create')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-4 mt-4 mb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      {t('companies.segments.form.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('companies.segments.form.namePlaceholder')}
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
                      {t('companies.segments.form.segmentType')}
                      <QuestionTooltip className="ml-1">
                        {t('companies.segments.form.segmentTypeTooltip')}
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
                            {t('companies.segments.form.filter')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="MANUAL" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t('companies.segments.form.manual')}
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
                {t('companies.actions.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('companies.segments.form.createSegment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

CompanySegmentCreateDialog.displayName = 'CompanySegmentCreateDialog';
