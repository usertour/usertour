import {
  ModalPosition,
  ResourceCenterBlockType,
  ResourceCenterData,
  ResourceCenterMessageBlock,
  ResourceCenterPlacement,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { DropDownIcon, QuestionMarkCircledIcon } from '@usertour-packages/icons';
import {
  createContext,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSettingsStyles } from './hooks/use-settings-styles';
import { ContentEditorSerialize } from '../serialize/content-editor-serialize';
import {
  Popper,
  PopperContent,
  PopperContentFrame,
  PopperMadeWith,
  PopperModalContentPotal,
  type PopperProps,
  PopperStaticContent,
} from './popper';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { computePositionStyle } from './utils/position';
import { AssetAttributes, Frame, useFrame } from '@usertour-packages/frame';
import { useSize } from '@usertour-packages/react-use-size';
import { cn } from '@usertour-packages/tailwind';
import { Button } from '../primitives';

// ============================================================================
// Placement mapping
// ============================================================================

const placementToModalPosition = (placement: ResourceCenterPlacement): ModalPosition => {
  const map: Record<ResourceCenterPlacement, ModalPosition> = {
    'top-left': ModalPosition.LeftTop,
    'top-right': ModalPosition.RightTop,
    'bottom-left': ModalPosition.LeftBottom,
    'bottom-right': ModalPosition.RightBottom,
  };
  return map[placement] ?? ModalPosition.RightBottom;
};

// ============================================================================
// Context
// ============================================================================

interface ResourceCenterRootContextValue {
  globalStyle: string;
  themeSetting: ThemeTypesSetting;
  data: ResourceCenterData;
  isOpen: boolean;
  handleExpandedChange: (expanded: boolean) => Promise<void>;
  zIndex: number;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  checklistSlot?: React.ReactNode;
  showMadeWith: boolean;
}

const ResourceCenterRootContext = createContext<ResourceCenterRootContextValue | null>(null);

const useResourceCenterRootContext = () => {
  const context = useContext(ResourceCenterRootContext);
  if (!context) {
    throw new Error('useResourceCenterRootContext must be used within a ResourceCenterRoot.');
  }
  return context;
};

// ============================================================================
// Root
// ============================================================================

interface ResourceCenterRootProps {
  children: React.ReactNode;
  themeSettings: ThemeTypesSetting;
  data: ResourceCenterData;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => Promise<void>;
  zIndex: number;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  checklistSlot?: React.ReactNode;
  showMadeWith?: boolean;
}

const ResourceCenterRoot = memo((props: ResourceCenterRootProps) => {
  const {
    children,
    data,
    expanded = false,
    onExpandedChange,
    zIndex,
    themeSettings,
    userAttributes,
    onContentClick,
    checklistSlot,
    showMadeWith = true,
  } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(themeSettings);

  const isOpen = expanded;

  const handleExpandedChange = useCallback(
    async (open: boolean) => {
      await onExpandedChange?.(open);
    },
    [onExpandedChange],
  );

  const contextValue = useMemo(
    () => ({
      globalStyle,
      themeSetting,
      data,
      isOpen,
      handleExpandedChange,
      zIndex,
      userAttributes,
      onContentClick,
      checklistSlot,
      showMadeWith,
    }),
    [
      globalStyle,
      themeSetting,
      data,
      isOpen,
      handleExpandedChange,
      zIndex,
      userAttributes,
      onContentClick,
      checklistSlot,
      showMadeWith,
    ],
  );

  return (
    <ResourceCenterRootContext.Provider value={contextValue}>
      {children}
    </ResourceCenterRootContext.Provider>
  );
});

ResourceCenterRoot.displayName = 'ResourceCenterRoot';

// ============================================================================
// Container — applies globalStyle CSS vars (like ChecklistContainer)
// ============================================================================

const ResourceCenterContainer = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const { globalStyle } = useResourceCenterRootContext();
    const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
      if (el?.style) {
        el.style.cssText = globalStyle;
      }
    });

    return <div ref={composedRefs}>{children}</div>;
  },
);

ResourceCenterContainer.displayName = 'ResourceCenterContainer';

// ============================================================================
// Launcher icon
// ============================================================================

const ResourceCenterLauncherIcon = memo(
  ({
    iconType,
    iconUrl,
    imageHeight,
  }: {
    iconType?: string;
    iconUrl?: string;
    imageHeight?: number;
  }) => {
    if (iconType === 'custom' && iconUrl) {
      return (
        <img
          src={iconUrl}
          alt=""
          style={{ height: imageHeight ?? 28, width: 'auto', objectFit: 'contain' }}
        />
      );
    }
    if (iconType === 'plaintext-question-mark') {
      return (
        <span className="text-lg font-bold leading-none" style={{ fontSize: imageHeight ?? 28 }}>
          ?
        </span>
      );
    }
    return <QuestionMarkCircledIcon width={imageHeight ?? 28} height={imageHeight ?? 28} />;
  },
);

ResourceCenterLauncherIcon.displayName = 'ResourceCenterLauncherIcon';

// ============================================================================
// Badge
// ============================================================================

interface ResourceCenterBadgeProps {
  count: number;
}

const ResourceCenterBadge = memo(({ count }: ResourceCenterBadgeProps) => {
  if (count <= 0) return null;

  return (
    <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-xs font-bold min-w-[20px] h-5 px-1 bg-sdk-resource-center-badge-background text-sdk-resource-center-badge-foreground">
      {count}
    </div>
  );
});

ResourceCenterBadge.displayName = 'ResourceCenterBadge';

// ============================================================================
// Launcher (like ChecklistLauncher — fixed position button)
// ============================================================================

interface ResourceCenterLauncherContentProps {
  onClick?: () => void;
  badgeCount?: number;
  launcherText?: string;
  onSizeChange?: (rect: { width: number; height: number }) => void;
}

const ResourceCenterLauncherContent = forwardRef<
  HTMLButtonElement,
  ResourceCenterLauncherContentProps
>((props, ref) => {
  const { onClick, badgeCount = 0, launcherText, onSizeChange } = props;
  const { themeSetting, data } = useResourceCenterRootContext();
  const launcher = themeSetting.resourceCenterLauncherButton;

  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
  const rect = useSize(contentRef);

  useEffect(() => {
    if (rect) {
      onSizeChange?.(rect);
    }
  }, [rect, onSizeChange]);

  const resolvedText = useMemo(() => {
    if (launcher?.textMode === 'no-text') return undefined;
    if (launcher?.textMode === 'active-checklist-text' && launcherText) return launcherText;
    return data.buttonText;
  }, [launcher?.textMode, launcherText, data.buttonText]);

  const buttonClassName = cn(
    'rounded-sdk-resource-center-launcher h-full w-full flex bg-sdk-resource-center-launcher-background',
    'cursor-pointer items-center justify-center',
    'hover:bg-sdk-resource-center-launcher-hover',
    'active:bg-sdk-resource-center-launcher-active',
    'focus-visible:outline-none',
    'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-transparent',
    'focus-visible:ring-offset-[3px] focus-visible:ring-offset-sdk-resource-center-launcher-foreground/30',
    'text-sdk-resource-center-launcher-foreground font-sdk-resource-center-launcher',
  );

  return (
    <Button
      variant="custom"
      ref={ref}
      style={{ height: launcher?.height ?? 60 }}
      className={buttonClassName}
      onClick={onClick}
      aria-label={data.buttonText}
    >
      <div
        ref={setContentRef}
        className="flex items-center whitespace-nowrap gap-2"
        style={{
          paddingLeft: launcher?.height ? `${Number(launcher.height) / 2}px` : undefined,
          paddingRight: launcher?.height ? `${Number(launcher.height) / 2}px` : undefined,
          transitionDuration: 'var(--usertour-resource-center-transition-duration)',
        }}
      >
        <span className="relative flex items-center justify-center">
          <ResourceCenterLauncherIcon
            iconType={launcher?.iconType}
            iconUrl={launcher?.iconUrl}
            imageHeight={launcher?.imageHeight}
          />
          <ResourceCenterBadge count={badgeCount} />
        </span>
        {resolvedText && (
          <span className="text-sm font-semibold whitespace-nowrap">{resolvedText}</span>
        )}
      </div>
    </Button>
  );
});

ResourceCenterLauncherContent.displayName = 'ResourceCenterLauncherContent';

interface ResourceCenterLauncherProps {
  badgeCount?: number;
  launcherText?: string;
  onClick?: () => void;
}

const ResourceCenterLauncher = forwardRef<HTMLDivElement, ResourceCenterLauncherProps>(
  (props, ref) => {
    const { onClick, badgeCount, launcherText } = props;
    const { themeSetting, zIndex } = useResourceCenterRootContext();

    const rc = themeSetting.resourceCenter;
    const launcher = themeSetting.resourceCenterLauncherButton;
    const placement = rc?.placement ?? 'bottom-right';
    const position = placementToModalPosition(placement);
    const style = computePositionStyle(position, rc?.offsetX ?? 20, rc?.offsetY ?? 20);

    return (
      <div
        ref={ref}
        className="fixed overflow-hidden shadow-[0_3px_10px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.1)]"
        style={{
          zIndex,
          ...style,
          height: launcher?.height ?? 60,
          borderRadius: launcher?.borderRadius ?? 9999,
        }}
      >
        <ResourceCenterLauncherContent
          onClick={onClick}
          badgeCount={badgeCount}
          launcherText={launcherText}
        />
      </div>
    );
  },
);

ResourceCenterLauncher.displayName = 'ResourceCenterLauncher';

// ============================================================================
// Launcher Frame (like ChecklistLauncherFrame — iframe variant for SDK)
// ============================================================================

interface ResourceCenterLauncherFrameProps {
  assets: AssetAttributes[] | undefined;
  badgeCount?: number;
  launcherText?: string;
}

const ResourceCenterLauncherFrame = forwardRef<HTMLIFrameElement, ResourceCenterLauncherFrameProps>(
  (props, ref) => {
    const { assets, badgeCount, launcherText } = props;
    const { globalStyle, themeSetting, zIndex } = useResourceCenterRootContext();
    const [launcherRect, setLauncherRect] = useState<{ width: number; height: number } | null>(
      null,
    );

    const rc = themeSetting.resourceCenter;
    const launcher = themeSetting.resourceCenterLauncherButton;
    const placement = rc?.placement ?? 'bottom-right';
    const position = placementToModalPosition(placement);
    const style = computePositionStyle(position, rc?.offsetX ?? 20, rc?.offsetY ?? 20);

    const width = launcherRect?.width ? `${launcherRect.width}px` : undefined;

    return (
      <Frame
        assets={assets}
        ref={ref}
        className="fixed overflow-hidden shadow-[0_3px_10px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.1)]"
        defaultStyle={{
          zIndex,
          ...style,
          height: launcher?.height ?? 60,
          borderRadius: launcher?.borderRadius ?? 9999,
          width,
        }}
      >
        <ResourceCenterLauncherInFrame
          globalStyle={globalStyle}
          onSizeChange={setLauncherRect}
          badgeCount={badgeCount}
          launcherText={launcherText}
        />
      </Frame>
    );
  },
);

ResourceCenterLauncherFrame.displayName = 'ResourceCenterLauncherFrame';

interface ResourceCenterLauncherInFrameProps {
  globalStyle?: string;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  badgeCount?: number;
  launcherText?: string;
}

const ResourceCenterLauncherInFrame = forwardRef<
  HTMLDivElement,
  ResourceCenterLauncherInFrameProps
>((props, _) => {
  const { globalStyle, onSizeChange, badgeCount, launcherText } = props;
  const { handleExpandedChange } = useResourceCenterRootContext();
  const { document } = useFrame();

  useEffect(() => {
    if (globalStyle && document?.body) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  return (
    <ResourceCenterLauncherContent
      onClick={async () => await handleExpandedChange(true)}
      onSizeChange={onSizeChange}
      badgeCount={badgeCount}
      launcherText={launcherText}
    />
  );
});

ResourceCenterLauncherInFrame.displayName = 'ResourceCenterLauncherInFrame';

// ============================================================================
// Popper (like ChecklistPopper — conditional launcher / modal)
// ============================================================================

interface ResourceCenterPopperExtraProps {
  badgeCount?: number;
  launcherText?: string;
}

const ResourceCenterPopper = forwardRef<
  HTMLDivElement,
  Omit<PopperProps, 'globalStyle'> & ResourceCenterPopperExtraProps
>((props, ref) => {
  const { children, badgeCount, launcherText, ...popperProps } = props;
  const { globalStyle, isOpen, themeSetting, handleExpandedChange } =
    useResourceCenterRootContext();

  const rc = themeSetting.resourceCenter;
  const placement = rc?.placement ?? 'bottom-right';
  const position = placementToModalPosition(placement);

  const handleLauncherClick = useCallback(async () => {
    await handleExpandedChange(true);
  }, [handleExpandedChange]);

  const modalContentProps = useMemo(
    () => ({
      position: position as unknown as string,
      positionOffsetX: rc?.offsetX ?? 20,
      positionOffsetY: rc?.offsetY ?? 20,
      enabledBackdrop: false,
      width: `${rc?.normalWidth ?? 360}px`,
    }),
    [position, rc?.offsetX, rc?.offsetY, rc?.normalWidth],
  );

  const optimizedPopperProps = useMemo(
    () => ({
      ...popperProps,
      triggerRef: undefined,
      open: isOpen,
      globalStyle,
    }),
    [popperProps, isOpen, globalStyle],
  );

  if (!isOpen) {
    return (
      <ResourceCenterLauncher
        onClick={handleLauncherClick}
        badgeCount={badgeCount}
        launcherText={launcherText}
      />
    );
  }

  return (
    <Popper ref={ref} {...optimizedPopperProps}>
      <PopperModalContentPotal {...modalContentProps}>{children}</PopperModalContentPotal>
    </Popper>
  );
});

ResourceCenterPopper.displayName = 'ResourceCenterPopper';

// ============================================================================
// Popper with iframe (like ChecklistPopperUseIframe)
// ============================================================================

const ResourceCenterPopperUseIframe = forwardRef<
  HTMLDivElement,
  Omit<PopperProps, 'globalStyle'> & ResourceCenterPopperExtraProps
>((props, ref) => {
  const { children, assets, badgeCount, launcherText, ...popperProps } = props;
  const { globalStyle, isOpen, themeSetting } = useResourceCenterRootContext();

  const rc = themeSetting.resourceCenter;
  const placement = rc?.placement ?? 'bottom-right';
  const position = placementToModalPosition(placement);

  const modalContentProps = useMemo(
    () => ({
      position: position as unknown as string,
      positionOffsetX: rc?.offsetX ?? 20,
      positionOffsetY: rc?.offsetY ?? 20,
      enabledBackdrop: false,
      width: `${rc?.normalWidth ?? 360}px`,
    }),
    [position, rc?.offsetX, rc?.offsetY, rc?.normalWidth],
  );

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

  if (!isOpen) {
    return (
      <ResourceCenterLauncherFrame
        assets={assets}
        badgeCount={badgeCount}
        launcherText={launcherText}
      />
    );
  }

  return (
    <Popper ref={ref} {...optimizedPopperProps} isIframeMode={true}>
      <PopperModalContentPotal {...modalContentProps}>
        <PopperContentFrame {...props}>{children}</PopperContentFrame>
      </PopperModalContentPotal>
    </Popper>
  );
});

ResourceCenterPopperUseIframe.displayName = 'ResourceCenterPopperUseIframe';

// ============================================================================
// Static Popper (like ChecklistStaticPopper — for previews)
// ============================================================================

const ResourceCenterStaticPopper = forwardRef<
  HTMLDivElement,
  Omit<PopperProps, 'globalStyle' | 'zIndex'>
>((props, ref) => {
  const { children, ...popperProps } = props;
  const { globalStyle, zIndex, themeSetting } = useResourceCenterRootContext();

  const rc = themeSetting.resourceCenter;

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

  const staticContentProps = useMemo(
    () => ({
      ref,
      globalStyle,
      height: 'auto',
      width: `${rc?.normalWidth ?? 360}px`,
      showArrow: false,
    }),
    [globalStyle, rc?.normalWidth],
  );

  return (
    <Popper {...optimizedPopperProps}>
      <PopperStaticContent {...staticContentProps}>{children}</PopperStaticContent>
    </Popper>
  );
});

ResourceCenterStaticPopper.displayName = 'ResourceCenterStaticPopper';

// ============================================================================
// Popper Content (alias, like ChecklistPopperContent)
// ============================================================================

const ResourceCenterPopperContent = PopperContent;
ResourceCenterPopperContent.displayName = 'ResourceCenterPopperContent';

// ============================================================================
// Header (brand-colored header bar with close button)
// ============================================================================

const ResourceCenterHeader = memo(({ text }: { text: string }) => {
  return (
    <div
      className="bg-sdk-resource-center-header-background px-3 py-2 flex items-center shrink-0"
      style={{ transitionDuration: 'var(--usertour-resource-center-transition-duration)' }}
    >
      <div className="text-sdk-resource-center-header-foreground font-semibold text-base flex-1">
        {text}
      </div>
      <ResourceCenterDropdown />
    </div>
  );
});

ResourceCenterHeader.displayName = 'ResourceCenterHeader';

// ============================================================================
// Dropdown close button (like ChecklistDropdown)
// ============================================================================

const ResourceCenterDropdown = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { handleExpandedChange } = useResourceCenterRootContext();
  const { className, ...restProps } = props;

  const buttonClassName = cn(
    'size-6 rounded',
    'inline-flex items-center justify-center',
    'text-sdk-resource-center-header-foreground',
    'hover:bg-sdk-resource-center-header-foreground/10',
    'outline-none cursor-pointer',
    className,
  );

  const handleClick = useCallback(async () => {
    await handleExpandedChange(false);
  }, [handleExpandedChange]);

  return (
    <Button
      variant="custom"
      ref={ref}
      className={buttonClassName}
      onClick={handleClick}
      aria-label="Close resource center"
      {...restProps}
    >
      <DropDownIcon height={24} width={24} />
    </Button>
  );
});

ResourceCenterDropdown.displayName = 'ResourceCenterDropdown';

// ============================================================================
// Block — MESSAGE
// ============================================================================

interface ResourceCenterMessageBlockViewProps {
  block: ResourceCenterMessageBlock;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  editSlot?: React.ReactNode;
}

const ResourceCenterMessageBlockView = memo(
  ({ block, userAttributes, onContentClick, editSlot }: ResourceCenterMessageBlockViewProps) => {
    if (editSlot) {
      return <div className="py-2 px-4">{editSlot}</div>;
    }

    return (
      <div className="py-2 px-4">
        <ContentEditorSerialize
          contents={block.content}
          onClick={onContentClick}
          userAttributes={userAttributes}
        />
      </div>
    );
  },
);

ResourceCenterMessageBlockView.displayName = 'ResourceCenterMessageBlockView';

// ============================================================================
// Block — CHECKLIST (slot)
// ============================================================================

interface ResourceCenterChecklistBlockViewProps {
  slot?: React.ReactNode;
}

const ResourceCenterChecklistBlockView = memo(({ slot }: ResourceCenterChecklistBlockViewProps) => {
  if (slot) {
    return <div className="px-4 py-2">{slot}</div>;
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 text-sm opacity-50">
        <span>📋</span>
        <span>No active checklist</span>
      </div>
    </div>
  );
});

ResourceCenterChecklistBlockView.displayName = 'ResourceCenterChecklistBlockView';

// ============================================================================
// Body
// ============================================================================

const ResourceCenterBody = memo(({ children }: { children: React.ReactNode }) => {
  const { themeSetting } = useResourceCenterRootContext();
  const rc = themeSetting.resourceCenter;

  return (
    <div
      className="flex-1 overflow-y-auto bg-sdk-background"
      style={{
        maxHeight: rc?.maxHeight ? `${rc.maxHeight}px` : undefined,
      }}
    >
      {children}
    </div>
  );
});

ResourceCenterBody.displayName = 'ResourceCenterBody';

// ============================================================================
// Blocks — renders all blocks with dividers
// ============================================================================

interface ResourceCenterBlocksProps {
  messageEditSlots?: Record<string, React.ReactNode>;
}

const ResourceCenterBlocks = memo(({ messageEditSlots }: ResourceCenterBlocksProps) => {
  const { themeSetting, data, userAttributes, onContentClick, checklistSlot } =
    useResourceCenterRootContext();

  const rc = themeSetting.resourceCenter;
  const showDividers = rc?.dividerLines !== false;

  return (
    <>
      {data.blocks.map((block, index) => {
        const showDivider = showDividers && index < data.blocks.length - 1;

        return (
          <div key={block.id}>
            {block.type === ResourceCenterBlockType.MESSAGE && (
              <ResourceCenterMessageBlockView
                block={block}
                userAttributes={userAttributes}
                onContentClick={onContentClick}
                editSlot={messageEditSlots?.[block.id]}
              />
            )}
            {block.type === ResourceCenterBlockType.CHECKLIST && (
              <ResourceCenterChecklistBlockView slot={checklistSlot} />
            )}
            {showDivider && <div className="mx-4 border-b border-sdk-resource-center-divider" />}
          </div>
        );
      })}

      {data.blocks.length === 0 && (
        <div className="py-8 text-center text-sm opacity-40">No blocks added yet</div>
      )}
    </>
  );
});

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';

// ============================================================================
// Footer (MadeWith)
// ============================================================================

const ResourceCenterFooter = memo(() => {
  const { showMadeWith } = useResourceCenterRootContext();
  if (!showMadeWith) return null;
  return <PopperMadeWith />;
});

ResourceCenterFooter.displayName = 'ResourceCenterFooter';

// ============================================================================
// Exports
// ============================================================================

export {
  ResourceCenterRoot,
  ResourceCenterContainer,
  ResourceCenterLauncher,
  ResourceCenterLauncherContent,
  ResourceCenterLauncherIcon,
  ResourceCenterLauncherFrame,
  ResourceCenterPopper,
  ResourceCenterPopperUseIframe,
  ResourceCenterPopperContent,
  ResourceCenterStaticPopper,
  ResourceCenterHeader,
  ResourceCenterDropdown,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterMessageBlockView,
  ResourceCenterChecklistBlockView,
  ResourceCenterBadge,
  ResourceCenterFooter,
  useResourceCenterRootContext,
};
