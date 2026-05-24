import { useCallback, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type DefaultValues,
  type FieldValues,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from 'react-hook-form';
import type { ZodType } from 'zod';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';

export interface UseSettingsFormOptions<TValues extends FieldValues> {
  schema: ZodType<TValues>;
  defaultValues: DefaultValues<TValues>;
  /**
   * Called with the validated form values. Throwing — or returning a
   * rejected promise — fires the destructive toast. A `void` resolution
   * fires the success toast.
   */
  submit: (values: TValues) => Promise<unknown>;
  /**
   * Toast title on success. Skipped when nullish.
   */
  successMessage?: string;
  /**
   * Extra handler invoked after a successful submit (e.g. close dialog,
   * refetch list). Runs after the success toast.
   */
  onSuccess?: (values: TValues) => void;
  /**
   * Override the default `react-hook-form` mode. Defaults to `onChange`
   * which matches what every settings form currently uses.
   */
  mode?: UseFormProps<TValues>['mode'];
}

export interface UseSettingsFormResult<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  isSubmitting: boolean;
  /** True until the user edits any field. Wraps `formState.isDirty`. */
  isPristine: boolean;
  /**
   * Wired-up submit handler — pass to `<form onSubmit={...}>` directly.
   */
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
}

/**
 * Standardises the "validate with zod → call mutation → toast outcome →
 * propagate loading state to a `<LoadingButton>`" pipeline used by every
 * settings form. Loses the manual `useState<boolean>` + try/finally +
 * `getErrorMessage` toast that each form currently re-implements.
 */
export function useSettingsForm<TValues extends FieldValues>({
  schema,
  defaultValues,
  submit,
  successMessage,
  onSuccess,
  mode = 'onChange',
}: UseSettingsFormOptions<TValues>): UseSettingsFormResult<TValues> {
  const form = useForm<TValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handler: SubmitHandler<TValues> = useCallback(
    async (values) => {
      setIsSubmitting(true);
      try {
        await submit(values);
        if (successMessage) {
          toast({ variant: 'success', title: successMessage });
        }
        onSuccess?.(values);
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
      } finally {
        setIsSubmitting(false);
      }
    },
    [submit, successMessage, onSuccess, toast],
  );

  const onSubmit = useCallback(
    (event?: React.BaseSyntheticEvent) => form.handleSubmit(handler)(event),
    [form, handler],
  );

  return {
    form,
    isSubmitting,
    isPristine: !form.formState.isDirty,
    onSubmit,
  };
}
