import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  useToast,
} from '@usertour/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateApiTokenMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SpinnerIcon } from '@usertour/icons';
import { useAppContext } from '@/contexts/app-context';
import { API_TOKEN_SCOPE_OPTIONS } from './scopes';
import { RevealDialog } from './reveal-dialog';

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful create — consumers refetch here. */
  onSubmit?: () => void;
}

const formSchema = z.object({
  name: z.string().min(2).max(50),
  projectIds: z.array(z.string()).min(1),
  scopes: z.array(z.string()).min(1),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  name: '',
  projectIds: [],
  scopes: [],
};

export const CreateDialog = (props: CreateDialogProps) => {
  const { open, onOpenChange, onSubmit } = props;
  const [newToken, setNewToken] = useState('');
  const { projects } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { invoke: createApiToken, loading: creating } = useCreateApiTokenMutation();

  const handleSubmit = async (values: FormValues) => {
    try {
      const result = await createApiToken({
        name: values.name.trim(),
        projectIds: values.projectIds,
        scopes: values.scopes,
      });
      if (!result) {
        toast({ title: t('settings.personalApiKeys.createFailure'), variant: 'destructive' });
        return;
      }
      form.reset(defaultValues);
      onSubmit?.();
      onOpenChange(false);
      setNewToken(result.token);
      toast({ variant: 'success', title: t('settings.personalApiKeys.createSuccess') });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: 'destructive' });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <DialogHeader>
                <DialogTitle>{t('settings.personalApiKeys.createTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.personalApiKeys.nameLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('settings.personalApiKeys.namePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>{t('settings.common.changeableLater')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.personalApiKeys.projectsLabel')}</FormLabel>
                      <div className="space-y-2">
                        {projects.map((project) => {
                          const id = project.id ?? '';
                          return (
                            <div key={id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`project-${id}`}
                                checked={field.value.includes(id)}
                                onCheckedChange={(checked) => {
                                  field.onChange(
                                    checked
                                      ? [...field.value, id]
                                      : field.value.filter((value) => value !== id),
                                  );
                                }}
                              />
                              <Label htmlFor={`project-${id}`} className="font-normal">
                                {project.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scopes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.personalApiKeys.scopesLabel')}</FormLabel>
                      <div className="space-y-2">
                        {API_TOKEN_SCOPE_OPTIONS.map((scope) => (
                          <div key={scope.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`scope-${scope.value}`}
                              checked={field.value.includes(scope.value)}
                              onCheckedChange={(checked) => {
                                field.onChange(
                                  checked
                                    ? [...field.value, scope.value]
                                    : field.value.filter((value) => value !== scope.value),
                                );
                              }}
                            />
                            <Label htmlFor={`scope-${scope.value}`} className="font-normal">
                              {t(scope.labelKey)}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={creating}
                >
                  {t('settings.common.cancel')}
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                  {creating
                    ? t('settings.personalApiKeys.creating')
                    : t('settings.personalApiKeys.createButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <RevealDialog token={newToken} open={!!newToken} onOpenChange={() => setNewToken('')} />
    </>
  );
};

CreateDialog.displayName = 'CreateDialog';
