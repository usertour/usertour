import {
  ButtonIcon,
  ImageIcon,
  InputIcon,
  RulerHorizontalIcon,
  StarIcon,
  TextAlignLeftIcon,
  TextIcon,
  VideoIcon,
} from '@radix-ui/react-icons';
import { MultiCheckIcon, NpsIcon } from '@usertour-ui/icons';
import { ContentEditorElement, ContentEditorElementType } from '../types/editor';

type ContentTypeConfig = {
  name: string;
  icon: typeof TextIcon;
  element: ContentEditorElement;
};

export const contentTypesConfig = [
  {
    name: 'Text',
    icon: TextIcon,
    element: {
      type: ContentEditorElementType.TEXT,
      data: [
        {
          type: 'paragraph',
          children: [{ text: 'Enter text here' }],
        },
      ],
    },
  },
  {
    name: 'Button',
    icon: ButtonIcon,
    element: {
      type: ContentEditorElementType.BUTTON,
      data: {
        action: 'goto',
        text: 'Next',
        type: 'default',
      },
    },
  },
  {
    name: 'Image',
    icon: ImageIcon,
    element: { type: ContentEditorElementType.IMAGE, url: '' },
  },
  {
    name: 'Embed',
    icon: VideoIcon,
    element: { type: ContentEditorElementType.EMBED, url: '' },
  },
  {
    name: 'NPS',
    icon: NpsIcon,
    element: {
      type: ContentEditorElementType.NPS,
      data: { name: '', lowLabel: '', highLabel: '' },
    },
  },
  {
    name: 'Star Rating',
    icon: StarIcon,
    element: {
      type: ContentEditorElementType.STAR_RATING,
      data: { name: '', lowRange: 1, highRange: 5 },
    },
  },
  {
    name: 'Scale',
    icon: RulerHorizontalIcon,
    element: {
      type: ContentEditorElementType.SCALE,
      data: { name: '', lowRange: 1, highRange: 5 },
    },
  },
  {
    name: 'Single Line Text',
    icon: InputIcon,
    element: {
      type: ContentEditorElementType.SINGLE_LINE_TEXT,
      data: { name: '', placeholder: '', buttonText: '', required: false },
    },
  },
  {
    name: 'Multi Line Text',
    icon: TextAlignLeftIcon,
    element: {
      type: ContentEditorElementType.MULTI_LINE_TEXT,
      data: { name: '', placeholder: '', buttonText: '', required: false },
    },
  },
  {
    name: 'Multiple Choice',
    icon: MultiCheckIcon,
    element: {
      type: ContentEditorElementType.MULTIPLE_CHOICE,
      data: {
        name: '',
        options: [
          { label: '', value: '' },
          { label: '', value: '' },
        ],
        shuffleOptions: false,
        enableOther: false,
        allowMultiple: false,
      },
    },
  },
] as ContentTypeConfig[];
