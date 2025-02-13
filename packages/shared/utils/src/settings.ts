import { Step } from '@usertour-ui/types';

export const defaultStep: Step = {
  name: 'step',
  type: 'tooltip',
  sequence: 0,
  setting: {
    height: 0,
    width: 250,
    skippable: true,
    enabledBackdrop: false,
    enabledBlockTarget: false,
    align: 'center',
    side: 'bottom',
    sideOffset: 0,
    alignOffset: 0,
    alignType: 'auto',
    position: 'center',
    positionOffsetX: 0,
    positionOffsetY: 0,
  },
  data: [
    {
      type: 'paragraph',
      children: [{ text: '' }],
    },
  ],
  target: {
    selectors: null,
    content: '',
    sequence: '1st',
    precision: 'stricter',
    isDynamicContent: false,
    customSelector: '',
    type: 'auto',
  },
};
