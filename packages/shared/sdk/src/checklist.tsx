import {
  ChecklistData,
  ChecklistInitialDisplay,
  ChecklistItemType,
  ModalPosition,
  Theme,
  ThemeTypesSetting,
} from '@usertour-ui/types';
import {
  forwardRef,
  useState,
  createContext,
  useContext,
  useEffect,
  useMemo,
  memo,
  useCallback,
} from 'react';
import {
  Popper,
  PopperContent,
  PopperModalContentPotal,
  PopperProps,
  PopperStaticContent,
  PopperContentFrame,
  PopperContentProps,
} from './popper';
import { CheckmarkIcon, DropDownIcon } from '@usertour-ui/icons';
import { useComposedRefs } from '@usertour-ui/react-compose-refs';
import { useThemeStyles } from './hook';
import { computePositionStyle } from './position';
import { AssetAttributes, Frame, useFrame } from '@usertour-ui/frame';
import { cn } from '@usertour-ui/ui-utils';
import { Button } from '@usertour-ui/button';
import { useSize } from '@usertour-ui/react-use-size';
import {
  canCompleteChecklistItem,
  checklistIsCompleted,
  checklistUnCompletedItemsCount,
} from './utils';

interface ChecklistRootContextValue {
  globalStyle: string;
  themeSetting?: ThemeTypesSetting;
  data: ChecklistData;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  updateItemStatus: (itemId: string, isCompleted: boolean) => void;
  showDismissConfirm: boolean;
  setShowDismissConfirm: (showDismissConfirm: boolean) => void;
  onDismiss?: () => Promise<void>;
  handleOpenChange?: (open: boolean) => Promise<void>;
  // Animation state tracking
  pendingAnimationItems: Set<string>;
  removePendingAnimation: (itemId: string) => void;
  zIndex: number;
}

const ChecklistRootContext = createContext<ChecklistRootContextValue | null>(null);

const useChecklistRootContext = () => {
  const context = useContext(ChecklistRootContext);
  if (!context) {
    throw new Error('useChecklistRootContext must be used within a ChecklistRoot.');
  }
  return context;
};

interface ChecklistRootProps {
  children: React.ReactNode;
  theme: Theme;
  data: ChecklistData;
  defaultOpen?: boolean;
  onDismiss?: () => Promise<void>;
  onOpenChange?: (open: boolean) => Promise<void>;
  zIndex: number;
}

const ChecklistRoot = (props: ChecklistRootProps) => {
  const {
    children,
    theme,
    data: initialData,
    defaultOpen = true,
    onDismiss,
    onOpenChange,
    zIndex,
  } = props;
  const { globalStyle, themeSetting } = useThemeStyles(theme);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [data, setData] = useState(initialData);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [pendingAnimationItems, setPendingAnimationItems] = useState<Set<string>>(new Set());
  const [prevData, setPrevData] = useState(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      await onOpenChange?.(open);
      setIsOpen(open);
    },
    [onOpenChange],
  );

  useEffect(() => {
    const shouldBeOpen = data.initialDisplay === ChecklistInitialDisplay.EXPANDED;
    handleOpenChange(shouldBeOpen);
  }, [data.initialDisplay]);

  // Track completion changes and add to pending animations if checklist is closed
  useEffect(() => {
    if (!isOpen) {
      // Check for newly completed items
      for (const item of data.items) {
        const prevItem = prevData.items.find((prevItem) => prevItem.id === item.id);
        if (item.isCompleted && prevItem && !prevItem.isCompleted) {
          setPendingAnimationItems((prev) => new Set(prev).add(item.id));
        }
      }
    }
    setPrevData(data);
  }, [data, isOpen]);

  const updateItemStatus = (itemId: string, isCompleted: boolean) => {
    setData((prevData) => ({
      ...prevData,
      items: prevData.items.map((item) => (item.id === itemId ? { ...item, isCompleted } : item)),
    }));
  };

  const removePendingAnimation = useCallback((itemId: string) => {
    setPendingAnimationItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  return (
    <ChecklistRootContext.Provider
      value={{
        globalStyle,
        themeSetting,
        data,
        isOpen,
        setIsOpen,
        updateItemStatus,
        showDismissConfirm,
        setShowDismissConfirm,
        onDismiss,
        handleOpenChange,
        pendingAnimationItems,
        removePendingAnimation,
        zIndex,
      }}
    >
      {children}
    </ChecklistRootContext.Provider>
  );
};

ChecklistRoot.displayName = 'ChecklistRoot';

interface ChecklistCheckedProps {
  isChecked: boolean;
  isShowAnimation: boolean;
}

const EmptyCircle = () => {
  return <div className="w-5 h-5 bg-gray-200 rounded-full" />;
};

const ChecklistChecked = forwardRef<HTMLSpanElement, ChecklistCheckedProps>((props, ref) => {
  const { isChecked, isShowAnimation } = props;
  return (
    <span
      ref={ref}
      className={cn(
        'flex-none w-8 h-8 border-2 border-transparent rounded-full flex justify-center items-center mr-3 text-sm text-white',
        isChecked ? 'bg-sdk-checklist-checkmark' : 'bg-gray-200',
        isShowAnimation ? 'animate-pop-scale' : '',
      )}
    >
      {isChecked ? <CheckmarkIcon className="w-5 h-5 stroke-white" /> : <EmptyCircle />}
    </span>
  );
});

ChecklistChecked.displayName = 'ChecklistChecked';

const ChecklistProgress = memo(
  forwardRef<HTMLDivElement, { width?: number }>(({ width }, ref) => {
    const { data } = useChecklistRootContext();
    const progress = useMemo(() => {
      const completedCount = data.items.filter((item) => item.isCompleted).length;
      if (data.items.length === 0) {
        return width ?? 0;
      }
      return width ?? Math.round((completedCount / data.items.length) * 100) ?? 0;
    }, [data.items, width]);

    return (
      <div className="w-full bg-sdk-foreground rounded-full my-3" ref={ref}>
        <div
          className={cn(
            'text-sdk-background font-medium p-1 px-2 leading-none rounded-full text-left',
            progress > 0 && 'bg-sdk-progress',
          )}
          style={{ width: `${progress}%` }}
        >
          {progress}%
        </div>
      </div>
    );
  }),
);

ChecklistProgress.displayName = 'ChecklistProgress';

interface ChecklistLauncherContentProps {
  buttonText: string;
  height?: string | number;
  onClick?: () => void;
  number?: number;
  isCompleted?: boolean;
  onSizeChange?: (rect: { width: number; height: number }) => void;
}
const ChecklistLauncherContent = forwardRef<HTMLDivElement, ChecklistLauncherContentProps>(
  (props, ref) => {
    const { buttonText, height, onClick, number = 1, isCompleted, onSizeChange } = props;
    const paddingLeft = height ? `${Number(height) / 2}px` : undefined;
    const paddingRight = height ? `${Number(height) / 2}px` : undefined;

    const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
    const rect = useSize(contentRef);

    useEffect(() => {
      if (rect) {
        onSizeChange?.(rect);
      }
    }, [rect]);

    return (
      <div
        ref={ref}
        style={{
          height,
        }}
        className="rounded-sdk-checklist-trigger h-full w-full flex bg-sdk-checklist-trigger-background cursor-pointer items-center justify-center hover:bg-sdk-checklist-trigger-hover-background"
        onClick={onClick}
      >
        <div
          ref={setContentRef}
          className="flex whitespace-nowrap	"
          style={{
            paddingLeft,
            paddingRight,
          }}
        >
          <div className="overflow-hidden	text-sdk-checklist-trigger-font h-6 font-sdk-checklist-trigger text-sdk-base flex items-center justify-center">
            {buttonText}
          </div>
          <div className="rounded-full w-6 h-6 text-sdk-base bg-sdk-checklist-trigger-counter-background text-sdk-checklist-trigger-counter-font ml-1 flex items-center justify-center">
            {isCompleted ? (
              <CheckmarkIcon className="w-5 h-5 stroke-sdk-checklist-trigger-counter-font" />
            ) : (
              number
            )}
          </div>
        </div>
      </div>
    );
  },
);

ChecklistLauncherContent.displayName = 'ChecklistLauncherContent';

const ChecklistLauncher = forwardRef<HTMLDivElement, { onClick?: () => void }>((props, ref) => {
  const { onClick } = props;
  const { themeSetting, data, zIndex } = useChecklistRootContext();
  const style = computePositionStyle(
    themeSetting?.checklistLauncher.placement.position as ModalPosition,
    themeSetting?.checklistLauncher.placement.positionOffsetX ?? 0,
    themeSetting?.checklistLauncher.placement.positionOffsetY ?? 0,
  );

  const isAllCompleted = data.items.filter((item) => item.isCompleted).length === data.items.length;

  return (
    <div
      ref={ref}
      className="usertour-widget-checklist-launcher usertour-widget-checklist-launcher--position-fixed"
      style={{
        zIndex,
        ...style,
        height: themeSetting?.checklistLauncher.height,
        borderRadius: themeSetting?.checklistLauncher.borderRadius,
      }}
    >
      <ChecklistLauncherContent
        buttonText={data.buttonText}
        height={themeSetting?.checklistLauncher.height}
        onClick={onClick}
        number={data.items.filter((item) => !item.isCompleted).length}
        isCompleted={isAllCompleted}
      />
    </div>
  );
});

ChecklistLauncher.displayName = 'ChecklistLauncher';

interface ChecklistContainerProps {
  children: React.ReactNode;
}

const ChecklistContainer = forwardRef<HTMLDivElement, ChecklistContainerProps>(
  ({ children }, ref) => {
    const { globalStyle } = useChecklistRootContext();
    const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
      if (el?.style) {
        el.style.cssText = globalStyle;
      }
    });

    return <div ref={composedRefs}>{children}</div>;
  },
);

ChecklistContainer.displayName = 'ChecklistContainer';

const ChecklistPopper = forwardRef<HTMLDivElement, Omit<PopperProps, 'globalStyle'>>(
  (props, ref) => {
    const { children, ...popperProps } = props;
    const { globalStyle, isOpen, themeSetting, handleOpenChange } = useChecklistRootContext();

    // Memoize the launcher click handler to prevent unnecessary re-renders
    const handleLauncherClick = useCallback(async () => {
      await handleOpenChange?.(true);
    }, [handleOpenChange]);

    // Memoize the modal content props to prevent unnecessary re-renders
    const modalContentProps = useMemo(
      () => ({
        position: themeSetting?.checklist.placement.position as ModalPosition,
        positionOffsetX: themeSetting?.checklist.placement.positionOffsetX,
        positionOffsetY: themeSetting?.checklist.placement.positionOffsetY,
        enabledBackdrop: false,
        width: `${themeSetting?.checklist.width}px`,
      }),
      [
        themeSetting?.checklist.placement.position,
        themeSetting?.checklist.placement.positionOffsetX,
        themeSetting?.checklist.placement.positionOffsetY,
        themeSetting?.checklist.width,
      ],
    );

    // Memoize the popper props to prevent unnecessary re-renders
    const optimizedPopperProps = useMemo(
      () => ({
        ...popperProps,
        triggerRef: undefined,
        open: isOpen,
        globalStyle,
      }),
      [popperProps, isOpen, globalStyle],
    );

    // Early return for closed state
    if (!isOpen) {
      return <ChecklistLauncher onClick={handleLauncherClick} />;
    }

    // Main content when open
    return (
      <Popper ref={ref} {...optimizedPopperProps}>
        <PopperModalContentPotal {...modalContentProps}>{children}</PopperModalContentPotal>
      </Popper>
    );
  },
);

ChecklistPopper.displayName = 'ChecklistPopper';

const ChecklistPopperUseIframe = forwardRef<HTMLDivElement, Omit<PopperProps, 'globalStyle'>>(
  (props, ref) => {
    const { children, assets, ...popperProps } = props;
    const { globalStyle, isOpen, themeSetting } = useChecklistRootContext();

    // Memoize the modal content props to prevent unnecessary re-renders
    const modalContentProps = useMemo(
      () => ({
        position: themeSetting?.checklist.placement.position as ModalPosition,
        positionOffsetX: themeSetting?.checklist.placement.positionOffsetX,
        positionOffsetY: themeSetting?.checklist.placement.positionOffsetY,
        enabledBackdrop: false,
        width: `${themeSetting?.checklist.width}px`,
      }),
      [
        themeSetting?.checklist.placement.position,
        themeSetting?.checklist.placement.positionOffsetX,
        themeSetting?.checklist.placement.positionOffsetY,
        themeSetting?.checklist.width,
      ],
    );

    // Memoize the popper props to prevent unnecessary re-renders
    const optimizedPopperProps = useMemo(
      () => ({
        ...popperProps,
        triggerRef: undefined,
        open: isOpen,
        globalStyle,
        assets,
      }),
      [popperProps, isOpen, globalStyle, assets],
    );

    // Early return for closed state
    if (!isOpen) {
      return <ChecklistLauncherFrame assets={assets} />;
    }

    // Main content when open
    return (
      <Popper ref={ref} {...optimizedPopperProps}>
        <PopperModalContentPotal {...modalContentProps}>
          <PopperContentFrame ref={ref} {...props}>
            {children}
          </PopperContentFrame>
        </PopperModalContentPotal>
      </Popper>
    );
  },
);

interface ChecklistLauncherFrameProps {
  assets: AssetAttributes[] | undefined;
}
const ChecklistLauncherFrame = forwardRef<HTMLIFrameElement, ChecklistLauncherFrameProps>(
  (props, ref) => {
    const { assets } = props;
    const { globalStyle, themeSetting, zIndex } = useChecklistRootContext();
    const [launcherRect, setLauncherRect] = useState<{ width: number; height: number } | null>(
      null,
    );

    const style = computePositionStyle(
      themeSetting?.checklistLauncher.placement.position as ModalPosition,
      themeSetting?.checklistLauncher.placement.positionOffsetX ?? 0,
      themeSetting?.checklistLauncher.placement.positionOffsetY ?? 0,
    );

    const width = launcherRect?.width ? `${launcherRect?.width}px` : undefined;

    return (
      <>
        <Frame
          assets={assets}
          ref={ref}
          className="usertour-widget-checklist-launcher usertour-widget-checklist-launcher--position-fixed"
          defaultStyle={{
            zIndex,
            ...style,
            height: themeSetting?.checklistLauncher.height,
            borderRadius: themeSetting?.checklistLauncher.borderRadius,
            width,
          }}
        >
          <ChecklistLauncherInFrame globalStyle={globalStyle} onSizeChange={setLauncherRect} />
        </Frame>
      </>
    );
  },
);

ChecklistLauncherFrame.displayName = 'ChecklistLauncherFrame';

const ChecklistLauncherInFrame = forwardRef<HTMLDivElement, PopperContentProps>((props, _) => {
  const { globalStyle, onSizeChange } = props;
  const { data, themeSetting, handleOpenChange } = useChecklistRootContext();
  const { document } = useFrame();

  useEffect(() => {
    if (globalStyle) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle]);

  const isCompleted = checklistIsCompleted(data.items);
  const number = checklistUnCompletedItemsCount(data.items);

  return (
    <ChecklistLauncherContent
      buttonText={data.buttonText}
      height={themeSetting?.checklistLauncher.height}
      number={number}
      isCompleted={isCompleted}
      onClick={async () => await handleOpenChange?.(true)}
      onSizeChange={onSizeChange}
    />
  );
});

const ChecklistStaticPopper = forwardRef<
  HTMLDivElement,
  Omit<PopperProps, 'globalStyle' | 'zIndex'>
>((props, ref) => {
  const { children, ...popperProps } = props;
  const { globalStyle, zIndex } = useChecklistRootContext();

  // Memoize the popper props to prevent unnecessary re-renders
  const optimizedPopperProps = useMemo(
    () => ({
      ...popperProps,
      triggerRef: undefined,
      open: true,
      globalStyle,
      zIndex,
    }),
    [popperProps, globalStyle, zIndex],
  );

  // Memoize the static content props
  const staticContentProps = useMemo(
    () => ({
      ref,
      globalStyle,
      height: 'auto',
      width: '360px',
      showArrow: false,
    }),
    [globalStyle],
  );

  return (
    <Popper {...optimizedPopperProps}>
      <PopperStaticContent {...staticContentProps}>{children}</PopperStaticContent>
    </Popper>
  );
});

ChecklistStaticPopper.displayName = 'ChecklistStaticPopper';

const ChecklistDropdown = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const { handleOpenChange } = useChecklistRootContext();
    return (
      <div
        className="rounded-full h-[25px] w-[25px] inline-flex items-center justify-center text-sdk-xbutton absolute top-[5px] right-[5px] hover:bg-sdk-primary/40 outline-none cursor-pointer"
        ref={ref}
        {...props}
      >
        <DropDownIcon
          height={24}
          width={24}
          onClick={async () => await handleOpenChange?.(false)}
        />
      </div>
    );
  },
);

ChecklistDropdown.displayName = 'ChecklistDropdown';

interface ChecklistItemsProps {
  onClick?: (item: ChecklistItemType, index: number) => void;
  disabledUpdate?: boolean;
}
const ChecklistItems = forwardRef<HTMLDivElement, ChecklistItemsProps>(
  ({ onClick, disabledUpdate }, ref) => {
    const { data, updateItemStatus, themeSetting } = useChecklistRootContext();

    const textDecoration = themeSetting?.checklist.completedTaskTextDecoration;

    const handleItemClick = useCallback(
      (item: ChecklistItemType, index: number) => {
        if (disabledUpdate) {
          onClick?.(item, index);
          return;
        }
        if (!item.isCompleted) {
          updateItemStatus(item.id, !item.isCompleted);
        }
        onClick?.(item, index);
      },
      [onClick, updateItemStatus, disabledUpdate],
    );

    return (
      <div ref={ref} className="flex flex-col space-y-1">
        {data.items
          .filter((item) => item.isVisible !== false)
          .map((item, index) => (
            <ChecklistItem
              key={item.id}
              item={item}
              index={index}
              onClick={handleItemClick}
              textDecoration={textDecoration}
            />
          ))}
      </div>
    );
  },
);

ChecklistItems.displayName = 'ChecklistItems';

const ChecklistDismissConfirm = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const { setShowDismissConfirm, onDismiss } = useChecklistRootContext();

    return (
      <div ref={ref} {...props} className="flex flex-col space-y-2">
        <div className="text-sdk-base">Dismiss checklist?</div>
        <div className="flex flex-row space-x-2 items-center justify-center pb-2">
          <Button forSdk onClick={onDismiss}>
            Yes, dismiss
          </Button>
          <Button forSdk variant="secondary" onClick={() => setShowDismissConfirm(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  },
);

ChecklistDismissConfirm.displayName = 'ChecklistDismissConfirm';

const ChecklistDismiss = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const { data, onDismiss, setShowDismissConfirm } = useChecklistRootContext();

    const isAllCompleted =
      data.items.filter((item) => item.isCompleted).length === data.items.length;

    const baseClassName = cn(
      'text-right',
      data.preventDismissChecklist ? 'h-sdk-line-height' : 'cursor-pointer',
      isAllCompleted
        ? 'text-sdk-link hover:text-sdk-link/80 font-sdk-bold'
        : 'text-sdk-foreground/50 hover:text-sdk-foreground/80',
    );

    const handleDismiss = useCallback(() => {
      if (data.preventDismissChecklist) {
        return;
      }
      if (isAllCompleted) {
        onDismiss?.();
      } else {
        setShowDismissConfirm(true);
      }
    }, [data.preventDismissChecklist, isAllCompleted, onDismiss, setShowDismissConfirm]);

    return (
      <div ref={ref} {...props} className={baseClassName} onClick={handleDismiss}>
        {!data.preventDismissChecklist && 'Dismiss checklist'}
      </div>
    );
  },
);

ChecklistDismiss.displayName = 'ChecklistDismiss';

const ChecklistPopperContent = PopperContent;

ChecklistPopperContent.displayName = 'ChecklistPopperContent';

const ChecklistPopperContentBody = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const { showDismissConfirm } = useChecklistRootContext();
  if (showDismissConfirm) {
    return <ChecklistDismissConfirm />;
  }
  return children;
};

ChecklistPopperContentBody.displayName = 'ChecklistPopperContentBody';

interface ChecklistItemProps {
  item: ChecklistItemType;
  index: number;
  onClick: (item: ChecklistItemType, index: number) => void;
  textDecoration?: string;
}

const ChecklistItem = (props: ChecklistItemProps) => {
  const { item, index, onClick, textDecoration = 'line-through' } = props;
  const { isOpen, pendingAnimationItems, removePendingAnimation, data } = useChecklistRootContext();
  const [prevIsCompleted, setPrevIsCompleted] = useState(item.isCompleted);
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false);

  const isCompleted = useMemo(() => {
    return item.isCompleted;
  }, [item.isCompleted]);

  // Handle animation logic
  useEffect(() => {
    // Case 1: Item was just completed while checklist is open
    if (isCompleted && !prevIsCompleted && isOpen) {
      setShouldShowAnimation(true);
      const timer = setTimeout(() => {
        setShouldShowAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Case 2: Item has pending animation (completed while closed) and checklist is now open
    if (isOpen && isCompleted && pendingAnimationItems.has(item.id)) {
      setShouldShowAnimation(true);
      const timer = setTimeout(() => {
        removePendingAnimation(item.id);
        setShouldShowAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Case 3: External animation control via item.isShowAnimation
    if (isOpen && isCompleted && item.isShowAnimation) {
      setShouldShowAnimation(true);
      const timer = setTimeout(() => {
        setShouldShowAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    setPrevIsCompleted(isCompleted);
  }, [
    isCompleted,
    isOpen,
    prevIsCompleted,
    pendingAnimationItems,
    item.id,
    removePendingAnimation,
    item.isShowAnimation,
  ]);

  // Check if this item can be clicked based on completion order
  const isClickable = useMemo(() => {
    return canCompleteChecklistItem(data.completionOrder, data.items, item);
  }, [data.completionOrder, data.items, item]);

  // Reset animation state when item becomes uncompleted
  useEffect(() => {
    if (!isCompleted) {
      setShouldShowAnimation(false);
    }
  }, [isCompleted]);

  return (
    <div
      className={cn(
        'flex items-center cursor-pointer',
        isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
      )}
      onClick={() => (isClickable ? onClick(item, index) : undefined)}
    >
      <ChecklistChecked isChecked={isCompleted} isShowAnimation={shouldShowAnimation} />
      <div
        className={cn(
          'grow flex flex-col items-start',
          isCompleted && `${textDecoration} text-sdk-foreground/60`,
        )}
      >
        <span className="text-sdk-base">{item.name}</span>
        {item.description && <span className="text-sdk-xs leading-3">{item.description}</span>}
      </div>
    </div>
  );
};

export {
  ChecklistRoot,
  ChecklistPopper,
  ChecklistPopperContent,
  ChecklistProgress,
  ChecklistChecked,
  ChecklistLauncher,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistDismiss,
  ChecklistStaticPopper,
  ChecklistContainer,
  ChecklistPopperUseIframe,
  ChecklistPopperContentBody,
};
