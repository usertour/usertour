import type { TranslationUnitField } from '@usertour/helpers';
import { ContentEditorElementType } from '@usertour/types';

/**
 * Row label per unit field — typed over the walkers' field registry, so a
 * field the walkers start emitting cannot reach the page without saying how
 * it is labeled (null = the row shows no label of its own: rich-text runs,
 * and media whose element section already names them).
 */
export const FIELD_LABEL_KEYS: Record<TranslationUnitField, string | null> = {
  text: null,
  fallback: 'contents.localization.field.attributeFallback',
  'link.url': 'contents.localization.field.linkUrl',
  'button.text': null,
  'navigate.url': 'contents.localization.field.navigateUrl',
  'image.url': null,
  'image.alt': 'contents.localization.field.imageAlt',
  'image.link.url': 'contents.localization.field.linkUrl',
  'embed.url': null,
  'question.name': 'contents.localization.field.question',
  'question.lowLabel': 'contents.localization.field.lowLabel',
  'question.highLabel': 'contents.localization.field.highLabel',
  'question.placeholder': 'contents.localization.field.placeholder',
  'question.buttonText': 'contents.localization.field.buttonText',
  'question.otherPlaceholder': 'contents.localization.field.otherPlaceholder',
  'question.option': 'contents.localization.field.optionLabel',
  buttonText: 'contents.localization.field.buttonText',
  headerText: 'contents.localization.field.headerText',
  title: 'contents.localization.field.title',
  readMoreLabel: 'contents.localization.field.readMoreLabel',
  'tab.name': 'contents.localization.field.tabName',
  'block.name': 'contents.localization.field.blockLabel',
  'item.name': 'contents.localization.field.taskName',
  'item.description': 'contents.localization.field.taskDescription',
  'contentItem.label': 'contents.localization.field.listItemLabel',
};

/** Section label per element type; elements absent here have no translatable units. */
export const ELEMENT_LABEL_KEYS: Partial<Record<ContentEditorElementType, string>> = {
  [ContentEditorElementType.TEXT]: 'contents.localization.element.content',
  [ContentEditorElementType.IMAGE]: 'contents.localization.element.image',
  [ContentEditorElementType.EMBED]: 'contents.localization.element.video',
  [ContentEditorElementType.BUTTON]: 'contents.localization.element.button',
  [ContentEditorElementType.NPS]: 'contents.localization.element.nps',
  [ContentEditorElementType.STAR_RATING]: 'contents.localization.element.starRating',
  [ContentEditorElementType.SCALE]: 'contents.localization.element.scale',
  [ContentEditorElementType.SINGLE_LINE_TEXT]: 'contents.localization.element.singleLineText',
  [ContentEditorElementType.MULTI_LINE_TEXT]: 'contents.localization.element.multiLineText',
  [ContentEditorElementType.MULTIPLE_CHOICE]: 'contents.localization.element.multipleChoice',
};
