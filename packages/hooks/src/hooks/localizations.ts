import { useMutation } from '@apollo/client';
import {
  createLocalization,
  deleteLocalization,
  listVersionLocalizations,
  setDefaultLocalization,
  updateLocalization,
  upsertVersionLocalization,
} from '@usertour/gql';
import type { VersionOnLocalization } from '@usertour/types';

export interface CreateLocalizationInput {
  projectId: string;
  locale: string;
  name: string;
  code: string;
}

export interface UpdateLocalizationInput {
  id: string;
  locale: string;
  name: string;
  code: string;
}

export const useCreateLocalizationMutation = () => {
  const [mutation, { loading, error }] = useMutation(createLocalization, {
    refetchQueries: ['listLocalizations'],
  });
  const invoke = async (input: CreateLocalizationInput): Promise<boolean> => {
    const response = await mutation({ variables: { data: input } });
    return !!response.data?.createLocalization?.id;
  };
  return { invoke, loading, error };
};

export const useUpdateLocalizationMutation = () => {
  // Auto-merged by Apollo via __typename:id.
  const [mutation, { loading, error }] = useMutation(updateLocalization);
  const invoke = async (input: UpdateLocalizationInput): Promise<boolean> => {
    const response = await mutation({ variables: { data: input } });
    return !!response.data?.updateLocalization?.id;
  };
  return { invoke, loading, error };
};

export const useDeleteLocalizationMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteLocalization);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({
      variables: { id },
      update(cache) {
        cache.evict({ id: cache.identify({ __typename: 'Localization', id }) });
        cache.gc();
      },
    });
    return !!response.data?.deleteLocalization?.id;
  };
  return { invoke, loading, error };
};

export interface UpsertVersionLocalizationInput {
  localizationId: string;
  versionId: string;
  localized?: unknown;
  backup?: unknown;
  enabled?: boolean;
}

export const useUpsertVersionLocalizationMutation = () => {
  // In-place saves auto-merge into the `VersionOnLocalization:id` slot; a
  // first save CREATES the row, which the normalized cache can't place into
  // the version's list by itself — insert the ref there.
  const [mutation, { loading, error }] = useMutation(upsertVersionLocalization);
  const invoke = async (input: UpsertVersionLocalizationInput): Promise<boolean> => {
    const response = await mutation({
      variables: { data: input },
      update(cache, { data }) {
        const upserted = data?.upsertVersionLocalization as VersionOnLocalization | undefined;
        if (!upserted) {
          return;
        }
        cache.updateQuery(
          { query: listVersionLocalizations, variables: { versionId: input.versionId } },
          (existing: { listVersionLocalizations: VersionOnLocalization[] } | null) => {
            const rows = existing?.listVersionLocalizations;
            if (!rows || rows.some((row) => row.id === upserted.id)) {
              return existing ?? undefined;
            }
            return { listVersionLocalizations: [...rows, upserted] };
          },
        );
      },
    });
    return !!response.data?.upsertVersionLocalization?.id;
  };
  return { invoke, loading, error };
};

export const useSetDefaultLocalizationMutation = () => {
  // The mutation flips `isDefault` on two rows (the old default → false,
  // the new one → true). Server response only carries the new default's
  // id, so refetch the list to pick up the demoted previous default.
  const [mutation, { loading, error }] = useMutation(setDefaultLocalization, {
    refetchQueries: ['listLocalizations'],
  });
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.setDefaultLocalization?.id;
  };
  return { invoke, loading, error };
};
