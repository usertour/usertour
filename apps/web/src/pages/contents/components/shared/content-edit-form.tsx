'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionListContext } from '@/contexts/content-version-list-context';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
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
import { createContentVersion, updateContent } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { RadioGroup, RadioGroupItem } from '@usertour-packages/radio-group';
import { useOpenSelector } from '@usertour-packages/shared-hooks';
import { getAuthToken, getErrorMessage } from '@usertour/helpers';
import { BuilderType, Content } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

interface ContentEditFormProps {
  content: Content;
  open: boolean;
  showBuilderType?: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  buildUrl: z
    .string({
      required_error: 'Please enter a URL.',
    })
    .min(1),
  type: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
const defaultValues: Partial<FormValues> = {
  buildUrl: '',
  type: BuilderType.EXTENSION,
};

export const ContentEditForm = (props: ContentEditFormProps) => {
  const { open, onOpenChange, showBuilderType = true } = props;
  const { project, environment } = useAppContext();
  const { content, refetch, contentType } = useContentDetailContext();
  const { refetch: refetchVersionList } = useContentVersionListContext();
  const [mutation] = useMutation(updateContent);
  const navigate = useNavigate();
  // const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...defaultValues, buildUrl: content?.buildUrl },
    mode: 'onChange',
  });
  const token = getAuthToken();
  const openTarget = useOpenSelector(token, (isSuccess: boolean) => {
    if (isSuccess) {
      onOpenChange(false);
    }
  });
  const { toast } = useToast();

  const [createVersion] = useMutation(createContentVersion);

  const handleOpenEditor = async (
    projectId: string,
    content: Content,
    type: string,
    envToken: string,
  ) => {
    let versionId = content.editedVersionId;
    if (content?.published && content.editedVersionId === content.publishedVersionId) {
      const { data } = await createVersion({
        variables: {
          data: {
            versionId: content.editedVersionId,
          },
        },
      });
      if (!data?.createContentVersion?.id) {
        return toast({
          variant: 'destructive',
          title: 'Failed to create a new version.',
        });
      }
      versionId = data?.createContentVersion?.id;
      await refetch();
      await refetchVersionList();
    }

    if (type === BuilderType.WEB) {
      navigate(`/env/${content?.environmentId}/${contentType}/${content?.id}/builder/${versionId}`);
      return;
    }

    const initParams = {
      environmentId: content.environmentId,
      contentId: content.id,
      versionId,
      projectId,
      action: 'editContent',
      envToken,
    };
    if (content?.buildUrl) {
      openTarget.open(content?.buildUrl, initParams);
    }
  };

  const handleOnSubmit = useCallback(
    async (formData: FormValues) => {
      const { buildUrl, type } = formData;

      await mutation({
        variables: { contentId: content?.id, content: { buildUrl } },
      });
      if (!content || !project?.id || !environment?.token) {
        return toast({
          variant: 'destructive',
          title: 'Failed to open builder.',
        });
      }
      try {
        handleOpenEditor(project?.id, { ...content, buildUrl }, type, environment?.token);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [content, environment],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl	">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOnSubmit)}>
              <DialogHeader>
                <DialogTitle>Edit flow in builder </DialogTitle>
              </DialogHeader>

              <div className="space-y-2 py-4 ">
                {showBuilderType && (
                  <>
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
                                <FormLabel className="font-normal  cursor-pointer">
                                  Web Builder
                                </FormLabel>
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
                  </>
                )}
                {form.getValues('type') === BuilderType.EXTENSION && (
                  <>
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
                    <p className="text-xs text-muted-foreground">
                      This is the page URL where you build & edit the Flow. This URL is for yourself
                      only, and will not affect the ‘page trigger’ conditions for the flow (where
                      users see the Flow live).
                    </p>
                  </>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  className="flex-none"
                  type="submit"
                  disabled={
                    form.getValues('type') === BuilderType.EXTENSION && openTarget.isLoading
                  }
                  // onClick={handleOpenEditor}
                >
                  {form.getValues('type') === BuilderType.EXTENSION && openTarget.isLoading && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

ContentEditForm.displayName = 'ContentEditForm';
