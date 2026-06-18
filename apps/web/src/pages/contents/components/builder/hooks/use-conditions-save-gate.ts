import { validateConditions } from '@usertour/business-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import type { RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useEnvironmentId, useProjectId } from '@/pages/contents/components/builder/core';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useSaveGate } from '@/pages/contents/components/builder/hooks/use-save-gate';

// Returns a guard the consumer calls right before its save action: runs
// validateConditions over each provided condition list (skipping empties),
// toasts and returns false if any condition is incomplete, otherwise true.
// Shares the gate control flow with useActionsSaveGate via useSaveGate.
//
// Lifted out of the per-block / per-item save handlers because they share
// the same lookup wiring (attributes, segments, contents, events). Added
// when builder consumers (resource-center blocks, checklist items, etc.)
// were silently letting incomplete conditions through to save — invalid
// conditions reach the runtime, which then quietly fails to evaluate them
// and the user sees the rule "not working" with no in-builder hint why.
export const useConditionsSaveGate = () => {
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);

  const validate = useCallback(
    (list: RulesCondition[]) =>
      validateConditions(list, {
        attributes: attributeList ?? undefined,
        segments: segmentList ?? undefined,
        contents: contents ?? undefined,
        events: eventList ?? undefined,
      }),
    [attributeList, segmentList, contents, eventList],
  );

  return useSaveGate(validate, 'conditions.errors.incompleteSaveBlocked');
};
