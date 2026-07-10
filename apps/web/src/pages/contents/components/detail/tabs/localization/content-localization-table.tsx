import {
  ListSkeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@usertour/ui';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentLocalizations } from '@/hooks/use-content-localizations';
import { useLocalizationList } from '@/hooks/use-localization-list';
import { resolveEditableVersionId } from '@/utils/content';
import {
  useCreateContentVersionMutation,
  useUpsertVersionLocalizationMutation,
} from '@usertour/hooks';
import { countMissingTranslations, countMissingVersionDataTranslations } from '@usertour/helpers';
import {
  ContentDataType,
  ContentVersion,
  Localization,
  LocalizedFlowContent,
  VersionOnLocalization,
} from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

interface ContentLocalizationTableProps {
  contentType: string;
  version: ContentVersion;
}

/** Required units the locale's translation doesn't cover — flow counts over steps, the rest over version.data. */
const countVersionMissing = (
  contentType: string,
  version: ContentVersion,
  localized: VersionOnLocalization['localized'] | undefined,
): number => {
  if (contentType === ContentDataType.FLOW) {
    const flowLocalized = localized as LocalizedFlowContent | null | undefined;
    return (version.steps ?? []).reduce((missing, step) => {
      if (!step.data) {
        return missing;
      }
      const stepLocalized = step.cvid ? flowLocalized?.[step.cvid] : undefined;
      return missing + countMissingTranslations(step.data, stepLocalized);
    }, 0);
  }
  return countMissingVersionDataTranslations(contentType, version.data ?? {}, localized);
};

export const ContentLocalizationTable = (props: ContentLocalizationTableProps) => {
  const { contentType, version } = props;
  const { t } = useTranslation();
  const { contentId } = useContentDetailUI();
  const { content, refetch: refetchContent } = useContentDetail(contentId);
  const { contentLocalizationList, loading } = useContentLocalizations(version.id);
  const { localizationList, loading: localizationsLoading } = useLocalizationList();
  const { invoke: upsertVersionLocalization } = useUpsertVersionLocalizationMutation();
  const { invoke: createContentVersion } = useCreateContentVersionMutation();
  const { toast } = useToast();
  const location = useLocation();

  // The default locale is what the content is authored in — there is nothing
  // to translate into it, so it never gets a row here.
  const locales = useMemo(
    () => (localizationList ?? []).filter((localization) => !localization.isDefault),
    [localizationList],
  );

  const rowByLocalizationId = useMemo(
    () =>
      new Map(
        contentLocalizationList.map((contentLocalization) => [
          contentLocalization.localizationId,
          contentLocalization,
        ]),
      ),
    [contentLocalizationList],
  );

  const missingByLocalizationId = useMemo(
    () =>
      new Map(
        locales.map((localization) => {
          const row = rowByLocalizationId.get(localization.id);
          return [localization.id, countVersionMissing(contentType, version, row?.localized)];
        }),
      ),
    [locales, rowByLocalizationId, contentType, version],
  );

  const handleOnCheckedChange = async (
    enabled: boolean,
    localization: Localization,
    row: VersionOnLocalization | undefined,
  ) => {
    if (!content) {
      return;
    }
    try {
      // Toggling on a published version forks a draft first (same behavior as
      // "Edit in builder"); the fork copies every translation row, so writing
      // the pre-fork row payload onto the draft only changes `enabled`. The
      // refetch repoints the page at the draft.
      const editableVersionId = await resolveEditableVersionId(
        content,
        version.id,
        createContentVersion,
      );
      const success = await upsertVersionLocalization({
        localizationId: localization.id,
        versionId: editableVersionId,
        localized: row?.localized ?? {},
        backup: row?.backup ?? {},
        enabled,
      });
      if (editableVersionId !== version.id) {
        await refetchContent();
      }
      if (success) {
        toast({
          variant: 'success',
          title: t('contents.localization.toast.applySuccess'),
        });
      }
    } catch (_) {
      toast({
        variant: 'destructive',
        title: t('contents.localization.toast.applyFailure'),
      });
    }
  };

  // First-load gating only — once rows are in cache, a background
  // refetch shouldn't flash the skeleton in place of the table.
  if ((loading || localizationsLoading) && locales.length === 0) {
    return <ListSkeleton />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-2/4">{t('contents.localization.taskTable.locale')}</TableHead>
          <TableHead className="w-1/4">{t('contents.localization.taskTable.status')}</TableHead>
          <TableHead className="w-1/4">{t('contents.localization.taskTable.updatedAt')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locales.length > 0 ? (
          locales.map((localization) => {
            const row = rowByLocalizationId.get(localization.id);
            const missingCount = missingByLocalizationId.get(localization.id) ?? 0;
            return (
              <TableRow key={localization.id}>
                <TableCell>
                  <Link
                    to={`${location.pathname}/${localization.locale}`}
                    className={cn('hover:text-primary hover:underline underline-offset-4')}
                  >
                    {localization.name}
                  </Link>
                  {missingCount > 0 && (
                    <span className="ml-2 text-destructive">
                      {t('contents.localization.taskTable.missingCount', { count: missingCount })}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={row?.enabled ?? false}
                    className="data-[state=unchecked]:bg-input"
                    onCheckedChange={(checked: boolean) => {
                      handleOnCheckedChange(checked, localization, row);
                    }}
                  />
                </TableCell>
                <TableCell>{row ? format(new Date(row.updatedAt), 'PPpp') : '-'}</TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center">
              {t('contents.localization.taskTable.noLocales')}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

ContentLocalizationTable.displayName = 'ContentLocalizationTable';
