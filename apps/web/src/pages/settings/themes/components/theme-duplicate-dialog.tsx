'use client';

import { SpinnerIcon } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useCopyThemeMutation } from '@usertour/hooks';
import { Input } from '@usertour/input';
import { getErrorMessage } from '@usertour/helpers';
import { Theme } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface ThemeDuplicateDialogProps {
  duplicateTheme: Theme;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().max(30).min(1),
});

type FormValues = z.infer<typeof formSchema>;

export const ThemeDuplicateDialog = (props: ThemeDuplicateDialogProps) => {
  const { onSuccess, duplicateTheme, open, onOpenChange } = props;
  const { invoke: copyTheme } = useCopyThemeMutation();
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
      const success = await copyTheme(duplicateTheme.id, formValues.name);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.themes.duplicateSuccess'),
        });
        // onSuccess closes the dialog and triggers the parent's refetch;
        // both should only fire when the server actually created the
        // duplicate. Previously this ran unconditionally, so a
        // soft-failure (success=false) closed the dialog with no toast
        // and refreshed an unchanged list.
        onSuccess();
      } else {
        showError(t('settings.themes.duplicateFailure'));
      }
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog
      defaultOpen={true}
      open={open}
      // Block Esc / click-outside while the mutation is flying — otherwise
      // a user who clicks Duplicate and immediately Cancel orphans an
      // in-flight `copyTheme` call. The server still creates the theme
      // and the component unmount triggers a wasted setState on
      // `setIsLoading(false)`.
      onOpenChange={(next) => {
        if (!next && isLoading) {
          return;
        }
        onOpenChange(next);
      }}
    >
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
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.themes.duplicateSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ThemeDuplicateDialog.displayName = 'ThemeDuplicateDialog';
