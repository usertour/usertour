'use client';

import { Icons } from '@/components/atoms/icons';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import { updateLocalization } from '@usertour-ui/gql';
import { Input } from '@usertour-ui/input';
import { LocateItem, LocateSelect } from '@usertour-ui/shared-components';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { Localization } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface EditFormProps {
  isOpen: boolean;
  localization: Localization;
  onClose: () => void;
}

const formSchema = z.object({
  locale: z
    .string({
      required_error: 'Please input locale.',
    })
    .max(20)
    .min(2),
  name: z
    .string({
      required_error: 'Please input name.',
    })
    .max(20)
    .min(2),
  code: z
    .string({
      required_error: 'Please input code.',
    })
    .max(20)
    .min(2),
});

type FormValues = z.infer<typeof formSchema>;

export const LocalizationEditForm = (props: EditFormProps) => {
  const { onClose, isOpen, localization } = props;
  const [updateMutation] = useMutation(updateLocalization);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...localization,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({
      ...localization,
    });
  }, [isOpen, localization, form]);

  const handleOnSubmit = React.useCallback(
    async (formValues: FormValues) => {
      setIsLoading(true);
      try {
        const data = {
          id: localization.id,
          ...formValues,
        };
        const ret = await updateMutation({ variables: { data } });

        if (!ret.data?.updateLocalization?.id) {
          showError('Update localization failed.');
        }
        onClose();
      } catch (error) {
        showError(getErrorMessage(error));
      }
      setIsLoading(false);
    },
    [localization],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Rename Localization </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-2 mt-4 mb-4">
              <FormField
                control={form.control}
                name="locale"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      Locale
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            A locale represents a user's language and region.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <LocateSelect
                      popperContentClass="w-[450px]"
                      defaultValue={form.getValues('locale')}
                      onSelect={(item: LocateItem) => {
                        form.setValue('name', `${item.language.name} (${item.country.code})`);
                        form.setValue('code', item.locale);
                        form.setValue('locale', item.locale);
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      Name
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            Human-readable name of the locale
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      Code
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            The value that users of this locale must have in their locale_code
                            attribute in your Usertour.js installation. It's important that this
                            code matches exactly. If a user has a missing or invalid locale code,
                            they will be regarded as having no locale, which means they'll see the
                            flow in the base locale.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter code name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Save Localization
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

LocalizationEditForm.displayName = 'LocalizationEditForm';
