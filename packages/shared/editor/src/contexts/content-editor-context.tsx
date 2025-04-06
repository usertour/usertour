import { uuidV4 } from '@usertour-ui/ui-utils';
import { useToast } from '@usertour-ui/use-toast';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  ContentEditorColumnElement,
  ContentEditorContextProps,
  ContentEditorContextProviderProps,
  ContentEditorElement,
  ContentEditorElementInsertDirection,
  ContentEditorElementType,
  ContentEditorGroupElement,
  ContentEditorRoot,
  ContentEditorRootColumn,
  ContentEditorRootElement,
} from '../types/editor';
import { createNewColumn, createNewGroup, isRestrictedType } from '../utils/helper';

const ContentEditorContext = createContext<ContentEditorContextProps | undefined>(undefined);

export const useContentEditorContext = () => {
  const context = useContext(ContentEditorContext);
  if (!context) {
    throw new Error('useContentEditorContext must be used within a ContentEditorContextProvider.');
  }
  return context;
};

const addID = (contents: ContentEditorRoot[]) => {
  return contents.map((content) => ({
    ...content,
    id: uuidV4(),
    children: content.children.map((column) => ({
      ...column,
      id: uuidV4(),
      children: column.children.map((element) => ({
        ...element,
        id: uuidV4(),
      })),
    })),
  }));
};

const removeID = (contents: ContentEditorRoot[]) => {
  return contents.map(({ id, ...content }) => ({
    ...content,
    children: content.children.map(({ id, ...column }) => ({
      ...column,
      children: column.children.map(({ id, ...element }) => ({
        ...element,
      })),
    })),
  }));
};

// Helper function to check for existing restricted type
export const checkExistingRestrictedType = (
  contents: ContentEditorRoot[],
  elementType: ContentEditorElementType,
) => {
  // If the new element is not a restricted type, we can always add it
  if (!isRestrictedType(elementType)) {
    return true;
  }

  // If the new element is a restricted type, check if any restricted type already exists
  return !contents.some((group) =>
    group.children.some((column) =>
      column.children.some((item) => isRestrictedType(item.element.type)),
    ),
  );
};

// Extract common error message
const RESTRICTED_TYPE_ERROR = {
  variant: 'destructive',
  title: 'Each step can only contain one question. Add a new step instead.',
} as const;

// Helper function to handle restricted type check and show error
const handleRestrictedTypeCheck = (
  contents: ContentEditorRoot[],
  element: ContentEditorElement,
  toast: any,
): boolean => {
  if (!checkExistingRestrictedType(contents, element.type)) {
    toast(RESTRICTED_TYPE_ERROR);
    return false;
  }
  return true;
};

export const ContentEditorContextProvider = ({
  children,
  initialValue = [],
  onValueChange,
  ...props
}: ContentEditorContextProviderProps) => {
  const [isEditorHover, setIsEditorHover] = useState(false);
  const [contents, setContents] = useState<ContentEditorRoot[]>(addID(initialValue));
  const [activeId, setActiveId] = useState<string | undefined>();
  const { toast } = useToast();

  const insertGroupAtTop = (element: ContentEditorElement) => {
    if (!handleRestrictedTypeCheck(contents, element, toast)) return;

    setContents((pre) => {
      const group = createNewGroup([{ element, children: null, id: uuidV4() }]);
      return [group, ...pre];
    });
  };

  const insertGroupAtBottom = (element: ContentEditorElement) => {
    if (!handleRestrictedTypeCheck(contents, element, toast)) return;

    setContents((pre) => [...pre, createNewGroup([{ element, children: null, id: uuidV4() }])]);
  };

  const insertColumnInGroup = (
    element: ContentEditorElement,
    path: number[],
    direction: ContentEditorElementInsertDirection,
  ) => {
    if (!handleRestrictedTypeCheck(contents, element, toast)) return;
    setContents((pre) => {
      const column = createNewColumn([{ element, children: null, id: uuidV4() }]);
      //insert at group
      if (path.length === 1) {
        const index = direction === 'right' ? pre[path[0]].children.length : 0;
        pre[path[0]].children.splice(index, 0, column);
      } else {
        const index =
          direction === 'right'
            ? path[path.length - 1] + 1
            : Math.max(path[path.length - 1] - 1, 0);
        pre[path[0]].children.splice(index, 0, column);
      }
      return [...pre];
    });
  };

  const deleteColumn = (path: number[]) => {
    setContents((pre) => {
      if (pre[path[0]].children.length === 1) {
        pre.splice(path[0], 1);
      } else {
        pre[path[0]].children.splice(path[1], 1);
      }
      return [...pre];
    });
  };

  // path=[1,1,1] group,column,element
  const insertElementInColumn = (
    element: ContentEditorElement,
    path: number[],
    direction: ContentEditorElementInsertDirection,
  ) => {
    setContents((pre) => {
      const index =
        direction === 'right' ? path[path.length - 1] + 1 : Math.max(path[path.length - 1] - 1, 0);
      pre[path[0]].children[path[1]].children.splice(index, 0, {
        element,
        children: null,
        id: uuidV4(),
      });
      return [...pre];
    });
  };

  const deleteElementInColumn = (path: number[]) => {
    setContents((pre) => {
      const childrens = pre[path[0]].children[path[1]].children;
      if (childrens.length === 1) {
        if (pre[path[0]].children.length === 1) {
          pre.splice(path[0], 1);
        } else {
          pre[path[0]].children.splice(path[1], 1);
        }
      } else {
        pre[path[0]].children[path[1]].children.splice(path[2], 1);
      }
      return [...pre];
    });
  };

  const update = (
    list: ContentEditorRoot[] | ContentEditorRootColumn[] | ContentEditorRootElement[],
    id: string,
    element: ContentEditorElement | ContentEditorColumnElement | ContentEditorGroupElement,
  ): any => {
    return list.map((item) => {
      if (item.id === id) {
        return { ...item, element: { ...item.element, ...element } };
      }
      if (item.children) {
        return { ...item, children: update(item.children, id, element) };
      }
      return item;
    });
  };

  const updateElement = (
    element: ContentEditorElement | ContentEditorColumnElement | ContentEditorGroupElement,
    id: string,
  ) => {
    setContents((pre) => {
      return update(pre, id, element);
    });
  };

  useEffect(() => {
    if (onValueChange) {
      onValueChange(removeID(contents));
    }
  }, [contents]);

  const value = {
    ...props,
    contents,
    isEditorHover,
    setIsEditorHover,
    insertColumnInGroup,
    insertGroupAtBottom,
    insertGroupAtTop,
    deleteColumn,
    insertElementInColumn,
    deleteElementInColumn,
    updateElement,
    setContents,
    activeId,
    setActiveId,
  };

  return <ContentEditorContext.Provider value={value}>{children}</ContentEditorContext.Provider>;
};
