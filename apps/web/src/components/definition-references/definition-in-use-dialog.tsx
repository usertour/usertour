import { RiErrorWarningLine } from '@usertour/icons';
import type { DefinitionReference, DefinitionReferenceLocation } from '@usertour/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour/ui';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';
import { referenceHref } from './reference-href';

export interface DefinitionInUseDialogProps {
  /** The definition's noun, already translated — e.g. "attribute". */
  resource: string;
  name: string;
  references: DefinitionReference[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shown instead of the delete confirmation when something still uses the
 * definition (ADR 0016): what uses it and where, each linking to the place to
 * fix it. Not destructive — there is nothing to confirm, only to close.
 */
export const DefinitionInUseDialog = (props: DefinitionInUseDialogProps) => {
  const { resource, name, references, open, onOpenChange } = props;
  const { t } = useTranslation();
  const { project, environment } = useAppContext();

  const describeLocation = (location: DefinitionReferenceLocation) => {
    const place = t(`definitionReferences.surfaces.${location.surface}`, {
      step: location.step,
      defaultValue: location.surface,
    });
    if (!location.version) {
      return place;
    }
    return t('definitionReferences.locationWithVersion', {
      location: place,
      version: t(`definitionReferences.versions.${location.version}`),
    });
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
              {t('definitionReferences.dialog.title', { resource })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="definitionReferences.dialog.description"
                values={{ name }}
                components={{ strong: <strong className="font-bold text-foreground" /> }}
              />
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <ul className="max-h-72 space-y-3 overflow-y-auto pl-14">
          {references.map((reference) => (
            <li key={`${reference.referrerKind}:${reference.id}`} className="min-w-0">
              <div className="flex min-w-0 items-baseline gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">
                  {t(`definitionReferences.referrerKinds.${reference.referrerKind}`)}
                </span>
                <Link
                  to={referenceHref(reference, {
                    projectId: project?.id ?? '',
                    environmentId: environment?.id ?? '',
                  })}
                  onClick={() => onOpenChange(false)}
                  className="min-w-0 truncate font-medium text-primary underline-offset-2 hover:underline"
                >
                  {reference.name || reference.id}
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                {reference.locations.map(describeLocation).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('definitionReferences.dialog.close')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

DefinitionInUseDialog.displayName = 'DefinitionInUseDialog';
