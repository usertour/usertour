import { useCallback } from 'react';
import Upload from 'rc-upload';
import { Button } from '@usertour-packages/button';
import { RiDeleteBinFill, RiUpload2Fill, SpinnerIcon } from '@usertour-packages/icons';
import { useToast } from '@usertour-packages/use-toast';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import type {
  ResourceCenterLauncherIconType,
  ResourceCenterLauncherTextMode,
} from '@usertour/types';
import { useAvatarUpload } from '../avatar-type/hooks/use-avatar-upload';
import { useThemeSettingsContext } from '../theme-settings-panel';

const iconTypeItems = [
  { name: 'Default question mark', value: 'default-question-mark' },
  { name: 'Plaintext question mark', value: 'plaintext-question-mark' },
  { name: 'Custom', value: 'custom' },
];

const ACCEPT_FILE_TYPES = 'image/svg+xml,image/png,image/jpeg';
const MIN_ICON_SIZE = 60;

const textModeItems = [
  { name: 'Active checklist text', value: 'active-checklist-text' },
  { name: 'Resource center text', value: 'resource-center-text' },
  { name: 'No text', value: 'no-text' },
];

type RcUploadOption = {
  file: File | Blob | string;
  onError?: (error: Error, body?: unknown) => void;
  onSuccess?: (body: { url: string }) => void;
};

const validateImageDimensions = (file: File): Promise<void> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.naturalWidth < MIN_ICON_SIZE || image.naturalHeight < MIN_ICON_SIZE) {
        reject(new Error(`Image must be at least ${MIN_ICON_SIZE}x${MIN_ICON_SIZE} pixels.`));
        return;
      }
      resolve();
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to read image dimensions.'));
    };

    image.src = objectUrl;
  });

export const ThemeSettingsResourceCenterLauncher = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();
  const { toast } = useToast();

  const launcher = settings.resourceCenterLauncherButton;
  if (!launcher) return null;

  const update = (data: Partial<typeof launcher>) => {
    setSettings((pre) => ({
      ...pre,
      resourceCenterLauncherButton: { ...launcher, ...data },
    }));
  };

  const { handleUpload, isUploading } = useAvatarUpload({
    onUploadSuccess: (url) => {
      update({ iconUrl: url });
    },
  });

  const handleCustomIconUpload = useCallback(
    async (option: RcUploadOption) => {
      const file = option.file;
      if (!(file instanceof File)) {
        const error = new Error('Invalid file type');
        toast({ variant: 'destructive', title: 'Please select a valid image file.' });
        option.onError?.(error);
        return;
      }

      const isSupportedType = ['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type);
      if (!isSupportedType) {
        const error = new Error('Unsupported file type');
        toast({
          variant: 'destructive',
          title: 'Only PNG, JPG, or SVG files are supported.',
        });
        option.onError?.(error);
        return;
      }

      try {
        await validateImageDimensions(file);
        handleUpload(option);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Invalid image file');
        toast({ variant: 'destructive', title: error.message });
        option.onError?.(error);
      }
    },
    [handleUpload, toast],
  );

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingSelect
          text="Icon type"
          name="rc-launcher-icon-type"
          items={iconTypeItems}
          tooltip="The icon displayed in the launcher button."
          vertical
          defaultValue={launcher.iconType}
          onValueChange={(value: string) => {
            update({ iconType: value as ResourceCenterLauncherIconType });
          }}
          disabled={isViewOnly}
        />
        {launcher.iconType === 'custom' && (
          <div className="rounded-lg border bg-background p-4">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-foreground">Upload custom icon</h4>
              <p className="text-xs text-muted-foreground">Min. 60x60 pixels PNG/JPG/SVG</p>
            </div>

            <Upload
              accept={ACCEPT_FILE_TYPES}
              customRequest={handleCustomIconUpload}
              disabled={isViewOnly || isUploading}
              className="block min-w-0"
            >
              <div
                className={`flex min-w-0 cursor-pointer flex-col items-center gap-3 rounded-md border-2 p-4 transition-colors ${
                  isViewOnly || isUploading
                    ? 'cursor-not-allowed border-muted/50 bg-muted/30'
                    : 'border-dashed border-muted bg-transparent'
                }`}
                aria-hidden={isUploading}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                  <RiUpload2Fill className="text-muted-foreground/70" size={20} />
                </div>
                <Button
                  variant="outline"
                  className="whitespace-nowrap"
                  disabled={isViewOnly || isUploading}
                >
                  {isUploading ? (
                    <span className="inline-flex items-center">
                      <SpinnerIcon className="mr-2 animate-spin" />
                      Uploading
                    </span>
                  ) : (
                    'Choose file'
                  )}
                </Button>
              </div>
            </Upload>

            {launcher.iconUrl && (
              <div className="mt-4 flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/70">
                    <img
                      src={launcher.iconUrl}
                      alt="Uploaded resource center icon"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      Uploaded icon
                    </div>
                    <div className="truncate break-all text-xs text-muted-foreground">
                      {launcher.iconUrl}
                    </div>
                  </div>
                </div>

                <Button
                  className="flex-none hover:bg-destructive/10"
                  variant="ghost"
                  size="icon"
                  onClick={() => update({ iconUrl: undefined })}
                  disabled={isViewOnly}
                >
                  <RiDeleteBinFill className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        )}
        <ThemeSettingInput
          text="Height"
          name="rc-launcher-height"
          tooltip="The height of the launcher button in pixels."
          defaultValue={String(launcher.height)}
          onChange={(value: string) => {
            update({ height: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Image height"
          name="rc-launcher-image-height"
          tooltip="The height of the icon image inside the launcher button."
          defaultValue={String(launcher.imageHeight)}
          onChange={(value: string) => {
            update({ imageHeight: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Border radius"
          name="rc-launcher-border-radius"
          tooltip="The border radius of the launcher button. Leave blank for a round launcher."
          placeholder="Round"
          defaultValue={launcher.borderRadius == null ? '' : String(launcher.borderRadius)}
          onChange={(value: string) => {
            update({ borderRadius: value.trim() === '' ? null : Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingSelect
          text="Text mode"
          name="rc-launcher-text-mode"
          items={textModeItems}
          tooltip="Controls what text is shown next to the launcher icon."
          vertical
          defaultValue={launcher.textMode}
          onValueChange={(value: string) => {
            update({ textMode: value as ResourceCenterLauncherTextMode });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingSelect
          text="Show remaining tasks"
          name="rc-launcher-show-remaining-tasks"
          items={[
            { name: 'Show', value: 'true' },
            { name: 'Hide', value: 'false' },
          ]}
          tooltip="Whether to show the number of remaining checklist tasks."
          defaultValue={String(launcher.showRemainingTasks)}
          onValueChange={(value: string) => {
            update({ showRemainingTasks: value === 'true' });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsResourceCenterLauncher.displayName = 'ThemeSettingsResourceCenterLauncher';
