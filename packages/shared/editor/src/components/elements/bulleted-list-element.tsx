import { cn } from '@usertour-ui/button/src/utils';
import { RenderElementProps } from 'slate-react';

const BulletedListElement = (props: RenderElementProps & { className?: string }) => {
  const { className, attributes, children } = props;
  return (
    <ul className={cn('list-disc list-inside', className)} {...attributes}>
      {children}
    </ul>
  );
};

type BulletedListElementSerializeType = {
  className?: string;
  children: React.ReactNode;
};
export const BulletedListElementSerialize = (props: BulletedListElementSerializeType) => {
  const { className, children } = props;
  return <ul className={cn('list-disc list-inside', className)}>{children}</ul>;
};

export default BulletedListElement;
