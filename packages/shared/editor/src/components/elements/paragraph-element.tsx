import { cn } from '@usertour-ui/ui-utils';
import { RenderElementProps } from 'slate-react';

const ParagraphElement = (props: RenderElementProps & { className?: string }) => {
  const { className, attributes, children } = props;
  return (
    <p className={cn('w-full whitespace-pre-wrap	break-words	', className)} {...attributes}>
      {children}
    </p>
  );
};

type ParagraphElementSerializeType = {
  className?: string;
  children: React.ReactNode;
};
export const ParagraphElementSerialize = (props: ParagraphElementSerializeType) => {
  const { className, children } = props;
  return <p className={cn('w-full whitespace-pre-wrap break-words', className)}>{children}</p>;
};

export default ParagraphElement;
