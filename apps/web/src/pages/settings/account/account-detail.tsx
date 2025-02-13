import { SettingsContent } from '../components/content';
import { AccountEmailForm } from './components/account-email-form';
import { AccountPasswordForm } from './components/account-password-form';
import { AccountProfileForm } from './components/account-profile-form';

export const SettingsAccountDetail = () => {
  return (
    <div className="flex flex-col grow space-y-8 py-8">
      <SettingsContent className="min-w-[750px] max-w-3xl  shadow-sm border border-border rounded mx-auto bg-background">
        <AccountProfileForm />
      </SettingsContent>
      <SettingsContent className="min-w-[750px] max-w-3xl  shadow-sm border border-border rounded mx-auto bg-background">
        <AccountEmailForm />
      </SettingsContent>
      <SettingsContent className="min-w-[750px] max-w-3xl  shadow-sm border border-border rounded mx-auto bg-background">
        <AccountPasswordForm />
      </SettingsContent>
    </div>
  );
};

SettingsAccountDetail.displayName = 'SettingsAccountDetail';
