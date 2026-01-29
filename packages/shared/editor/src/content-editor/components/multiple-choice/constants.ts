// Constants for multiple choice component

export const DEFAULT_BUTTON_TEXT = 'Submit';
export const DEFAULT_OPTION_PREFIX = 'Option';
export const DEFAULT_OTHER_PLACEHOLDER = 'Other...';

// Shared CSS classes
export const OPTION_ITEM_BASE_CLASS =
  'flex items-center overflow-hidden group cursor-pointer relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:bg-sdk-question/30 rounded-md main-transition pl-2 py-1 gap-2 w-auto pr-0 h-auto items-center justify-center min-w-0';

export const OPTION_ITEM_EDITING_CLASS = 'hover:bg-transparent';

export const OTHER_INPUT_CLASS =
  'grow bg-transparent text-sdk-base leading-none h-sdk-font-size focus:outline-none focus:ring-0';

export const OTHER_SUBMIT_BUTTON_CLASS =
  'cursor-pointer w-6 h-6 shrink-0 p-1 m-0 bg-sdk-question hover:bg-sdk-question/90 active:bg-sdk-question/80 text-white border-0 rounded-sdk-xs transition-colors mr-1 ml-2';
