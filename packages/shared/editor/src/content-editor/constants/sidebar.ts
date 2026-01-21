// Sidebar component style constants

import type { CSSProperties } from 'react';
import { ContentEditorSideBarType } from '../../types/editor';

// Sidebar selection indicator colors
export const SIDEBAR_SELECTION_COLORS = {
  background: 'rgb(212, 254, 230)',
  border: 'rgb(0, 184, 80)',
  borderDotted: '1px dotted rgb(0, 184, 80)',
  borderSolid: '1px solid rgb(0, 184, 80)',
  icon: '#22c55e',
} as const;

// Base style for selection indicator (used for RIGHT sidebar)
const SELECT_BASE_STYLE: CSSProperties = {
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
  background: SIDEBAR_SELECTION_COLORS.background,
  border: SIDEBAR_SELECTION_COLORS.borderSolid,
  opacity: 0,
  transition: 'width 0.15s ease-out, transform, opacity 0.3s ease-out 0.1s',
  transformOrigin: 'right center',
  backfaceVisibility: 'hidden',
  transform: 'translateZ(0px) translateX(-1px)',
};

// Style for bottom selection indicator
const SELECT_BOTTOM_STYLE: CSSProperties = {
  ...SELECT_BASE_STYLE,
  top: 'unset',
  bottom: '0px',
  width: '100%',
  height: '0px',
  transition: 'height 0.15s ease-out, transform, opacity 0.3s ease-out 0.1s',
  transformOrigin: 'bottom center',
  transform: 'translateZ(0px) translateY(-1px)',
};

// Style for top selection indicator
const SELECT_TOP_STYLE: CSSProperties = {
  ...SELECT_BOTTOM_STYLE,
  top: '0px',
  bottom: 'unset',
  transformOrigin: 'top center',
};

// Base style for add button
const BUTTON_BASE_STYLE: CSSProperties = {
  position: 'absolute',
  top: '50%',
  cursor: 'pointer',
  zIndex: 10,
  transform: 'translateY(-50%) translateX(37.5%) scale(1)',
  transformOrigin: 'right center',
  transition: 'transform 0.15s ease-out',
  right: '0px',
};

// Style for bottom add button
const BUTTON_BOTTOM_STYLE: CSSProperties = {
  ...BUTTON_BASE_STYLE,
  top: 'unset',
  left: '50%',
  transform: 'translateX(-50%) translateY(37.5%) scale(1)',
  transformOrigin: 'bottom center',
  bottom: '0px',
};

// Style for top add button
const BUTTON_TOP_STYLE: CSSProperties = {
  ...BUTTON_BOTTOM_STYLE,
  bottom: 'unset',
  top: '0px',
  left: '50%',
  transformOrigin: 'top center',
  transform: 'translateX(-50%) translateY(-50%) scale(1)',
};

// Style configuration for each sidebar type
type SidebarStyleConfig = {
  button: CSSProperties;
  select: CSSProperties;
  activeButtonTransform: string;
  activeSelectSize: { width?: string; height?: string };
};

const SIDEBAR_STYLE_CONFIG: Record<ContentEditorSideBarType, SidebarStyleConfig> = {
  [ContentEditorSideBarType.BOTTOM]: {
    button: BUTTON_BOTTOM_STYLE,
    select: SELECT_BOTTOM_STYLE,
    activeButtonTransform: 'translateX(-50%) translateY(37.5%) scale(1.2)',
    activeSelectSize: { height: '20px' },
  },
  [ContentEditorSideBarType.RIGHT]: {
    button: BUTTON_BASE_STYLE,
    select: SELECT_BASE_STYLE,
    activeButtonTransform: 'translateY(-50%) translateX(37.5%) scale(1.2)',
    activeSelectSize: { width: '20px' },
  },
  [ContentEditorSideBarType.TOP]: {
    button: BUTTON_TOP_STYLE,
    select: SELECT_TOP_STYLE,
    activeButtonTransform: 'translateX(-50%) translateY(-37.5%) scale(1.2)',
    activeSelectSize: { height: '20px' },
  },
};

/**
 * Get computed styles for sidebar button and selection indicator
 * @param type - Sidebar position type (TOP, RIGHT, BOTTOM)
 * @param isActive - Whether the sidebar is in active/hover state
 * @returns Tuple of [buttonStyle, selectStyle]
 */
export const getSidebarStyles = (
  type: ContentEditorSideBarType,
  isActive: boolean,
): [CSSProperties, CSSProperties] => {
  const config = SIDEBAR_STYLE_CONFIG[type];

  const buttonStyle: CSSProperties = {
    ...config.button,
    transform: isActive ? config.activeButtonTransform : config.button.transform,
  };

  const selectStyle: CSSProperties = {
    ...config.select,
    ...(isActive ? config.activeSelectSize : { width: '1px', height: '1px' }),
    opacity: 0.5,
    border: isActive ? SIDEBAR_SELECTION_COLORS.borderDotted : SIDEBAR_SELECTION_COLORS.borderSolid,
  };

  return [buttonStyle, selectStyle];
};
