import { CodeEditor, type CodeEditorLanguage } from '@usertour/editor';
import { useBuilderContext } from '../builder-context';
import { FieldRow } from './field-row';

export interface CodeFieldProps {
  path: string;
  label: string;
  language: CodeEditorLanguage;
  placeholder?: string;
  tooltip?: string;
  height?: string;
}

// Multi-line code field (CodeMirror) — used for the theme's custom CSS,
// where syntax highlighting and bracket matching beat a plain textarea.
export const CodeField = (props: CodeFieldProps) => {
  const { path, label, language, placeholder, tooltip, height = '240px' } = props;
  const { getField, setField, isReadOnly } = useBuilderContext();
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
    </FieldRow>
  );
};
