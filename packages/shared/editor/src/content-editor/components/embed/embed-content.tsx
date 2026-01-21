// Embed content display component

import { VideoIcon } from '@usertour-packages/icons';
import { forwardRef, useMemo } from 'react';

import type { ContentEditorEmebedElement } from '../../../types/editor';
import {
  DEFAULT_EMBED_HEIGHT,
  DEFAULT_EMBED_SIZE,
  DEFAULT_EMBED_WIDTH,
  MARGIN_KEY_MAPPING,
} from '../../constants';
import type { MarginPosition } from '../../types';

// Utility function to calculate aspect ratio
const calculateAspectRatio = (width?: number, height?: number): number => {
  if (!width || !height) return 0;
  return height / width;
};

// Transform element properties to CSS styles
const transformsStyle = (element: ContentEditorEmebedElement): React.CSSProperties => {
  const style: React.CSSProperties = {};
  const aspectRatio = calculateAspectRatio(element.oembed?.width, element.oembed?.height);

  // Handle width
  if (!element.width || element.width?.type === 'percent') {
    const width = element?.width?.value ?? DEFAULT_EMBED_WIDTH;
    style.width = `calc(${width}% + 0px)`;

    if (aspectRatio > 0) {
      style.height = '0px';
      style.paddingBottom = `calc(${aspectRatio * width}% + 0px)`;
    }
  } else if (element?.width?.value) {
    style.width = `${element.width.value}px`;
    style.height = aspectRatio ? `${element.width.value * aspectRatio}px` : '100%';
    style.paddingBottom = '0px';
  }

  // Handle height
  if (!element.height || element.height?.type === 'percent') {
    const height = element?.height?.value ?? DEFAULT_EMBED_HEIGHT;
    style.height = `calc(${height}% + 0px)`;
    style.paddingBottom = '0px';
  } else if (element?.height?.value) {
    style.height = `${element.height.value}px`;
    style.paddingBottom = '0px';
  }

  // Handle margins
  if (element.margin) {
    for (const [key, marginName] of Object.entries(MARGIN_KEY_MAPPING)) {
      const marginKey = key as MarginPosition;
      const marginValue = element.margin?.[marginKey];

      if (marginValue !== undefined) {
        if (element.margin.enabled) {
          (style as Record<string, unknown>)[marginName] = `${marginValue}px`;
        } else {
          (style as Record<string, unknown>)[marginName] = undefined;
        }
      }
    }
  }

  return style;
};

export interface EmbedContentProps extends React.HTMLAttributes<HTMLDivElement> {
  element: ContentEditorEmebedElement;
  isReadOnly?: boolean;
}

export const EmbedContent = forwardRef<HTMLDivElement, EmbedContentProps>(
  ({ element, isReadOnly = false, ...props }, ref) => {
    const containerStyle = useMemo(
      () => ({
        position: 'relative' as const,
        ...transformsStyle(element),
      }),
      [element],
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
      if (element.oembed?.html) {
        return element.oembed.html
          .replace(/width=[0-9,"']+/, 'width="100%"')
          .replace(/height=[0-9,"']+/, 'height="100%"');
      }
      return null;
    }, [element.oembed?.html]);

    // Render oembed HTML content
    if (element.oembed?.html && element.parsedUrl) {
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
    if (element.parsedUrl) {
      const iframeStyle: React.CSSProperties | undefined = isReadOnly
        ? undefined
        : {
            display: 'block',
            pointerEvents: 'none',
          };

      return (
        <div ref={ref} style={containerStyle} {...props}>
          <iframe
            src={element.parsedUrl}
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

EmbedContent.displayName = 'EmbedContent';
