import { validateConditions } from '@usertour/business-components';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/core/hooks/use-content-list';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import type { RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useEnvironmentId, useProjectId } from '@/pages/contents/components/builder/core';

// Returns a guard the consumer can call right before its save action.
// The guard:
//   1. Runs validateConditions over each provided list (skipping empties).
//   2. If any condition is incomplete, toasts and returns false.
//   3. Otherwise returns true.
//
// Lifted out of the per-block / per-item save handlers because they share
// the same lookup wiring (attributes, segments, contents, events). Added
// when builder consumers (resource-center blocks, checklist items, etc.)
// were silently letting incomplete conditions through to save — invalid
// conditions reach the runtime, which then quietly fails to evaluate them
// and the user sees the rule "not working" with no in-builder hint why.
export function useConditionsSaveGate() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);

  return useCallback(
    (...lists: (RulesCondition[] | undefined)[]): boolean => {
      const failures = lists.flatMap((conds) =>
        conds && conds.length > 0
          ? validateConditions(conds, {
              attributes: attributeList ?? undefined,
              segments: segmentList ?? undefined,
              contents: contents ?? undefined,
              events: eventList ?? undefined,
            })
          : [],
      );
      if (failures.length === 0) {
        return true;
      }
      toast({
        variant: 'destructive',
        title: t('conditions.errors.incompleteSaveBlocked'),
      });
      return false;
    },
    [attributeList, segmentList, contents, eventList, toast, t],
  );
}
