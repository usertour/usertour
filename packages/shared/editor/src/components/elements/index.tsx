import { RenderElementProps } from 'slate-react';
import { CustomElementStrings } from '../../types/slate';
import BulletedListElement, { BulletedListElementSerialize } from './bulleted-list-element';
import { CodeElement, CodeElementSerialize } from './code-element';
import { HeadingElement, HeadingElementSerialize } from './heading-element';
import { LinkElement, LinkElementSerialize } from './link-element';
import ListItemElement, { ListItemElementSerialize } from './list-item-element';
import NumberedListElement, { NumberedListElementSerialize } from './numbered-list-element';
import ParagraphElement, { ParagraphElementSerialize } from './paragraph-element';
import { UserAttributeElement, UserAttributeElementSerialize } from './user-attr-element';

export { CodeElement } from './code-element';
export { HeadingElement } from './heading-element';

type ElementMetadata = {
  // eslint-disable-next-line no-unused-vars
  render: (x: MetaRenderElementProps) => JSX.Element;
  serialize: (x: any) => JSX.Element;
};

type MetaRenderElementProps = RenderElementProps & { className?: string };

type ElementMap = Record<CustomElementStrings, ElementMetadata>;

export const ELEMENTS: ElementMap = {
  h1: {
    serialize: (props: any) => <HeadingElementSerialize headingSize={1} {...props} />,
    render: (props: MetaRenderElementProps) => <HeadingElement headingSize={1} {...props} />,
  },
  h2: {
    serialize: (props: any) => <HeadingElementSerialize headingSize={2} {...props} />,
    render: (props: MetaRenderElementProps) => <HeadingElement headingSize={2} {...props} />,
  },
  code: {
    serialize: CodeElementSerialize,
    render: CodeElement,
  },
  paragraph: {
    serialize: ParagraphElementSerialize,
    render: ParagraphElement,
  },
  'bulleted-list': {
    serialize: BulletedListElementSerialize,
    render: BulletedListElement,
  },
  'numbered-list': {
    serialize: NumberedListElementSerialize,
    render: NumberedListElement,
  },
  'list-item': {
    serialize: ListItemElementSerialize,
    render: ListItemElement,
  },
  'user-attribute': {
    serialize: UserAttributeElementSerialize,
    render: UserAttributeElement,
  },
  link: {
    serialize: LinkElementSerialize,
    render: LinkElement,
  },
};
