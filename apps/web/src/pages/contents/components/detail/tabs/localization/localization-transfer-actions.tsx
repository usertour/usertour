import { downloadFile, parseCsv, sanitizeFileBaseName, serializeCsv } from '@/utils/csv';
import type { LocalizationTranslationUnit } from '@usertour/helpers';
import { RiDownload2Line, RiUpload2Line } from '@usertour/icons';
import { Button, useToast } from '@usertour/ui';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Fixed, untranslated column headers so a file exported under one dashboard
// language imports under any other.
const CSV_HEADER = ['path', 'source', 'translation'] as const;

export interface LocalizationTransferActionsProps {
  /** Content name half of the exported file name. */
  contentName: string;
  /** Locale code half of the exported file name. */
  localeCode: string;
  /** Import mutates the translation, so it follows the editor lock. */
  importDisabled: boolean;
  /** Current units — source texts plus whatever is already translated. */
  buildUnits: () => LocalizationTranslationUnit[];
  onImport: (translations: ReadonlyMap<string, string>) => void;
}

export const LocalizationTransferActions = (props: LocalizationTransferActionsProps) => {
  const { contentName, localeCode, importDisabled, buildUnits, onImport } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    const units = buildUnits();
    if (units.length === 0) {
      toast({ variant: 'destructive', title: t('contents.localization.toast.exportEmpty') });
      return;
    }
    const rows = [
      [...CSV_HEADER],
      ...units.map((unit) => [unit.path, unit.sourceText, unit.translatedText]),
    ];
    downloadFile(
      serializeCsv(rows),
      `Usertour-${sanitizeFileBaseName(contentName)}-${localeCode}.csv`,
      'text/csv;charset=utf-8;',
    );
  };

  const handleImportFile = async (file: File) => {
    let rows: string[][];
    try {
      rows = parseCsv(await file.text());
    } catch (_) {
      toast({ variant: 'destructive', title: t('contents.localization.toast.importInvalid') });
      return;
    }

    const dataRows = rows.filter((row) => row.length >= 3);
    const body = dataRows[0]?.[0] === CSV_HEADER[0] ? dataRows.slice(1) : dataRows;
    if (body.length === 0) {
      toast({ variant: 'destructive', title: t('contents.localization.toast.importInvalid') });
      return;
    }

    const validPaths = new Set(buildUnits().map((unit) => unit.path));
    const translations = new Map<string, string>();
    for (const row of body) {
      const [path, , translation] = row;
      if (validPaths.has(path) && translation.trim() !== '') {
        translations.set(path, translation);
      }
    }
    if (translations.size === 0) {
      toast({ variant: 'destructive', title: t('contents.localization.toast.importNoMatches') });
      return;
    }

    onImport(translations);
    toast({
      variant: 'success',
      title: t('contents.localization.toast.importSuccess', { count: translations.size }),
    });
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleExport}>
        <RiDownload2Line className="mr-1 h-4 w-4" />
        {t('contents.localization.exportButton')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={importDisabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <RiUpload2Line className="mr-1 h-4 w-4" />
        {t('contents.localization.importButton')}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so picking the same file again re-triggers the change event.
          event.target.value = '';
          if (file) {
            void handleImportFile(file);
          }
        }}
      />
    </>
  );
};

LocalizationTransferActions.displayName = 'LocalizationTransferActions';
