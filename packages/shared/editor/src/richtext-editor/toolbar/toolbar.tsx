'use client';

import {
  Root as ToolbarRoot,
  Separator as ToolbarSeparator,
  ToggleGroup as ToolbarToggleGroup,
} from '@radix-ui/react-toolbar';
import { EDITOR_RICH_TOOLBAR } from '@usertour-packages/constants';
import { cn } from '@usertour-packages/tailwind';
import { TooltipProvider } from '@usertour-packages/tooltip';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { usePopperEditorContext } from '../editor';
import {
  AlignmentGroup,
  BlockButton,
  ColorButton,
  LinkButton,
  MarkButton,
  ToolbarOverflow,
  UserAttrButton,
} from './components';
import { useClickOutside, useResponsiveToolbar } from './hooks';
import { ALIGNMENT_ITEMS, TOOLBAR_ITEMS } from './toolbar.config';
import { TOOLBAR_CONTAINER, TOOLBAR_SEPARATOR, TOOLBAR_TOGGLE_GROUP } from './toolbar.styles';
import type {
  BlockToolbarItemConfig,
  ColorToolbarItemConfig,
  LinkToolbarItemConfig,
  MarkToolbarItemConfig,
  ToolbarItemConfig,
  UserAttributeToolbarItemConfig,
} from './toolbar.types';

/**
 * Render toolbar item based on its type
 */
const renderToolbarItem = (item: ToolbarItemConfig) => {
  switch (item.type) {
    case 'mark':
      return <MarkButton key={item.id} config={item as MarkToolbarItemConfig} />;
    case 'block':
      return <BlockButton key={item.id} config={item as BlockToolbarItemConfig} />;
    case 'link':
      return <LinkButton key={item.id} config={item as LinkToolbarItemConfig} />;
    case 'user-attribute':
      return <UserAttrButton key={item.id} config={item as UserAttributeToolbarItemConfig} />;
    case 'color':
      return <ColorButton key={item.id} config={item as ColorToolbarItemConfig} />;
    default:
      return null;
  }
};

/**
 * Rich text editor toolbar component
 *
 * Features:
 * - Configuration-driven design for easy customization
 * - Responsive layout with overflow menu
 * - Accessible with proper ARIA labels
 * - Optimized with React.memo and memoized callbacks
 */
export const EditorToolbar = memo(() => {
  const { zIndex, setShowToolbar, showToolbar } = usePopperEditorContext();
  const overflowRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLElement | null>(null);

  // Responsive layout management
  const { visibleItems, overflowItems, showOverflow, measureRef, containerRef } =
    useResponsiveToolbar(TOOLBAR_ITEMS);

  // Keep editorRef in sync with toolbar's parent element
  // Note: Run on every render to ensure ref is always current
  // since React doesn't track ref.current changes
  useEffect(() => {
    editorRef.current = containerRef.current?.parentElement ?? null;
  });

  // Handle click outside to close toolbar
  const handleClickOutside = useCallback(() => {
    setShowToolbar(false);
  }, [setShowToolbar]);

  // Stable refs array for click outside detection
  const clickOutsideRefs = useMemo(() => [containerRef, overflowRef, editorRef], [containerRef]);

  // Click outside detection with editor container support
  useClickOutside(clickOutsideRefs, handleClickOutside, showToolbar);

  return (
    <TooltipProvider>
      <ToolbarRoot
        ref={measureRef}
        aria-label="Formatting options"
        className={cn(TOOLBAR_CONTAINER, !showToolbar && 'hidden')}
        style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR }}
      >
        <ToolbarToggleGroup
          type="multiple"
          aria-label="Text formatting"
          className={TOOLBAR_TOGGLE_GROUP}
        >
          {visibleItems.map(renderToolbarItem)}
        </ToolbarToggleGroup>

        {!showOverflow && (
          <>
            <ToolbarSeparator className={TOOLBAR_SEPARATOR} />
            <AlignmentGroup items={ALIGNMENT_ITEMS} />
          </>
        )}

        {showOverflow && (
          <ToolbarOverflow
            ref={overflowRef}
            items={overflowItems}
            alignmentItems={ALIGNMENT_ITEMS}
            zIndex={zIndex}
          />
        )}
      </ToolbarRoot>
    </TooltipProvider>
  );
});

EditorToolbar.displayName = 'EditorToolbar';
