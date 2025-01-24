import { useQuery } from "@apollo/client";
import { queryContents } from "@usertour-ui/gql";
import { Content, ContentDataType, Pagination } from "@usertour-ui/types";

type UseContentListQueryProps = {
  query: {
    environmentId: string;
    type?: ContentDataType;
  };
  pagination?: Pagination;
  orderBy?: {
    field: string;
    direction: "asc" | "desc";
  };
};

export const useContentListQuery = ({
  query,
  orderBy = { field: "createdAt", direction: "desc" },
  pagination = { first: 1000 },
}: UseContentListQueryProps) => {
  const { data, refetch, error } = useQuery(queryContents, {
    variables: {
      ...pagination,
      query,
      orderBy,
    },
  });
  const contentList =
    data &&
    data.queryContents &&
    data.queryContents.edges.map((e: any) => e.node);

  const contents = contentList ? (contentList as Content[]) : [];

  return { contents, refetch, error };
};
