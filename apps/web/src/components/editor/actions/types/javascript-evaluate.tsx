import { RiCodeLine } from '@usertour/icons';
import { ContentActionsItemType, type RulesCondition } from '@usertour/types';
import { CodeEditor } from '@usertour/ui';
import { useActionsT, useSummaryTextClass } from '../actions-context';
import { registerActionSchema } from '../registry';
import type { ActionTypeSchema } from '../schema-types';

interface JavascriptEvaluateData {
  value?: string;
}

const readData = (condition: RulesCondition): JavascriptEvaluateData =>
  (condition.data as JavascriptEvaluateData | undefined) ?? {};

const writeData = (
  condition: RulesCondition,
  patch: Partial<JavascriptEvaluateData>,
): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

// Cap the inline preview so a long script doesn't bloat the chip. 50 chars
// matches v1 actions-code.tsx — long enough to be recognizable, short
// enough to keep the row aligned with sibling chips.
const SUMMARY_MAX_LENGTH = 50;

function JavascriptEvaluateSummary({ condition }: { condition: RulesCondition }) {
  const t = useActionsT();
  const summaryTextClass = useSummaryTextClass();
  const data = readData(condition);
  const value = (data.value ?? '').trim();

  // Compose prefix + body in JSX rather than via i18next interpolation —
  // i18next escapes interpolated values by default and would mangle code
  // characters like `<`, `>`, `&`, `/` in the preview. Same reasoning as
  // PageNavigateSummary.
  const display =
    value.length > SUMMARY_MAX_LENGTH ? `${value.slice(0, SUMMARY_MAX_LENGTH)}…` : value;

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <RiCodeLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        {value ? (
          <>
            <span className="text-muted-foreground">
              {t('actions.types.javascriptEvaluate.prefix')}
            </span>{' '}
            <span className="font-medium">{display}</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            {t('actions.types.javascriptEvaluate.placeholder')}
          </span>
        )}
      </span>
    </span>
  );
}

function JavascriptEvaluateEditor({
  condition,
  onChange,
}: {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onClose: () => void;
}) {
  const data = readData(condition);
  return (
    <div className="flex flex-col gap-2">
      <CodeEditor
        value={data.value ?? ''}
        onChange={(value) => onChange(writeData(condition, { value }))}
      />
    </div>
  );
}

export const javascriptEvaluateSchema: ActionTypeSchema<JavascriptEvaluateData> = {
  type: ContentActionsItemType.JAVASCRIPT_EVALUATE,
  labelKey: 'actions.types.javascriptEvaluate.label',
  Icon: RiCodeLine,
  defaultData: () => ({ value: '' }),
  Summary: JavascriptEvaluateSummary,
  Editor: JavascriptEvaluateEditor,
  // Match v1's `w-96` (384px) — CodeMirror wraps lines on its own, so the
  // default chip popover width is enough.
  editorWidthClassName: 'w-96',
  // The only repeatable action: a step can fire multiple evaluate-blocks in
  // sequence (e.g., one to set up state and one to clean up).
  repeatable: true,
  validate: (condition) => {
    const data = readData(condition);
    if (!data.value || data.value.trim() === '') {
      return { key: 'actions.errors.javascriptEvaluate.enterCode' };
    }
    return undefined;
  },
};

registerActionSchema(javascriptEvaluateSchema);
