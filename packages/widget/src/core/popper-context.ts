import type { SideObject, Rect } from '@floating-ui/dom';
import { AssetAttributes } from '@usertour-packages/frame';
import { createContext } from '@usertour-packages/react-context';

/**
 * Internal Popper context - shared between popper and bubble components
 * This file is not exported from the package's public API
 */

export const POPPER_NAME = 'Popover';

export type PopperContextProps = {
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  zIndex: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
  triggerRef?: React.RefObject<any>;
  viewportRef?: React.RefObject<any>;
  referenceHidden?: boolean;
  setReferenceHidden?: (hidden: boolean) => void;
  rect?: Rect;
  setRect?: (rect: Rect | undefined) => void;
  overflow?: SideObject;
  setOverflow?: (overflow: SideObject | undefined) => void;
  // Iframe related states
  isIframeMode?: boolean;
  isIframeLoaded?: boolean;
  setIsIframeLoaded?: (loaded: boolean) => void;
  shouldShow?: boolean;
};

export const [PopperProvider, usePopperContext] = createContext<PopperContextProps>(POPPER_NAME);
