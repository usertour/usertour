import { ButtonIcon, ImageIcon, TextIcon, VideoIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { PlusIcon3 } from '@usertour-ui/icons';
import { CSSProperties, createContext, useContext, useEffect, useState } from 'react';
import { Node, Path } from 'slate';
import { ReactEditor, RenderElementProps, useSlateStatic } from 'slate-react';
import { inertColumnBlock, inertGroupBlockV2, updateNodeStatus } from '../../lib/editorHelper';
import { ColumnElementType, CustomElement, GroupElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';

enum SideBarType {
  TOP = 'top',
  RIGHT = 'right',
  BOTTOM = 'bottom',
}
interface SideBarProps {
  onClick: (node: CustomElement) => void;
  type: SideBarType;
  element: GroupElementType;
}

interface GroupElementContextValue {
  isGroupHover: boolean;
}
const GroupElementContext = createContext<GroupElementContextValue | undefined>(undefined);

function useGroupElementContext(): GroupElementContextValue {
  const context = useContext(GroupElementContext);
  if (!context) {
    throw new Error('useGroupElementContext must be used within a GroupElementContextProvider.');
  }
  return context;
}

const style: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  position: 'relative',
};
const selectStyle: CSSProperties = {
  boxSizing: 'border-box',
  height: '100%',
  position: 'absolute',
  top: '0px',
  width: '0px',
  right: '0px',
  zIndex: 2,
  padding: '0px',
  margin: '0px',
  pointerEvents: 'none',
  background: 'rgb(212, 254, 230)',
  border: '1px solid rgb(0, 184, 80)',
  opacity: 0,
  //transition: "width 0.15s ease-out, transform, opacity 0.3s ease-out 0.1s",
  // transition: "opacity 0.15s ease-out, width 0.15s ease-out, transform",
  transformOrigin: 'right center',
  backfaceVisibility: 'hidden',
  transform: 'translateZ(0px) translateX(-1px)',
};

const selectBottomStyle: CSSProperties = {
  ...selectStyle,
  top: 'unset',
  bottom: '0px',
  width: '100%',
  height: '0px',
  transition: 'height 0.15s ease-out, transform, opacity 0.3s ease-out 0.1s',
  transformOrigin: 'bottom center',
  transform: 'translateZ(0px) translateY(-1px)',
};
const selectTopStyle: CSSProperties = {
  ...selectBottomStyle,
  top: '0px',
  bottom: 'unset',
  transformOrigin: 'top center',
};
const buttonStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  cursor: 'pointer',
  zIndex: 10,
  transform: 'translateY(-50%) translateX(37.5%) scale(1)',
  transformOrigin: 'right center',
  transition: 'transform 0.15s ease-out',
  right: '0px',
};
const buttonBelowStyle: CSSProperties = {
  ...buttonStyle,
  top: 'unset',
  left: '50%',
  transform: 'translateX(-50%) translateY(37.5%) scale(1)',
  transformOrigin: 'bottom center',
  bottom: '0px',
};
const buttonTopStyle: CSSProperties = {
  ...buttonBelowStyle,
  bottom: 'unset',
  top: '0px',
  left: '50%',
  transformOrigin: 'top center',
  transform: 'translateX(-50%) translateY(-50%) scale(1)',
};

const getStyle = (type: SideBarType, isActived: boolean) => {
  switch (type) {
    case SideBarType.BOTTOM:
      return [
        {
          ...buttonBelowStyle,
          // right: isHover ? "":"",
          transform: isActived
            ? 'translateX(-50%) translateY(37.5%) scale(1.2)'
            : buttonBelowStyle.transform,
        },
        {
          ...selectBottomStyle,
          height: isActived ? '20px' : '1px',
          opacity: '.5',
          border: isActived ? '1px dotted rgb(0, 184, 80)' : '1px solid rgb(0, 184, 80)',
        },
      ];
    case SideBarType.RIGHT:
      return [
        {
          ...buttonStyle,
          // right: isHover ? "":"",
          transform: isActived
            ? 'translateY(-50%) translateX(37.5%) scale(1.2)'
            : buttonStyle.transform,
        },
        {
          ...selectStyle,
          width: isActived ? '20px' : '1px',
          opacity: '.5',
          border: isActived ? '1px dotted rgb(0, 184, 80)' : '1px solid rgb(0, 184, 80)',
        },
      ];

    case SideBarType.TOP:
      return [
        {
          ...buttonTopStyle,
          // right: isHover ? "":"",
          transform: isActived
            ? 'translateX(-50%) translateY(-37.5%) scale(1.2)'
            : buttonTopStyle.transform,
        },
        {
          ...selectTopStyle,
          height: isActived ? '20px' : '1px',
          opacity: '.5',
          border: isActived ? '1px dotted rgb(0, 184, 80)' : '1px solid rgb(0, 184, 80)',
        },
      ];
  }
};

type SideBarButton = {
  name: string;
  icon: typeof TextIcon;
  node: CustomElement;
};

const sidebarButtons: SideBarButton[] = [
  {
    name: 'Text',
    icon: TextIcon,
    node: {
      type: 'paragraph',
      children: [{ text: '' }],
    },
  },
  {
    name: 'Button',
    icon: ButtonIcon,
    node: {
      type: 'button',
      data: { text: 'Button', type: 'default', action: 'goto' },
      children: [{ text: '' }],
    },
  },
  {
    name: 'Image',
    icon: ImageIcon,
    node: {
      type: 'image',
      url: '',
      width: { type: 'percent', value: 100 },
      children: [{ text: '' }],
    },
  },
  {
    name: 'Embed',
    icon: VideoIcon,
    node: {
      type: 'embed',
      url: '',
      width: { type: 'percent', value: 100 },
      children: [{ text: '' }],
    },
  },
];
const SideBar = (props: SideBarProps) => {
  const { onClick, type, element } = props;
  const [isHover, setHover] = useState(false);
  const [customStyle, setCustomStyle] = useState<CSSProperties>();
  const [customIconStyle, setCustomIconStyle] = useState<CSSProperties>();
  const [isOpen, setIsOpen] = useState(false);
  const { isGroupHover } = useGroupElementContext();
  const [isShow, setIsShow] = useState(false);
  const { isEditorHover, setIsEditorHover } = usePopperEditorContext();

  useEffect(() => {
    const [iconStyle, lineStyle] = getStyle(type, isHover || isOpen);
    setCustomIconStyle(iconStyle);
    setCustomStyle(lineStyle);
    if (type === SideBarType.RIGHT) {
      setIsShow(isOpen || isGroupHover);
    } else if (type === SideBarType.BOTTOM) {
      setIsShow(element.isLast && (isOpen || isEditorHover));
    } else if (type === SideBarType.TOP) {
      setIsShow(element.isFirst && (isOpen || isEditorHover));
    }
  }, [type, isHover, isOpen, isGroupHover, isEditorHover]);

  const handleButtonClick = (node: CustomElement) => {
    setIsOpen(false);
    setIsEditorHover(false);
    onClick(node);
  };

  return (
    <>
      <div style={{ ...customStyle, display: isShow ? '' : 'none' }} />
      <Popover.Root onOpenChange={setIsOpen} open={isOpen}>
        <Popover.Trigger asChild>
          <PlusIcon3
            className="text-[#22c55e] h-5 w-5"
            // onClick={() => setIsActivedButton(true)}
            style={{ ...customIconStyle, display: isShow ? '' : 'none' }}
            onMouseOver={() => {
              setHover(true);
            }}
            onMouseOut={() => setHover(false)}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={10}
            className="z-50 bg-background p-4 rounded-lg"
            style={{
              filter:
                'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
            }}
          >
            <div className="grid grid-cols-3 gap-2">
              {sidebarButtons.map(({ name, icon: Icon, node }, index) => (
                <div
                  key={index}
                  onClick={() => handleButtonClick(node)}
                  className="rounded-lg flex flex-col border hover:shadow-lg dark:hover:shadow-lg-light cursor-pointer p-4 items-center justify-center pb-2"
                >
                  <Icon className="h-8 w-8 text-primary" />
                  {name}
                </div>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
};

export const GroupElement = (props: RenderElementProps & { className?: string }) => {
  const element = props.element as GroupElementType;
  const editor = useSlateStatic();
  const [isGroupHover, setIsGroupHover] = useState(false);

  const value = { isGroupHover };
  const insertBlockAtRight = (node: CustomElement) => {
    const child = Node.child(element, element.children.length - 1) as ColumnElementType;
    const path = ReactEditor.findPath(editor, child);
    const column = {
      width: { type: 'fill', value: 50 },
      style: { justifyContent: 'start', marginRight: '30', ...child.style },
    };
    const options = {
      at: Path.next(path),
    };
    inertColumnBlock(editor, column, [node], options);
    setIsGroupHover(false);
  };

  const insertBlockAtBottom = (node: CustomElement) => {
    const path = ReactEditor.findPath(editor, element);
    inertGroupBlockV2(editor, [node], {
      at: Path.next(path),
    });
    updateNodeStatus(editor);
    setIsGroupHover(false);
  };
  const insertBlockAtTop = (node: CustomElement) => {
    const path = ReactEditor.findPath(editor, element);
    inertGroupBlockV2(editor, [node], {
      at: path,
    });
    updateNodeStatus(editor);
    setIsGroupHover(false);
  };

  return (
    <GroupElementContext.Provider value={value}>
      <div
        style={{ ...style }}
        {...props.attributes}
        onMouseOver={() => {
          setIsGroupHover(true);
        }}
        onMouseOut={() => setIsGroupHover(false)}
        onFocus={() => setIsGroupHover(true)}
        onBlur={() => setIsGroupHover(false)}
      >
        <SideBar type={SideBarType.RIGHT} element={element} onClick={insertBlockAtRight} />
        <SideBar type={SideBarType.BOTTOM} element={element} onClick={insertBlockAtBottom} />
        <SideBar type={SideBarType.TOP} element={element} onClick={insertBlockAtTop} />
        {props.children}
      </div>
    </GroupElementContext.Provider>
  );
};

type GroupElementSerializeType = {
  children: React.ReactNode;
  key?: string;
};
export const GroupElementSerialize = (props: GroupElementSerializeType) => {
  const { children } = props;
  return <div style={{ ...style }}>{children}</div>;
};

GroupElement.display = 'GroupElement';
