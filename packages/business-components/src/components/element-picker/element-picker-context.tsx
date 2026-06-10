import { createContext, useContext } from 'react';

export interface PickElementOptions {
  // Restricts which elements the user can pick, as a CSS selector — e.g.
  // form controls for text-input / text-fill conditions. Non-matching
  // elements can't be selected in the picker overlay.
  mustMatch?: string;
}

export interface PickElementResult {
  selector: string;
  // How many elements the picked selector currently matches on the target
  // page. Consumers surface their "if multiple matches" control when > 1.
  matchCount: number;
}

// Resolves with the picked selector, or null when the user cancelled or the
// host already surfaced the failure itself (install prompt, error toast).
// The host owns the target URL and the picking transport; consumers only
// ask "pick an element" and apply the result.
export type PickElementFunction = (
  options?: PickElementOptions,
) => Promise<PickElementResult | null>;

const ElementPickerContext = createContext<PickElementFunction | undefined>(undefined);

export const ElementPickerProvider = ElementPickerContext.Provider;

// Returns undefined outside a provider (or when the host has no pickable
// page) — consumers hide their pick affordance in that case, e.g. when
// conditions render in segment / filter contexts.
export const useElementPicker = (): PickElementFunction | undefined => {
  return useContext(ElementPickerContext);
};
