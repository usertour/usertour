import imageExtensions from 'image-extensions';
import { Editor, Transforms } from 'slate';

import { ImageElementType } from '../types/slate';

export const withImages = (editor: Editor) => {
  const { insertData, isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element);
  };

  editor.insertData = (data) => {
    const text = data.getData('text/plain');
    const { files } = data;

    if (files && files.length > 0) {
      for (const file of files as any) {
        const reader = new FileReader();
        const [mime] = file.type.split('/');

        if (mime === 'image') {
          reader.addEventListener('load', () => {
            const url = reader.result;
            insertImage(editor, url as string);
          });

          reader.readAsDataURL(file);
        }
      }
    } else if (isImageUrl(text)) {
      insertImage(editor, text);
    } else {
      insertData(data);
    }
  };

  return editor;
};

export const insertImage = (editor: Editor, url: string) => {
  const image: ImageElementType = { type: 'image', url, children: [{ text: '' }] };
  Transforms.insertNodes(editor, image);
};

const isImageUrl = (url: string) => {
  if (!url) return false;
  try {
    const ext = new URL(url).pathname.split('.').pop();
    if (!ext) return false;
    return imageExtensions.includes(ext);
  } catch {
    return false;
  }
};
