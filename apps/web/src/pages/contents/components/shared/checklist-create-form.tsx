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
import { createContent, updateContentVersion } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { Content, ContentDataType, DEFAULT_CHECKLIST_DATA } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

interface ChecklistCreateFormProps {
  isOpen: boolean;
  onClose: (contentId?: string) => void;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please enter your checklist name.',
    })
    .max(30)
    .min(1),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const ChecklistCreateForm = ({ onClose, isOpen }: ChecklistCreateFormProps) => {
  const [createContentMutation] = useMutation(createContent);
  const [updateContentVersionMutation] = useMutation(updateContentVersion);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { environment } = useAppContext();
  const navigate = useNavigate();
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

  const nameValue = form.watch('name');
  const isNameEmpty = !nameValue?.trim();

  const openBuilder = (content: Content) => {
    navigate(
      `/env/${environment?.id}/checklists/${content?.id}/builder/${content?.editedVersionId}`,
    );
  };

  async function handleOnSubmit(formValues: FormValues) {
    const { name } = formValues;
    setIsLoading(true);
    try {
      const data = {
        name,
        environmentId: environment?.id,
        type: ContentDataType.CHECKLIST,
      };
      const ret = await createContentMutation({ variables: data });
      if (!ret.data?.createContent?.id) {
        showError('Create checklist failed.');
        return;
      }
      const content = ret.data?.createContent as Content;
      const initVersion = await updateContentVersionMutation({
        variables: {
          versionId: content.editedVersionId,
          content: { data: DEFAULT_CHECKLIST_DATA },
        },
      });
      if (!initVersion.data.updateContentVersion) {
        showError('Create checklist failed.');
        return;
      }
      openBuilder(content);
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Create checklist</DialogTitle>
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
                        <Input placeholder="Enter checklist name" {...field} />
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
              <Button type="submit" disabled={isLoading || isNameEmpty}>
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

ChecklistCreateForm.displayName = 'ChecklistCreateForm';
