import { useGlobalConfigQuery } from '@usertour/hooks';

// Thin facade over the Apollo `globalConfig` query so consumers don't
// have to remember the wrapper name and the field name stays consistent
// with the legacy AppContext shape.
export const useGlobalConfig = () => {
  const { data: globalConfig, loading: globalConfigLoading } = useGlobalConfigQuery();
  return { globalConfig, globalConfigLoading };
};
