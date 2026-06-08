import { ReactNode, createContext, useContext, useState } from 'react';

export interface TriggerProviderProps {
  children?: ReactNode;
}

export interface TriggerContextValue {
  showError: boolean;
  setShowError: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TriggerContext = createContext<TriggerContextValue | undefined>(undefined);

export function TriggerProvider(props: TriggerProviderProps): JSX.Element {
  const { children } = props;
  const [showError, setShowError] = useState<boolean>(false);

  const value: TriggerContextValue = { showError, setShowError };

  return <TriggerContext.Provider value={value}>{children}</TriggerContext.Provider>;
}

export function useTriggerContext(): TriggerContextValue {
  const context = useContext(TriggerContext);
  if (!context) {
    throw new Error('useTriggerContext must be used within a TriggerProvider.');
  }
  return context;
}
