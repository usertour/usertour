import type { AssetAttributes } from '@usertour/frame';
import type { EmbedData, ThemeTypesSetting } from '@usertour/types';
import type { CSSProperties } from 'react';
import { forwardRef, memo, useMemo } from 'react';

import {
  InlineBody,
  InlineRoot,
  getInlineContentWrapperStyle,
  useInlineRootContext,
  type InlineShell,
} from './inline';

// The embed is the second surface of the shared inline shell (./inline): a
// card that lives in the host layout at a target element. What is embed-only
// here is the mapping from its stored data onto the shell and the theme
// section it reads its padding from (ADR 0022).

export const EMBED_DEFAULT_PADDING_PX = 16;

/** Maps the embed's stored data onto the shared inline shell. */
export const toEmbedInlineShell = (data: EmbedData | undefined): InlineShell => ({
  allowDismiss: data?.allowUsersToDismiss ?? false,
  maxContentWidth: data?.maxContentWidth,
  outerMargin: data?.outerMargin,
});

export const getEmbedPadding = (themeSetting: ThemeTypesSetting | undefined): number =>
  themeSetting?.embed?.padding ?? EMBED_DEFAULT_PADDING_PX;

/**
 * Host-side wrapper style for an in-flow embed: sized to the live measurement
 * and kept invisible until it lands, so the page never shows a guessed height.
 */
export function getEmbedWrapperStyle(measuredHeight: number | null): CSSProperties {
  const style: CSSProperties = {
    position: 'relative',
    ['--usertour-widget-embed-height' as string]:
      measuredHeight === null ? '0px' : `${measuredHeight}px`,
  };
  if (measuredHeight === null) {
    style.visibility = 'hidden';
  }
  return style;
}

interface EmbedRootProps {
  themeSettings: ThemeTypesSetting;
  data: EmbedData;
  zIndex?: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
  onDismiss?: () => void;
  /** Fires with the live-measured height (content + padding); see InlineRoot. */
  onMeasuredHeightChange?: (height: number | null) => void;
  children?: React.ReactNode;
}

const EmbedRoot = memo((props: EmbedRootProps) => {
  const { data, zIndex, assets, onDismiss, themeSettings, globalStyle, onMeasuredHeightChange } =
    props;
  const shell = useMemo(() => toEmbedInlineShell(data), [data]);

  return (
    <InlineRoot
      surface="embed"
      themeSettings={themeSettings}
      shell={shell}
      zIndex={zIndex}
      assets={assets}
      globalStyle={globalStyle}
      onDismiss={onDismiss}
      onMeasuredHeightChange={onMeasuredHeightChange}
      getPadding={getEmbedPadding}
    >
      {props.children}
    </InlineRoot>
  );
});

EmbedRoot.displayName = 'EmbedRoot';

interface EmbedPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to render inside the embed (e.g. ContentEditor in builder preview). */
  children?: React.ReactNode;
}

/** The non-iframe embed: a static card in the host document (builder and theme previews). */
const EmbedPreview = memo(
  forwardRef<HTMLDivElement, EmbedPreviewProps>((props, ref) => {
    const { children, style, ...restProps } = props;
    const { shell } = useInlineRootContext();
    const contentStyle = useMemo(() => getInlineContentWrapperStyle(shell), [shell]);
    const wrapperStyle = useMemo<CSSProperties>(
      () => ({
        position: 'relative',
        ['--usertour-widget-embed-height' as string]: 'auto',
        ...style,
      }),
      [style],
    );

    return (
      <div ref={ref} className="usertour-widget-embed" style={wrapperStyle} {...restProps}>
        <InlineBody style={contentStyle}>{children}</InlineBody>
      </div>
    );
  }),
);

EmbedPreview.displayName = 'EmbedPreview';

export { EmbedRoot, EmbedPreview };
