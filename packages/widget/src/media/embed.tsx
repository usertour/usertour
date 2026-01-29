// Embed component for SDK widget

import { VideoIcon } from '@usertour-packages/icons';
import { forwardRef, useMemo } from 'react';

import {
  DEFAULT_EMBED_HEIGHT,
  DEFAULT_EMBED_SIZE,
  DEFAULT_EMBED_WIDTH,
  MARGIN_KEY_MAPPING,
} from './constants';
import type { EmbedData, MarginPosition } from './types';

// Utility function to calculate aspect ratio
const calculateAspectRatio = (width?: number, height?: number): number => {
  if (!width || !height) return 0;
  return height / width;
};

// Transform embed data to CSS styles
const transformsStyle = (data: EmbedData): React.CSSProperties => {
  const style: React.CSSProperties = {};
  const aspectRatio = calculateAspectRatio(data.oembed?.width, data.oembed?.height);

  // Handle width
  if (!data.width || data.width?.type === 'percent') {
    const width = data?.width?.value ?? DEFAULT_EMBED_WIDTH;
    style.width = `calc(${width}% + 0px)`;

    if (aspectRatio > 0) {
      style.height = '0px';
      style.paddingBottom = `calc(${aspectRatio * width}% + 0px)`;
    }
  } else if (data?.width?.value) {
    style.width = `${data.width.value}px`;
    style.height = aspectRatio ? `${data.width.value * aspectRatio}px` : '100%';
    style.paddingBottom = '0px';
  }

  // Handle height
  if (!data.height || data.height?.type === 'percent') {
    const height = data?.height?.value ?? DEFAULT_EMBED_HEIGHT;
    style.height = `calc(${height}% + 0px)`;
    style.paddingBottom = '0px';
  } else if (data?.height?.value) {
    style.height = `${data.height.value}px`;
    style.paddingBottom = '0px';
  }

  // Handle margins
  if (data.margin) {
    for (const [key, marginName] of Object.entries(MARGIN_KEY_MAPPING)) {
      const marginKey = key as MarginPosition;
      const marginValue = data.margin?.[marginKey];

      if (marginValue !== undefined) {
        if (data.margin.enabled) {
          (style as Record<string, unknown>)[marginName] = `${marginValue}px`;
        } else {
          (style as Record<string, unknown>)[marginName] = undefined;
        }
      }
    }
  }

  return style;
};

export interface EmbedProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Embed data containing URL, dimensions, and oembed info */
  data: EmbedData;
  /** Whether the embed is in read-only mode (enables pointer events) */
  isReadOnly?: boolean;
}

/**
 * Embed component for SDK widget
 * Displays embedded content from external providers (YouTube, Vimeo, etc.)
 */
export const Embed = forwardRef<HTMLDivElement, EmbedProps>(
  ({ data, isReadOnly = false, ...props }, ref) => {
    const containerStyle = useMemo(
      () => ({
        position: 'relative' as const,
        ...transformsStyle(data),
      }),
      [data],
    );

    const innerStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: '0px',
        left: '0px',
        display: 'block' as const,
        width: '100%',
        height: '100%',
      }),
      [],
    );

    const sanitizedHtml = useMemo(() => {
      if (data.oembed?.html) {
        return data.oembed.html
          .replace(/width=[0-9,"']+/, 'width="100%"')
          .replace(/height=[0-9,"']+/, 'height="100%"');
      }
      return null;
    }, [data.oembed?.html]);

    // Render oembed HTML content
    if (data.oembed?.html && data.parsedUrl) {
      return (
        <div ref={ref} style={containerStyle} {...props}>
          <div
            style={innerStyle}
            className={
              isReadOnly ? '' : '[&>iframe]:pointer-events-none [&>video]:pointer-events-none'
            }
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized HTML from oembed
            dangerouslySetInnerHTML={{ __html: sanitizedHtml! }}
          />
        </div>
      );
    }

    // Render iframe for parsed URL
    if (data.parsedUrl) {
      const iframeStyle: React.CSSProperties | undefined = isReadOnly
        ? undefined
        : {
            display: 'block',
            pointerEvents: 'none',
          };

      return (
        <div ref={ref} style={containerStyle} {...props}>
          <iframe
            src={data.parsedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; fullscreen; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={true}
            tabIndex={-1}
            style={iframeStyle}
            title="embed"
          />
        </div>
      );
    }

    // Render placeholder when no URL
    return (
      <div
        ref={ref}
        className="flex items-center justify-center cursor-pointer w-full h-full"
        {...props}
      >
        <VideoIcon
          className="fill-slate-300"
          width={DEFAULT_EMBED_SIZE}
          height={DEFAULT_EMBED_SIZE}
        />
      </div>
    );
  },
);

Embed.displayName = 'Embed';

// Backward compatibility alias
export const EmbedContent = Embed;
export type EmbedContentProps = EmbedProps;
