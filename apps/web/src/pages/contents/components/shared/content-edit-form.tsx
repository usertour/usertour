'use client';

import { SpinnerIcon } from '@usertour/icons';
import { useAppContext } from '@/contexts/app-context';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersionList } from '@/hooks/use-content-version-list';
import { isVersionPublished } from '@/utils/content';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
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
  RadioGroup,
  RadioGroupItem,
  useToast,
} from '@usertour/ui';
import {
  useCreateContentVersionMutation,
  useOpenSelector,
  useUpdateContentMutation,
} from '@usertour/hooks';
import { getAuthToken, getErrorMessage } from '@usertour/helpers';
import { BuilderType, Content } from '@usertour/types';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

interface ContentEditFormProps {
  content: Content;
  open: boolean;
  showBuilderType?: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  buildUrl: z.string().min(1),
  type: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
const defaultValues: Partial<FormValues> = {
  buildUrl: '',
  type: BuilderType.EXTENSION,
};

export const ContentEditForm = (props: ContentEditFormProps) => {
  const { content, open, onOpenChange, showBuilderType = true } = props;
  const { project, environment } = useAppContext();
  const { contentId, contentType } = useContentDetailUI();
  const { refetch } = useContentDetail(contentId);
  const { refetch: refetchVersionList } = useContentVersionList(contentId);
  const { invoke: updateContent } = useUpdateContentMutation();
  const { invoke: createContentVersion } = useCreateContentVersionMutation();
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const handleOpenEditor = async (
    projectId: string,
    content: Content,
    type: string,
    envToken: string,
  ) => {
    let versionId = content.editedVersionId;
    // Fork only when the version we'd open is currently live in some
    // environment. Reads contentOnEnvironments (per-env source of truth)
    // instead of the legacy Content.publishedVersionId field — same fix
    // as useContentBuilder, see schema deprecation note on the field.
    if (versionId && isVersionPublished(content, versionId)) {
      const created = await createContentVersion({ versionId });
      if (!created?.id) {
        return toast({
          variant: 'destructive',
          title: t('contents.shared.edit.createVersionFailure'),
        });
      }
      versionId = created.id;
      await refetch();
      await refetchVersionList();
    }

    if (type === BuilderType.WEB) {
      navigate(`/env/${content?.environmentId}/${contentType}/${content?.id}/builder`);
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

      await updateContent(content?.id, { buildUrl });
      if (!content || !project?.id || !environment?.token) {
        return toast({
          variant: 'destructive',
          title: t('contents.shared.edit.openBuilderFailure'),
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
    [content, environment, t],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOnSubmit)}>
              <DialogHeader>
                <DialogTitle>{t('contents.shared.edit.title')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-2 py-4 ">
                {showBuilderType && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="flex flex-row space-y-0 space-x-2 space-y-0 pt-1">
                        <FormLabel className="w-32">
                          {t('contents.shared.edit.builderTypeLabel')}
                        </FormLabel>
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
                                {t('contents.shared.edit.extensionBuilder')}
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={BuilderType.WEB} />
                              </FormControl>
                              <FormLabel className="font-normal  cursor-pointer">
                                {t('contents.shared.edit.webBuilder')}
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {form.getValues('type') === BuilderType.EXTENSION && (
                  <>
                    <FormField
                      control={form.control}
                      name="buildUrl"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-1 space-y-0">
                          <FormLabel className="w-32 flex-none">
                            {t('contents.shared.edit.buildUrlLabel')}
                          </FormLabel>
                          <FormControl>
                            <div className="flex flex-col space-x-1 w-full grow">
                              <Input
                                placeholder={t('contents.shared.edit.buildUrlPlaceholder')}
                                {...field}
                              />
                              <FormMessage />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('contents.shared.edit.buildUrlHint')}
                    </p>
                  </>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    {t('contents.shared.common.cancel')}
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
                    <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t('contents.shared.common.submit')}
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
