import { useAppContext } from '@/contexts/app-context';
import { SettingsContent } from '../components/content';
import { AccountEmailForm } from './components/account-email-form';
import { AccountPasswordForm } from './components/account-password-form';
import { AccountProfileForm } from './components/account-profile-form';
import { AccountTwoFactorForm } from './components/account-two-factor-form';

export const SettingsAccountDetail = () => {
  const { userInfo } = useAppContext();
  return (
    <div className="flex flex-col grow space-y-8 py-8">
      <SettingsContent className="w-full min-w-[750px] max-w-3xl  shadow-sm border border-border rounded-xl mx-auto bg-background">
        <AccountProfileForm />
      </SettingsContent>
      {!userInfo?.isOAuthUser && (
        <>
          <SettingsContent className="w-full min-w-[750px] max-w-3xl  shadow-sm border border-border rounded-xl mx-auto bg-background">
            <AccountEmailForm />
          </SettingsContent>
          <SettingsContent className="w-full min-w-[750px] max-w-3xl  shadow-sm border border-border rounded-xl mx-auto bg-background">
            <AccountPasswordForm />
          </SettingsContent>
        </>
      )}
      <SettingsContent className="w-full min-w-[750px] max-w-3xl  shadow-sm border border-border rounded-xl mx-auto bg-background">
        <AccountTwoFactorForm />
      </SettingsContent>
    </div>
  );
};

SettingsAccountDetail.displayName = 'SettingsAccountDetail';
