'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { defaultSettings } from '@usertour/types';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { Checkbox } from '@usertour-packages/checkbox';
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
import { createTheme } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface CreateFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please enter your theme name.',
    })
    .max(30)
    .min(1),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
  isDefault: false,
};

export const ThemeCreateForm = ({ onClose, isOpen }: CreateFormProps) => {
  const [createMutation] = useMutation(createTheme);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { project } = useAppContext();
  const { toast } = useToast();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset();
  }, [isOpen]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const data = {
        ...formValues,
        projectId: project?.id,
        settings: defaultSettings,
      };
      const ret = await createMutation({ variables: data });
      if (!ret.data?.createTheme?.id) {
        showError('Create theme failed.');
      }
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New Theme</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter theme  name" {...field} />
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
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 ">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="leading-none">
                          <FormLabel>Set as default theme</FormLabel>
                        </div>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ThemeCreateForm.displayName = 'ThemeCreateForm';
