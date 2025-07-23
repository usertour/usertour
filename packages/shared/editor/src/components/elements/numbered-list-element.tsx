import { cn } from '@usertour-packages/button/src/utils';
import { RenderElementProps } from 'slate-react';

const NumberedListElement = (props: RenderElementProps & { className?: string }) => {
  const { className, attributes, children } = props;
  return (
    <ol className={cn('list-decimal list-inside', className)} {...attributes}>
      {children}
    </ol>
  );
};

type NumberedListElementSerializeType = {
  className?: string;
  children: React.ReactNode;
};
export const NumberedListElementSerialize = (props: NumberedListElementSerializeType) => {
  const { className, children } = props;
  return <ol className={cn('list-decimal list-inside', className)}>{children}</ol>;
};

export default NumberedListElement;
