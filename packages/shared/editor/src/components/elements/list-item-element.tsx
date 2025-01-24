import { cn } from "@usertour-ui/button/src/utils";
import { RenderElementProps } from "slate-react";

const ListItemElement = (
  props: RenderElementProps & { className?: string }
) => {
  const { className, attributes, children } = props;
  return (
    <li className={className} {...attributes}>
      {children}
    </li>
  );
};

type ListItemElementSerializeType = {
  className?: string;
  children: React.ReactNode;
};
export const ListItemElementSerialize = (
  props: ListItemElementSerializeType
) => {
  const { className, children } = props;
  return <li className={className}>{children}</li>;
};

export default ListItemElement;
