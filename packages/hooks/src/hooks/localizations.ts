import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import {
  createLocalization,
  deleteLocalization,
  listVersionLocalizations,
  setDefaultLocalization,
  translateLocalizationUnits,
  updateLocalization,
  updateVersionLocalization,
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

/** One unit of a translation save: `null` clears it, a blank string keeps the stored text. */
export interface VersionTranslationUnitChange {
  path: string;
  translation: string | null;
}

export interface UpdateVersionLocalizationInput {
  contentId: string;
  versionId: string;
  /** The target locale's code. */
  code: string;
  /** Only the listed units are written; the server merges them into the stored row. */
  translations?: VersionTranslationUnitChange[];
  /** Omitted keeps the stored state. */
  enabled?: boolean;
}

export const useUpdateVersionLocalizationMutation = () => {
  // In-place saves auto-merge into the `VersionOnLocalization:id` slot; a
  // first save CREATES the row, which the normalized cache can't place into
  // the version's list by itself — insert the ref there.
  const [mutation, { loading, error }] = useMutation(updateVersionLocalization);
  const invoke = useCallback(
    async (input: UpdateVersionLocalizationInput): Promise<boolean> => {
      const response = await mutation({
        variables: { data: input },
        update(cache, { data }) {
          const saved = data?.updateVersionLocalization as VersionOnLocalization | undefined;
          if (!saved) {
            return;
          }
          cache.updateQuery(
            { query: listVersionLocalizations, variables: { versionId: input.versionId } },
            (existing: { listVersionLocalizations: VersionOnLocalization[] } | null) => {
              const rows = existing?.listVersionLocalizations;
              if (!rows || rows.some((row) => row.id === saved.id)) {
                return existing ?? undefined;
              }
              return { listVersionLocalizations: [...rows, saved] };
            },
          );
        },
      });
      return !!response.data?.updateVersionLocalization?.id;
    },
    [mutation],
  );
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

export interface TranslateLocalizationUnitsInput {
  versionId: string;
  localizationId: string;
  units: { path: string; sourceText: string }[];
}

export interface TranslatedLocalizationUnit {
  path: string;
  translatedText: string;
}

export const useTranslateLocalizationUnitsMutation = () => {
  const [mutation, { loading, error }] = useMutation(translateLocalizationUnits);
  const invoke = async (
    input: TranslateLocalizationUnitsInput,
  ): Promise<TranslatedLocalizationUnit[]> => {
    const response = await mutation({ variables: { data: input } });
    return response.data?.translateLocalizationUnits ?? [];
  };
  return { invoke, loading, error };
};
