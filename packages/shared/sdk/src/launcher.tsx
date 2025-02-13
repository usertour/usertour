import { forwardRef, useRef, createContext, useContext } from 'react';
import { useComposedRefs } from '@usertour-ui/react-compose-refs';
import { autoUpdate, ReferenceElement } from '@floating-ui/dom';
import { useFloating, offset, shift, limitShift, hide, flip, size } from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/dom';
import { UserIcon } from '@usertour-ui/icons';
import { InfoCircledIcon, RocketIcon } from '@radix-ui/react-icons';
import {
  Align,
  LauncherData,
  LauncherDataType,
  Side,
  Theme,
  ThemeTypesSetting,
} from '@usertour-ui/types';
import { cn } from '@usertour-ui/ui-utils';
import {
  Popper,
  PopperContent,
  PopperContentPotal,
  PopperContentProps,
  PopperProps,
} from './popper';
import { useThemeStyles } from './hook';

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

type Boundary = Element | null;

export const IconsList = [
  { ICON: InfoCircledIcon, text: 'Info Circled', name: 'info-circled' },
  { ICON: RocketIcon, text: 'Rocket', name: 'rocket' },
  { ICON: UserIcon, text: 'User', name: 'user' },
];

interface LauncherContentProps {
  type?: LauncherDataType;
  onOpenChange?: (open: boolean) => void;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  side?: Side;
  sideOffset?: number;
  align?: Align;
  alignOffset?: number;
  avoidCollisions?: boolean;
  collisionBoundary?: Boundary | Boundary[];
  collisionPadding?: number | Partial<Record<Side, number>>;
  sticky?: 'partial' | 'always';
  hideWhenDetached?: boolean;
  dir?: string;
  globalStyle?: string;
  updatePositionStrategy?: 'optimized' | 'always';
  referenceRef?: React.RefObject<any>;
  iconType?: string;
  zIndex: number;
}

interface LauncherRootProps {
  children: React.ReactNode;
  theme: Theme;
  data: LauncherData;
}

interface LauncherContextValue {
  globalStyle: string;
  themeSetting?: ThemeTypesSetting;
  data: LauncherData;
}

const LauncherContext = createContext<LauncherContextValue | null>(null);

const useLauncherContext = () => {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error('useLauncherContext must be used within a LauncherRoot');
  }
  return context;
};

const LauncherRoot = (props: LauncherRootProps) => {
  const { children, theme, data } = props;
  const { globalStyle, themeSetting } = useThemeStyles(theme);

  return (
    <LauncherContext.Provider value={{ globalStyle, themeSetting, data }}>
      {children}
    </LauncherContext.Provider>
  );
};

LauncherRoot.displayName = 'LauncherRoot';

interface LauncherContainerProps {
  children: React.ReactNode;
}

const LauncherContainer = forwardRef<HTMLDivElement, LauncherContainerProps>(
  ({ children }, ref) => {
    const { globalStyle } = useLauncherContext();
    const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
      if (el?.style) {
        el.style.cssText = globalStyle;
      }
    });
    return (
      <div id="usertour-widget" ref={composedRefs}>
        {children}
      </div>
    );
  },
);

LauncherContainer.displayName = 'LauncherContainer';

// Add interfaces before the component definitions
interface LauncherIconProps {
  type: LauncherDataType;
  iconType?: string;
  ref?: React.Ref<HTMLDivElement>;
  width?: number;
  height?: number;
}

// UI Components
const LauncherIcon = forwardRef<HTMLDivElement, LauncherIconProps>(
  ({ type, iconType, width, height }, ref) => {
    const ActiveIcon = IconsList.find((item) => item.name === iconType)?.ICON;

    if (type === LauncherDataType.BEACON) {
      return (
        <div ref={ref}>
          <div className="usertour-widget-beacon__ping" />
          <div className="usertour-widget-beacon__pong" />
        </div>
      );
    }

    if (type === LauncherDataType.ICON && ActiveIcon) {
      return (
        <div ref={ref}>
          <ActiveIcon width={width} height={height} />
        </div>
      );
    }

    return null;
  },
);

LauncherIcon.displayName = 'LauncherIcon';

interface LauncherViewProps {
  className?: string;
  style: React.CSSProperties;
  dir?: string;
  type: LauncherDataType;
  iconType?: string;
}

const LauncherView = forwardRef<HTMLDivElement, LauncherViewProps>(
  ({ className, style, dir, type, iconType }, ref) => {
    const { themeSetting } = useLauncherContext();
    let iconClass = 'usertour-widget-launcher--icon';
    if (type === LauncherDataType.BEACON) {
      iconClass = 'usertour-widget-beacon ';
    }
    const isClick = true;
    const classes = `usertour-widget-launcher ${iconClass} ${
      isClick ? 'usertour-widget-launcher--activate-on-click' : ''
    }`;

    return (
      <div className={cn(classes, className)} ref={ref} style={style} dir={dir}>
        <LauncherIcon
          type={type}
          iconType={iconType}
          width={themeSetting?.launcherIcon.size}
          height={themeSetting?.launcherIcon.size}
        />
      </div>
    );
  },
);

LauncherView.displayName = 'LauncherView';

const LauncherContent = forwardRef<HTMLDivElement, LauncherContentProps>((props, forwardedRef) => {
  const {
    side = 'bottom',
    sideOffset = 0,
    align = 'center',
    alignOffset = 0,
    avoidCollisions = true,
    collisionBoundary = [],
    collisionPadding: collisionPaddingProp = 0,
    sticky = 'partial',
    hideWhenDetached = false,
    dir = 'ltr',
    updatePositionStrategy = 'optimized',
    referenceRef,
    zIndex,
    type = LauncherDataType.ICON,
    iconType,
  } = props;

  const referenceEl = referenceRef?.current as ReferenceElement;
  const { globalStyle } = useLauncherContext();

  const desiredPlacement = `${side}${align !== 'center' ? `-${align}` : ''}` as Placement;
  const collisionPadding =
    typeof collisionPaddingProp === 'number'
      ? collisionPaddingProp
      : { top: 0, right: 0, bottom: 0, left: 0, ...collisionPaddingProp };

  const boundary = Array.isArray(collisionBoundary) ? collisionBoundary : [collisionBoundary];
  const hasExplicitBoundaries = boundary.length > 0;

  const detectOverflowOptions = {
    padding: collisionPadding,
    boundary: boundary.filter(isNotNull),
    // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
    altBoundary: hasExplicitBoundaries,
  };

  const { refs, floatingStyles, isPositioned } = useFloating({
    // default to `fixed` strategy so users don't have to pick and we also avoid focus scroll issues
    strategy: 'fixed',
    placement: desiredPlacement,
    whileElementsMounted: (...args) => {
      const cleanup = autoUpdate(...args, {
        animationFrame: updatePositionStrategy === 'always',
      });
      return cleanup;
    },
    elements: {
      reference: referenceEl,
    },
    middleware: [
      offset({
        mainAxis: sideOffset,
        alignmentAxis: alignOffset,
      }),
      avoidCollisions &&
        shift({
          mainAxis: true,
          crossAxis: false,
          limiter: sticky === 'partial' ? limitShift() : undefined,
          ...detectOverflowOptions,
        }),
      avoidCollisions && flip({ ...detectOverflowOptions }),
      size({
        ...detectOverflowOptions,
      }),
      hideWhenDetached && hide({ strategy: 'referenceHidden', ...detectOverflowOptions }),
    ],
  });

  const popperRef = useRef<HTMLDivElement | null>(null);
  const composedRefs = useComposedRefs(forwardedRef, popperRef, (node: any) =>
    refs.setFloating(node),
  );

  function parseStyleString(styleString: string): Record<string, string> {
    // Initialize result object
    const result: Record<string, string> = {};

    // Split by semicolon and filter out empty strings
    const declarations = styleString.split(';').filter((declaration) => declaration.trim());

    for (const declaration of declarations) {
      // Find the first colon to separate property and value
      const colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) continue;

      const property = declaration.substring(0, colonIndex).trim();
      const value = declaration.substring(colonIndex + 1).trim();

      if (property && value) {
        result[property] = value;
      }
    }

    return result;
  }

  const combinedStyles = {
    ...parseStyleString(globalStyle),
    ...floatingStyles,
    zIndex: zIndex + 1,
    transform: isPositioned ? floatingStyles.transform : 'translate(0, -200%)',
    opacity: isPositioned ? '1' : '0',
  };

  return (
    <LauncherView
      ref={composedRefs}
      style={combinedStyles}
      dir={dir}
      type={type}
      iconType={iconType}
    />
  );
});

LauncherContent.displayName = 'LauncherContent';

const LauncherPopper = forwardRef<HTMLDivElement, Omit<PopperProps, 'globalStyle'>>(
  (props, ref) => {
    const { globalStyle } = useLauncherContext();
    return <Popper ref={ref} {...props} globalStyle={globalStyle} />;
  },
);

LauncherPopper.displayName = 'LauncherPopper';

const LauncherPopperContentPotal = forwardRef<HTMLDivElement, PopperContentProps>((props, ref) => {
  const { themeSetting, data } = useLauncherContext();

  return (
    <PopperContentPotal
      ref={ref}
      width={`${data.tooltip.width}px`}
      sideOffset={data.tooltip.alignment.sideOffset}
      alignOffset={data.tooltip.alignment.alignOffset}
      side={data.tooltip.alignment.side}
      align={
        data.tooltip.alignment.alignType === 'auto'
          ? 'center'
          : (data.tooltip.alignment.align ?? 'center')
      }
      avoidCollisions={data.tooltip.alignment.alignType === 'auto'}
      arrowSize={{
        width: themeSetting?.tooltip.notchSize ?? 20,
        height: (themeSetting?.tooltip.notchSize ?? 10) / 2,
      }}
      arrowColor={themeSetting?.mainColor.background}
      {...props}
    />
  );
});

LauncherPopperContentPotal.displayName = 'LauncherPopperContentPotal';

const LauncherPopperContent = PopperContent;

const LauncherContentWrapper = forwardRef<HTMLDivElement, LauncherContentProps>(
  ({ ...props }, ref) => {
    const { data } = useLauncherContext();
    const {
      side = 'bottom',
      align,
      sideOffset = 0,
      alignOffset = 0,
      alignType = 'auto',
    } = data.target.alignment;

    return (
      <LauncherContent
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        align={alignType === 'auto' ? 'center' : (align ?? 'center')}
        avoidCollisions={alignType === 'auto'}
        type={data.type}
        iconType={data.iconType}
        ref={ref}
        {...props}
      />
    );
  },
);

LauncherContentWrapper.displayName = 'LauncherContentWrapper';

export {
  LauncherRoot,
  LauncherContent,
  LauncherContentWrapper,
  LauncherIcon,
  LauncherView,
  LauncherPopper,
  LauncherPopperContent,
  LauncherPopperContentPotal,
  LauncherContainer,
};
