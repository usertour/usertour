import { RenderElementProps } from 'slate-react';

const DividerElement = (props: RenderElementProps) => {
  return (
    <div {...props.attributes} className="flex items-center" contentEditable={false}>
      <span className="hidden select-none">{props.children}</span>
      <hr className="flex-1" />
    </div>
  );
};

type DividerElementSerializeType = {
  className?: string;
  children: React.ReactNode;
};
export const DividerElementSerialize = (props: DividerElementSerializeType) => {
  const { children } = props;
  return (
    <div className="flex items-center">
      <span className="hidden select-none">{children}</span>
      <hr className="flex-1" />
    </div>
  );
};

export default DividerElement;
