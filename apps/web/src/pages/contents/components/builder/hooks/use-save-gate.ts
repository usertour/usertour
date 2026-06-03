import { useToast } from '@usertour/ui';
import type { RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Shared skeleton for the "validate each list before saving" gates
// (conditions / actions). The caller closes over its own validation
// context and passes a `validate(list) => failures` closure plus the
// toast i18n key; this hook owns the shared control flow:
//   1. run validate over each non-empty list, collecting failures;
//   2. if any failed, toast and return false;
//   3. otherwise return true.
// The skeleton never reads the failure shape — only whether the list is
// empty — so it's agnostic to which validator / context flows through.
export const useSaveGate = (
  validate: (list: RulesCondition[]) => readonly unknown[],
  toastKey: string,
) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  return useCallback(
    (...lists: (RulesCondition[] | undefined)[]): boolean => {
      const failures = lists.flatMap((list) => (list && list.length > 0 ? validate(list) : []));
      if (failures.length === 0) {
        return true;
      }
      toast({
        variant: 'destructive',
        title: t(toastKey),
      });
      return false;
    },
    [validate, toastKey, toast, t],
  );
};
