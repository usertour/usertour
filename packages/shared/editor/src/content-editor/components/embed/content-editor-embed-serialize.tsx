// Serialize component for embed (read-only mode for SDK)

import type { EmbedData } from '@usertour-packages/widget';
import { Embed } from '@usertour-packages/widget';
import { memo, useMemo } from 'react';

import type { ContentEditorEmebedElement } from '../../../types/editor';

export interface ContentEditorEmbedSerializeProps {
  element: ContentEditorEmebedElement;
}

export const ContentEditorEmbedSerialize = memo<ContentEditorEmbedSerializeProps>(({ element }) => {
  // Map element properties to EmbedData format
  // Type assertion needed due to ContentEditorWidth.type being string vs DimensionType literal
  const embedData = useMemo<EmbedData>(
    () => ({
      url: element.url,
      parsedUrl: element.parsedUrl,
      width: element.width as EmbedData['width'],
      height: element.height as EmbedData['height'],
      margin: element.margin,
      oembed: element.oembed,
    }),
    [element.url, element.parsedUrl, element.width, element.height, element.margin, element.oembed],
  );

  return <Embed data={embedData} isReadOnly />;
});

ContentEditorEmbedSerialize.displayName = 'ContentEditorEmbedSerialize';
