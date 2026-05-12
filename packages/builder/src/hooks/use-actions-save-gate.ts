import { useAttributeListContext, useContentListContext } from '@usertour-packages/contexts';
import { validateActions } from '@usertour-packages/editor';
import { useToast } from '@usertour-packages/use-toast';
import type { RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderContext } from '../contexts';

// Mirrors useConditionsSaveGate. Returns a guard the consumer calls right
// before its save action; runs validateActions over each provided list
// (skipping empties), toasts and returns false if any action is incomplete,
// otherwise returns true. Lives next to the conditions gate so a single
// consumer can run both before committing (e.g., resource-center block,
// checklist item, trigger).
export function useActionsSaveGate() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { attributeList } = useAttributeListContext();
  const { contents } = useContentListContext();
  const { currentVersion, currentStep } = useBuilderContext();

  return useCallback(
    (...lists: (RulesCondition[] | undefined)[]): boolean => {
      const failures = lists.flatMap((actions) =>
        actions && actions.length > 0
          ? validateActions(actions, {
              attributes: attributeList ?? undefined,
              contents: contents ?? undefined,
              currentVersion: currentVersion ?? undefined,
              currentStep: currentStep ?? undefined,
            })
          : [],
      );
      if (failures.length === 0) {
        return true;
      }
      toast({
        variant: 'destructive',
        title: t('actions.errors.incompleteSaveBlocked'),
      });
      return false;
    },
    [attributeList, contents, currentVersion, currentStep, toast, t],
  );
}
