'use client';

import { SpinnerIcon } from '@usertour-packages/icons';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { createContent } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { Content, ContentDataType, DEFAULT_CHECKLIST_DATA } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getContentTypeMeta } from './content-type-meta';

interface ContentCreateFormProps {
  isOpen: boolean;
  onClose: (contentId?: string) => void;
  contentType: ContentDataType;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please enter the name.',
    })
    .max(30)
    .min(1),
});

type FormValues = z.infer<typeof formSchema>;

const CONTENT_TYPE_INITIAL_DATA: Partial<Record<ContentDataType, unknown>> = {
  [ContentDataType.CHECKLIST]: DEFAULT_CHECKLIST_DATA,
};

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const ContentCreateForm = ({ onClose, isOpen, contentType }: ContentCreateFormProps) => {
  const [createContentMutation] = useMutation(createContent);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { environment } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const contentTypeMeta = useMemo(() => getContentTypeMeta(contentType), [contentType]);
  const initialData = useMemo(() => CONTENT_TYPE_INITIAL_DATA[contentType], [contentType]);

  const copy = useMemo(
    () => ({
      dialogTitle: `Create ${contentTypeMeta.singular}`,
      namePlaceholder: `Enter ${contentTypeMeta.singular} name`,
      createErrorMessage: `Create ${contentTypeMeta.singular} failed.`,
    }),
    [contentTypeMeta],
  );

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

  const nameValue = form.watch('name');
  const isNameEmpty = !nameValue?.trim();

  const handleOnSubmit = async (formValues: FormValues) => {
    const { name } = formValues;
    setIsLoading(true);
    try {
      const variables = {
        name,
        environmentId: environment?.id,
        type: contentTypeMeta.dataType,
        ...(initialData != null && { data: initialData }),
      };
      const ret = await createContentMutation({ variables });
      if (!ret.data?.createContent?.id) {
        showError(copy.createErrorMessage);
        return;
      }
      const content = ret.data?.createContent as Content;
      if (!content?.editedVersionId) {
        showError(copy.createErrorMessage);
        return;
      }
      if (!contentTypeMeta.hasBuilder) {
        const path = `/env/${content.environmentId ?? ''}/${contentTypeMeta.builderPathSegment}/${content.id}/detail`;
        navigate(path);
      } else {
        const path = `/env/${content.environmentId ?? ''}/${contentTypeMeta.builderPathSegment}/${content.id}/builder/${content.editedVersionId}`;
        navigate(path);
      }
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const submitButtonId = contentType === ContentDataType.FLOW ? 'create-flow-submit' : undefined;
  const nameInputId = contentType === ContentDataType.FLOW ? 'flow-name-input' : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{copy.dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4 pt-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-start space-y-1">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <div className="w-full">
                        <Input placeholder={copy.namePlaceholder} {...field} id={nameInputId} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isNameEmpty} id={submitButtonId}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ContentCreateForm.displayName = 'ContentCreateForm';
