'use client';

import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useState } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
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

export const CodeEditor = ({ value, onChange, height = '200px' }: CodeEditorProps) => {
  const extensions = useMemo(() => [javascript({ jsx: false, typescript: false })], []);
  const isDark = useIsDarkMode();

  return (
    <CodeMirror
      value={value}
      height={height}
      theme={isDark ? 'dark' : 'light'}
      basicSetup={{ lineNumbers: false }}
      extensions={extensions}
      onChange={onChange}
    />
  );
};

CodeEditor.displayName = 'CodeEditor';
