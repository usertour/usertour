import { RulesZIndexOffset, WebZIndex } from '@usertour/constants';
import { createContext, useContext } from 'react';

// The base z-index of the rules editor (conditions or actions) the caller is
// rendered in. Standalone pickers render outside any editor and fall back to
// the dashboard's rules layer.
const RulesZIndexContext = createContext<number | undefined>(undefined);

export const RulesZIndexProvider = RulesZIndexContext.Provider;

// Offsets match v1 useRulesZIndex so popovers / dropdowns stack consistently
// with the surrounding chrome.
export const useRulesZIndex = () => {
  const base = useContext(RulesZIndexContext) ?? WebZIndex.RULES;
  return {
    base,
    popover: base + RulesZIndexOffset.POPOVER,
    dropdown: base + RulesZIndexOffset.DROPDOWN,
    combobox: base + RulesZIndexOffset.COMBOBOX,
    error: base + RulesZIndexOffset.ERROR,
  };
};
