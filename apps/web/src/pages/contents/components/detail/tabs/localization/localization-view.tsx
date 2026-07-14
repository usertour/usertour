import type { LocalizationTranslationUnit } from '@usertour/helpers';
import { RiCheckLine } from '@usertour/icons';
import { Card } from '@usertour/ui';
import { ReactNode, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// View context — the shell owns the "only untranslated" filter and the
// single-unit machine-translation callback; rows and group cards read both
// from context instead of threading props through every section component.
// ---------------------------------------------------------------------------

export interface LocalizationViewContextValue {
  /** Hide rows that already carry a translation. */
  showOnlyMissing: boolean;
  /**
   * Translate one source text; null when machine translation is unavailable
   * (not configured, plan-locked, or the editor is read-only).
   */
  translateText: ((sourceText: string) => Promise<string | null>) | null;
}

const LocalizationViewContext = createContext<LocalizationViewContextValue>({
  showOnlyMissing: false,
  translateText: null,
});

export const LocalizationViewProvider = LocalizationViewContext.Provider;

export const useLocalizationView = (): LocalizationViewContextValue => {
  return useContext(LocalizationViewContext);
};

// ---------------------------------------------------------------------------
// Per-group counting over transfer units — cards report how much translation
// work is left inside them by filtering the flat unit list by path.
// ---------------------------------------------------------------------------

export const isUnitMissing = (unit: LocalizationTranslationUnit): boolean => {
  return !unit.optional && unit.translatedText.trim() === '';
};

export const countMissingUnits = (
  units: LocalizationTranslationUnit[],
  matchesPath: (path: string) => boolean = () => true,
): number => {
  return units.filter((unit) => matchesPath(unit.path) && isUnitMissing(unit)).length;
};

export const countOutdatedPaths = (
  outdatedPaths: Set<string> | undefined,
  matchesPath: (path: string) => boolean = () => true,
): number => {
  if (!outdatedPaths) {
    return 0;
  }
  return [...outdatedPaths].filter(matchesPath).length;
};

// ---------------------------------------------------------------------------
// Group card — one card per translation group (flow step or version-data
// section) with the group's remaining work in the header. Skipping finished
// groups is the filter's job, so cards never collapse.
// ---------------------------------------------------------------------------

export interface LocalizationGroupCardProps {
  title: string;
  missingCount: number;
  outdatedCount: number;
  children: ReactNode;
}

export const LocalizationGroupCard = (props: LocalizationGroupCardProps) => {
  const { title, missingCount, outdatedCount, children } = props;
  const { t } = useTranslation();
  const { showOnlyMissing } = useLocalizationView();

  if (showOnlyMissing && missingCount === 0) {
    return null;
  }

  return (
    <Card className="flex flex-col p-4">
      <div className="flex w-full items-center gap-3">
        <span className="min-w-0 truncate font-medium">{title}</span>
        <span className="ml-auto flex flex-none items-center gap-3 text-xs text-muted-foreground">
          {missingCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive/70" />
              {t('contents.localization.cardMissing', { count: missingCount })}
            </span>
          )}
          {outdatedCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              {t('contents.localization.cardOutdated', { count: outdatedCount })}
            </span>
          )}
          {missingCount === 0 && outdatedCount === 0 && (
            <RiCheckLine
              className="h-4 w-4 text-success"
              aria-label={t('contents.localization.allTranslated')}
            />
          )}
        </span>
      </div>
      <div className="flex flex-col gap-4 pt-4">{children}</div>
    </Card>
  );
};

LocalizationGroupCard.displayName = 'LocalizationGroupCard';
