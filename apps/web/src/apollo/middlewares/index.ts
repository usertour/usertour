import { ApolloLink } from "@apollo/client";
import { serverLink } from "./server";
import { errorLink } from "./errors";

const link: ApolloLink = ApolloLink.from([serverLink, errorLink]);

export default link;
