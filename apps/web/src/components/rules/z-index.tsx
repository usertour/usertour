import { RulesZIndexOffset, WebZIndex } from '@usertour/constants';
import { createContext, useContext } from 'react';

// The base z-index of the rules editor (conditions or actions) the caller is
// rendered in. Without a provider it is the dashboard's rules layer; a host
// stacked above that layer (the builder sidebar) sets its own around the
// standalone pickers it renders.
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
