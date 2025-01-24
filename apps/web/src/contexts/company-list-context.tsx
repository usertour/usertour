import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { queryBizCompany } from "@usertour-ui/gql";
import { BizUser, Pagination, BizQuery } from "@usertour-ui/types";

export interface CompanyListProviderProps {
  children?: ReactNode;
  environmentId: string | undefined;
  defaultQuery?: Object
}

export interface CompanyListContextValue {
  bizCompanyList: any;
  refetch: any;
  requestPagination: Pagination;
  setRequestPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  query: Object;
  setQuery: React.Dispatch<React.SetStateAction<Object>>;
}
export const CompanyListContext = createContext<
  CompanyListContextValue | undefined
>(undefined);

export function CompanyListProvider(
  props: CompanyListProviderProps
): JSX.Element {
  const { children, environmentId, defaultQuery = {} } = props;
  const [requestPagination, setRequestPagination] = useState<Pagination>({ first: 10 })
  const [query, setQuery] = useState<Object>(defaultQuery)

  const { data, refetch } = useQuery(queryBizCompany, {
    variables: {
      ...requestPagination,
      query: { environmentId, ...query },
      orderBy: { field: "createdAt", direction: "desc" },
    },
  });

  useEffect(() => {
    refetch()
  }, [query, requestPagination])

  const bizCompanyList = data && data.queryBizCompany;
  const value: CompanyListContextValue = {
    bizCompanyList,
    refetch,
    requestPagination,
    setRequestPagination,
    query,
    setQuery
  };

  return (
    <CompanyListContext.Provider value={value}>
      {children}
    </CompanyListContext.Provider>
  );
}

export function useCompanyListContext(): CompanyListContextValue {
  const context = useContext(CompanyListContext);
  if (!context) {
    throw new Error(
      `useCompanyListContext must be used within a CompanyListProvider.`
    );
  }
  return context;
}
