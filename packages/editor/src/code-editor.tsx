'use client';

import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useState } from 'react';

export type CodeEditorLanguage = 'javascript' | 'css';

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
  const extensions = useMemo(
    () => [language === 'css' ? css() : javascript({ jsx: false, typescript: false })],
    [language],
  );
  const isDark = useIsDarkMode();

  return (
    <CodeMirror
      value={value}
      height={height}
      theme={isDark ? 'dark' : 'light'}
      basicSetup={{ lineNumbers: false }}
      extensions={extensions}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={onChange}
    />
  );
};

CodeEditor.displayName = 'CodeEditor';
