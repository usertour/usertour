'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import { duplicateContent } from '@usertour-ui/gql';
import { Input } from '@usertour-ui/input';
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@usertour-ui/select';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { Content } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface ContentDuplicateFormProps {
  content: Content;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please enter name.',
    })
    .max(30)
    .min(1),
  targetEnvironmentId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const ContentDuplicateForm = (props: ContentDuplicateFormProps) => {
  const { onSuccess, content, open, onOpenChange, name } = props;
  const [mutation] = useMutation(duplicateContent);
  const { environmentList } = useEnvironmentListContext();
  const { environment } = useAppContext();

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
    defaultValues: { name: content.name, targetEnvironmentId: environment?.id },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset();
  }, [open]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const variables = {
        contentId: content.id,
        name: formValues.name,
        targetEnvironmentId: formValues.targetEnvironmentId,
      };
      const ret = await mutation({ variables });
      if (ret.data.duplicateContent.id) {
        toast({
          variant: 'success',
          title: `The ${name} has been successfully created`,
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
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Duplicate {name}</DialogTitle>
              <DialogDescription>
                This will create a new {name} with a copy of the original {name}
                's steps.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 pb-4 pt-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder={`Enter ${name} name`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetEnvironmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Environment</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a data type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {environmentList?.map((env) => (
                            <SelectItem value={env.id} key={env.id}>
                              {env.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ContentDuplicateForm.displayName = 'ContentDuplicateForm';
