import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from './use-content-list';
import { validateActions } from '@usertour/editor';
import { useToast } from '@usertour/ui';
import type { RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderStore } from '../core';

// Mirrors useConditionsSaveGate. Returns a guard the consumer calls right
// before its save action; runs validateActions over each provided list
// (skipping empties), toasts and returns false if any action is incomplete,
// otherwise returns true. Lives next to the conditions gate so a single
// consumer can run both before committing (e.g., resource-center block,
// checklist item, trigger).
export function useActionsSaveGate() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const currentStep = useBuilderStore((state) => state.currentStep);

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
