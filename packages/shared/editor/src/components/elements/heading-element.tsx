import { RenderElementProps } from 'slate-react';

import { cn } from '@usertour-packages/tailwind';

export const HeadingElement = (
  props: RenderElementProps & { className?: string; headingSize: 1 | 2 },
) => {
  const { attributes, children, className, headingSize } = props;
  const CustomTag = `h${headingSize}` as 'h1' | 'h2';

  return (
    <div
      {...attributes}
      className={cn(
        'font-bold',
        headingSize === 1 && 'text-3xl',
        headingSize === 2 && 'text-2xl',
        className,
      )}
    >
      <CustomTag>{children}</CustomTag>
    </div>
  );
};

type HeadingElementSerializeType = {
  className?: string;
  headingSize: 1 | 2;
  children: React.ReactNode;
};
export const HeadingElementSerialize = (props: HeadingElementSerializeType) => {
  const { children, headingSize, className } = props;
  const CustomTag = `h${headingSize}` as 'h1' | 'h2';

  return (
    <div
      className={cn(
        'font-bold',
        headingSize === 1 && 'text-3xl',
        headingSize === 2 && 'text-2xl',
        className,
      )}
    >
      <CustomTag>{children}</CustomTag>
    </div>
  );
};

HeadingElement.displayName = 'HeadingElement';
