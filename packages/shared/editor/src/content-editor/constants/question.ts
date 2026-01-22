// Constants for question components (NPS, Scale, Star Rating)

// NPS specific constants
export const NPS_SCALE_LENGTH = 11;
export const NPS_DEFAULT_LOW_LABEL = 'Not at all likely';
export const NPS_DEFAULT_HIGH_LABEL = 'Extremely likely';

// Shared button style for scale-type questions (NPS, Scale)
export const QUESTION_BUTTON_BASE_CLASS =
  'flex items-center overflow-hidden group relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:border-sdk-question hover:bg-sdk-question/40 rounded-md main-transition p-2 justify-center w-auto min-w-0';

// Shared grid class for scale-type questions
export const QUESTION_SCALE_GRID_CLASS = 'grid gap-1.5 !gap-1';

// Shared labels container class
export const QUESTION_LABELS_CONTAINER_CLASS =
  'flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80';

// Star rating SVG path
export const STAR_SVG_PATH =
  'M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z';
