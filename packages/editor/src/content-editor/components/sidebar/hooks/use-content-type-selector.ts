// Hook for content type selection logic

import { cuid, isQuestionElement } from '@usertour/helpers';
import { useCallback, useMemo } from 'react';

import { useContentEditorContext } from '../../../../contexts/content-editor-context';
import type { ContentEditorElement, ContentEditorQuestionElement } from '../../../../types/editor';
import { contentTypesConfig } from '../../../../utils/config';

export interface UseContentTypeSelectorOptions {
  onClose?: () => void;
}

export interface UseContentTypeSelectorReturn {
  filteredContentTypes: typeof contentTypesConfig;
  handleContentTypeClick: (element: ContentEditorElement) => void;
}

export function useContentTypeSelector(
  onClick: (element: ContentEditorElement) => void,
  options?: UseContentTypeSelectorOptions,
): UseContentTypeSelectorReturn {
  const { enabledElementTypes } = useContentEditorContext();
  const { onClose } = options ?? {};

  // Filter buttons based on enabledElementTypes
  const filteredContentTypes = useMemo(
    () =>
      enabledElementTypes
        ? contentTypesConfig.filter((config) => enabledElementTypes.includes(config.element.type))
        : contentTypesConfig,
    [enabledElementTypes],
  );

  // Handle content type selection
  const handleContentTypeClick = useCallback(
    (element: ContentEditorElement) => {
      if (isQuestionElement(element)) {
        const el = element as ContentEditorQuestionElement;
        const newElement = {
          ...element,
          data: { ...el.data, cvid: cuid() },
        } as ContentEditorQuestionElement;
        onClick(newElement);
      } else {
        onClick(element);
      }
      onClose?.();
    },
    [onClick, onClose],
  );

  return {
    filteredContentTypes,
    handleContentTypeClick,
  };
}
