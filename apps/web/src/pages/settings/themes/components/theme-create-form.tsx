'use client';

import { SpinnerIcon } from '@usertour-packages/icons';
import { useAppContext } from '@/contexts/app-context';
import { defaultSettings } from '@usertour/types';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { Checkbox } from '@usertour-packages/checkbox';
import {
  Dialog,
  DialogClose,
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
import { createTheme } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface CreateFormProps {
  isOpen: boolean;
  onDialogClose: () => void;
  onClose: () => void;
}

type FormValues = {
  name: string;
  isDefault: boolean;
};

const defaultValues: Partial<FormValues> = {
  name: '',
  isDefault: false,
};

export const ThemeCreateForm = ({ onDialogClose, onClose, isOpen }: CreateFormProps) => {
  const { t } = useTranslation();
  const { project } = useAppContext();
  const { toast } = useToast();

  const formSchema = useMemo(
    () =>
      z.object({
        name: z
          .string({
            required_error: t('themes.createForm.name.required'),
          })
          .max(30)
          .min(1),
        isDefault: z.boolean(),
      }),
    [t],
  );

  const [createMutation, { loading }] = useMutation(createTheme);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  async function handleOnSubmit(formValues: FormValues) {
    if (!project?.id) {
      toast({
        variant: 'destructive',
        title: t('themes.createForm.toast.projectMissing'),
      });
      return;
    }

    try {
      const data = {
        ...formValues,
        projectId: project.id,
        settings: defaultSettings,
      };
      const ret = await createMutation({ variables: data });
      if (!ret.data?.createTheme?.id) {
        toast({
          variant: 'destructive',
          title: t('themes.createForm.toast.createFailed'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('themes.createForm.toast.success'),
      });
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onDialogClose()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('themes.createForm.title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 pb-4 pt-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('themes.createForm.name.label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('themes.createForm.name.placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel>{t('themes.createForm.isDefault.label')}</FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t('themes.createForm.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading || !form.formState.isValid}>
                {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('themes.createForm.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ThemeCreateForm.displayName = 'ThemeCreateForm';
