'use client';

import { SpinnerIcon } from '@usertour/icons';
import { useAppContext } from '@/contexts/app-context';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
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
  useToast,
} from '@usertour/ui';
import { useCreateContentMutation } from '@usertour/hooks';
import { createDefaultResourceCenterData, getErrorMessage } from '@usertour/helpers';
import { ContentDataType, DEFAULT_BANNER_DATA, DEFAULT_CHECKLIST_DATA } from '@usertour/types';
import { defaultLauncherData } from '@/pages/contents/components/builder/utils/default-data';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getContentTypeMeta } from './content-type-meta';

// `contents.types.<key>` provides the localised lowercased noun used by
// the dialog copy ('New {{type}}', 'Create {{type}}', etc.). Map each
// ContentDataType to its key so the form can stay generic.
const CONTENT_TYPE_I18N_KEY: Record<ContentDataType, string> = {
  [ContentDataType.FLOW]: 'contents.types.flow',
  [ContentDataType.CHECKLIST]: 'contents.types.checklist',
  [ContentDataType.LAUNCHER]: 'contents.types.launcher',
  [ContentDataType.BANNER]: 'contents.types.banner',
  [ContentDataType.TRACKER]: 'contents.types.tracker',
  [ContentDataType.RESOURCE_CENTER]: 'contents.types.resourceCenter',
};

interface ContentCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called only after a successful create. The submit flow navigates
   * the user to the builder so the list page can skip its refetch — the
   * callback exists for parity with other create dialogs in case a
   * consumer wants to refresh without navigating.
   */
  onSubmit?: (success: boolean) => void;
  contentType: ContentDataType;
}

const formSchema = z.object({
  name: z.string().max(30).min(1),
});

type FormValues = z.infer<typeof formSchema>;

const CONTENT_TYPE_INITIAL_DATA: Partial<Record<ContentDataType, () => unknown>> = {
  [ContentDataType.CHECKLIST]: () => ({ ...DEFAULT_CHECKLIST_DATA }),
  [ContentDataType.LAUNCHER]: () => ({ ...defaultLauncherData }),
  [ContentDataType.BANNER]: () => ({ ...DEFAULT_BANNER_DATA }),
  [ContentDataType.RESOURCE_CENTER]: createDefaultResourceCenterData,
};

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const ContentCreateForm = ({
  open,
  onOpenChange,
  onSubmit,
  contentType,
}: ContentCreateFormProps) => {
  const { invoke: createContent } = useCreateContentMutation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { environment } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const contentTypeMeta = useMemo(() => getContentTypeMeta(contentType), [contentType]);
  const typeLabel = t(CONTENT_TYPE_I18N_KEY[contentType]);

  const copy = useMemo(
    () => ({
      dialogTitle: t('contents.create.title', { type: typeLabel }),
      nameLabel: t('contents.create.nameLabel'),
      namePlaceholder: t('contents.create.namePlaceholder', { type: typeLabel }),
      submitLabel: t('contents.create.submit', { type: typeLabel }),
      cancelLabel: t('settings.common.cancel'),
      createErrorMessage: t('contents.create.failure', { type: typeLabel }),
    }),
    [t, typeLabel],
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
      const data = CONTENT_TYPE_INITIAL_DATA[contentType]?.();
      const content = await createContent({
        name,
        environmentId: environment?.id ?? '',
        type: contentTypeMeta.dataType,
        ...(data != null && { data }),
      });
      if (!content?.id || !content?.editedVersionId) {
        showError(copy.createErrorMessage);
        return;
      }
      onSubmit?.(true);
      if (!contentTypeMeta.hasBuilder) {
        const path = `/env/${content.environmentId ?? ''}/${contentTypeMeta.builderPathSegment}/${content.id}/detail`;
        navigate(path);
      } else {
        const path = `/env/${content.environmentId ?? ''}/${contentTypeMeta.builderPathSegment}/${content.id}/builder`;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
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
                    <FormLabel>{copy.nameLabel}</FormLabel>
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
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                {copy.cancelLabel}
              </Button>
              <Button type="submit" disabled={isLoading || isNameEmpty} id={submitButtonId}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {copy.submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ContentCreateForm.displayName = 'ContentCreateForm';
