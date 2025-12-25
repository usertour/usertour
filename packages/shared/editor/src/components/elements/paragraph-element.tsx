import { cn } from '@usertour/helpers';
import React from 'react';
import { RenderElementProps } from 'slate-react';

const ParagraphElement = (props: RenderElementProps & { className?: string }) => {
  const { className, attributes, children } = props;
  return (
    <p className={cn('w-full whitespace-pre-wrap break-words', className)} {...attributes}>
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

  // Use React.Children.toArray to properly handle Fragment and filter out null/undefined
  // This correctly detects empty paragraphs (all children are null after serialization)
  const childArray = React.Children.toArray(children);
  const isEmpty = childArray.length === 0;

  return (
    <p className={cn('w-full whitespace-pre-wrap break-words', className)}>
      {isEmpty ? '\u00A0' : children}
    </p>
  );
};

export default ParagraphElement;
