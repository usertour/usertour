import { validateActions } from '@usertour/editor';
import type { RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useSaveGate } from '@/pages/contents/components/builder/hooks/use-save-gate';

// Mirrors useConditionsSaveGate (shares useSaveGate): runs validateActions
// over each provided action list (skipping empties), toasts and returns false
// if any action is incomplete, otherwise true. Lives next to the conditions
// gate so a single consumer can run both before committing (e.g.,
// resource-center block, checklist item, trigger).
export const useActionsSaveGate = () => {
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const currentStep = useBuilderStore((state) => state.currentStep);

  const validate = useCallback(
    (list: RulesCondition[]) =>
      validateActions(list, {
        attributes: attributeList ?? undefined,
        contents: contents ?? undefined,
        currentVersion: currentVersion ?? undefined,
        currentStep: currentStep ?? undefined,
      }),
    [attributeList, contents, currentVersion, currentStep],
  );

  return useSaveGate(validate, 'actions.errors.incompleteSaveBlocked');
};
