// Shared preview types. The popper preview measures its anchor and the
// outer pane reports its own rect so children can position themselves
// relative to the visible canvas.
export interface Rect {
  width: number;
  height: number;
  x: number;
  y: number;
}
