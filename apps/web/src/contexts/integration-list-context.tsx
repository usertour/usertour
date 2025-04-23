import React, { createContext, useContext } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { Integration } from '@usertour-ui/types';
import { toast } from '@usertour-ui/use-toast';

const LIST_INTEGRATIONS = gql`
  query listIntegrations($projectId: String!) {
    listIntegrations(projectId: $projectId) {
      id
      displayName
      codeName
      projectId
      createdAt
      updatedAt
      enabled
    }
  }
`;

const UPSERT_BIZ_INTEGRATION = gql`
  mutation upsertBizIntegration($data: UpsertBizIntegrationInput!) {
  upsertBizIntegration(data: $data) {
    success
  }
}
`;

type IntegrationListContextType = {
  integrations: Integration[];
  loading: boolean;
  toggleIntegration: (
    integrationId: string,
    enabled: boolean,
    displayName: string,
  ) => Promise<void>;
};

const IntegrationListContext = createContext<IntegrationListContextType | undefined>(undefined);

export const IntegrationListProvider = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string | undefined;
}) => {
  const { data, loading, refetch } = useQuery(LIST_INTEGRATIONS, {
    variables: { projectId },
  });

  const [upsertBizIntegration] = useMutation(UPSERT_BIZ_INTEGRATION);

  const toggleIntegration = async (
    integrationId: string,
    enabled: boolean,
    displayName: string,
  ) => {
    try {
      const response = await upsertBizIntegration({
        variables: { data: { integrationId, enabled } },
      });
      if (response.data.upsertBizIntegration.success) {
        toast({
          variant: 'success',
          title: `${enabled ? 'Connected' : 'Disconnected'} ${displayName} integration`,
        });
        refetch();
      } else {
        toast({
          variant: 'destructive',
          title: `Failed to enable integration: ${response.data.enableIntegration.message}`,
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Unknown error occurred',
      });
    }
  };

  const integrations = data?.listIntegrations || [];

  return (
    <IntegrationListContext.Provider
      value={{
        integrations,
        loading,
        toggleIntegration,
      }}
    >
      {children}
    </IntegrationListContext.Provider>
  );
};

export const useIntegrationList = () => {
  const context = useContext(IntegrationListContext);
  if (!context) {
    throw new Error('useIntegrationList must be used within an IntegrationListProvider');
  }
  return context;
};
