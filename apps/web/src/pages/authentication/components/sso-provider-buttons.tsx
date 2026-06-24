import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/ui';
import { RiLockFill } from '@usertour/icons';
import { apiUrl } from '@/utils/env';

export interface SsoProviderButtonsProps {
  /** Active SSO providers (only id + name are used). */
  providers: { id: string; name: string }[];
}

// The per-provider "Continue with <name>" buttons, shared by the SSO entry page
// (sso.tsx) and the invite page (invite.tsx) so the icon/style/launch URL live
// in one place. Each button kicks off the same SP-initiated flow at
// <API_URL>/api/auth/sso/<providerId>.
export const SsoProviderButtons = (props: SsoProviderButtonsProps) => {
  const { providers } = props;
  const { t } = useTranslation('ui');

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          className="w-full"
          type="button"
          onClick={() => {
            window.location.href = `${apiUrl}/api/auth/sso/${provider.id}`;
          }}
        >
          <RiLockFill className="mr-2 h-4 w-4" />
          {t('auth.sso.continueWith', { name: provider.name })}
        </Button>
      ))}
    </div>
  );
};

SsoProviderButtons.displayName = 'SsoProviderButtons';
