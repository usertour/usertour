import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { EDITOR_OVERLAY } from '@usertour-ui/constants';
import { isUndefined } from '@usertour-ui/shared-utils';
import { BizUserInfo } from '@usertour-ui/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Descendant } from 'slate';
import {
  ContentEditorContextProvider,
  useContentEditorContext,
} from '../contexts/content-editor-context';
import {
  ContentEditorClickableElement,
  ContentEditorElementType,
  ContentEditorProps,
  ContentEditorRoot,
  ContentEditorRootColumn,
  ContentEditorRootElement,
  ContentEditorSideBarType,
} from '../types/editor';
import { defaultInitialValue, isClickableElement } from '../utils/helper';
import { ContentEditorButton, ContentEditorButtonSerialize } from './components/button';
import {
  ContentEditorColumn,
  ContentEditorColumnOverlay,
  ContentEditorColumnSerialize,
} from './components/column';
import { ContentEditorEmbed, ContentEditorEmbedSerialize } from './components/embed';
import {
  ContentEditorGroup,
  ContentEditorGroupOverlay,
  ContentEditorGroupSerialize,
} from './components/group';
import { ContentEditorImage, ContentEditorImageSerialize } from './components/image';
import { ContentEditorMultiLineText } from './components/multi-line-text';
import { ContentEditorMultiLineTextSerialize } from './components/multi-line-text';
import {
  ContentEditorMultipleChoice,
  ContentEditorMultipleChoiceSerialize,
} from './components/multiple-choice';
import { ContentEditorNPS, ContentEditorNPSSerialize } from './components/nps';
import { ContentEditorRichText, ContentEditorRichTextSerialize } from './components/rich-text';
import { ContentEditorScale } from './components/scale';
import { ContentEditorScaleSerialize } from './components/scale';
import { ContentEditorSideBar } from './components/sidebar';
import { ContentEditorSingleLineTextSerialize } from './components/single-line-text';
import { ContentEditorSingleLineText } from './components/single-line-text';
import { ContentEditorStarRatingSerialize } from './components/star-rating';
import { ContentEditorStarRating } from './components/star-rating';

export const contentEditorElements = [
  {
    type: ContentEditorElementType.GROUP,
    render: ContentEditorGroup,
    serialize: ContentEditorGroupSerialize,
  },
  {
    type: ContentEditorElementType.COLUMN,
    render: ContentEditorColumn,
    serialize: ContentEditorColumnSerialize,
  },
  {
    type: ContentEditorElementType.BUTTON,
    render: ContentEditorButton,
    serialize: ContentEditorButtonSerialize,
  },
  {
    type: ContentEditorElementType.IMAGE,
    render: ContentEditorImage,
    serialize: ContentEditorImageSerialize,
  },
  {
    type: ContentEditorElementType.TEXT,
    render: ContentEditorRichText,
    serialize: ContentEditorRichTextSerialize,
  },
  {
    type: ContentEditorElementType.EMBED,
    render: ContentEditorEmbed,
    serialize: ContentEditorEmbedSerialize,
  },
  {
    type: ContentEditorElementType.NPS,
    render: ContentEditorNPS,
    serialize: ContentEditorNPSSerialize,
  },
  {
    type: ContentEditorElementType.STAR_RATING,
    render: ContentEditorStarRating,
    serialize: ContentEditorStarRatingSerialize,
  },
  {
    type: ContentEditorElementType.SCALE,
    render: ContentEditorScale,
    serialize: ContentEditorScaleSerialize,
  },
  {
    type: ContentEditorElementType.SINGLE_LINE_TEXT,
    render: ContentEditorSingleLineText,
    serialize: ContentEditorSingleLineTextSerialize,
  },
  {
    type: ContentEditorElementType.MULTI_LINE_TEXT,
    render: ContentEditorMultiLineText,
    serialize: ContentEditorMultiLineTextSerialize,
  },
  {
    type: ContentEditorElementType.MULTIPLE_CHOICE,
    render: ContentEditorMultipleChoice,
    serialize: ContentEditorMultipleChoiceSerialize,
  },
];

const getLinkUrl = (value: Descendant[], userInfo: BizUserInfo) => {
  let url = '';
  try {
    for (const v of value) {
      if ('children' in v) {
        for (const vc of v.children) {
          if ('type' in vc && vc.type === 'user-attribute') {
            if (userInfo) {
              url += userInfo.data[vc.attrCode] || vc.fallback;
            }
          } else if ('text' in vc) {
            url += vc.text;
          }
        }
      }
    }
  } catch (_) {}
  return url;
};

const replaceUserAttrForElement = (data: Descendant[], userInfo: BizUserInfo) => {
  return data.map((v: any) => {
    if (v.children) {
      v.children = replaceUserAttrForElement(v.children, userInfo);
    }
    if (v.type === 'user-attribute' && userInfo.data) {
      const value = userInfo.data[v.attrCode] || v.fallback;
      if (!isUndefined(value)) {
        v.value = String(value);
      }
    }
    if (v.type === 'link' && userInfo.data) {
      v.url = v.data ? getLinkUrl(v.data, userInfo) : '';
    }
    return v;
  });
};

export const replaceUserAttr = (editorContents: ContentEditorRoot[], userInfo: BizUserInfo) => {
  return editorContents.map((editorContent: ContentEditorRoot) => {
    if (!editorContent.children) {
      return editorContent;
    }
    return {
      ...editorContent,
      children: editorContent.children.map((column) => {
        if (!column.children) {
          return column;
        }
        return {
          ...column,
          children: column.children.map((element) => {
            if (element.element.type === ContentEditorElementType.TEXT) {
              return {
                ...element,
                element: {
                  ...element.element,
                  data: replaceUserAttrForElement(element.element.data, userInfo),
                },
              };
            }
            return { ...element };
          }),
        };
      }),
    };
  });
};

export const ContentEditorSerialize = (props: {
  contents: ContentEditorRoot[];
  userInfo?: BizUserInfo;
  onClick?: (element: ContentEditorClickableElement, value?: any) => void;
}) => {
  const { contents, onClick, userInfo } = props;
  const editorContents = userInfo ? replaceUserAttr(contents, userInfo) : contents;

  return (
    <>
      {editorContents.map((content, i) => (
        <ContentEditorGroupSerialize key={i}>
          {content.children.map((column, ii) => (
            <ContentEditorColumnSerialize element={column.element} key={ii}>
              {column.children.map((element, iii) => {
                const mapping = contentEditorElements.find((e) => e.type === element.element.type);
                if (!mapping) {
                  return <></>;
                }

                const Comp = mapping.serialize as any;
                if (isClickableElement(element.element as ContentEditorClickableElement)) {
                  return (
                    <Comp
                      element={element.element as ContentEditorClickableElement}
                      onClick={onClick}
                      key={iii}
                    />
                  );
                }
                return <Comp element={element.element} key={iii} />;
              })}
            </ContentEditorColumnSerialize>
          ))}
        </ContentEditorGroupSerialize>
      ))}
    </>
  );
};

interface ContentEditorRenderElementProps {
  elements: ContentEditorRootElement[];
  parentPath: number[];
}

const ContentEditorRenderElement = (props: ContentEditorRenderElementProps) => {
  const { parentPath, elements } = props;
  return (
    <>
      {elements.map((c, i) => {
        const mapping = contentEditorElements.find((e) => e.type === c.element.type);
        if (!mapping) {
          return <></>;
        }
        const Comp = mapping.render as any;
        return <Comp element={c.element} key={c.id} path={[...parentPath, i]} id={c.id} />;
      })}
    </>
  );
};

interface ContentEditorRenderColumnProps {
  columns: ContentEditorRootColumn[];
  parentPath: number[];
  isInOverlay?: boolean;
}

const ContentEditorRenderColumn = (props: ContentEditorRenderColumnProps) => {
  const { columns, parentPath } = props;
  return (
    <>
      {columns.map((column, i) => (
        <ContentEditorColumn
          element={column.element}
          key={column.id}
          id={column.id ?? ''}
          path={[...parentPath, i]}
        >
          <ContentEditorRenderElement elements={column.children} parentPath={[...parentPath, i]} />
        </ContentEditorColumn>
      ))}
    </>
  );
};

const ContentEditorDragOverlay = () => {
  const { contents, activeId } = useContentEditorContext();

  const group = contents.find((c) => c.id === activeId);

  if (group) {
    return (
      <>
        {[group].map((content, i) => (
          <ContentEditorGroupOverlay
            element={content.element}
            key={content.id}
            items={content.children.map((c) => ({ id: c.id }))}
            path={[i]}
            id={content.id ?? ''}
          >
            {content.children.map((column, ii) => (
              <ContentEditorColumnOverlay
                element={column.element}
                className={'h-full'}
                key={column.id}
                isInGroup={true}
                id={column.id ?? ''}
                path={[i, ii]}
              >
                <ContentEditorRenderElement elements={column.children} parentPath={[i, ii]} />
              </ContentEditorColumnOverlay>
            ))}
          </ContentEditorGroupOverlay>
        ))}
      </>
    );
  }
  return (
    <>
      {contents.map((content, index) => {
        const column = content.children.find((cn) => cn.id === activeId);
        const columnIndex = content.children.indexOf(column as any);
        if (column) {
          return (
            <ContentEditorColumnOverlay
              element={column.element}
              className={'h-full'}
              key={column.id}
              id={column.id ?? ''}
              path={[index, columnIndex]}
            >
              <ContentEditorRenderElement
                elements={column.children}
                parentPath={[index, columnIndex]}
              />
            </ContentEditorColumnOverlay>
          );
        }
      })}
    </>
  );
};

// const dropAnimation: DropAnimation = {
//   ...defaultDropAnimation,
//   sideEffects: defaultDropAnimationSideEffects({
//     styles: {
//       active: {
//         opacity: '0.5',
//       },
//     },
//   }),
// };
const Editor = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const {
    contents,
    isEditorHover,
    setIsEditorHover,
    insertGroupAtTop,
    insertGroupAtBottom,
    activeId,
    setActiveId,
    setContents,
    zIndex,
  } = useContentEditorContext();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  // const lastOverId = useRef<UniqueIdentifier | null>(null);

  // const collisionDetectionStrategy: CollisionDetection = useCallback(
  //   (args) => {
  //     if (activeId && contents.find((c) => c.id == activeId)) {
  //       return closestCenter({
  //         ...args,
  //         droppableContainers: args.droppableContainers.filter((container) =>
  //           contents.find((c) => c.id == container.id),
  //         ),
  //       });
  //     }

  //     // Start by finding any intersecting droppable
  //     const pointerIntersections = pointerWithin(args);
  //     const intersections =
  //       pointerIntersections.length > 0
  //         ? // If there are droppables intersecting with the pointer, return those
  //           pointerIntersections
  //         : rectIntersection(args);
  //     let overId = getFirstCollision(intersections, 'id');

  //     if (overId != null) {
  //       if (contents.find((c) => c.id == overId)) {
  //         const containerItems = contents.find((c) => c.id == overId)?.children;

  //         // If a container is matched and it contains items (columns 'A', 'B', 'C')
  //         if (containerItems && containerItems.length > 0) {
  //           // Return the closest droppable within that container
  //           overId = closestCorners({
  //             ...args,
  //             droppableContainers: args.droppableContainers.filter(
  //               (container) =>
  //                 container.id !== overId && containerItems.find((c) => c.id == container.id),
  //             ),
  //           })[0]?.id;
  //         }
  //       }

  //       lastOverId.current = overId;

  //       return [{ id: overId }];
  //     }

  //     // When a draggable item moves to a new container, the layout may shift
  //     // and the `overId` may become `null`. We manually set the cached `lastOverId`
  //     // to the id of the draggable item that was moved to the new container, otherwise
  //     // the previous `overId` will be returned which can cause items to incorrectly shift positions
  //     // if (recentlyMovedToNewContainer.current) {
  //     //   lastOverId.current = activeId;
  //     // }

  //     // If no droppable is matched, return the last match
  //     return lastOverId.current ? [{ id: lastOverId.current }] : [];
  //   },
  //   [activeId, contents],
  // );

  function handleDragStart(event: any) {
    const { active } = event;
    setActiveId(active.id);
  }

  const findContainer = useCallback(
    (id: string) => {
      const container = contents.find((content) => content.id === id);
      if (container) {
        return container;
      }
      return contents.find((content) => content.children.find((c) => c.id === id));
    },
    [contents],
  );

  const isContainer = useCallback(
    (id: string) => {
      return contents.find((content) => content.id === id);
    },
    [contents],
  );

  const handleDragOver = ({ active, over }: any) => {
    const activeId = active.id;
    const overId = over?.id;
    if (!overId) {
      return;
    }
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    //group
    if (isContainer(activeId)) {
      setContents((pre) => {
        const oldIndex = pre.indexOf(contents.find((c) => c.id === activeId) as any);
        const newIndex = pre.indexOf(contents.find((c) => c.id === overContainer?.id) as any);
        return arrayMove(pre, oldIndex, newIndex);
      });
      return;
    }
    if (!activeContainer || !overContainer || activeContainer.id === overContainer.id) {
      return;
    }

    setContents((pre) => {
      const contents = JSON.parse(JSON.stringify(pre)) as typeof pre;
      const activeContent = contents.find((c) => c.id === activeContainer.id);
      const overContent = contents.find((c) => c.id === overContainer.id);
      const activeColumn = activeContent?.children.find((c) => c.id === activeId);
      let overIndex = 0;
      if (contents.find((c) => c.id === overId)) {
        overIndex = contents.find((c) => c.id === overId)?.children.length ?? 0;
      } else {
        const overColumn = overContent?.children.find((c) => c.id === overId);
        if (overColumn && overContent) {
          overIndex = overContent.children.indexOf(overColumn);
        }
      }
      const c: ContentEditorRoot[] = [];
      for (let index = 0; index < pre.length; index++) {
        const content = pre[index];
        if (activeContent && content.id === activeContent?.id) {
          c.push({
            ...content,
            children: activeContent.children.filter((c) => c.id !== activeId),
          });
        } else if (overContent && content.id === overContent.id) {
          c.push({
            ...content,
            children: [
              ...content.children.slice(0, overIndex),
              activeColumn,
              ...content.children.slice(overIndex, content.children.length),
            ] as any,
          });
        } else {
          c.push(content);
        }
      }
      return c.filter((cc) => cc.children.length !== 0);
    });
  };

  const handleDragEnd = ({ active, over }: any) => {
    const activeId = active.id;
    const overId = over?.id;
    if (!overId || activeId === overId) {
      setActiveId(undefined);
      return;
    }

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer) {
      setActiveId(undefined);
      return;
    }
    //group
    if (isContainer(activeId)) {
      setContents((pre) => {
        const oldIndex = pre.indexOf(contents.find((c) => c.id === activeId) as any);
        const newIndex = pre.indexOf(contents.find((c) => c.id === overContainer.id) as any);
        return arrayMove(pre, oldIndex, newIndex);
      });
      setActiveId(undefined);
      return;
    }
    //column
    if (isContainer(overId) || activeContainer.id !== overContainer.id) {
      setActiveId(undefined);
      return;
    }
    const activeColumn = overContainer.children.find((cc) => cc.id === activeId);
    const overColumn = overContainer.children.find((cc) => cc.id === overId);
    if (!activeColumn || !overColumn) {
      return;
    }
    const overIndex = overContainer.children.indexOf(overColumn);
    const activeIndex = overContainer.children.indexOf(activeColumn);
    setContents((pre) => {
      return pre
        .map((content) => {
          if (content.id === overContainer.id) {
            return {
              ...content,
              children: arrayMove(content.children, activeIndex, overIndex),
            };
          }
          return content;
        })
        .filter((c) => c.children.length !== 0);
    });

    setActiveId(undefined);
  };

  const [containerNode, setContainerNode] = useState<HTMLElement>();
  useEffect(() => {
    if (ref.current) {
      const el = ref.current as HTMLElement;
      const parentNode = el.closest('.usertour-widget-root') as HTMLElement;
      if (parentNode) {
        setContainerNode(parentNode);
      }
    }
  }, [ref.current]);

  return (
    <div
      className="relative"
      ref={ref}
      onMouseOver={() => {
        setIsEditorHover(true);
      }}
      onMouseOut={() => setIsEditorHover(false)}
      onFocus={() => setIsEditorHover(true)}
      onBlur={() => setIsEditorHover(false)}
    >
      {!activeId && (isEditorHover || isOpen) && (
        <ContentEditorSideBar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          onClick={insertGroupAtTop}
          type={ContentEditorSideBarType.TOP}
        />
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <SortableContext
          items={contents.map((c) => ({ id: c.id })) as any}
          strategy={verticalListSortingStrategy}
        >
          {contents.map((content, i) => (
            <ContentEditorGroup
              element={content.element}
              key={content.id}
              path={[i]}
              items={content.children.map((c) => ({ id: c.id }))}
              id={content.id ?? ''}
            >
              <SortableContext
                items={content.children.map((c) => ({ id: c.id })) as any}
                strategy={horizontalListSortingStrategy}
              >
                <ContentEditorRenderColumn columns={content.children} parentPath={[i]} />
              </SortableContext>
            </ContentEditorGroup>
          ))}
        </SortableContext>
        {containerNode &&
          createPortal(
            <DragOverlay dropAnimation={null} style={{ zIndex: zIndex + EDITOR_OVERLAY }}>
              {<ContentEditorDragOverlay />}
            </DragOverlay>,
            containerNode,
          )}
      </DndContext>
      {!activeId && (isEditorHover || isOpen) && (
        <ContentEditorSideBar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          onClick={insertGroupAtBottom}
          type={ContentEditorSideBarType.BOTTOM}
        />
      )}
    </div>
  );
};

export const ContentEditor = (props: ContentEditorProps) => {
  const {
    initialValue = defaultInitialValue,
    enabledElementTypes = [
      ContentEditorElementType.IMAGE,
      ContentEditorElementType.EMBED,
      ContentEditorElementType.TEXT,
      ContentEditorElementType.BUTTON,
    ],
  } = props;

  return (
    <ContentEditorContextProvider
      {...props}
      initialValue={initialValue}
      enabledElementTypes={enabledElementTypes}
    >
      <Editor />
    </ContentEditorContextProvider>
  );
};
