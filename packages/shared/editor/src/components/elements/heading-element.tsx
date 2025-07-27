import { RenderElementProps } from 'slate-react';

import { cn } from '@usertour-packages/button/src/utils';

export const HeadingElement = (
  props: RenderElementProps & { className?: string; headingSize: 1 | 2 | 3 },
) => {
  const CustomTag = `h${props.headingSize}` as 'h1' | 'h2' | 'h3';

  return (
    <div
      className={cn(
        'font-bold',
        props.headingSize === 1 && 'text-3xl',
        props.headingSize === 2 && 'text-2xl',
        props.headingSize === 3 && 'text-xl',
        props.className,
      )}
    >
      <CustomTag>{props.children}</CustomTag>
    </div>
  );
};

type HeadingElementSerializeType = {
  className?: string;
  headingSize: 1 | 2 | 3;
  children: React.ReactNode;
};
export const HeadingElementSerialize = (props: HeadingElementSerializeType) => {
  const { children, headingSize, className } = props;
  const CustomTag = `h${headingSize}` as 'h1' | 'h2' | 'h3';

  return (
    <div
      className={cn(
        'font-bold',
        headingSize === 1 && 'text-3xl',
        headingSize === 2 && 'text-2xl',
        headingSize === 3 && 'text-xl',
        className,
      )}
    >
      <CustomTag>{children}</CustomTag>
    </div>
  );
};

HeadingElement.display = 'HeadingElement';
