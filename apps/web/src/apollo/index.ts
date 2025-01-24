import { InMemoryCache, ApolloClient, DefaultOptions } from "@apollo/client";
import { typeDefs } from "./type-defs";
import link from "./middlewares";
import initCache from "./cache";

let client: ApolloClient<any>;

const defaultOptions: DefaultOptions = {
  watchQuery: {
    fetchPolicy: "no-cache",
    errorPolicy: "ignore",
  },
  query: {
    fetchPolicy: "no-cache",
    errorPolicy: "all",
  },
};

export const getApolloClient = async (): Promise<ApolloClient<any>> => {
  if (client) return client;

  const cache: InMemoryCache = await initCache();

  const apolloClient: ApolloClient<any> = new ApolloClient({
    link,
    cache,
    connectToDevTools: import.meta.env.MODE === "development",
    typeDefs,
    defaultOptions: defaultOptions,
  });

  client = apolloClient;

  return apolloClient;
};
