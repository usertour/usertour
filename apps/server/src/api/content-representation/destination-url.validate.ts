import {
  type DestinationValue,
  collectActionListDestinations,
  collectContentsDestinations,
  collectVersionDataDestinations,
  isSafeDestinationUrl,
} from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';
import type { ContentEditorRoot } from '@usertour/types';

import type { ValidationIssue } from '@/common/errors/errors';

type InternalStep = {
  cvid?: string | null;
  data?: unknown;
  target?: { actions?: unknown } | null;
  trigger?: { actions?: unknown }[] | null;
};

/**
 * Where a click goes — an image's link, a navigate action, a rich-text link, a
 * resource-center list entry — must be a path the host routes or an http(s) /
 * mailto / tel URL; a scheme that runs code is refused (`destination_url`).
 *
 * Checked on the COMPILED model, with the walk the translation write
 * validates with, so a source write and a translated write agree on what a
 * destination is and where one can sit: the representation has no single
 * shape for one (markdown links, plain url strings, list-entry fields), the
 * compiled model does. Dynamic destinations (user-attribute chips) are read
 * with the chips stood in for, so a scheme cannot hide behind one. A flow
 * step's own action slots — click-the-target and trigger actions — sit
 * outside its content tree (they are no translation unit) and are walked on
 * top.
 *
 * A value the stored version already carries passes verbatim
 * (preserve-not-endorse): builder-authored data must stay echo-editable.
 */
const collectDestinations = (
  contentType: string | undefined,
  steps: unknown,
  data: unknown,
): DestinationValue[] => {
  if (contentType === ContentDataType.FLOW) {
    if (!Array.isArray(steps)) {
      return [];
    }
    return (steps as InternalStep[]).flatMap((step) => {
      const stepDestinations = [
        ...(Array.isArray(step?.data)
          ? collectContentsDestinations(step.data as ContentEditorRoot[])
          : []),
        ...collectActionListDestinations(step?.target?.actions, 'target.actions'),
        ...(Array.isArray(step?.trigger) ? step.trigger : []).flatMap((trigger, index) =>
          collectActionListDestinations(trigger?.actions, `trigger.${index}.actions`),
        ),
      ];
      return stepDestinations.map((destination) => ({
        ...destination,
        path: `steps/${step?.cvid ?? ''}/${destination.path}`,
      }));
    });
  }
  if (!contentType || !data) {
    return [];
  }
  return collectVersionDataDestinations(contentType, data);
};

export const collectDestinationIssues = (input: {
  contentType?: string;
  /** Compiled steps / data of this write (either may be absent). */
  steps?: unknown;
  data?: unknown;
  /** The stored version's steps / data — its destinations pass verbatim. */
  storedSteps?: unknown;
  storedData?: unknown;
}): ValidationIssue[] => {
  const stored = new Set(
    collectDestinations(input.contentType, input.storedSteps, input.storedData).map(
      (destination) => destination.value,
    ),
  );
  const issues: ValidationIssue[] = [];
  for (const destination of collectDestinations(input.contentType, input.steps, input.data)) {
    if (stored.has(destination.value) || isSafeDestinationUrl(destination.value)) {
      continue;
    }
    issues.push({
      rule: 'destination_url',
      path: destination.path,
      message: `A link or navigate target must be a path or an http(s) / mailto / tel URL — ${JSON.stringify(
        destination.value,
      )} uses a scheme that is never allowed in a link.`,
    });
  }
  return issues;
};
