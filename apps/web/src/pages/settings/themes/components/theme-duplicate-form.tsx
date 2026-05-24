'use client';

import { SpinnerIcon } from '@usertour/icons';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { copyTheme } from '@usertour/gql';
import { Input } from '@usertour/input';
import { getErrorMessage } from '@usertour/helpers';
import { Theme } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface ThemeDuplicateFormProps {
  duplicateTheme: Theme;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().max(30).min(1),
});

type FormValues = z.infer<typeof formSchema>;

export const ThemeDuplicateForm = (props: ThemeDuplicateFormProps) => {
  const { onSuccess, duplicateTheme, open, onOpenChange } = props;
  const [copyMutation] = useMutation(copyTheme);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: duplicateTheme.name },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset();
  }, [open]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const variables = {
        id: duplicateTheme.id,
        name: formValues.name,
      };
      const response = await copyMutation({ variables });
      if (response.data.copyTheme.id) {
        toast({
          variant: 'success',
          title: t('settings.themes.duplicateSuccess'),
        });
      }
      onSuccess();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.themes.duplicateTitle')}</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.themes.duplicateNameLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('settings.themes.duplicateNamePlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t('settings.common.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.common.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ThemeDuplicateForm.displayName = 'ThemeDuplicateForm';
