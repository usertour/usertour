// Content editor main entry point

import { ContentEditorContextProvider } from '../contexts/content-editor-context';
import { ContentEditorElementType, type ContentEditorProps } from '../types/editor';
import { defaultInitialValue } from '../utils/helper';
import { Editor } from './components/editor';

export const ContentEditor = (props: ContentEditorProps) => {
  const {
    initialValue = defaultInitialValue,
    enabledElementTypes = [
      ContentEditorElementType.IMAGE,
      ContentEditorElementType.EMBED,
      ContentEditorElementType.TEXT,
      ContentEditorElementType.BUTTON,
    ],
  } = props;

  return (
    <ContentEditorContextProvider
      {...props}
      initialValue={initialValue}
      enabledElementTypes={enabledElementTypes}
    >
      <Editor />
    </ContentEditorContextProvider>
  );
};

ContentEditor.displayName = 'ContentEditor';
