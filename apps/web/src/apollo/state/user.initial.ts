import { makeVar } from "@apollo/client";

type UserModel = {
    __typename: string;
    isLoggedIn: boolean;
};

export const initialUser = makeVar<UserModel>({
    __typename: "LocalUser",
    isLoggedIn: false,
});
