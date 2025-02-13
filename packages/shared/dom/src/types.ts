export type Alignment = 'start' | 'end';
export type Side = 'top' | 'right' | 'bottom' | 'left';
export type AlignedPlacement = `${Side}-${Alignment}`;
export type Placement = Side | AlignedPlacement;
export type Strategy = 'absolute' | 'fixed';
export type Axis = 'x' | 'y';
export type Length = 'width' | 'height';

export type Coords = { [key in Axis]: number };

export type SideObject = { [key in Side]: number };

export type Dimensions = { [key in Length]: number };

export type Rect = Coords & Dimensions;
/**
 * Custom positioning reference element.
 * @see https://floating-ui.com/docs/virtual-elements
 */
export type VirtualElement = {
  getBoundingClientRect(): ClientRectObject;
  contextElement?: any;
};
export type ClientRectObject = Rect & SideObject;
export type Padding = number | Partial<SideObject>;
export type Boundary = any;
export type RootBoundary = 'viewport' | 'document' | Rect;
export type ElementContext = 'reference' | 'floating';
