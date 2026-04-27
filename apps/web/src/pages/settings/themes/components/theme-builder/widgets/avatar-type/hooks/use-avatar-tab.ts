import { useCallback, useState, useEffect } from 'react';

import { AvatarType } from '@usertour/types';

interface UseAvatarTabProps {
  type: AvatarType;
}

/**
 * Hook for managing avatar tab state
 */
export const useAvatarTab = ({ type }: UseAvatarTabProps) => {
  const [activeTab, setActiveTab] = useState<string>(type);

  // Update active tab when type changes
  useEffect(() => {
    setActiveTab(type);
  }, [type]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  return {
    activeTab,
    handleTabChange,
  };
};
