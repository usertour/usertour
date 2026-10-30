import { EmbedPlacement } from '@usertour/types';
import type { EmbedData } from '@usertour/types';

export const DEFAULT_EMBED_DATA: EmbedData = {
  placement: EmbedPlacement.IMMEDIATELY_AFTER_ELEMENT,
  allowUsersToDismiss: true,
};
