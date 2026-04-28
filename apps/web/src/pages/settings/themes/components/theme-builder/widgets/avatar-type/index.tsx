import { memo, useCallback } from 'react';

import { AvatarType } from '@usertour/types';
import { BuilderTabs, BuilderTabsContent, BuilderTabsList, BuilderTabsTrigger } from '../../ui';

import { useAvatarTab } from './hooks/use-avatar-tab';
import { CartoonAvatarTab } from './cartoon-avatar-tab';
import { UploadAvatarTab } from './upload-avatar-tab';
import { UrlAvatarTab } from './url-avatar-tab';
import type { AvatarTypeProps } from './types';

export const AvatarTypeSelector = memo<AvatarTypeProps>(
  ({ type, name, url, disabled, onChange }) => {
    const { activeTab, handleTabChange } = useAvatarTab({
      type,
    });

    // Handle tab change with automatic NONE selection
    const handleTabChangeWithNone = useCallback(
      (value: string) => {
        handleTabChange(value);
        // Automatically select NONE when switching to the None tab
        if (value === AvatarType.NONE) {
          onChange({
            type: AvatarType.NONE,
            name: undefined,
            url: undefined,
          });
        }
      },
      [handleTabChange, onChange],
    );

    const handleCartoonSelect = useCallback(
      (selectedName: string) => {
        onChange({
          type: AvatarType.CARTOON,
          name: selectedName,
          url: undefined,
        });
      },
      [onChange],
    );

    const handleUploadSuccess = useCallback(
      (uploadedUrl: string) => {
        onChange({
          type: AvatarType.UPLOAD,
          name: undefined,
          url: uploadedUrl,
        });
      },
      [onChange],
    );

    const handleUrlSubmit = useCallback(
      (submittedUrl: string) => {
        onChange({
          type: AvatarType.URL,
          name: undefined,
          url: submittedUrl,
        });
      },
      [onChange],
    );

    const handleRemoveUploadedAvatar = useCallback(() => {
      onChange({
        type: AvatarType.CARTOON,
        name: 'alex',
        url: undefined,
      });
    }, [onChange]);

    return (
      <BuilderTabs value={activeTab} onValueChange={disabled ? undefined : handleTabChangeWithNone}>
        <BuilderTabsList>
          <BuilderTabsTrigger value={AvatarType.CARTOON} disabled={disabled}>
            Cartoon
          </BuilderTabsTrigger>
          <BuilderTabsTrigger value={AvatarType.UPLOAD} disabled={disabled}>
            Upload
          </BuilderTabsTrigger>
          <BuilderTabsTrigger value={AvatarType.URL} disabled={disabled}>
            URL
          </BuilderTabsTrigger>
          <BuilderTabsTrigger value={AvatarType.NONE} disabled={disabled}>
            None
          </BuilderTabsTrigger>
        </BuilderTabsList>
        <BuilderTabsContent value={AvatarType.CARTOON}>
          <CartoonAvatarTab
            selectedName={name}
            onAvatarSelect={handleCartoonSelect}
            disabled={disabled}
          />
        </BuilderTabsContent>
        <BuilderTabsContent value={AvatarType.UPLOAD}>
          <UploadAvatarTab
            avatarUrl={url}
            isCurrentUpload={type === AvatarType.UPLOAD}
            onUploadSuccess={handleUploadSuccess}
            onRemove={handleRemoveUploadedAvatar}
            disabled={disabled}
          />
        </BuilderTabsContent>
        <BuilderTabsContent value={AvatarType.URL}>
          <UrlAvatarTab
            avatarUrl={url}
            isCurrentUrl={type === AvatarType.URL}
            onUrlSubmit={handleUrlSubmit}
            disabled={disabled}
          />
        </BuilderTabsContent>
        <BuilderTabsContent value={AvatarType.NONE} />
      </BuilderTabs>
    );
  },
);

AvatarTypeSelector.displayName = 'AvatarTypeSelector';

export { AvatarTypeSelector as AvatarType };
export type { AvatarTypeProps } from './types';
