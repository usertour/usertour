'use client';

import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useState } from 'react';

export type CodeEditorLanguage = 'javascript' | 'css' | 'html';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  language?: CodeEditorLanguage;
  placeholder?: string;
  readOnly?: boolean;
}

// CodeMirror's theme is a JS extension, not a CSS class, so it can't ride the
// app's `.dark` Tailwind class like everything else. Watch `documentElement`
// for the `dark` class and hand CodeMirror the matching built-in theme.
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

export const CodeEditor = ({
  value,
  onChange,
  height = '200px',
  language = 'javascript',
  placeholder,
  readOnly = false,
}: CodeEditorProps) => {
  const extensions = useMemo(() => {
    switch (language) {
      case 'css':
        return [css()];
      case 'html':
        return [html()];
      default:
        return [javascript({ jsx: false, typescript: false })];
    }
  }, [language]);
  const isDark = useIsDarkMode();

  return (
    <CodeMirror
      value={value}
      height={height}
      theme={isDark ? 'dark' : 'light'}
      basicSetup={
        // Read-only is a viewer, not an editor: strip the editor chrome
        // (fold gutter, active-line highlight) so it reads as a clean snippet.
        readOnly
          ? {
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLine: false,
              highlightActiveLineGutter: false,
              highlightSelectionMatches: false,
            }
          : { lineNumbers: false }
      }
      extensions={extensions}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={onChange}
    />
  );
};

CodeEditor.displayName = 'CodeEditor';
