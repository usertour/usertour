import { CodeEditor, type CodeEditorLanguage } from '@usertour/editor';
import { useTranslation } from 'react-i18next';
import { useBuilderContext } from '../builder-context';
import { FieldRow } from './field-row';

export interface CodeFieldProps {
  path: string;
  label: string;
  language: CodeEditorLanguage;
  placeholder?: string;
  tooltip?: string;
  height?: string;
  // Optional "Learn more" link rendered under the editor — e.g. the custom
  // CSS field points at the custom-fonts-and-css guide.
  docsHref?: string;
}

// Multi-line code field (CodeMirror) — used for the theme's custom CSS,
// where syntax highlighting and bracket matching beat a plain textarea.
export const CodeField = (props: CodeFieldProps) => {
  const { path, label, language, placeholder, tooltip, height = '240px', docsHref } = props;
  const { getField, setField, isReadOnly } = useBuilderContext();
  const { t } = useTranslation();
  const value = getField<string>(path) ?? '';
  return (
    <FieldRow label={label} tooltip={tooltip} forceVertical>
      <div className="overflow-hidden rounded-lg border border-input/60 text-sm">
        <CodeEditor
          value={value}
          language={language}
          placeholder={placeholder}
          readOnly={isReadOnly}
          height={height}
          onChange={(next) => setField(path, next)}
        />
      </div>
      {docsHref && (
        <a
          href={docsHref}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-sm text-primary hover:underline"
        >
          {t('themeBuilder.fields.customCss.docsLink')}
        </a>
      )}
    </FieldRow>
  );
};
