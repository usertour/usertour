// Context for passing link URL decorator from SDK to Widget components
import { createContext, useContext } from 'react';

/**
 * Context for link URL decorator function
 * Used to modify link URLs before rendering (e.g., adding authentication tokens)
 */
export const LinkDecoratorContext = createContext<((url: string) => string) | null>(null);

/**
 * Hook to access the link URL decorator from context
 * Returns null if no decorator is provided
 */
export const useLinkDecorator = (): ((url: string) => string) | null => {
  return useContext(LinkDecoratorContext);
};
