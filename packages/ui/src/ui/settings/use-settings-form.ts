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
import { useToast } from '../../primitives/use-toast';

export interface UseSettingsFormOptions<TValues extends FieldValues> {
  // Input == Output: form values feed in raw, schema returns the same shape.
  // Zod 4's `ZodType` is `<Output, Input>` with Input defaulting to `unknown`,
  // which would force the resolver to widen `Resolver<unknown, …, TValues>`
  // and clash with `useForm<TValues>`'s `Resolver<TValues, …, TValues>`.
  schema: ZodType<TValues, TValues>;
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
  /**
   * Re-baseline the form to the submitted values after a successful
   * submit so `formState.isDirty` flips back to false and the Save
   * button disables.
   *
   * Defaults to `true`, which is what almost every settings form wants:
   * after saving "NewName" the user shouldn't see the Save button still
   * highlighted as if there were unsaved changes.
   *
   * Set to `false` for forms that want the inputs cleared on success
   * rather than re-baselined to the submitted values — e.g. the password
   * change form, where leaving the submitted password sitting in form
   * state would mean a (briefly) re-displayable sensitive value. Those
   * forms typically reset to blank inside their own `onSuccess`.
   */
  resetOnSuccess?: boolean;
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
  resetOnSuccess = true,
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
        // Re-baseline before firing the success toast / `onSuccess`.
        // react-hook-form's `defaultValues` is captured once at mount, so
        // `formState.isDirty` stays true after a successful save — the
        // Save button would otherwise look active for unsaved changes
        // that don't exist. `reset(values)` updates the baseline to what
        // we just submitted and clears the dirty flag.
        if (resetOnSuccess) {
          form.reset(values);
        }
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
    [submit, successMessage, onSuccess, toast, form, resetOnSuccess],
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
