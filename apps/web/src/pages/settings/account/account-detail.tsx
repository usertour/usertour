import { useAppContext } from '@/contexts/app-context';
import { SettingsCard, SettingsCardStack } from '@usertour/ui';
import { AccountEmailForm } from './components/account-email-form';
import { AccountPasswordForm } from './components/account-password-form';
import { AccountProfileForm } from './components/account-profile-form';
import { AccountTwoFactor } from './two-factor';

export const SettingsAccountDetail = () => {
  const { userInfo } = useAppContext();
  return (
    <SettingsCardStack>
      <SettingsCard>
        <AccountProfileForm />
      </SettingsCard>
      {!userInfo?.isOAuthUser && (
        <>
          <SettingsCard>
            <AccountEmailForm />
          </SettingsCard>
          <SettingsCard>
            <AccountPasswordForm />
          </SettingsCard>
        </>
      )}
      <SettingsCard>
        <AccountTwoFactor />
      </SettingsCard>
    </SettingsCardStack>
  );
};

SettingsAccountDetail.displayName = 'SettingsAccountDetail';
