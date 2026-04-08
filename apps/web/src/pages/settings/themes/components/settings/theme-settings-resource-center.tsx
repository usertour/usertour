import { useCallback } from 'react';
import Upload from 'rc-upload';
import { Button } from '@usertour-packages/button';
import { RiDeleteBinFill, RiUpload2Fill, SpinnerIcon } from '@usertour-packages/icons';
import { useToast } from '@usertour-packages/use-toast';
import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import type {
  ResourceCenterHeaderBackground,
  ResourceCenterHeaderBackgroundType,
  ResourceCenterPlacement,
} from '@usertour/types';
import { useAvatarUpload } from '../avatar-type/hooks/use-avatar-upload';
import { useThemeSettingsContext } from '../theme-settings-panel';

const ACCEPT_IMAGE_TYPES = 'image/svg+xml,image/png,image/jpeg';

type UploadOption = {
  file: File | Blob | string;
  onError?: (error: Error, body?: unknown) => void;
  onSuccess?: (body: { url: string }) => void;
};

const placementItems = [
  { name: 'Top Left', value: 'top-left' },
  { name: 'Top Right', value: 'top-right' },
  { name: 'Bottom Left', value: 'bottom-left' },
  { name: 'Bottom Right', value: 'bottom-right' },
];

const headerBackgroundTypeItems = [
  { name: 'Color', value: 'color' },
  { name: 'Gradient', value: 'gradient' },
  { name: 'Image', value: 'image' },
];

export const ThemeSettingsResourceCenter = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();
  const { toast } = useToast();

  const resourceCenter = settings.resourceCenter;
  if (!resourceCenter) return null;

  const update = (data: Partial<typeof resourceCenter>) => {
    setSettings((pre) => ({
      ...pre,
      resourceCenter: { ...resourceCenter, ...data },
    }));
  };

  const headerBackground = resourceCenter.headerBackground;
  const brandBackground = settings.brandColor.background;

  const updateHeaderBackground = (data: Partial<ResourceCenterHeaderBackground>) => {
    update({
      headerBackground: { ...headerBackground, ...data },
    });
  };

  const { handleUpload: handleBgUpload, isUploading: isBgUploading } = useAvatarUpload({
    onUploadSuccess: (url) => {
      updateHeaderBackground({ imageUrl: url });
    },
  });

  const { handleUpload: handleLogoUploadRequest, isUploading: isLogoUploading } = useAvatarUpload({
    onUploadSuccess: (url) => {
      update({ logoUrl: url });
    },
  });

  const validateAndUpload = useCallback(
    (option: UploadOption, uploadFn: (option: UploadOption) => void) => {
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

      uploadFn(option);
    },
    [toast],
  );

  const handleImageUpload = useCallback(
    (option: UploadOption) => validateAndUpload(option, handleBgUpload),
    [validateAndUpload, handleBgUpload],
  );

  const handleLogoUpload = useCallback(
    (option: UploadOption) => {
      const file = option.file;
      if (file instanceof File && file.size > 2 * 1024 * 1024) {
        const error = new Error('File too large');
        toast({ variant: 'destructive', title: 'Max file size is 2MB.' });
        option.onError?.(error);
        return;
      }
      validateAndUpload(option, handleLogoUploadRequest);
    },
    [validateAndUpload, handleLogoUploadRequest, toast],
  );

  return (
    <div className="flex flex-col">
      <div className="py-[15px] px-5 space-y-3">
        {/* Logo */}
        <div>
          <h4 className="text-sm font-medium mb-3">Logo</h4>
          <div className="rounded-lg border bg-background p-4">
            <div className="mb-3">
              <p className="text-xs text-muted-foreground">
                Recommended size: 60x60 pixels. Max file size: 2MB.
              </p>
            </div>

            <Upload
              accept={ACCEPT_IMAGE_TYPES}
              customRequest={handleLogoUpload}
              disabled={isViewOnly || isLogoUploading}
              className="block min-w-0"
            >
              <div
                className={`flex min-w-0 cursor-pointer flex-col items-center gap-3 rounded-md border-2 p-4 transition-colors ${
                  isViewOnly || isLogoUploading
                    ? 'cursor-not-allowed border-muted/50 bg-muted/30'
                    : 'border-dashed border-muted bg-transparent'
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                  <RiUpload2Fill className="text-muted-foreground/70" size={20} />
                </div>
                <Button
                  variant="outline"
                  className="whitespace-nowrap"
                  disabled={isViewOnly || isLogoUploading}
                >
                  {isLogoUploading ? (
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

            {resourceCenter.logoUrl && (
              <div className="mt-4 flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-12 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/70">
                    <img
                      src={resourceCenter.logoUrl}
                      alt="Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      Uploaded logo
                    </div>
                    <div className="truncate break-all text-xs text-muted-foreground">
                      {resourceCenter.logoUrl}
                    </div>
                  </div>
                </div>

                <Button
                  className="flex-none hover:bg-destructive/10"
                  variant="ghost"
                  size="icon"
                  onClick={() => update({ logoUrl: '' })}
                  disabled={isViewOnly}
                >
                  <RiDeleteBinFill className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Header Background */}
        <div>
          <h4 className="text-sm font-medium mb-3">Home header background</h4>
          <div className="space-y-3">
            <ThemeSettingSelect
              text="Type"
              name="resource-center-header-bg-type"
              items={headerBackgroundTypeItems}
              tooltip="The background style for the resource center header area."
              defaultValue={headerBackground.type}
              onValueChange={(value: string) => {
                updateHeaderBackground({ type: value as ResourceCenterHeaderBackgroundType });
              }}
              disabled={isViewOnly}
            />
            {headerBackground.type === 'color' && (
              <ThemeSelectColor
                text="Background color"
                name="resource-center-header-bg-color"
                defaultColor={headerBackground.color}
                showAutoButton={true}
                isAutoColor={headerBackground.color === 'Auto'}
                autoColor={brandBackground}
                onChange={(value: string) => {
                  updateHeaderBackground({ color: value });
                }}
                disabled={isViewOnly}
              />
            )}
            {headerBackground.type === 'gradient' && (
              <>
                <ThemeSelectColor
                  text="Gradient from"
                  name="resource-center-header-bg-gradient-from"
                  defaultColor={headerBackground.gradientFrom}
                  showAutoButton={true}
                  isAutoColor={headerBackground.gradientFrom === 'Auto'}
                  autoColor={brandBackground}
                  onChange={(value: string) => {
                    updateHeaderBackground({ gradientFrom: value });
                  }}
                  disabled={isViewOnly}
                />
                <ThemeSelectColor
                  text="Gradient to"
                  name="resource-center-header-bg-gradient-to"
                  defaultColor={headerBackground.gradientTo}
                  showAutoButton={true}
                  isAutoColor={headerBackground.gradientTo === 'Auto'}
                  autoColor={settings.brandColor.color}
                  onChange={(value: string) => {
                    updateHeaderBackground({ gradientTo: value });
                  }}
                  disabled={isViewOnly}
                />
              </>
            )}
            {headerBackground.type === 'image' && (
              <div className="rounded-lg border bg-background p-4">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-foreground">Upload background image</h4>
                  <p className="text-xs text-muted-foreground">PNG/JPG/SVG</p>
                </div>

                <Upload
                  accept={ACCEPT_IMAGE_TYPES}
                  customRequest={handleImageUpload}
                  disabled={isViewOnly || isBgUploading}
                  className="block min-w-0"
                >
                  <div
                    className={`flex min-w-0 cursor-pointer flex-col items-center gap-3 rounded-md border-2 p-4 transition-colors ${
                      isViewOnly || isBgUploading
                        ? 'cursor-not-allowed border-muted/50 bg-muted/30'
                        : 'border-dashed border-muted bg-transparent'
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                      <RiUpload2Fill className="text-muted-foreground/70" size={20} />
                    </div>
                    <Button
                      variant="outline"
                      className="whitespace-nowrap"
                      disabled={isViewOnly || isBgUploading}
                    >
                      {isBgUploading ? (
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

                {headerBackground.imageUrl && (
                  <div className="mt-4 flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/70">
                        <img
                          src={headerBackground.imageUrl}
                          alt="Header background"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          Uploaded image
                        </div>
                        <div className="truncate break-all text-xs text-muted-foreground">
                          {headerBackground.imageUrl}
                        </div>
                      </div>
                    </div>

                    <Button
                      className="flex-none hover:bg-destructive/10"
                      variant="ghost"
                      size="icon"
                      onClick={() => updateHeaderBackground({ imageUrl: '' })}
                      disabled={isViewOnly}
                    >
                      <RiDeleteBinFill className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-border" />
      <div className="py-[15px] px-5 space-y-3">
        {/* Colors */}
        <div>
          <h4 className="text-sm font-medium mb-3">Colors</h4>
          <div className="space-y-3">
            <ThemeSelectColor
              text="Background"
              name="resource-center-background-color"
              defaultColor={resourceCenter.backgroundColor}
              showAutoButton={true}
              isAutoColor={resourceCenter.backgroundColor === 'Auto'}
              autoColor={settings.mainColor.background}
              onChange={(value: string) => {
                update({ backgroundColor: value });
              }}
              disabled={isViewOnly}
            />
            <ThemeSelectColor
              text="Font color"
              name="resource-center-foreground-color"
              defaultColor={resourceCenter.fontColor}
              showAutoButton={true}
              isAutoColor={resourceCenter.fontColor === 'Auto'}
              autoColor={settings.mainColor.color}
              onChange={(value: string) => {
                update({ fontColor: value });
              }}
              disabled={isViewOnly}
            />
            <ThemeSelectColor
              text="Primary"
              name="resource-center-primary-color"
              defaultColor={resourceCenter.primaryColor}
              showAutoButton={true}
              isAutoColor={resourceCenter.primaryColor === 'Auto'}
              autoColor={brandBackground}
              onChange={(value: string) => {
                update({ primaryColor: value });
              }}
              disabled={isViewOnly}
            />
            <ThemeSelectColor
              text="Header font color"
              name="resource-center-primary-foreground-color"
              defaultColor={resourceCenter.headerFontColor}
              showAutoButton={true}
              isAutoColor={resourceCenter.headerFontColor === 'Auto'}
              autoColor={settings.brandColor.color}
              onChange={(value: string) => {
                update({ headerFontColor: value });
              }}
              disabled={isViewOnly}
            />
          </div>
        </div>
      </div>
      <div className="border-t border-border" />
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingSelect
          text="Placement"
          name="resource-center-placement"
          items={placementItems}
          tooltip="Controls which corner the resource center panel should appear at."
          defaultValue={resourceCenter.placement}
          onValueChange={(value: string) => {
            update({ placement: value as ResourceCenterPlacement });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Offset X"
          name="resource-center-offset-x"
          tooltip="Horizontal offset from the edge of the viewport in pixels."
          defaultValue={String(resourceCenter.offsetX)}
          onChange={(value: string) => {
            update({ offsetX: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Offset Y"
          name="resource-center-offset-y"
          tooltip="Vertical offset from the edge of the viewport in pixels."
          defaultValue={String(resourceCenter.offsetY)}
          onChange={(value: string) => {
            update({ offsetY: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Normal width"
          name="resource-center-normal-width"
          tooltip="The default width of the resource center panel."
          defaultValue={String(resourceCenter.normalWidth)}
          onChange={(value: string) => {
            update({ normalWidth: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Large width"
          name="resource-center-large-width"
          tooltip="The expanded width used for larger block types."
          defaultValue={String(resourceCenter.largeWidth)}
          onChange={(value: string) => {
            update({ largeWidth: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Transition duration"
          name="resource-center-transition-duration"
          tooltip="The duration of the panel open/close animation in milliseconds."
          defaultValue={String(resourceCenter.transitionDuration)}
          onChange={(value: string) => {
            update({ transitionDuration: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Z-index"
          name="resource-center-z-index"
          disableUnit={true}
          placeholder="Auto"
          tooltip="Controls the z-index of the resource center. Leave empty for default."
          defaultValue={resourceCenter.zIndex ? String(resourceCenter.zIndex) : ''}
          onChange={(value: string) => {
            const numValue = value === '' ? undefined : Number(value);
            update({ zIndex: numValue });
          }}
          disabled={isViewOnly}
        />
      </div>
    </div>
  );
};

ThemeSettingsResourceCenter.displayName = 'ThemeSettingsResourceCenter';
