import { cuid } from '@usertour/helpers';

import { ValidationError } from '@/common/errors/errors';

import { compileContent } from './representation.compile';
import { compileActions, compileConditions, CompileResolvers } from './rules.compile';
import { compilePlainText } from './text.compile';
import {
  RepresentationResourceCenter,
  RepresentationResourceCenterBlock,
} from './resource-center.schema';

/**
 * Compile a resource-center representation back into ResourceCenterData, merging
 * onto the existing data. Tabs/blocks merge by their server-owned id (content
 * block styling is preserved via the existing block's content); new tabs/blocks
 * get a generated id. Only provided top-level fields are written.
 */
export function compileResourceCenter(
  rep: RepresentationResourceCenter,
  existing: unknown,
  r: CompileResolvers,
): unknown {
  const base = (existing ?? {}) as Record<string, any>;
  const out: Record<string, any> = { ...base };
  if (rep.buttonText !== undefined) out.buttonText = rep.buttonText;
  if (rep.headerText !== undefined) out.headerText = rep.headerText;

  if (rep.tabs !== undefined) {
    // Announcement state (feed, badge, popup) is global to the resource center —
    // the builder allows exactly one announcement block across all tabs, so the
    // API enforces the same invariant instead of writing a state the widget
    // cannot render.
    const announcementBlocks = rep.tabs.flatMap((t) =>
      t.blocks.filter((b) => b.type === 'announcement'),
    );
    if (announcementBlocks.length > 1) {
      throw new ValidationError(
        `A resource center supports at most ONE announcement block across all tabs — remove ${announcementBlocks.length - 1} of them.`,
      );
    }
    const prevBlockById = new Map<string, any>();
    for (const t of Array.isArray(base.tabs) ? base.tabs : []) {
      for (const b of Array.isArray(t?.blocks) ? t.blocks : []) {
        if (b?.id) prevBlockById.set(b.id, b);
      }
    }
    // Tabs merge like blocks do: an echoed `id` carries the stored tab forward
    // (prev-spread keeps builder-only fields; iconFields keeps the icon when
    // omitted) — without this, any tabs write silently reset tab icons and
    // shredded unknown stored fields (RC A+B round).
    const prevTabById = new Map<string, any>();
    for (const t of Array.isArray(base.tabs) ? base.tabs : []) {
      if (t?.id) prevTabById.set(t.id, t);
    }
    out.tabs = rep.tabs.map((t) => {
      const prevTab = t.id ? prevTabById.get(t.id) : undefined;
      return {
        ...(prevTab ?? {}),
        id: t.id ?? cuid(),
        name: t.name,
        ...iconFields(t.icon, prevTab),
        blocks: t.blocks.map((b) => compileBlock(b, prevBlockById, r)),
      };
    });
  }
  return out;
}

function compileBlock(
  b: RepresentationResourceCenterBlock,
  prevById: Map<string, any>,
  r: CompileResolvers,
): unknown {
  const prev = b.id ? prevById.get(b.id) : undefined;
  const id = b.id ?? cuid();
  const onlyShowBlock = b.onlyShowWhen !== undefined;
  const cond = {
    onlyShowBlock,
    onlyShowBlockConditions: onlyShowBlock ? compileConditions(b.onlyShowWhen ?? [], r) : [],
  };

  switch (b.type) {
    case 'richtext':
      return {
        ...(prev ?? {}),
        id,
        type: 'richtext',
        ...cond,
        ...(b.name !== undefined ? { name: b.name } : {}),
        content: compileContent(b.content ?? [], prev?.content, r),
      };
    case 'divider':
      return {
        ...(prev ?? {}),
        id,
        type: 'divider',
        ...cond,
        ...(b.name !== undefined ? { name: b.name } : {}),
      };
    case 'action':
      return {
        ...(prev ?? {}),
        id,
        type: 'action',
        ...cond,
        name: compilePlainText(b.name),
        ...iconFields(b.icon, prev),
        // No DismissVariant is passed: a resource center has no dismiss action (there's no
        // `resource-center-dismis` handler — the builder registers dismiss only for
        // flow/checklist/banner/launcher). A `dismiss` here is rejected upstream by
        // assertNonFlowData, so compileActions only ever sees start_content / navigate here; the
        // `flow-dismis` default would be wrong, but is unreachable. Keep both in sync if that
        // guard ever changes. `r` MUST be passed: it carries the echoActions pool, without
        // which a builder-authored run_javascript on this block can never be echoed back —
        // and since tabs are a full-list replacement, that made the whole RC un-editable.
        clickedActions: compileActions(b.clickActions ?? [], r),
      };
    case 'sub-page':
      return {
        ...(prev ?? {}),
        id,
        type: 'sub-page',
        ...cond,
        name: compilePlainText(b.name),
        ...iconFields(b.icon, prev),
        content: compileContent(b.content ?? [], prev?.content, r),
      };
    case 'content-list':
      return {
        ...(prev ?? {}),
        id,
        type: 'content-list',
        ...cond,
        name: compilePlainText(b.name),
        ...iconFields(b.icon, prev),
        flowIconSource: b.flowIcon?.source ?? prev?.flowIconSource ?? 'none',
        flowIconType: b.flowIcon?.type ?? prev?.flowIconType ?? '',
        ...(b.flowIcon?.url !== undefined ? { flowIconUrl: b.flowIcon.url } : {}),
        checklistIconSource: b.checklistIcon?.source ?? prev?.checklistIconSource ?? 'none',
        checklistIconType: b.checklistIcon?.type ?? prev?.checklistIconType ?? '',
        ...(b.checklistIcon?.url !== undefined ? { checklistIconUrl: b.checklistIcon.url } : {}),
        showSearchField: b.showSearchField ?? prev?.showSearchField ?? false,
        contentItems: (b.items ?? []).map((it) => {
          const onlyShowItem = it.onlyShowWhen !== undefined;
          return {
            contentId: it.content,
            contentType: it.contentType,
            ...(it.label !== undefined ? { label: it.label } : {}),
            ...(it.icon?.source !== undefined ? { iconSource: it.icon.source } : {}),
            ...(it.icon?.type !== undefined ? { iconType: it.icon.type } : {}),
            ...(it.icon?.url !== undefined ? { iconUrl: it.icon.url } : {}),
            ...(it.navigateUrl !== undefined
              ? { navigateUrl: compilePlainText(it.navigateUrl) }
              : {}),
            ...(it.navigateOpenType !== undefined ? { navigateOpenType: it.navigateOpenType } : {}),
            onlyShowItem,
            onlyShowItemConditions: onlyShowItem ? compileConditions(it.onlyShowWhen ?? [], r) : [],
          };
        }),
      };
    case 'live-chat': {
      // `customCode` is arbitrary JS executed in the host page — the same
      // security rule as run_javascript applies: an echo of the STORED code is
      // kept, omitting it keeps it too, an empty string clears it, but new or
      // edited code is rejected (author scripts in the builder).
      const storedCode = prev?.customLiveChatCode ?? '';
      if (b.customCode !== undefined && b.customCode !== '' && b.customCode !== storedCode) {
        throw new ValidationError(
          'Cannot write live-chat `customCode` via the API — custom scripts are blocked for ' +
            'security, like run_javascript. Echo the stored code back unchanged (or omit the ' +
            'field) to keep it; author or edit the script in the builder.',
        );
      }
      return {
        ...(prev ?? {}),
        id,
        type: 'live-chat',
        ...cond,
        name: compilePlainText(b.name),
        ...iconFields(b.icon, prev),
        liveChatProvider: b.provider,
        customLiveChatCode: b.customCode ?? storedCode,
      };
    }
    case 'announcement':
      return {
        ...(prev ?? {}),
        id,
        type: 'announcement',
        ...cond,
        name: compilePlainText(b.name),
        ...iconFields(b.icon, prev),
      };
    default:
      // 'unsupported' — the echo of a stored block kind this API version cannot
      // express (read-backs mark it honestly instead of mislabeling it). Echoing
      // it back with its id preserves the original verbatim; AUTHORING one is
      // meaningless, so a new unsupported block (no stored original) is rejected
      // rather than silently invented.
      if (!prev) {
        throw new ValidationError(
          'An `unsupported` block is echo-only — it preserves an existing block this API ' +
            'cannot edit. Remove it, or echo it back exactly as read (including its `id`).',
        );
      }
      return prev;
  }
}

/** Required iconSource/iconType (+ optional iconUrl), defaulted for new blocks. */
function iconFields(
  icon: { source?: string; type?: string; url?: string } | undefined,
  prev: any,
): Record<string, unknown> {
  return {
    iconSource: icon?.source ?? prev?.iconSource ?? 'none',
    iconType: icon?.type ?? prev?.iconType ?? '',
    ...(icon?.url !== undefined
      ? { iconUrl: icon.url }
      : prev?.iconUrl !== undefined
        ? { iconUrl: prev.iconUrl }
        : {}),
  };
}
