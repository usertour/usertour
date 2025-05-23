import { Button } from '@usertour-ui/button';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { useAppContext } from '@/contexts/app-context';

export const UpgradePlanBanner = ({ projectId }: { projectId: string }) => {
  const navigate = useNavigate();
  const { currentUsage, totalLimit, loading } = useSubscriptionContext();
  const { globalConfig } = useAppContext();

  if (globalConfig?.isSelfHostedMode) {
    return null;
  }

  if (currentUsage < totalLimit || loading) {
    return null;
  }

  const handleUpgradeClick = () => {
    navigate(`/project/${projectId}/settings/billing`);
  };

  return (
    <div className="w-full bg-warning text-white py-2 px-4">
      <div className="container mx-auto flex flex-row items-center justify-center">
        <div className="flex flex-row items-center space-x-8">
          <div className="flex flex-row items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              You've reached your session limit. Upgrade your plan to create more sessions.
            </span>
          </div>
          <Button onClick={handleUpgradeClick}>Upgrade Plan</Button>
        </div>
      </div>
    </div>
  );
};
