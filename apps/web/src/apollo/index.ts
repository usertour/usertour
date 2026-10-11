import { ApolloClient, DefaultOptions, InMemoryCache } from '@apollo/client';
import initCache from './cache';
import link from './middlewares';
import { typeDefs } from './type-defs';

let client: ApolloClient<any>;

// errorPolicy 'none' (ADR 0021 §2): a partial response is an error and never
// flows on as data. A query that wants partial data opts into 'all' itself
// — today that is `me`, whose user must survive a failed `projects` field.
const defaultOptions: DefaultOptions = {
  watchQuery: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'none',
  },
  query: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'none',
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
