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
  onOpenChange?: (open: boolean) => void;
  // Animation state tracking
  pendingAnimationItems: Set<string>;
  removePendingAnimation: (itemId: string) => void;
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
  onOpenChange?: (open: boolean) => void;
}

const ChecklistRoot = (props: ChecklistRootProps) => {
  const { children, theme, data: initialData, defaultOpen = true, onDismiss, onOpenChange } = props;
  const { globalStyle, themeSetting } = useThemeStyles(theme);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [data, setData] = useState(initialData);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [pendingAnimationItems, setPendingAnimationItems] = useState<Set<string>>(new Set());
  const [prevData, setPrevData] = useState(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    setIsOpen(data.initialDisplay === ChecklistInitialDisplay.EXPANDED);
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
  }, [data.items, isOpen, prevData]);

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
        onOpenChange,
        pendingAnimationItems,
        removePendingAnimation,
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
      return width ?? Math.round((completedCount / data.items.length) * 100);
    }, [data.items, width]);

    return (
      <div className="w-full bg-sdk-foreground rounded-full my-3" ref={ref}>
        <div
          className={cn(
            'text-sdk-background font-medium text-center p-1 leading-none rounded-full',
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
}
const ChecklistLauncherContent = forwardRef<HTMLDivElement, ChecklistLauncherContentProps>(
  (props, ref) => {
    const { buttonText, height, onClick, number = 1, isCompleted } = props;
    return (
      <div
        ref={ref}
        style={{ height }}
        className="rounded-sdk-checklist-trigger h-full w-full flex bg-sdk-checklist-trigger-background cursor-pointer items-center justify-center hover:bg-sdk-checklist-trigger-hover-background"
        onClick={onClick}
      >
        <div className="max-w-24 overflow-hidden	text-sdk-checklist-trigger-font h-6 font-sdk-checklist-trigger text-sdk-base flex items-center justify-center">
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
    );
  },
);

ChecklistLauncherContent.displayName = 'ChecklistLauncherContent';

const ChecklistLauncher = forwardRef<HTMLDivElement, { onClick?: () => void }>((props, ref) => {
  const { onClick } = props;
  const { themeSetting, data } = useChecklistRootContext();
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
        zIndex: themeSetting?.checklist.zIndex,
        ...style,
        height: themeSetting?.checklistLauncher.height,
        borderRadius: themeSetting?.checklistLauncher.borderRadius,
        width: '174px',
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
    const { children } = props;
    const { globalStyle, isOpen, setIsOpen, themeSetting, onOpenChange } =
      useChecklistRootContext();

    const handleOpenChange = () => {
      setIsOpen(true);
      onOpenChange?.(true);
    };

    return (
      <>
        {isOpen && (
          <Popper
            triggerRef={undefined}
            open={isOpen}
            ref={ref}
            {...props}
            globalStyle={globalStyle}
          >
            <PopperModalContentPotal
              position={themeSetting?.checklist.placement.position as ModalPosition}
              positionOffsetX={themeSetting?.checklist.placement.positionOffsetX}
              positionOffsetY={themeSetting?.checklist.placement.positionOffsetY}
              enabledBackdrop={false}
              width={`${themeSetting?.checklist.width}px`}
            >
              {children}
            </PopperModalContentPotal>
          </Popper>
        )}
        {!isOpen && <ChecklistLauncher onClick={handleOpenChange} />}
      </>
    );
  },
);

ChecklistPopper.displayName = 'ChecklistPopper';

const ChecklistPopperUseIframe = forwardRef<HTMLDivElement, Omit<PopperProps, 'globalStyle'>>(
  (props, ref) => {
    const { children, assets, zIndex } = props;
    const { globalStyle, isOpen, themeSetting } = useChecklistRootContext();
    return (
      <>
        {isOpen && (
          <Popper
            triggerRef={undefined}
            open={isOpen}
            ref={ref}
            {...props}
            globalStyle={globalStyle}
          >
            <PopperModalContentPotal
              position={themeSetting?.checklist.placement.position as ModalPosition}
              positionOffsetX={themeSetting?.checklist.placement.positionOffsetX}
              positionOffsetY={themeSetting?.checklist.placement.positionOffsetY}
              enabledBackdrop={false}
              width={`${themeSetting?.checklist.width}px`}
            >
              <PopperContentFrame ref={ref} {...props}>
                {children}
              </PopperContentFrame>
            </PopperModalContentPotal>
          </Popper>
        )}
        {!isOpen && <ChecklistLauncherFrame assets={assets} zIndex={zIndex} />}
      </>
    );
  },
);

interface ChecklistLauncherFrameProps {
  assets: AssetAttributes[] | undefined;
  zIndex: number;
}
const ChecklistLauncherFrame = forwardRef<HTMLIFrameElement, ChecklistLauncherFrameProps>(
  (props, ref) => {
    const { assets, zIndex } = props;
    const { globalStyle, themeSetting } = useChecklistRootContext();

    const style = computePositionStyle(
      themeSetting?.checklistLauncher.placement.position as ModalPosition,
      themeSetting?.checklistLauncher.placement.positionOffsetX ?? 0,
      themeSetting?.checklistLauncher.placement.positionOffsetY ?? 0,
    );

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
            width: '174px',
          }}
        >
          <ChecklistLauncherInFrame globalStyle={globalStyle} />
        </Frame>
      </>
    );
  },
);

ChecklistLauncherFrame.displayName = 'ChecklistLauncherFrame';

const ChecklistLauncherInFrame = forwardRef<HTMLDivElement, PopperContentProps>((props, _) => {
  const { globalStyle } = props;
  const { document } = useFrame();
  const { data, setIsOpen, themeSetting, onOpenChange } = useChecklistRootContext();

  useEffect(() => {
    if (globalStyle) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle]);

  const handleOnOpenChange = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const isAllCompleted = data.items.filter((item) => item.isCompleted).length === data.items.length;

  return (
    <ChecklistLauncherContent
      buttonText={data.buttonText}
      height={themeSetting?.checklistLauncher.height}
      number={data.items.filter((item) => !item.isCompleted).length}
      isCompleted={isAllCompleted}
      onClick={handleOnOpenChange}
    />
  );
});

const ChecklistStaticPopper = forwardRef<HTMLDivElement, Omit<PopperProps, 'globalStyle'>>(
  (props, ref) => {
    const { children } = props;
    const { globalStyle } = useChecklistRootContext();
    return (
      <>
        <Popper
          triggerRef={undefined}
          open={true}
          ref={ref}
          globalStyle={globalStyle}
          zIndex={1111}
        >
          <PopperStaticContent
            ref={ref}
            globalStyle={globalStyle}
            height={'auto'}
            width={`${360}px`}
            showArrow={false}
          >
            {children}
          </PopperStaticContent>
        </Popper>
      </>
    );
  },
);

ChecklistStaticPopper.displayName = 'ChecklistStaticPopper';

const ChecklistDropdown = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const { setIsOpen, onOpenChange } = useChecklistRootContext();
    const handleOnOpenChange = () => {
      setIsOpen(false);
      onOpenChange?.(false);
    };
    return (
      <div
        className="rounded-full h-[25px] w-[25px] inline-flex items-center justify-center text-sdk-xbutton absolute top-[5px] right-[5px] hover:bg-sdk-primary/40 outline-none cursor-pointer"
        ref={ref}
        {...props}
      >
        <DropDownIcon height={24} width={24} onClick={handleOnOpenChange} />
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
    const { data, updateItemStatus } = useChecklistRootContext();

    const handleItemClick = useCallback(
      (item: ChecklistItemType, index: number) => {
        if (disabledUpdate) {
          if (onClick) {
            onClick(item, index);
          }
          return;
        }
        if (!item.isCompleted) {
          updateItemStatus(item.id, !item.isCompleted);
          onClick?.(item, index);
        }
      },
      [onClick, updateItemStatus],
    );

    return (
      <div ref={ref} className="flex flex-col space-y-1">
        {data.items.map(
          (item, index) =>
            item.isVisible !== false && (
              <ChecklistItem key={item.id} item={item} index={index} onClick={handleItemClick} />
            ),
        )}
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
    const { setShowDismissConfirm, data } = useChecklistRootContext();

    const isAllCompleted =
      data.items.filter((item) => item.isCompleted).length === data.items.length;

    const baseClassName = cn(
      'text-right',
      data.preventDismissChecklist ? 'h-sdk-line-height' : 'cursor-pointer',
      isAllCompleted
        ? 'text-sdk-link hover:text-sdk-link/80 font-sdk-bold'
        : 'text-sdk-foreground/50 hover:text-sdk-foreground/80',
    );

    return (
      <div
        ref={ref}
        {...props}
        className={baseClassName}
        onClick={data.preventDismissChecklist ? undefined : () => setShowDismissConfirm(true)}
      >
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
  return <>{showDismissConfirm ? <ChecklistDismissConfirm /> : children}</>;
};

ChecklistPopperContentBody.displayName = 'ChecklistPopperContentBody';

interface ChecklistItemProps {
  item: ChecklistItemType;
  index: number;
  onClick: (item: ChecklistItemType, index: number) => void;
}

const ChecklistItem = ({ item, index, onClick }: ChecklistItemProps) => {
  const { isOpen, pendingAnimationItems, removePendingAnimation } = useChecklistRootContext();
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

    setPrevIsCompleted(isCompleted);
  }, [
    isCompleted,
    isOpen,
    prevIsCompleted,
    pendingAnimationItems,
    item.id,
    removePendingAnimation,
  ]);

  // Reset animation state when item becomes uncompleted
  useEffect(() => {
    if (!isCompleted) {
      setShouldShowAnimation(false);
    }
  }, [isCompleted]);

  return (
    <div className={cn('flex items-center cursor-pointer')} onClick={() => onClick(item, index)}>
      <ChecklistChecked isChecked={isCompleted} isShowAnimation={shouldShowAnimation} />
      <div
        className={cn(
          'grow flex flex-col items-start',
          isCompleted && 'line-through text-sdk-foreground/60',
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
