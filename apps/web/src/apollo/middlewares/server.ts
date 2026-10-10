import { apiUrl } from '@/utils/env';
import { createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import i18next from 'i18next';

// Error messages come back in the dashboard's language, which is not
// always the browser's: the header follows i18next per request, so a
// language switch takes effect on the next call.
const languageLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    ...(i18next.language ? { 'Accept-Language': i18next.language } : {}),
  },
}));

const httpLink = createHttpLink({
  uri: `${apiUrl}/graphql`,
});

export const serverLink = languageLink.concat(httpLink);
