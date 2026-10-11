import type { ApolloError } from '@apollo/client';
import { createContext, type ReactNode, useContext } from 'react';

export interface QueryFailure {
  operationName: string;
  error: ApolloError;
}

export type QueryErrorNotifier = (failure: QueryFailure) => void;

// Without a provider a failed query is still visible — in the console.
const logFailure: QueryErrorNotifier = (failure) => {
  console.error(`[query] ${failure.operationName} failed`, failure.error);
};

const QueryErrorNotifierContext = createContext<QueryErrorNotifier>(logFailure);

export interface QueryErrorNotifierProviderProps {
  /**
   * How the application shows a failed query to the user. The hooks package
   * imports no toast and no translations (ADR 0002); the application mounts
   * this once with its own (ADR 0021 §2).
   */
  notify: QueryErrorNotifier;
  children: ReactNode;
}

export const QueryErrorNotifierProvider = (props: QueryErrorNotifierProviderProps) => {
  const { notify, children } = props;
  return (
    <QueryErrorNotifierContext.Provider value={notify}>
      {children}
    </QueryErrorNotifierContext.Provider>
  );
};

QueryErrorNotifierProvider.displayName = 'QueryErrorNotifierProvider';

export const useQueryErrorNotifier = (): QueryErrorNotifier =>
  useContext(QueryErrorNotifierContext);
