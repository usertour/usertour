import { RenderElementProps } from 'slate-react';

const TodoElement = (props: RenderElementProps) => {
  const { attributes, children } = props;
  return (
    <div {...attributes} className="mb-4 flex items-center">
      <input
        type="checkbox"
        className="mr-2 h-5 w-5 cursor-pointer accent-blue-300 checked:border-0"
        contentEditable={false}
      />
      {children}
    </div>
  );
};

type TodoElementSerializeType = {
  className?: string;
  children: React.ReactNode;
};
export const TodoElementSerialize = (props: TodoElementSerializeType) => {
  const { children } = props;
  return (
    <div className="mb-4 flex items-center">
      <input
        type="checkbox"
        className="mr-2 h-5 w-5 cursor-pointer accent-blue-300 checked:border-0"
      />
      {children}
    </div>
  );
};

export default TodoElement;
