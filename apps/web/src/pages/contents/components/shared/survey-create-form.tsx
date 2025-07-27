'use client';

import { Icons } from '@/components/atoms/icons';
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
import { RadioGroup, RadioGroupItem } from '@usertour-packages/radio-group';
import { useOpenSelector } from '@usertour-packages/shared-hooks';
import { getAuthToken, getErrorMessage } from '@usertour/helpers';
import { BuilderType, Content, ContentDataType } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

interface SurveyCreateFormProps {
  isOpen: boolean;
  onClose: (contentId?: string) => void;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please enter your survey name.',
    })
    .max(30)
    .min(1),
  buildUrl: z
    .string({
      required_error: 'Please enter the URL you want to add an experience to',
    })
    // .min(1)
    // .url()
    .optional(),
  type: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
  buildUrl: '',
  type: BuilderType.EXTENSION,
};

export const SurveyCreateForm = ({ onClose, isOpen }: SurveyCreateFormProps) => {
  const [createContentMutation] = useMutation(createContent);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const token = getAuthToken();
  const [currentContent, setCurrentContent] = useState<Content | undefined>();
  const { project, environment } = useAppContext();
  const navigate = useNavigate();
  const onOpenedBuilder = useCallback(() => {
    if (currentContent) {
      navigate(`/env/${currentContent?.environmentId}/surveys/${currentContent?.id}/detail`);
    }
  }, [currentContent]);
  const openTarget = useOpenSelector(token, onOpenedBuilder);
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

  async function handleOnSubmit(formValues: FormValues) {
    const { buildUrl, type, name } = formValues;
    setIsLoading(true);
    try {
      const data = {
        name,
        buildUrl,
        environmentId: environment?.id,
        type: ContentDataType.SURVEY,
      };
      const ret = await createContentMutation({ variables: data });
      if (!ret.data?.createContent?.id) {
        showError('Create survey failed.');
      }
      const content = ret.data?.createContent as Content;
      setCurrentContent(content);
      if (type === BuilderType.WEB) {
        navigate(
          `/env/${content?.environmentId}/surveys/${content?.id}/builder/${content.editedVersionId}`,
        );
        return;
      }
      if (!buildUrl) {
        showError('Please enter the URL you want to add an experience to.');
        return;
      }
      const initParams = {
        environmentId: environment?.id,
        contentId: content.id,
        action: 'editContent',
        projectId: project?.id,
        versionId: content.editedVersionId,
        envToken: environment?.token,
      };
      openTarget.open(buildUrl, initParams);
      // onClose(content.id);
      // navigate(`/env/${content?.environmentId}/surveys/${content?.id}/detail`);
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl	">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New Survey</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4 ">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-1 space-y-0">
                    <FormLabel className="w-32 flex-none">Survey name:</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-x-1 w-full grow">
                        <Input placeholder="Enter survey  name" {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="flex flex-row space-y-0 space-x-2 space-y-0 pt-1">
                    <FormLabel className="w-32">Builder Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={BuilderType.EXTENSION} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Extension Builder
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={BuilderType.WEB} />
                          </FormControl>
                          <FormLabel className="font-normal  cursor-pointer">Web Builder</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
              <span className="text-xs text-muted-foreground">
                {form.getValues('type') === BuilderType.EXTENSION &&
                  'Open the builder in new tab for WYSIWYG editing experience'}
                {form.getValues('type') === BuilderType.WEB &&
                  'Open the builder in the current tab for convenient editing experience'}
              </span>
              {form.getValues('type') === BuilderType.EXTENSION && (
                <FormField
                  control={form.control}
                  name="buildUrl"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-1 space-y-0">
                      <FormLabel className="w-32 flex-none">Build Url</FormLabel>
                      <FormControl>
                        <div className="flex flex-col space-x-1 w-full grow">
                          <Input
                            placeholder="Enter the URL you want to add an experience to"
                            {...field}
                          />
                          <FormMessage />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
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

SurveyCreateForm.displayName = 'SurveyCreateForm';
