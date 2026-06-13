import { RiErrorWarningLine } from '@usertour/icons';
import { Alert, AlertDescription, AlertTitle, Button } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';

// Shown in place of a custom-CSS / custom-font field when the project's plan
// doesn't include the feature. Cloud-only in practice: self-hosted never
// gates custom CSS (getProjectConfig forces customCss on there), so this only
// renders for cloud projects below Growth. Matches the app-wide plan-limit
// upsell style (a tinted alert with an inline link to billing); the server
// enforces the gate independently.
export const CustomCssUpsell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { project } = useAppContext();

  return (
    <Alert className="bg-primary/10 border-primary/5">
      <RiErrorWarningLine className="h-4 w-4 !text-primary" />
      <AlertTitle>{t('themeBuilder.customCssUpsell.title')}</AlertTitle>
      <AlertDescription>
        {t('themeBuilder.customCssUpsell.descriptionPrefix')}
        <Button
          variant="link"
          className="p-0 h-auto font-normal inline"
          onClick={() => navigate(`/project/${project?.id}/settings/billing`)}
        >
          {t('themeBuilder.customCssUpsell.upgradeLink')}
        </Button>
      </AlertDescription>
    </Alert>
  );
};
