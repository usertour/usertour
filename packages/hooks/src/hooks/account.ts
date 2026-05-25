import { useMutation } from '@apollo/client';
import { changePassword, updateEmail, updateUser } from '@usertour/gql';

export const useUpdateUserMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateUser);
  const invoke = async (name: string, avatarUrl = ''): Promise<boolean> => {
    const response = await mutation({ variables: { name, avatarUrl } });
    return !!response.data?.updateUser?.id;
  };
  return { invoke, loading, error };
};

export const useUpdateEmailMutation = () => {
  // GraphQL operation is named `changeEmail`; the document export is
  // `updateEmail` because that's how it surfaces in the user-settings UI.
  const [mutation, { loading, error }] = useMutation(updateEmail);
  const invoke = async (email: string, password: string): Promise<boolean> => {
    const response = await mutation({ variables: { email, password } });
    return !!response.data?.changeEmail?.id;
  };
  return { invoke, loading, error };
};

export const useChangePasswordMutation = () => {
  const [mutation, { loading, error }] = useMutation(changePassword);
  const invoke = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    const response = await mutation({ variables: { oldPassword, newPassword } });
    return !!response.data?.changePassword?.id;
  };
  return { invoke, loading, error };
};
