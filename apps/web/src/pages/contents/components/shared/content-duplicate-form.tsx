'use client';

import { SpinnerIcon } from '@usertour/icons';
import { useAppContext } from '@/contexts/app-context';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { useDuplicateContentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { Content, ContentDataType } from '@usertour/types';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getContentTypeMeta } from './content-type-meta';

interface ContentDuplicateFormProps {
  content: Content;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().max(30).min(1),
  targetEnvironmentId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const ContentDuplicateForm = (props: ContentDuplicateFormProps) => {
  const { onSuccess, content, open, onOpenChange } = props;
  const { invoke: duplicateContent } = useDuplicateContentMutation();
  const { environment } = useAppContext();
  const contentTypeMeta = getContentTypeMeta(content.type);

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
      const duplicated = await duplicateContent({
        contentId: content.id,
        name: formValues.name,
      });
      if (duplicated?.id) {
        toast({
          variant: 'success',
          title: `The ${contentTypeMeta.singular} has been successfully created`,
        });
      }
      onSuccess();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Duplicate {contentTypeMeta.singular}</DialogTitle>
              <DialogDescription>
                {content.type === ContentDataType.FLOW &&
                  `This will create a new ${contentTypeMeta.singular} with a copy of the original ${contentTypeMeta.singular}'s steps.`}
                {content.type !== ContentDataType.FLOW &&
                  `This will create a new ${contentTypeMeta.singular} with a copy of the original ${contentTypeMeta.singular}.`}
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
                        <Input placeholder={`Enter ${contentTypeMeta.singular} name`} {...field} />
                      </FormControl>
                      <FormMessage />
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
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
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
