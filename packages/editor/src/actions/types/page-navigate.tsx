import { PagesIcon } from '@usertour/icons';
import { Tabs, TabsList, TabsTrigger } from '@usertour/tabs';
import { serializeMini as serializeMiniWidget } from '@usertour/widget/src/serialize/utils';
import type { DescendantNode } from '@usertour/widget/src/serialize/types';
import { ContentActionsItemType, type RulesCondition } from '@usertour/types';
import type { Descendant } from 'slate';
import { useActionsContext, useActionsT, useSummaryTextClass } from '../actions-context';
import { PopperEditorMini } from '../../richtext-editor/editor';
import { registerActionSchema } from '../registry';
import type { ActionTypeSchema } from '../schema-types';

interface PageNavigateData {
  openType?: 'same' | 'new';
  value?: Descendant[];
}

const DEFAULT_VALUE: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'https://' }],
  },
];

const SUMMARY_MAX_LENGTH = 50;

// Bridge slate's Descendant onto the widget serializer's expected node
// shape. The two type definitions are structurally identical but live in
// separate packages, so we cast at the boundary instead of widening the
// serializer's signature.
const serializeMini = (node: Descendant): string =>
  serializeMiniWidget(node as unknown as DescendantNode);

const readData = (condition: RulesCondition): PageNavigateData =>
  (condition.data as PageNavigateData | undefined) ?? {};

const writeData = (
  condition: RulesCondition,
  patch: Partial<PageNavigateData>,
): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const serializeAll = (value: Descendant[] | undefined): string =>
  (value ?? []).map((node) => serializeMini(node)).join('');

function PageNavigateSummary({ condition }: { condition: RulesCondition }) {
  const t = useActionsT();
  const summaryTextClass = useSummaryTextClass();
  const data = readData(condition);
  const serialized = serializeAll(data.value).trim();
  const hasValue = serialized.length > 0 && serialized !== 'https://';

  // Compose prefix + value in JSX instead of passing the URL through
  // i18next interpolation. i18next defaults to `escapeValue: true`, which
  // HTML-encodes special chars in interpolated values (`/` → `&#x2F;`) and
  // would produce a chip reading literal entities. Disabling escaping
  // globally would leak any future XSS surface, so we keep the URL out of
  // the interpolation path entirely.
  const display = (() => {
    if (!hasValue) return null;
    if (serialized.length > SUMMARY_MAX_LENGTH) {
      return `${serialized.slice(0, SUMMARY_MAX_LENGTH)}…`;
    }
    return serialized;
  })();

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <PagesIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        {display ? (
          <>
            <span className="text-muted-foreground">{t('actions.types.pageNavigate.prefix')}</span>{' '}
            <span className="font-semibold">{display}</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            {t('actions.types.pageNavigate.placeholder')}
          </span>
        )}
      </span>
    </span>
  );
}

function PageNavigateEditor({
  condition,
  onChange,
}: {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onClose: () => void;
}) {
  const t = useActionsT();
  const { attributes, baseZIndex } = useActionsContext();
  const data = readData(condition);
  const value = data.value ?? DEFAULT_VALUE;
  const openType = data.openType ?? 'same';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-sm">{t('actions.types.pageNavigate.urlLabel')}</span>
        <PopperEditorMini
          zIndex={baseZIndex + 200}
          attributes={attributes}
          initialValue={value}
          onValueChange={(nextValue) => onChange(writeData(condition, { value: nextValue }))}
        />
      </div>
      <Tabs
        className="w-full"
        defaultValue={openType}
        onValueChange={(nextOpenType) =>
          onChange(writeData(condition, { openType: nextOpenType as 'same' | 'new' }))
        }
      >
        <TabsList className="h-auto w-full">
          <TabsTrigger value="same" className="w-1/2" variant="primary">
            {t('actions.types.pageNavigate.sameTab')}
          </TabsTrigger>
          <TabsTrigger value="new" className="w-1/2" variant="primary">
            {t('actions.types.pageNavigate.newTab')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export const pageNavigateSchema: ActionTypeSchema<PageNavigateData> = {
  type: ContentActionsItemType.PAGE_NAVIGATE,
  labelKey: 'actions.types.pageNavigate.label',
  Icon: PagesIcon,
  defaultData: () => ({ openType: 'same', value: DEFAULT_VALUE }),
  Summary: PageNavigateSummary,
  Editor: PageNavigateEditor,
  editorWidthClassName: 'w-96',
  validate: (condition) => {
    const data = readData(condition);
    const serialized = serializeAll(data.value).trim();
    if (!serialized || serialized === 'https://') {
      return { key: 'actions.errors.pageNavigate.enterUrl' };
    }
    return undefined;
  },
};

registerActionSchema(pageNavigateSchema);
