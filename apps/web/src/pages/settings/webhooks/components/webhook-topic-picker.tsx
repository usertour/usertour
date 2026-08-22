import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  WEBHOOK_CONTENT_PUBLISHED_TOPIC,
  WEBHOOK_EVENT_TOPIC_PREFIX,
  WEBHOOK_NOISY_EVENTS,
  WEBHOOK_TOPIC_WILDCARD,
  WEBHOOK_ENTITY_TOPICS,
  WEBHOOK_PREFIX_SUBSCRIPTIONS,
} from '@usertour/constants';
import { RiArrowRightSLine, RiInformationLine, RiSearchLine } from '@usertour/icons';
import {
  Badge,
  Checkbox,
  Input,
  Label,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';

/**
 * Subscription picker that mirrors the topic grammar (ADR 0010) as a tree:
 *
 *   root  "Select all"                          → "*"
 *   family (Tracked events / Content / Users / Companies)
 *                                               → prefix subscription ("event.tracked", "content", …)
 *   group  (Flows / Checklists / … under Tracked events)
 *                                               → its leaves, spelled out
 *   leaf   (one event / one topic)              → exact topic
 *
 * Checking a family stores the prefix, so events added to it later flow in
 * automatically — that is the "auto-include" promise the old "All events"
 * radio made, now available per family. Checking a group or leaf stores exact
 * topics. High-volume events (page_viewed) are excluded from "*" and from
 * their family prefix server-side, so they stay independent, explicit leaves.
 *
 * `value` IS the stored `topics` array — no encode/decode layer. Topics the
 * tree does not know (e.g. an event definition deleted since) are preserved
 * untouched.
 */

export interface WebhookTopicPickerEvent {
  codeName: string;
  displayName: string;
  predefined?: boolean;
}

export interface WebhookTopicPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  events: WebhookTopicPickerEvent[];
  /** Marks the control invalid (nothing selected on submit). */
  invalid?: boolean;
}

interface Leaf {
  topic: string;
  label: string;
  /** Secondary muted text (codeName / topic string). */
  code: string;
  /** Excluded from wildcard + family prefix; must be selected on its own. */
  noisy: boolean;
}

interface Group {
  key: string;
  label: string;
  leaves: Leaf[];
}

interface Family {
  key: string;
  prefix: string;
  label: string;
  /** A single group whose key equals the family key renders flat (no sub-header). */
  groups: Group[];
}

/** UI grouping of predefined event codeNames by content type (custom events fall through). */
const EVENT_GROUPS: { key: string; prefixes: string[] }[] = [
  { key: 'flows', prefixes: ['flow_', 'tooltip_'] },
  { key: 'checklists', prefixes: ['checklist_'] },
  { key: 'surveys', prefixes: ['question_'] },
  { key: 'launchers', prefixes: ['launcher_'] },
  { key: 'banners', prefixes: ['banner_'] },
  { key: 'resourceCenters', prefixes: ['resource_center_'] },
  { key: 'announcements', prefixes: ['announcement_'] },
  { key: 'trackers', prefixes: ['event_tracker_'] },
  { key: 'pages', prefixes: ['page_'] },
];

const groupKeyForCodeName = (codeName: string): string => {
  const group = EVENT_GROUPS.find((candidate) =>
    candidate.prefixes.some((prefix) => codeName.startsWith(prefix)),
  );
  return group?.key ?? 'custom';
};

const includes = (haystack: string, needle: string): boolean =>
  haystack.toLowerCase().includes(needle.toLowerCase());

// ---------------------------------------------------------------------------
// Row primitives (module scope so rows keep identity across re-renders)
// ---------------------------------------------------------------------------

const Chevron = ({ open, onClick }: { open: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
    aria-expanded={open}
  >
    <RiArrowRightSLine className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
  </button>
);

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex shrink-0 text-muted-foreground">
        <RiInformationLine className="h-3.5 w-3.5" />
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs text-xs">
      {text}
    </TooltipContent>
  </Tooltip>
);

interface LeafRowProps {
  leaf: Leaf;
  depth: number;
  checked: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
  highVolumeLabel: string;
  highVolumeHint: string;
}

const LeafRow = (props: LeafRowProps) => {
  const { leaf, depth, checked, disabled, onToggle, highVolumeLabel, highVolumeHint } = props;
  // codeNames are user-authored with no charset guarantee; whitespace in an
  // id breaks the htmlFor association.
  const id = `webhook-topic-${leaf.topic.replace(/\s/g, '_')}`;
  return (
    <div
      className="flex h-8 items-center gap-2 pr-3 hover:bg-muted/40"
      style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onToggle(next === true)}
      />
      <Label htmlFor={id} className="flex min-w-0 items-center gap-1.5 font-normal">
        <span className="truncate">{leaf.label}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">{leaf.code}</span>
      </Label>
      {leaf.noisy && (
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <Badge variant="secondary" className="text-[10px] font-normal">
            {highVolumeLabel}
          </Badge>
          <InfoTip text={highVolumeHint} />
        </span>
      )}
    </div>
  );
};

export const WebhookTopicPicker = (props: WebhookTopicPickerProps) => {
  const { value, onChange, events, invalid } = props;
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const families = useMemo<Family[]>(() => {
    const buckets = new Map<string, Leaf[]>();
    for (const event of events) {
      const key = event.predefined ? groupKeyForCodeName(event.codeName) : 'custom';
      const bucket = buckets.get(key) ?? [];
      bucket.push({
        topic: `${WEBHOOK_EVENT_TOPIC_PREFIX}.${event.codeName}`,
        label: event.displayName,
        code: event.codeName,
        noisy: WEBHOOK_NOISY_EVENTS.includes(event.codeName),
      });
      buckets.set(key, bucket);
    }
    const trackedGroups: Group[] = [...EVENT_GROUPS.map((group) => group.key), 'custom']
      .filter((key) => buckets.has(key))
      .map((key) => ({
        key,
        label: t(`settings.webhooks.topicGroups.${key}`),
        leaves: buckets.get(key) ?? [],
      }));

    const fixedLeaf = (topic: string, labelKey: string): Leaf => ({
      topic,
      label: t(`settings.webhooks.form.${labelKey}`),
      code: topic,
      noisy: false,
    });

    return [
      {
        key: 'tracked',
        prefix: WEBHOOK_EVENT_TOPIC_PREFIX,
        label: t('settings.webhooks.picker.families.tracked'),
        groups: trackedGroups,
      },
      {
        key: 'content',
        prefix: 'content',
        label: t('settings.webhooks.picker.families.content'),
        groups: [
          {
            key: 'content',
            label: '',
            leaves: [fixedLeaf(WEBHOOK_CONTENT_PUBLISHED_TOPIC, 'contentPublished')],
          },
        ],
      },
      // Entity families derive their leaves from the shared vocabulary — a
      // topic added to WEBHOOK_ENTITY_TOPICS surfaces here without a code
      // change (its label key is the camelCased topic, e.g. user.created ->
      // form.userCreated). Known families keep local display metadata (their
      // plural i18n keys); a vocabulary prefix the metadata does NOT cover
      // still auto-appears as its own family — with the raw i18n key as its
      // label until someone adds one. A visible ugly label beats a topic the
      // server loudly emits but the picker silently hides (the server-side
      // counterpart is buildEntityTopic's vocabulary assertion).
      ...(() => {
        const knownFamilies = [
          { key: 'users', prefix: 'user' },
          { key: 'companies', prefix: 'company' },
        ];
        const vocabularyPrefixes = [
          ...new Set(WEBHOOK_ENTITY_TOPICS.map((topic) => topic.split('.')[0])),
        ];
        const familyMeta = [
          ...knownFamilies,
          ...vocabularyPrefixes
            .filter((prefix) => !knownFamilies.some((family) => family.prefix === prefix))
            .map((prefix) => ({ key: prefix, prefix })),
        ];
        return familyMeta.map(({ key, prefix }) => ({
          key,
          prefix,
          label: t(`settings.webhooks.picker.families.${key}`),
          groups: [
            {
              key,
              label: '',
              leaves: WEBHOOK_ENTITY_TOPICS.filter((topic) => topic.startsWith(`${prefix}.`)).map(
                (topic) =>
                  fixedLeaf(
                    topic,
                    topic.replace(/\.(\w)/g, (_match, letter: string) => letter.toUpperCase()),
                  ),
              ),
            },
          ],
        }));
      })(),
    ];
  }, [events, t]);

  // ---------------------------------------------------------------------------
  // Coverage (derived from `value`, the stored topics)
  // ---------------------------------------------------------------------------
  const selected = useMemo(() => new Set(value), [value]);
  const hasWildcard = selected.has(WEBHOOK_TOPIC_WILDCARD);
  const familyCovered = (family: Family) => hasWildcard || selected.has(family.prefix);
  const leafCovered = (family: Family, leaf: Leaf) =>
    leaf.noisy ? selected.has(leaf.topic) : familyCovered(family) || selected.has(leaf.topic);
  /** A leaf the user can still flip individually (not swallowed by a prefix). */
  const leafToggleable = (family: Family, leaf: Leaf) => leaf.noisy || !familyCovered(family);

  type TriState = boolean | 'indeterminate';
  const triState = (covered: number, total: number): TriState =>
    covered === 0 ? false : covered === total ? true : 'indeterminate';

  // Scoped to the VISIBLE leaves (the search filter): a group header must
  // never act on — or claim the state of — rows the user cannot see.
  const groupState = (family: Family, leaves: Leaf[]): TriState =>
    triState(leaves.filter((leaf) => leafCovered(family, leaf)).length, leaves.length);
  const familyState = (family: Family): TriState => {
    if (familyCovered(family)) {
      return true;
    }
    const leaves = family.groups.flatMap((group) => group.leaves);
    return triState(leaves.filter((leaf) => leafCovered(family, leaf)).length, leaves.length);
  };
  const allLeaves = families.flatMap((family) =>
    family.groups.flatMap((group) => group.leaves.map((leaf) => ({ family, leaf }))),
  );
  const coveredCount = allLeaves.filter(({ family, leaf }) => leafCovered(family, leaf)).length;
  const rootState: TriState = hasWildcard ? true : triState(coveredCount, allLeaves.length);

  // ---------------------------------------------------------------------------
  // Mutations — each returns the next stored topics array
  // ---------------------------------------------------------------------------
  const without = (topics: string[], drop: Set<string>) =>
    topics.filter((topic) => !drop.has(topic));

  const toggleRoot = (next: boolean) => {
    if (next) {
      // Keep explicit noisy leaves: "*" doesn't cover them, so they'd silently
      // vanish otherwise. Everything else collapses into the wildcard.
      // Derived from the CONSTANT, not only the loaded event list: before the
      // events query settles, allLeaves is empty and a load-time "Select all"
      // would silently drop an existing page_viewed subscription.
      const noisyTopics = new Set([
        ...WEBHOOK_NOISY_EVENTS.map((codeName) => `${WEBHOOK_EVENT_TOPIC_PREFIX}.${codeName}`),
        ...allLeaves.filter(({ leaf }) => leaf.noisy).map(({ leaf }) => leaf.topic),
      ]);
      onChange([WEBHOOK_TOPIC_WILDCARD, ...value.filter((topic) => noisyTopics.has(topic))]);
    } else {
      // Deliberate full clear — including subscriptions with no rendered
      // leaf (topics of since-deleted event definitions): "deselect all" is
      // the one gesture that lets a user shed those orphans, and keeping
      // invisible entries alive would make the picker lie about emptiness.
      onChange([]);
    }
  };

  const toggleFamily = (family: Family, next: boolean) => {
    const familyLeafTopics = new Set(
      family.groups.flatMap((group) => group.leaves.map((leaf) => leaf.topic)),
    );
    if (next) {
      const noisyTopics = new Set(
        family.groups.flatMap((group) =>
          group.leaves.filter((leaf) => leaf.noisy).map((leaf) => leaf.topic),
        ),
      );
      const rest = value.filter((topic) => !familyLeafTopics.has(topic) || noisyTopics.has(topic));
      onChange([...rest, family.prefix]);
    } else {
      onChange(without(value, new Set([family.prefix, ...familyLeafTopics])));
    }
  };

  const toggleGroup = (family: Family, leaves: Leaf[], next: boolean) => {
    const toggleable = leaves.filter((leaf) => leafToggleable(family, leaf));
    const topics = new Set(toggleable.map((leaf) => leaf.topic));
    if (next) {
      onChange([...without(value, topics), ...toggleable.map((leaf) => leaf.topic)]);
    } else {
      onChange(without(value, topics));
    }
  };

  const toggleLeaf = (leaf: Leaf, next: boolean) => {
    if (next) {
      onChange([...without(value, new Set([leaf.topic])), leaf.topic]);
    } else {
      onChange(without(value, new Set([leaf.topic])));
    }
  };

  // ---------------------------------------------------------------------------
  // Search + expand
  // ---------------------------------------------------------------------------
  const searching = query.trim().length > 0;
  const leafMatches = (leaf: Leaf) =>
    !searching || includes(leaf.label, query) || includes(leaf.code, query);
  const isExpanded = (key: string) => searching || expanded.has(key);
  const toggleExpanded = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const visibleFamilies = families
    .map((family) => ({
      family,
      groups: family.groups
        .map((group) => ({ group, leaves: group.leaves.filter(leafMatches) }))
        .filter(({ leaves }) => leaves.length > 0),
    }))
    .filter(({ groups }) => groups.length > 0);

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn('rounded-md border', invalid && 'border-destructive')}>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <RiSearchLine className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('settings.webhooks.picker.search')}
            className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <span className="shrink-0 text-xs text-muted-foreground">
            {t('settings.webhooks.picker.selectedCount', {
              count: coveredCount,
              total: allLeaves.length,
            })}
          </span>
        </div>

        <div className="flex h-9 items-center gap-2 border-b bg-muted/40 px-3">
          <Checkbox
            id="webhook-topic-all"
            checked={rootState}
            // '*' is inherently global — see the family checkbox note.
            disabled={searching}
            onCheckedChange={(next) => toggleRoot(next === true)}
          />
          <Label htmlFor="webhook-topic-all" className="flex items-center gap-1.5 font-medium">
            {t('settings.webhooks.picker.selectAll')}
          </Label>
          <InfoTip text={t('settings.webhooks.picker.selectAllHint')} />
        </div>

        <ScrollArea className="h-72">
          <div className="py-1">
            {visibleFamilies.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t('settings.webhooks.picker.noMatches')}
              </p>
            )}
            {visibleFamilies.map(({ family, groups }) => {
              const flat = groups.length === 1 && groups[0].group.key === family.key;
              const familyLeafCount = family.groups.reduce(
                (sum, group) => sum + group.leaves.length,
                0,
              );
              const familyId = `webhook-family-${family.key}`;
              const open = isExpanded(family.key);
              return (
                <div key={family.key}>
                  <div className="flex h-9 items-center gap-2 px-2 hover:bg-muted/40">
                    <Chevron open={open} onClick={() => toggleExpanded(family.key)} />
                    {/* Whole-family subscription stores the bare prefix, whose
                        legality is governed by WEBHOOK_PREFIX_SUBSCRIPTIONS —
                        an auto-surfaced family whose prefix the server doesn't
                        grant prefix semantics yet gets leaves only: a control
                        that exists must work, absence is honest. */}
                    {WEBHOOK_PREFIX_SUBSCRIPTIONS.includes(family.prefix) && (
                      <Checkbox
                        id={familyId}
                        checked={familyState(family)}
                        // Disabled while searching: the family checkbox stores
                        // a bare PREFIX (covers hidden and future topics), so
                        // it cannot honestly scope to the filtered rows.
                        disabled={hasWildcard || searching}
                        onCheckedChange={(next) => toggleFamily(family, next === true)}
                      />
                    )}
                    <Label
                      // No dangling reference when the family checkbox is not
                      // rendered (prefix without server-side prefix semantics).
                      htmlFor={
                        WEBHOOK_PREFIX_SUBSCRIPTIONS.includes(family.prefix) ? familyId : undefined
                      }
                      className="flex min-w-0 items-center gap-1.5 font-medium"
                    >
                      {family.label}
                    </Label>
                    <InfoTip text={t('settings.webhooks.picker.autoIncludeHint')} />
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {t('settings.webhooks.picker.eventsCount', { count: familyLeafCount })}
                    </span>
                  </div>
                  {open &&
                    (flat
                      ? groups[0].leaves.map((leaf) => (
                          <LeafRow
                            key={leaf.topic}
                            leaf={leaf}
                            depth={1}
                            checked={leafCovered(family, leaf)}
                            disabled={!leafToggleable(family, leaf)}
                            onToggle={(next) => toggleLeaf(leaf, next)}
                            highVolumeLabel={t('settings.webhooks.picker.highVolume')}
                            highVolumeHint={t('settings.webhooks.picker.highVolumeHint')}
                          />
                        ))
                      : groups.map(({ group, leaves }) => {
                          const groupKey = `${family.key}:${group.key}`;
                          const groupOpen = isExpanded(groupKey);
                          const groupId = `webhook-group-${groupKey}`;
                          const disabled = leaves.every((leaf) => !leafToggleable(family, leaf));
                          return (
                            <div key={group.key}>
                              <div className="flex h-8 items-center gap-2 pl-8 pr-2 hover:bg-muted/40">
                                <Chevron
                                  open={groupOpen}
                                  onClick={() => toggleExpanded(groupKey)}
                                />
                                <Checkbox
                                  id={groupId}
                                  checked={groupState(family, leaves)}
                                  disabled={disabled}
                                  onCheckedChange={(next) =>
                                    toggleGroup(family, leaves, next === true)
                                  }
                                />
                                <Label htmlFor={groupId} className="min-w-0 truncate font-normal">
                                  {group.label}
                                </Label>
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                  {t('settings.webhooks.picker.eventsCount', {
                                    count: leaves.length,
                                  })}
                                </span>
                              </div>
                              {groupOpen &&
                                leaves.map((leaf) => (
                                  <LeafRow
                                    key={leaf.topic}
                                    leaf={leaf}
                                    depth={2}
                                    checked={leafCovered(family, leaf)}
                                    disabled={!leafToggleable(family, leaf)}
                                    onToggle={(next) => toggleLeaf(leaf, next)}
                                    highVolumeLabel={t('settings.webhooks.picker.highVolume')}
                                    highVolumeHint={t('settings.webhooks.picker.highVolumeHint')}
                                  />
                                ))}
                            </div>
                          );
                        }))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};

WebhookTopicPicker.displayName = 'WebhookTopicPicker';
