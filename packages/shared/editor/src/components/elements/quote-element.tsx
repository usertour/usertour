import { RenderElementProps } from "slate-react";

const QuoteElement = (props: RenderElementProps) => {
  return (
    <blockquote className="border-l-4 border-black pl-4" {...props.attributes}>
      {props.children}
    </blockquote>
  );
};

type QuoteElementSerializeType = {
  className?: string;
  children: React.ReactNode;
};
export const QuoteElementSerialize = (props: QuoteElementSerializeType) => {
  const { className, children } = props;
  return (
    <blockquote className="border-l-4 border-black pl-4">{children}</blockquote>
  );
};

export default QuoteElement;
