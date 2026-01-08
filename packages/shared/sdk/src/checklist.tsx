import {
  ChecklistData,
  ChecklistItemType,
  ModalPosition,
  ThemeTypesSetting,
} from '@usertour/types';
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
import { TaskArrowIcon, CheckmarkIcon, DropDownIcon } from '@usertour-packages/icons';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { computePositionStyle } from './utils/position';
import { AssetAttributes, Frame, useFrame } from '@usertour-packages/frame';
import { Button } from '@usertour-packages/button';
import { useSize } from '@usertour-packages/react-use-size';
import {
  canCompleteChecklistItem,
  checklistIsCompleted,
  checklistProgress,
  checklistUnCompletedItemsCount,
} from './utils/content';
import { useSettingsStyles } from './hooks/use-settings-styles';
import { cn } from '@usertour-packages/tailwind';

interface ChecklistRootContextValue {
  globalStyle: string;
  themeSetting?: ThemeTypesSetting;
  data: ChecklistData;
  isOpen: boolean;
  isAllCompleted: boolean;
  unCompletedItemsCount: number;
  progress: number;
  updateItemStatus: (itemId: string, isCompleted: boolean) => void;
  showDismissConfirm: boolean;
  setShowDismissConfirm: (showDismissConfirm: boolean) => void;
  onDismiss?: () => Promise<void>;
  handleExpandedChange?: (expanded: boolean) => Promise<void>;
  zIndex: number;
  clearItemAnimations: () => void;
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
  themeSettings: ThemeTypesSetting;
  data: ChecklistData;
  defaultOpen?: boolean;
  expanded?: boolean;
  onDismiss?: () => Promise<void>;
  onExpandedChange?: (expanded: boolean) => Promise<void>;
  zIndex: number;
}

const ChecklistRoot = (props: ChecklistRootProps) => {
  const {
    children,
    data: initialData,
    defaultOpen = true,
    expanded,
    onDismiss,
    onExpandedChange,
    zIndex,
    themeSettings,
  } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(themeSettings);
  const [data, setData] = useState(initialData);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

  // Use expanded from store if provided, otherwise use local state
  const isOpen = expanded !== undefined ? expanded : defaultOpen;
  const isAllCompleted = checklistIsCompleted(data.items ?? []);
  const unCompletedItemsCount = checklistUnCompletedItemsCount(data.items ?? []);
  const progress = checklistProgress(data.items ?? []);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  //manual control open state
  const handleExpandedChange = useCallback(
    async (open: boolean) => {
      await onExpandedChange?.(open);
    },
    [onExpandedChange],
  );

  const updateItemStatus = (itemId: string, isCompleted: boolean) => {
    setData((prevData) => ({
      ...prevData,
      items:
        prevData.items?.map((item) => (item.id === itemId ? { ...item, isCompleted } : item)) ?? [],
    }));
  };

  const clearItemAnimations = useCallback(() => {
    setData((prevData) => ({
      ...prevData,
      items:
        prevData.items?.map((item) => ({
          ...item,
          isShowAnimation: false,
        })) ?? [],
    }));
  }, []);

  return (
    <ChecklistRootContext.Provider
      value={{
        globalStyle,
        themeSetting,
        data,
        isOpen,
        isAllCompleted,
        unCompletedItemsCount,
        progress,
        updateItemStatus,
        showDismissConfirm,
        setShowDismissConfirm,
        onDismiss,
        handleExpandedChange,
        zIndex,
        clearItemAnimations,
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

const ChecklistChecked = forwardRef<HTMLSpanElement, ChecklistCheckedProps>((props, ref) => {
  const { isChecked, isShowAnimation } = props;
  return (
    <span
      ref={ref}
      className={cn(
        'flex-none w-8 h-8 border-2 border-transparent rounded-full flex justify-center items-center mr-3 text-sm text-white',
        isChecked
          ? 'bg-sdk-checklist-checkmark'
          : 'border border-sdk-foreground/25 bg-sdk-background',
        isShowAnimation ? 'animate-pop-scale' : '',
      )}
    >
      {isChecked && <CheckmarkIcon className="w-5 h-5 stroke-white" />}
    </span>
  );
});

ChecklistChecked.displayName = 'ChecklistChecked';

const ChecklistProgress = memo(
  forwardRef<HTMLDivElement, { width?: number }>(({ width }, ref) => {
    const { progress } = useChecklistRootContext();

    // Use width if explicitly provided (including 0), otherwise use progress
    const finalProgress = width !== undefined ? width : (progress ?? 0);

    const progressClassName = cn(
      'font-medium px-[calc(0.75rem-1px)] rounded-l-full text-left',
      'transition-all duration-200 ease-out',
      'text-xs leading-[calc(1.5rem-2px)]',
      finalProgress > 0 ? 'bg-sdk-progress text-sdk-background' : 'text-sdk-progress',
      finalProgress >= 100 && 'rounded-r-full',
    );

    return (
      <div className="w-full border border-sdk-progress rounded-full my-3" ref={ref}>
        <div className={progressClassName} style={{ width: `${finalProgress}%` }}>
          {finalProgress}%
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
const ChecklistLauncherContent = forwardRef<HTMLButtonElement, ChecklistLauncherContentProps>(
  (props, ref) => {
    const { buttonText, height, onClick, number = 1, isCompleted, onSizeChange } = props;
    const paddingHorizontal = height ? `${Number(height) / 2}px` : undefined;

    const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
    const rect = useSize(contentRef);

    useEffect(() => {
      if (rect) {
        onSizeChange?.(rect);
      }
    }, [rect, onSizeChange]);

    const buttonClassName = cn(
      'rounded-sdk-checklist-trigger h-full w-full flex bg-sdk-checklist-trigger-background',
      'cursor-pointer items-center justify-center',
      'hover:bg-sdk-checklist-trigger-hover-background',
      'active:bg-sdk-checklist-trigger-active-background',
      'focus-visible:bg-sdk-checklist-trigger-hover-background',
      'focus-visible:outline-none',
      'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-transparent',
      'focus-visible:ring-offset-[3px] focus-visible:ring-offset-sdk-checklist-trigger-font/30',
    );

    return (
      <Button
        forSdk
        variant="custom"
        ref={ref}
        style={{
          height,
        }}
        className={buttonClassName}
        onClick={onClick}
        aria-label={`Open checklist${number > 0 ? ` (${number} items)` : ''}`}
      >
        <div
          ref={setContentRef}
          className="flex whitespace-nowrap	"
          style={{
            paddingLeft: paddingHorizontal,
            paddingRight: paddingHorizontal,
          }}
        >
          <div className="overflow-hidden	text-sdk-checklist-trigger-font h-6 font-sdk-checklist-trigger text-sdk-base flex items-center justify-center">
            {buttonText}
          </div>
          <div className="rounded-full w-6 h-6 text-sm bg-sdk-checklist-trigger-counter-background text-sdk-checklist-trigger-counter-font ml-1 flex items-center justify-center">
            {isCompleted ? (
              <CheckmarkIcon className="w-5 h-5 stroke-sdk-checklist-trigger-counter-font" />
            ) : (
              number
            )}
          </div>
        </div>
      </Button>
    );
  },
);

ChecklistLauncherContent.displayName = 'ChecklistLauncherContent';

const ChecklistLauncher = forwardRef<HTMLDivElement, { onClick?: () => void }>((props, ref) => {
  const { onClick } = props;
  const { themeSetting, data, zIndex, isAllCompleted, unCompletedItemsCount } =
    useChecklistRootContext();
  const style = computePositionStyle(
    themeSetting?.checklistLauncher.placement.position as ModalPosition,
    themeSetting?.checklistLauncher.placement.positionOffsetX ?? 0,
    themeSetting?.checklistLauncher.placement.positionOffsetY ?? 0,
  );

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
        number={unCompletedItemsCount}
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
    const { globalStyle, isOpen, themeSetting, handleExpandedChange } = useChecklistRootContext();

    // Memoize the launcher click handler to prevent unnecessary re-renders
    const handleLauncherClick = useCallback(async () => {
      await handleExpandedChange?.(true);
    }, [handleExpandedChange]);

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
      <Popper ref={ref} {...optimizedPopperProps} isIframeMode={true}>
        <PopperModalContentPotal {...modalContentProps}>
          <PopperContentFrame {...props}>{children}</PopperContentFrame>
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
  const { data, themeSetting, handleExpandedChange, isAllCompleted, unCompletedItemsCount } =
    useChecklistRootContext();
  const { document } = useFrame();

  useEffect(() => {
    if (globalStyle && document?.body) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  return (
    <ChecklistLauncherContent
      buttonText={data.buttonText}
      height={themeSetting?.checklistLauncher.height}
      number={unCompletedItemsCount}
      isCompleted={isAllCompleted}
      onClick={async () => await handleExpandedChange?.(true)}
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

const ChecklistDropdown = forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    const { handleExpandedChange } = useChecklistRootContext();
    const { className, ...restProps } = props;

    const buttonClassName = cn(
      'size-6 rounded',
      'inline-flex items-center justify-center',
      'text-sdk-xbutton',
      'fixed top-2 right-2',
      'hover:bg-sdk-hover',
      'outline-none cursor-pointer z-50',
      className,
    );

    const handleClick = useCallback(async () => {
      await handleExpandedChange?.(false);
    }, [handleExpandedChange]);

    return (
      <Button
        forSdk
        variant="custom"
        ref={ref}
        className={buttonClassName}
        onClick={handleClick}
        aria-label="Close checklist"
        {...restProps}
      >
        <DropDownIcon height={24} width={24} />
      </Button>
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
      <div ref={ref} className="flex flex-col -mx-[24px]">
        {data.items
          ?.filter((item) => item.isVisible !== false)
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
    const { setShowDismissConfirm, onDismiss, clearItemAnimations } = useChecklistRootContext();

    const handleCancel = useCallback(() => {
      clearItemAnimations();
      setShowDismissConfirm(false);
    }, [clearItemAnimations, setShowDismissConfirm]);

    return (
      <div ref={ref} {...props} className="flex flex-col">
        <div className="text-sdk-base font-sdk-bold">Dismiss checklist?</div>
        <div className="flex flex-row space-x-2 items-center justify-center my-4">
          <Button forSdk onClick={onDismiss}>
            Yes, dismiss
          </Button>
          <Button forSdk variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  },
);

ChecklistDismissConfirm.displayName = 'ChecklistDismissConfirm';

interface ChecklistDismissProps extends React.HTMLAttributes<HTMLDivElement> {
  onAutoDismiss?: () => void;
}

const ChecklistDismiss = forwardRef<HTMLDivElement, ChecklistDismissProps>((props, ref) => {
  const { onAutoDismiss, ...restProps } = props;
  const { data, onDismiss, setShowDismissConfirm, isAllCompleted } = useChecklistRootContext();
  const [progressWidth, setProgressWidth] = useState(0);

  // Handle progress bar animation when autoDismissChecklist is enabled and all items are completed
  useEffect(() => {
    if (data.autoDismissChecklist && isAllCompleted) {
      // Reset to 0 and then animate to 100%
      setProgressWidth(0);
      // Use requestAnimationFrame to ensure the reset is applied before animation starts
      requestAnimationFrame(() => {
        setProgressWidth(100);
      });
      // Call onAutoDismiss after animation completes (5000ms)
      const timer = setTimeout(() => {
        onAutoDismiss?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
    setProgressWidth(0);
  }, [data.autoDismissChecklist, isAllCompleted, onAutoDismiss]);

  const textClassName = cn(
    'text-right !text-sm !leading-none font-normal',
    isAllCompleted
      ? 'text-sdk-link hover:text-sdk-link/80 font-sdk-bold'
      : 'text-sdk-foreground/50 hover:text-sdk-foreground/80',
  );

  const handleDismiss = useCallback(() => {
    if (isAllCompleted) {
      onDismiss?.();
    } else {
      setShowDismissConfirm(true);
    }
  }, [isAllCompleted, onDismiss, setShowDismissConfirm]);

  return (
    <div className="flex flex-col" ref={ref} {...restProps}>
      {data.preventDismissChecklist && !(data.autoDismissChecklist && isAllCompleted) && (
        <div className="h-4" />
      )}
      {!data.preventDismissChecklist && (
        <div className="w-full flex justify-end h-6 items-center">
          <Button
            forSdk
            variant="custom"
            className={textClassName}
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
          >
            Dismiss checklist
          </Button>
        </div>
      )}
      {data.autoDismissChecklist && isAllCompleted && (
        <div className="w-full flex justify-end">
          <div className="w-32 max-w-32 h-[2px] bg-sdk-foreground/10 rounded-full overflow-hidden">
            <div
              className="bg-sdk-progress rounded-full h-full"
              style={{
                width: `${progressWidth}%`,
                transition: 'width 5000ms linear',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

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
  const { isOpen, data } = useChecklistRootContext();
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false);

  const isCompleted = useMemo(() => {
    return item.isCompleted;
  }, [item.isCompleted]);

  // Handle animation logic - only check isShowAnimation
  useEffect(() => {
    if (isOpen && item.isShowAnimation) {
      setShouldShowAnimation(true);
      const timer = setTimeout(() => {
        setShouldShowAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item.isShowAnimation]);

  // Check if this item can be clicked based on completion order
  const isClickable = useMemo(() => {
    return canCompleteChecklistItem(data.completionOrder, data.items ?? [], item);
  }, [data.completionOrder, data.items, item]);

  // Calculate cursor and interaction styles
  const cursorStyle = useMemo(() => {
    if (!isClickable) {
      return 'cursor-not-allowed';
    }
    if (item.isCompleted && !item?.clickedActions?.length) {
      return 'cursor-default';
    }
    return 'cursor-pointer';
  }, [isClickable, item.isCompleted, item?.clickedActions?.length]);

  return (
    <Button
      forSdk
      variant="custom"
      disabled={!isClickable}
      className={cn(
        'group flex items-center px-[24px] py-2 hover:bg-sdk-foreground/5 transition-colors',
        cursorStyle,
      )}
      onClick={() => onClick(item, index)}
      aria-label={`${item.isCompleted ? 'Uncomplete' : 'Complete'} task: ${item.name}`}
    >
      <ChecklistChecked isChecked={isCompleted} isShowAnimation={shouldShowAnimation} />
      <div
        className={cn(
          'grow flex flex-col items-start',
          isCompleted && `${textDecoration} text-sdk-foreground/60`,
        )}
      >
        <span className="text-sdk-base font-sdk-bold">{item.name}</span>
        {item.description && (
          <span className="text-sdk-sm opacity-75 leading-4">{item.description}</span>
        )}
      </div>
      <TaskArrowIcon
        className={cn(
          'w-4 h-4 ml-4 flex-shrink-0',
          'opacity-0 -translate-x-4',
          'transition-all duration-200 ease-out',
          'text-sdk-checklist-checkmark',
          !isCompleted && isClickable && 'group-hover:opacity-100 group-hover:translate-x-0',
        )}
      />
    </Button>
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
