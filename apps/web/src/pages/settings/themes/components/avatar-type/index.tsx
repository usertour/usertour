import { memo, useCallback } from 'react';

import { AvatarType } from '@usertour/types';
import {
  Tabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
} from '@usertour-packages/tabs';

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

    const handleNoneSelect = useCallback(() => {
      onChange({
        type: AvatarType.NONE,
        name: undefined,
        url: undefined,
      });
    }, [onChange]);

    return (
      <Tabs value={activeTab} onValueChange={disabled ? undefined : handleTabChange}>
        <UnderlineTabsList>
          <UnderlineTabsTrigger value={AvatarType.CARTOON} disabled={disabled}>
            Cartoon
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value={AvatarType.UPLOAD} disabled={disabled}>
            Upload
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value={AvatarType.URL} disabled={disabled}>
            URL
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value={AvatarType.NONE} disabled={disabled}>
            None
          </UnderlineTabsTrigger>
        </UnderlineTabsList>
        <UnderlineTabsContent value={AvatarType.CARTOON}>
          <CartoonAvatarTab
            selectedName={name}
            onAvatarSelect={handleCartoonSelect}
            disabled={disabled}
          />
        </UnderlineTabsContent>
        <UnderlineTabsContent value={AvatarType.UPLOAD}>
          <UploadAvatarTab
            avatarUrl={url}
            isCurrentUpload={type === AvatarType.UPLOAD}
            onUploadSuccess={handleUploadSuccess}
            onRemove={handleRemoveUploadedAvatar}
            disabled={disabled}
          />
        </UnderlineTabsContent>
        <UnderlineTabsContent value={AvatarType.URL}>
          <UrlAvatarTab
            avatarUrl={url}
            isCurrentUrl={type === AvatarType.URL}
            onUrlSubmit={handleUrlSubmit}
            disabled={disabled}
          />
        </UnderlineTabsContent>
        <UnderlineTabsContent value={AvatarType.NONE}>
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">No avatar will be displayed</p>
            <button
              type="button"
              onClick={handleNoneSelect}
              disabled={disabled}
              className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {type === AvatarType.NONE ? 'Currently selected' : 'Select this option'}
            </button>
          </div>
        </UnderlineTabsContent>
      </Tabs>
    );
  },
);

AvatarTypeSelector.displayName = 'AvatarTypeSelector';

export { AvatarTypeSelector as AvatarType };
export type { AvatarTypeProps } from './types';
