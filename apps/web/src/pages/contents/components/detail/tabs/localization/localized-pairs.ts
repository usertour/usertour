import {
  assignLocalizedLinkUrl,
  contentListDestination,
  getLocalizableLinkUrl,
  isTranslatableText,
  navigateDestination,
  readDestination,
  writeDestination,
} from '@usertour/helpers';
import { ContentActionsItemType } from '@usertour/types';
import type { RulesCondition } from '@usertour/types';

export const toText = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

// ---------------------------------------------------------------------------
// Slate helpers — a working tree is a structural clone of its source tree
// (createLocalizedWorkingContents / createLocalizedWorkingVersionData
// guarantee it), so both can be walked with the same index paths.
// ---------------------------------------------------------------------------

export type SlateNode = {
  text?: unknown;
  children?: unknown;
} & Record<string, unknown>;

export interface SlateLeafPair {
  path: number[];
  sourceText: string;
  value: string;
}

export interface SlateLinkPair {
  path: number[];
  sourceUrl: string;
  value: string;
}

/** A user-attribute chip's fallback — copy the user reads whenever the attribute is unset. */
export interface SlateChipPair {
  path: number[];
  attributeCode: string;
  sourceText: string;
  value: string;
}

export interface SlateFieldPairs {
  leafPairs: SlateLeafPair[];
  linkPairs: SlateLinkPair[];
  chipPairs: SlateChipPair[];
}

/**
 * One walk collects every editable field kind, so the positional-alignment
 * convention (working tree = structural clone of the source tree) lives in
 * exactly one place. Link destinations read/write through the helpers' link
 * accessors so the `data` template (what delivery renders) and the `url`
 * field stay in agreement; dynamic (user-attribute chip) and empty
 * destinations yield no pair and stay source-managed.
 */
export const collectSlateFieldPairs = (
  sourceNodes: SlateNode[],
  workingNodes: SlateNode[],
): SlateFieldPairs => {
  const leafPairs: SlateLeafPair[] = [];
  const linkPairs: SlateLinkPair[] = [];
  const chipPairs: SlateChipPair[] = [];
  const visit = (source: SlateNode[], working: SlateNode[], path: number[]): void => {
    source.forEach((sourceNode, index) => {
      if (!sourceNode || typeof sourceNode !== 'object') {
        return;
      }
      const workingNode = working?.[index];
      const nodePath = [...path, index];
      if (typeof sourceNode.text === 'string') {
        // Same line as the unit walkers draw, so the rows shown here are
        // exactly the units the missing count is taken over.
        if (isTranslatableText(sourceNode.text)) {
          leafPairs.push({
            path: nodePath,
            sourceText: sourceNode.text,
            value: toText(workingNode?.text),
          });
        }
        return;
      }
      if (sourceNode.type === 'user-attribute') {
        const fallback = toText(sourceNode.fallback);
        if (isTranslatableText(fallback)) {
          chipPairs.push({
            path: nodePath,
            attributeCode: toText(sourceNode.attrCode),
            sourceText: fallback,
            value: toText(workingNode?.fallback),
          });
        }
      }
      if (sourceNode.type === 'link') {
        const sourceUrl = getLocalizableLinkUrl(sourceNode);
        if (sourceUrl) {
          linkPairs.push({
            path: nodePath,
            sourceUrl,
            value: (workingNode ? getLocalizableLinkUrl(workingNode) : undefined) ?? '',
          });
        }
      }
      if (Array.isArray(sourceNode.children)) {
        visit(
          sourceNode.children as SlateNode[],
          (Array.isArray(workingNode?.children) ? workingNode.children : []) as SlateNode[],
          nodePath,
        );
      }
    });
  };
  visit(sourceNodes, workingNodes, []);
  return { leafPairs, linkPairs, chipPairs };
};

/** Leaf-only view for trees that never render links (block names). */
export const collectSlateLeafPairs = (
  sourceNodes: SlateNode[],
  workingNodes: SlateNode[],
): SlateLeafPair[] => {
  return collectSlateFieldPairs(sourceNodes, workingNodes).leafPairs;
};

const getSlateNodeAtPath = (nodes: SlateNode[], path: number[]): SlateNode | undefined => {
  let node: SlateNode | undefined = nodes[path[0]];
  for (const index of path.slice(1)) {
    if (!node || !Array.isArray(node.children)) {
      return undefined;
    }
    node = (node.children as SlateNode[])[index];
  }
  return node;
};

export const setSlateLeafText = (nodes: SlateNode[], path: number[], text: string): void => {
  const node = getSlateNodeAtPath(nodes, path);
  if (node) {
    node.text = text;
  }
};

export const setSlateLinkUrl = (nodes: SlateNode[], path: number[], url: string): void => {
  const node = getSlateNodeAtPath(nodes, path);
  if (node && node.type === 'link') {
    assignLocalizedLinkUrl(node, url);
  }
};

export const setSlateChipFallback = (nodes: SlateNode[], path: number[], text: string): void => {
  const node = getSlateNodeAtPath(nodes, path);
  if (node && node.type === 'user-attribute') {
    node.fallback = text;
  }
};

// ---------------------------------------------------------------------------
// Navigate destinations — the page-navigate action on any action list, and a
// content-list entry's own navigation. Paired by action id / contentId, the
// way the unit walkers pair them.
// ---------------------------------------------------------------------------

export interface NavigateActionPair {
  actionId: string;
  sourceUrl: string;
  value: string;
}

const isNavigateAction = (action: RulesCondition | undefined): action is RulesCondition => {
  return (
    action?.type === ContentActionsItemType.PAGE_NAVIGATE &&
    typeof action.id === 'string' &&
    Boolean(action.data) &&
    typeof action.data === 'object'
  );
};

/** The plain, non-empty navigate destinations of an action list, with their working values. */
export const collectNavigateActionPairs = (
  sourceActions: RulesCondition[] | undefined,
  workingActions: RulesCondition[] | undefined,
): NavigateActionPair[] => {
  const pairs: NavigateActionPair[] = [];
  for (const action of sourceActions ?? []) {
    if (!isNavigateAction(action)) {
      continue;
    }
    const sourceUrl = readDestination(navigateDestination(action.data));
    if (!sourceUrl) {
      continue;
    }
    const workingAction = (workingActions ?? []).find((candidate) => candidate.id === action.id);
    pairs.push({
      actionId: action.id,
      sourceUrl,
      value: isNavigateAction(workingAction)
        ? (readDestination(navigateDestination(workingAction.data)) ?? '')
        : '',
    });
  }
  return pairs;
};

/** A fresh action list with the given action's destination replaced. */
export const setNavigateActionUrl = (
  actions: RulesCondition[] | undefined,
  actionId: string,
  url: string,
): RulesCondition[] => {
  return (actions ?? []).map((action) => {
    if (action.id !== actionId || !isNavigateAction(action)) {
      return action;
    }
    const data = { ...(action.data as Record<string, unknown>) };
    writeDestination(navigateDestination(data), url);
    return { ...action, data };
  });
};

/** The plain, non-empty navigation of a content-list entry (undefined when none or dynamic). */
export const readContentListNavigateUrl = (contentItem: object): string | undefined => {
  const url = readDestination(contentListDestination(contentItem));
  return url ? url : undefined;
};

/** A fresh content-list entry with its navigation replaced. */
export const withContentListNavigateUrl = <T extends object>(contentItem: T, url: string): T => {
  const next = { ...contentItem };
  writeDestination(contentListDestination(next), url);
  return next;
};
