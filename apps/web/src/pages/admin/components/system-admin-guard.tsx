import { useAppContext } from '@/contexts/app-context';
import { useToast } from '@usertour/ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface SystemAdminGuardProps {
  children: React.ReactNode;
}

export const SystemAdminGuard = ({ children }: SystemAdminGuardProps) => {
  const { t } = useTranslation();
  const { globalConfig, userInfo, project, loading } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!globalConfig?.isSelfHostedMode) {
      navigate('/', { replace: true });
      return;
    }

    if (userInfo && !userInfo.isSystemAdmin) {
      toast({
        variant: 'destructive',
        title: t('admin.guard.accessDeniedTitle'),
        description: t('admin.guard.accessDeniedDescription'),
      });
      const projectHome = project?.id ? `/project/${project.id}/settings/account` : '/';
      navigate(projectHome, { replace: true });
    }
  }, [loading, globalConfig, userInfo, project, navigate, toast]);

  if (loading || !userInfo) {
    return null;
  }

  if (!globalConfig?.isSelfHostedMode || !userInfo.isSystemAdmin) {
    return null;
  }

  return <>{children}</>;
};

SystemAdminGuard.displayName = 'SystemAdminGuard';
