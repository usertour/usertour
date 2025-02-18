import { ApolloClient, DefaultOptions, InMemoryCache } from '@apollo/client';
import initCache from './cache';
import link from './middlewares';
import { typeDefs } from './type-defs';

let client: ApolloClient<any>;

const defaultOptions: DefaultOptions = {
  watchQuery: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
  },
  query: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
  },
};

export const getApolloClient = async (): Promise<ApolloClient<any>> => {
  if (client) return client;

  const cache: InMemoryCache = await initCache();

  const apolloClient: ApolloClient<any> = new ApolloClient({
    link,
    cache,
    connectToDevTools: import.meta.env.MODE === 'development',
    typeDefs,
    defaultOptions: defaultOptions,
  });

  client = apolloClient;

  return apolloClient;
};
