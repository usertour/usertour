import { cn } from '@usertour-ui/button/src/utils';
import { RenderElementProps } from 'slate-react';

export const CodeElement = (props: RenderElementProps & { className?: string }) => {
  const { className } = props;
  return (
    <pre className={cn('rounded bg-gray-100 p-8 font-mono text-sm text-gray-800', className)}>
      <code {...props.attributes}>{props.children}</code>
    </pre>
  );
};

type CodeElementSerializeType = {
  className?: string;
  children: React.ReactNode;
};
export const CodeElementSerialize = (props: CodeElementSerializeType) => {
  const { className, children } = props;
  return (
    <pre className={cn('rounded bg-gray-100 p-8 font-mono text-sm text-gray-800', className)}>
      <code>{children}</code>
    </pre>
  );
};

CodeElement.display = 'CodeElement';
