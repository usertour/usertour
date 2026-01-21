import { isRestrictedType, uuidV4 } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type {
  ContentEditorColumnElement,
  ContentEditorContextProps,
  ContentEditorContextProviderProps,
  ContentEditorElement,
  ContentEditorGroupElement,
  ContentEditorRoot,
  ContentEditorRootColumn,
  ContentEditorRootElement,
} from '../types/editor';
import { ContentEditorElementInsertDirection, ContentEditorElementType } from '../types/editor';
import { createNewColumn, createNewGroup } from '../utils/helper';

const ContentEditorContext = createContext<ContentEditorContextProps | undefined>(undefined);

export const useContentEditorContext = () => {
  const context = useContext(ContentEditorContext);
  if (!context) {
    throw new Error('useContentEditorContext must be used within a ContentEditorContextProvider.');
  }
  return context;
};

const addID = (contents: ContentEditorRoot[]): ContentEditorRoot[] => {
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

const removeID = (contents: ContentEditorRoot[]): ContentEditorRoot[] => {
  return contents.map(({ id: _id, ...content }) => ({
    ...content,
    children: content.children.map(({ id: _colId, ...column }) => ({
      ...column,
      children: column.children.map(({ id: _elemId, ...element }) => ({
        ...element,
      })),
    })),
  })) as ContentEditorRoot[];
};

// Helper function to check for existing restricted type
export const checkExistingRestrictedType = (
  contents: ContentEditorRoot[],
  elementType: ContentEditorElementType,
): boolean => {
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

// Helper to insert item at index immutably
const insertAt = <T,>(array: T[], index: number, item: T): T[] => [
  ...array.slice(0, index),
  item,
  ...array.slice(index),
];

// Helper to remove item at index immutably
const removeAt = <T,>(array: T[], index: number): T[] => [
  ...array.slice(0, index),
  ...array.slice(index + 1),
];

export const ContentEditorContextProvider = ({
  children,
  initialValue = [],
  onValueChange,
  ...props
}: ContentEditorContextProviderProps) => {
  const [isEditorHover, setIsEditorHover] = useState(false);
  const [contents, setContents] = useState<ContentEditorRoot[]>(() => addID(initialValue));
  const [activeId, setActiveId] = useState<string | undefined>();
  const { toast } = useToast();

  // Use ref to avoid stale closure issues with onValueChange
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  // Helper function to handle restricted type check and show error
  const handleRestrictedTypeCheck = useCallback(
    (currentContents: ContentEditorRoot[], element: ContentEditorElement): boolean => {
      if (!checkExistingRestrictedType(currentContents, element.type)) {
        toast(RESTRICTED_TYPE_ERROR);
        return false;
      }
      return true;
    },
    [toast],
  );

  const insertGroupAtTop = useCallback(
    (element: ContentEditorElement) => {
      setContents((prev) => {
        if (!handleRestrictedTypeCheck(prev, element)) return prev;
        const group = createNewGroup([{ element, children: null, id: uuidV4() }]);
        return [group, ...prev];
      });
    },
    [handleRestrictedTypeCheck],
  );

  const insertGroupAtBottom = useCallback(
    (element: ContentEditorElement) => {
      setContents((prev) => {
        if (!handleRestrictedTypeCheck(prev, element)) return prev;
        return [...prev, createNewGroup([{ element, children: null, id: uuidV4() }])];
      });
    },
    [handleRestrictedTypeCheck],
  );

  const insertColumnInGroup = useCallback(
    (
      element: ContentEditorElement,
      path: number[],
      direction: ContentEditorElementInsertDirection,
    ) => {
      setContents((prev) => {
        if (!handleRestrictedTypeCheck(prev, element)) return prev;

        const column = createNewColumn([{ element, children: null, id: uuidV4() }]);
        const groupIndex = path[0];

        // Calculate insert index
        let insertIndex: number;
        if (path.length === 1) {
          // Insert at group level
          insertIndex = direction === 'right' ? prev[groupIndex].children.length : 0;
        } else {
          // Insert relative to column
          insertIndex =
            direction === 'right'
              ? path[path.length - 1] + 1
              : Math.max(path[path.length - 1] - 1, 0);
        }

        // Immutable update
        return prev.map((group, idx) => {
          if (idx !== groupIndex) return group;
          return {
            ...group,
            children: insertAt(group.children, insertIndex, column),
          };
        });
      });
    },
    [handleRestrictedTypeCheck],
  );

  const deleteColumn = useCallback((path: number[]) => {
    setContents((prev) => {
      const groupIndex = path[0];
      const columnIndex = path[1];
      const group = prev[groupIndex];

      // If only one column, remove the entire group
      if (group.children.length === 1) {
        return removeAt(prev, groupIndex);
      }

      // Otherwise, remove just the column
      return prev.map((g, idx) => {
        if (idx !== groupIndex) return g;
        return {
          ...g,
          children: removeAt(g.children, columnIndex),
        };
      });
    });
  }, []);

  // path=[groupIndex, columnIndex, elementIndex]
  const insertElementInColumn = useCallback(
    (
      element: ContentEditorElement,
      path: number[],
      direction: ContentEditorElementInsertDirection,
    ) => {
      setContents((prev) => {
        const groupIndex = path[0];
        const columnIndex = path[1];
        const elementIndex = path[path.length - 1];

        const insertIndex =
          direction === 'right' ? elementIndex + 1 : Math.max(elementIndex - 1, 0);

        const newElement: ContentEditorRootElement = {
          element,
          children: null,
          id: uuidV4(),
        };

        return prev.map((group, gIdx) => {
          if (gIdx !== groupIndex) return group;
          return {
            ...group,
            children: group.children.map((column, cIdx) => {
              if (cIdx !== columnIndex) return column;
              return {
                ...column,
                children: insertAt(column.children, insertIndex, newElement),
              };
            }),
          };
        });
      });
    },
    [],
  );

  const deleteElementInColumn = useCallback((path: number[]) => {
    setContents((prev) => {
      const groupIndex = path[0];
      const columnIndex = path[1];
      const elementIndex = path[2];

      const group = prev[groupIndex];
      const column = group.children[columnIndex];
      const elements = column.children;

      // If only one element in column
      if (elements.length === 1) {
        // If only one column in group, remove entire group
        if (group.children.length === 1) {
          return removeAt(prev, groupIndex);
        }
        // Otherwise, remove the column
        return prev.map((g, gIdx) => {
          if (gIdx !== groupIndex) return g;
          return {
            ...g,
            children: removeAt(g.children, columnIndex),
          };
        });
      }

      // Remove just the element
      return prev.map((g, gIdx) => {
        if (gIdx !== groupIndex) return g;
        return {
          ...g,
          children: g.children.map((col, cIdx) => {
            if (cIdx !== columnIndex) return col;
            return {
              ...col,
              children: removeAt(col.children, elementIndex),
            };
          }),
        };
      });
    });
  }, []);

  // Recursive update function with proper typing
  type ContentItem = ContentEditorRoot | ContentEditorRootColumn | ContentEditorRootElement;
  type ContentChildren = ContentEditorRootColumn[] | ContentEditorRootElement[] | null;

  const updateRecursive = useCallback(
    (
      list: ContentItem[],
      id: string,
      newElement: ContentEditorElement | ContentEditorColumnElement | ContentEditorGroupElement,
    ): ContentItem[] => {
      return list.map((item) => {
        if (item.id === id) {
          return { ...item, element: { ...item.element, ...newElement } } as ContentItem;
        }
        const itemChildren = item.children as ContentChildren;
        if (itemChildren && Array.isArray(itemChildren)) {
          return {
            ...item,
            children: updateRecursive(itemChildren, id, newElement),
          } as ContentItem;
        }
        return item;
      });
    },
    [],
  );

  const updateElement = useCallback(
    (
      element: ContentEditorElement | ContentEditorColumnElement | ContentEditorGroupElement,
      id: string,
    ) => {
      setContents((prev) => updateRecursive(prev, id, element) as ContentEditorRoot[]);
    },
    [updateRecursive],
  );

  // Use ref pattern to avoid adding onValueChange to dependency array
  useEffect(() => {
    const callback = onValueChangeRef.current;
    if (callback) {
      callback(removeID(contents));
    }
  }, [contents]);

  const value: ContentEditorContextProps = {
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
