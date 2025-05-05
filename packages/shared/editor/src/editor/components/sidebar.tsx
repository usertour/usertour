import * as Popover from '@radix-ui/react-popover';
import { EDITOR_SIDEBAR } from '@usertour-ui/constants';
import { PlusIcon3 } from '@usertour-ui/icons';
import { CSSProperties, useEffect, useState } from 'react';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorElement,
  ContentEditorQuestionElement,
  ContentEditorSideBarType,
} from '../../types/editor';
import { cuid } from '@usertour-ui/ui-utils';
import { isQuestionElement } from '../../utils/helper';
import { contentTypesConfig } from '../../utils/config';

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

const getStyle = (type: ContentEditorSideBarType, isActived: boolean) => {
  switch (type) {
    case ContentEditorSideBarType.BOTTOM:
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
    case ContentEditorSideBarType.RIGHT:
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

    case ContentEditorSideBarType.TOP:
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

export const ContentEditorSideBarPopper = (
  props: Popover.PopoverProps & {
    onClick: (element: ContentEditorElement) => void;
  },
) => {
  const { zIndex, enabledElementTypes } = useContentEditorContext();

  // Filter buttons based on enabledElementTypes
  const filteredContentTypes = enabledElementTypes
    ? contentTypesConfig.filter((config) => enabledElementTypes.includes(config.element.type))
    : contentTypesConfig;

  const handleClick = (element: ContentEditorElement) => {
    if (isQuestionElement(element)) {
      const el = element as ContentEditorQuestionElement;
      const newElement = {
        ...element,
        data: { ...el.data, cvid: cuid() },
      } as ContentEditorQuestionElement;
      props.onClick(newElement);
    } else {
      props.onClick(element);
    }
  };

  return (
    <Popover.Root {...props}>
      <Popover.Trigger asChild>{props.children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          className="z-50 bg-background p-4 rounded-lg"
          style={{
            zIndex: zIndex + EDITOR_SIDEBAR,
            filter:
              'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {filteredContentTypes.map(({ name, icon: Icon, element }, index) => (
              <div
                key={index}
                onClick={() => handleClick(element)}
                className="rounded-lg text-sm flex flex-col border hover:shadow-lg dark:hover:shadow-lg-light cursor-pointer p-4 items-center justify-center pb-2"
              >
                <Icon className="h-6 w-6 text-primary" />
                {name}
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export interface ContentEditorSideBarProps {
  onClick: (element: ContentEditorElement) => void;
  type: ContentEditorSideBarType;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export const ContentEditorSideBar = (props: ContentEditorSideBarProps) => {
  const { onClick, type, setIsOpen } = props;
  const [isHover, setHover] = useState(false);
  const [customStyle, setCustomStyle] = useState<CSSProperties>();
  const [customIconStyle, setCustomIconStyle] = useState<CSSProperties>();
  const [open, setOpen] = useState<boolean>();

  useEffect(() => {
    const [iconStyle, lineStyle] = getStyle(type, !!isHover || !!open);
    setCustomIconStyle(iconStyle);
    setCustomStyle(lineStyle);
  }, [type, isHover, open]);

  const handleButtonClick = (element: ContentEditorElement) => {
    if (setIsOpen) {
      setIsOpen(false);
    }
    onClick(element);
  };

  const handleOnOpenChange = (open: boolean) => {
    setOpen(open);
    if (setIsOpen) {
      setIsOpen(open);
    }
  };

  return (
    <>
      <div style={{ ...customStyle }} />
      {customIconStyle && (
        <ContentEditorSideBarPopper onClick={handleButtonClick} onOpenChange={handleOnOpenChange}>
          <PlusIcon3
            className="text-[#22c55e] h-5 w-5"
            style={{ ...customIconStyle }}
            onMouseOver={() => {
              setHover(true);
            }}
            onMouseOut={() => setHover(false)}
          />
        </ContentEditorSideBarPopper>
      )}
    </>
  );
};

ContentEditorSideBar.displayName = 'ContentEditorSideBar';
