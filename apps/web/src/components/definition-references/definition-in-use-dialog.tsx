import {
  AnnouncementIcon,
  BannerIcon,
  ChecklistIcon,
  EventTrackerIcon,
  Filter2LineIcon,
  FlowIcon,
  LauncherIcon,
  ResourceCenterIcon,
  RiArrowRightUpLine,
  RiErrorWarningLine,
  RiPaletteLine,
} from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import type {
  DefinitionReference,
  DefinitionReferenceKind,
  DefinitionReferenceLocation,
} from '@usertour/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour/ui';
import type { ComponentType } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';
import { referenceHref } from './reference-href';

export interface DefinitionInUseDialogProps {
  kind: DefinitionReferenceKind;
  name: string;
  references: DefinitionReference[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Icon = ComponentType<{ className?: string }>;

const CONTENT_ICONS: Record<string, Icon> = {
  flow: FlowIcon,
  checklist: ChecklistIcon,
  launcher: LauncherIcon,
  banner: BannerIcon,
  tracker: EventTrackerIcon,
  'resource-center': ResourceCenterIcon,
  announcement: AnnouncementIcon,
};

const referrerIcon = (reference: DefinitionReference): Icon => {
  if (reference.referrerKind === 'segment') {
    return Filter2LineIcon;
  }
  if (reference.referrerKind === 'theme') {
    return RiPaletteLine;
  }
  return CONTENT_ICONS[reference.contentType ?? ''] ?? FlowIcon;
};

// Locations the row already says: a segment's conditions, a theme's
// variations, and a content's theme when the theme is what is being deleted.
const IMPLIED_SURFACES = new Set<DefinitionReferenceLocation['surface']>([
  'segmentConditions',
  'themeVariations',
  'versionTheme',
]);

/** Live when a published version uses it, else draft; null off content. */
const referenceState = (reference: DefinitionReference): 'live' | 'draft' | null => {
  const versions = reference.locations.map((location) => location.version);
  if (versions.some((version) => version === 'published' || version === 'draftAndPublished')) {
    return 'live';
  }
  return versions.includes('draft') ? 'draft' : null;
};

const GROUP_ORDER: DefinitionReference['referrerKind'][] = ['content', 'segment', 'theme'];

/**
 * Shown instead of the delete confirmation when something still uses the
 * definition (ADR 0016): what uses it, where, and whether live — each row
 * opening the place to fix it. Not destructive — nothing to confirm, only to
 * close.
 */
export const DefinitionInUseDialog = (props: DefinitionInUseDialogProps) => {
  const { kind, name, references, open, onOpenChange } = props;
  const { t } = useTranslation();
  const { project, environment } = useAppContext();

  const groups = GROUP_ORDER.map((referrerKind) => ({
    referrerKind,
    references: references.filter((reference) => reference.referrerKind === referrerKind),
  })).filter((group) => group.references.length > 0);
  // One kind needs no heading: the icons already tell a flow from a checklist.
  const showHeadings = groups.length > 1;

  const describeLocations = (reference: DefinitionReference) => {
    const places = reference.locations
      .filter((location) => !IMPLIED_SURFACES.has(location.surface))
      .map((location) =>
        t(`definitionReferences.surfaces.${location.surface}`, {
          step: location.step,
          defaultValue: location.surface,
        }),
      );
    return [...new Set(places)].join(' · ');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader className="flex-row gap-4 space-y-0 text-left sm:text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <RiErrorWarningLine className="h-5 w-5 text-warning" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <AlertDialogTitle>
              {t('definitionReferences.dialog.title', {
                resource: t(`definitionReferences.kinds.${kind}`),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                // A theme isn't removed from content, it is swapped for another.
                i18nKey={
                  kind === 'theme'
                    ? 'definitionReferences.dialog.themeDescription'
                    : 'definitionReferences.dialog.description'
                }
                values={{ name }}
                components={{ strong: <strong className="font-bold text-foreground" /> }}
              />
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <div className="ml-14 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-surface/50 p-1">
          {groups.map((group) => (
            <div key={group.referrerKind}>
              {showHeadings && (
                <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                  {t(`definitionReferences.groups.${group.referrerKind}`)}
                </p>
              )}
              <ul>
                {group.references.map((reference) => {
                  const ReferrerIcon = referrerIcon(reference);
                  const locations = describeLocations(reference);
                  const state = referenceState(reference);
                  return (
                    <li key={`${reference.referrerKind}:${reference.id}`}>
                      <Link
                        to={referenceHref(reference, {
                          projectId: project?.id ?? '',
                          environmentId: environment?.id ?? '',
                        })}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-raised/50"
                      >
                        <ReferrerIcon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {reference.name || reference.id}
                          </p>
                          {locations && (
                            <p className="truncate text-xs text-muted-foreground">{locations}</p>
                          )}
                        </div>
                        {state && (
                          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                state === 'live' ? 'bg-success' : 'bg-muted-foreground/40',
                              )}
                            />
                            <span
                              className={
                                state === 'live' ? 'text-foreground' : 'text-muted-foreground'
                              }
                            >
                              {t(`definitionReferences.states.${state}`)}
                            </span>
                          </span>
                        )}
                        <RiArrowRightUpLine
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('definitionReferences.dialog.close')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

DefinitionInUseDialog.displayName = 'DefinitionInUseDialog';
