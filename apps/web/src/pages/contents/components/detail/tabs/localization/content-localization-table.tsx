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
import { useContentLocalizations } from '@/hooks/use-content-localizations';
import { useLocalizationList } from '@/hooks/use-localization-list';
import { useUpdateVersionLocationDataMutation } from '@usertour/hooks';
import { VersionOnLocalization } from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

interface ContentLocalizationTableProps {
  versionId: string;
}

export const ContentLocalizationTable = (props: ContentLocalizationTableProps) => {
  const { versionId } = props;
  const { t } = useTranslation();
  const { contentLocalizationList, loading, refetch } = useContentLocalizations(versionId);
  const { localizationList } = useLocalizationList();
  const { invoke: updateVersionLocation } = useUpdateVersionLocationDataMutation();
  const { toast } = useToast();
  const location = useLocation();

  const handleOnCheckedChange = async (enabled: boolean, contentLocale: VersionOnLocalization) => {
    try {
      const success = await updateVersionLocation({
        localizationId: contentLocale.localizationId,
        versionId: contentLocale.versionId,
        localized: contentLocale.localized,
        backup: contentLocale.backup,
        enabled,
      });
      if (success) {
        await refetch();
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
  if (loading && contentLocalizationList.length === 0) {
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
        {contentLocalizationList ? (
          contentLocalizationList.map((contentLocale: VersionOnLocalization) => (
            <TableRow key={contentLocale.id}>
              <TableCell>
                <Link
                  to={`${location.pathname}/${
                    localizationList?.find((locate) => locate.id === contentLocale.localizationId)
                      ?.locale
                  }`}
                  key={contentLocale.id}
                  className={cn('hover:text-primary hover:underline underline-offset-4')}
                >
                  {
                    localizationList?.find((locate) => locate.id === contentLocale.localizationId)
                      ?.name
                  }
                </Link>
                <span className="ml-2 text-destructive">
                  {t('contents.localization.taskTable.missingCount', { count: 13 })}
                </span>
              </TableCell>
              <TableCell>
                <Switch
                  id="border-switch"
                  checked={contentLocale.enabled}
                  className="data-[state=unchecked]:bg-input"
                  onCheckedChange={(checked: boolean) => {
                    handleOnCheckedChange(checked, contentLocale);
                  }}
                />
              </TableCell>
              <TableCell>{format(new Date(contentLocale.updatedAt), 'PPpp')}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-24 text-center">
              {t('contents.localization.taskTable.noResults')}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

ContentLocalizationTable.displayName = 'ContentLocalizationTable';
