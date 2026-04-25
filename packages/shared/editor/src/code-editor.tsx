'use client';

import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { useMemo } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export const CodeEditor = ({ value, onChange, height = '200px' }: CodeEditorProps) => {
  const extensions = useMemo(() => [javascript({ jsx: false, typescript: false })], []);

  return (
    <CodeMirror
      value={value}
      height={height}
      basicSetup={{ lineNumbers: false }}
      extensions={extensions}
      onChange={onChange}
    />
  );
};

CodeEditor.displayName = 'CodeEditor';
