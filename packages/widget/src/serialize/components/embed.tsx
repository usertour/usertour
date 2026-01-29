// Embed serialize component for SDK rendering

import type { ContentEditorEmebedElement } from '@usertour/types';
import { memo, useMemo } from 'react';

import { Embed, type EmbedData } from '../../media';

export interface EmbedSerializeProps {
  element: ContentEditorEmebedElement;
}

export const EmbedSerialize = memo<EmbedSerializeProps>(({ element }) => {
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

EmbedSerialize.displayName = 'EmbedSerialize';
