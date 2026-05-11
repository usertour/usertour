import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@usertour-packages/input';
import { cn } from '@usertour-packages/tailwind';

import { ThemeSettingErrorPopover } from '@/components/molecules/theme/theme-setting-error-popover';

import { useAvatarUrl } from './hooks/use-avatar-url';
import type { UrlAvatarTabProps } from './types';

export const UrlAvatarTab = memo<UrlAvatarTabProps>(
  ({ avatarUrl, isCurrentUrl, onUrlSubmit, disabled }) => {
    const { urlInput, setUrlInput, handleFocus, handleBlur, error } = useAvatarUrl({
      avatarUrl,
      isCurrentUrl,
      onUrlSubmit,
    });
    const { t } = useTranslation();

    return (
      <div className="py-4 flex flex-col gap-2">
        <ThemeSettingErrorPopover error={error}>
          <Input
            id="avatar-url"
            placeholder={t('themeBuilder.avatar.urlPlaceholder')}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'bg-background',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
            disabled={disabled}
          />
        </ThemeSettingErrorPopover>
      </div>
    );
  },
);
UrlAvatarTab.displayName = 'UrlAvatarTab';
