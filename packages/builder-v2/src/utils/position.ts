import { ModalPosition } from '@usertour/types';

export type SidebarSide = 'left' | 'right';
export type ContentSide = 'left' | 'right' | 'center';

/**
 * Convert ModalPosition to sidebar side
 * @param position - The modal position value
 * @returns The side of the content ('left', 'right', or 'center')
 */
export function getPositionSide(position: ModalPosition | string | undefined): ContentSide {
  if (!position) return 'center';
  const pos = position.toLowerCase();
  if (pos.includes('left')) return 'left';
  if (pos.includes('right')) return 'right';
  return 'center';
}

/**
 * Get the opposite side of the given side
 * @param side - The current side ('left' or 'right')
 * @returns The opposite side
 */
export function getOppositeSide(side: SidebarSide): SidebarSide {
  return side === 'left' ? 'right' : 'left';
}
