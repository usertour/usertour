import { ApolloLink } from '@apollo/client';
import { errorLink } from './errors';
import { serverLink } from './server';

const link: ApolloLink = ApolloLink.from([serverLink, errorLink]);

export default link;
