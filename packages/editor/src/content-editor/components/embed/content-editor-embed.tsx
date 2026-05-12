// Main editable embed component

import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import type { EmbedData } from '@usertour-packages/widget';
import { Embed } from '@usertour-packages/widget';
import type { ContentOmbedInfo } from '@usertour/types';
import { memo, useCallback, useMemo, useState } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';
import {
  ContentEditorElementInsertDirection,
  ContentEditorEmebedElement,
} from '../../../types/editor';
import { EMBED_DIMENSION_TYPE_OPTIONS } from '../../constants';
import { ActionButtonsBase, MarginControls, WidthControls } from '../../shared';
import type { DimensionType, MarginPosition } from '../../types';
import { ensureDimensionWithDefaults } from '../../utils';
import { EmbedUrlInput } from './embed-url-input';

export interface ContentEditorEmbedProps {
  element: ContentEditorEmebedElement;
  path: number[];
  id: string;
}

export const ContentEditorEmbed = memo(({ element, path, id }: ContentEditorEmbedProps) => {
  const { zIndex, insertElementInColumn, deleteElementInColumn, updateElement, getOembedInfo } =
    useContentEditorContext();

  const [isLoading, setIsLoading] = useState(false);

  // Delete handler
  const handleDelete = useCallback(() => {
    deleteElementInColumn(path);
  }, [deleteElementInColumn, path]);

  // Insert handlers
  const handleAddLeft = useCallback(() => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.LEFT);
  }, [insertElementInColumn, element, path]);

  const handleAddRight = useCallback(() => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.RIGHT);
  }, [insertElementInColumn, element, path]);

  // Width handlers
  const handleWidthTypeChange = useCallback(
    (type: string) => {
      const width = ensureDimensionWithDefaults({
        ...element.width,
        type: type as DimensionType,
      });
      updateElement({ ...element, width }, id);
    },
    [element, updateElement, id],
  );

  const handleWidthValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      const width = ensureDimensionWithDefaults({
        ...element.width,
        value,
        type: element.width?.type as DimensionType,
      });
      updateElement({ ...element, width }, id);
    },
    [element, updateElement, id],
  );

  // Height handlers
  const handleHeightValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      const height = ensureDimensionWithDefaults({
        ...element.height,
        value,
        type: element.height?.type as DimensionType,
      });
      updateElement({ ...element, height }, id);
    },
    [element, updateElement, id],
  );

  const handleHeightTypeChange = useCallback(
    (type: string) => {
      const height = ensureDimensionWithDefaults({
        ...element.height,
        type: type as DimensionType,
      });
      updateElement({ ...element, height }, id);
    },
    [element, updateElement, id],
  );

  // Margin handlers
  const handleMarginValueChange = useCallback(
    (position: MarginPosition, value: string) => {
      const numericValue = value === '' ? 0 : Number(value);
      const margin = {
        ...element.margin,
        [position]: numericValue,
        enabled: element.margin?.enabled ?? false,
      };
      updateElement({ ...element, margin }, id);
    },
    [element, updateElement, id],
  );

  const handleMarginCheckedChange = useCallback(
    (enabled: boolean) => {
      const margin = {
        ...element.margin,
        enabled,
      };
      updateElement({ ...element, margin }, id);
    },
    [element, updateElement, id],
  );

  // URL handlers
  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      updateElement({ ...element, url: value }, id);
    },
    [element, updateElement, id],
  );

  const handleSubmitUrl = useCallback(async () => {
    if (!element.url.trim()) return;

    setIsLoading(true);
    try {
      let oembed: ContentOmbedInfo | undefined;
      if (getOembedInfo) {
        const resp = await getOembedInfo(element.url);
        if (resp) {
          oembed = { ...resp };
        }
      }

      const updatedElement: ContentEditorEmebedElement = { ...element, parsedUrl: element.url };
      if (oembed) {
        updatedElement.oembed = oembed;

        // If oembed returns width and height, set default dimensions
        if (oembed.width && oembed.height) {
          updatedElement.height = {
            type: 'pixels',
            value: oembed.height,
          };
          updatedElement.width = {
            type: 'percent',
            value: 100,
          };
        }
      }

      updateElement(updatedElement, id);
    } catch (error) {
      console.error('Failed to load embed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [element, getOembedInfo, updateElement, id]);

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Embed data={embedData} isReadOnly={false} />
      </PopoverTrigger>
      <PopoverContent
        className="bg-background"
        side="right"
        align="start"
        style={{ zIndex }}
        sideOffset={10}
      >
        <div className="flex flex-col gap-2.5">
          <EmbedUrlInput
            url={element.url}
            isLoading={isLoading}
            onUrlChange={handleUrlChange}
            onSubmit={handleSubmitUrl}
          />

          <WidthControls
            label="Display width"
            value={ensureDimensionWithDefaults(element.width)}
            options={EMBED_DIMENSION_TYPE_OPTIONS}
            onTypeChange={handleWidthTypeChange}
            onValueChange={handleWidthValueChange}
            zIndex={zIndex}
            inputPlaceholder="Display width"
          />

          <WidthControls
            label="Display height"
            value={ensureDimensionWithDefaults(element.height)}
            options={EMBED_DIMENSION_TYPE_OPTIONS}
            onTypeChange={handleHeightTypeChange}
            onValueChange={handleHeightValueChange}
            zIndex={zIndex}
            inputPlaceholder="Display height"
          />

          <MarginControls
            margin={element.margin}
            onMarginChange={handleMarginValueChange}
            onMarginEnabledChange={handleMarginCheckedChange}
          />

          <ActionButtonsBase
            entityName="embed"
            onDelete={handleDelete}
            onAddLeft={handleAddLeft}
            onAddRight={handleAddRight}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
});

ContentEditorEmbed.displayName = 'ContentEditorEmbed';
