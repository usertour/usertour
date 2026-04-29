import { PagesIcon } from '@usertour-packages/icons';
import type { RulesCondition } from '@usertour/types';
import { useConditionsT, useSummaryTextClass } from '../../conditions-context';
import { ListInput } from '../../primitives/list-input';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateCurrentPage } from '../../validators';

export interface CurrentPageData {
  includes?: string[];
  excludes?: string[];
}

const readData = (condition: RulesCondition): CurrentPageData =>
  (condition.data as CurrentPageData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<CurrentPageData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const cleanList = (values: string[] | undefined): string[] =>
  (values ?? []).map((v) => v.trim()).filter((v) => v !== '');

// ---------- Summary ----------

function CurrentPageSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const summaryTextClass = useSummaryTextClass();
  const data = readData(condition);
  const includes = cleanList(data.includes);
  const excludes = cleanList(data.excludes);

  if (includes.length === 0 && excludes.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <PagesIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{t('conditions.types.currentPage.placeholder')}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <PagesIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        <span>{t('conditions.types.currentPage.prefix')}</span>
        {includes.length > 0 && (
          <>
            {' '}
            <span className="text-muted-foreground">
              {t('conditions.types.currentPage.matches')}
            </span>{' '}
            <span className="font-semibold">{includes.join(', ')}</span>
          </>
        )}
        {includes.length > 0 && excludes.length > 0 && (
          <span className="text-muted-foreground"> {t('conditions.operators.and')}</span>
        )}
        {excludes.length > 0 && (
          <>
            {' '}
            <span className="text-muted-foreground">
              {t('conditions.types.currentPage.notMatches')}
            </span>{' '}
            <span className="font-semibold">{excludes.join(', ')}</span>
          </>
        )}
      </span>
    </span>
  );
}

// ---------- Editor ----------

interface EditorProps {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
}

function CurrentPageEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const data = readData(condition);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t('conditions.types.currentPage.urlMatches')}
        </div>
        <ListInput
          values={data.includes ?? []}
          onChange={(includes) => onChange(writeData(condition, { includes }))}
          placeholder={t('conditions.types.currentPage.urlPlaceholder')}
          addLabelKey="conditions.types.currentPage.addPattern"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t('conditions.types.currentPage.urlNotMatches')}
        </div>
        <ListInput
          values={data.excludes ?? []}
          onChange={(excludes) => onChange(writeData(condition, { excludes }))}
          placeholder={t('conditions.types.currentPage.urlPlaceholder')}
          addLabelKey="conditions.types.currentPage.addPattern"
        />
      </div>
      <a
        href="https://docs.usertour.io/how-to-guides/urls/"
        target="_blank"
        rel="noreferrer"
        className="text-[11px] text-primary hover:text-primary/80"
      >
        {t('conditions.types.currentPage.docsLink')}
      </a>
    </div>
  );
}

// ---------- Normalize ----------

// Strip the trailing empty rows ListInput keeps around for the "+ Add value"
// affordance — those are editor-only UI state and shouldn't reach the
// runtime URL matcher (an empty pattern in includes / excludes would change
// the match set unpredictably).
const normalize = (condition: RulesCondition): RulesCondition => {
  const data = readData(condition);
  return writeData(condition, {
    includes: cleanList(data.includes),
    excludes: cleanList(data.excludes),
  });
};

// ---------- Schema ----------

export const currentPageSchema: ConditionTypeSchema<CurrentPageData> = {
  type: 'current-page',
  labelKey: 'conditions.types.currentPage.label',
  Icon: PagesIcon,
  defaultData: () => ({ includes: [], excludes: [] }),
  Summary: CurrentPageSummary,
  Editor: CurrentPageEditor,
  validate: (condition) => validateCurrentPage(readData(condition)),
  normalize,
};
