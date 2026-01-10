import React, { useCallback, useState } from 'react';
import Upload from 'rc-upload';
import { IconsList } from '@usertour-packages/sdk';
import { LauncherIconSource } from '@usertour/types';
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from '@usertour-packages/popover';
import {
  Tabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
} from '@usertour-packages/tabs';
import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { ArrowRightIcon, SpinnerIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { useToast } from '@usertour-packages/use-toast';
import { useAws } from '../hooks/use-aws';

interface LauncherIconTypeProps {
  type: string;
  iconSource?: LauncherIconSource;
  iconUrl?: string;
  zIndex: number;
  onChange: (updates: {
    iconType?: string;
    iconSource?: LauncherIconSource;
    iconUrl?: string;
  }) => void;
}

// Icon button component for grid items
const IconButton = React.memo(
  ({
    icon: Icon,
    text,
    isSelected,
    onClick,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>;
    text: string;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={cn(
            'w-full aspect-square h-auto transition-transform hover:scale-125',
            isSelected && 'bg-accent',
          )}
        >
          <Icon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-foreground">{text}</TooltipContent>
    </Tooltip>
  ),
);
IconButton.displayName = 'IconButton';

// Icon grid component similar to TailwindPalette
const IconGrid = React.memo(
  ({
    selectedType,
    onIconSelect,
  }: {
    selectedType: string;
    onIconSelect: (name: string) => void;
  }) => (
    <div className="flex flex-col">
      <div className="grid grid-cols-10 gap-px flex-1 content-start max-h-72 overflow-y-auto p-1">
        {IconsList.map(({ ICON, name, text }) => (
          <IconButton
            key={name}
            icon={ICON}
            text={text}
            isSelected={name === selectedType}
            onClick={() => onIconSelect(name)}
          />
        ))}
      </div>
    </div>
  ),
);
IconGrid.displayName = 'IconGrid';

export const LauncherIconType = ({
  type,
  iconSource = LauncherIconSource.BUILTIN,
  iconUrl,
  zIndex,
  onChange,
}: LauncherIconTypeProps) => {
  const [open, setOpen] = useState(false);
  const getInitialTab = () => {
    if (iconSource === LauncherIconSource.UPLOAD) {
      return 'upload';
    }
    if (iconSource === LauncherIconSource.URL) {
      return 'url';
    }
    return 'builtin';
  };
  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  const [urlInput, setUrlInput] = useState<string>(iconUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { upload } = useAws();

  // Update activeTab when iconSource changes
  React.useEffect(() => {
    setActiveTab(getInitialTab());
  }, [iconSource]);

  const ActiveIcon = IconsList.find((item) => item.name === type)?.ICON;
  const activeText =
    iconSource === LauncherIconSource.UPLOAD
      ? 'Uploaded icon'
      : iconSource === LauncherIconSource.URL
        ? 'URL icon'
        : (IconsList.find((item) => item.name === type)?.text ?? type);

  const handleIconSelect = (selectedName: string) => {
    onChange({
      iconType: selectedName,
      iconSource: LauncherIconSource.BUILTIN,
      iconUrl: undefined,
    });
    setOpen(false);
  };

  const handleUpload = useCallback(
    (option: any) => {
      setIsUploading(true);

      // Extract file from rc-upload option (file can be File | Blob | string)
      const file = option.file;
      if (!(file instanceof File)) {
        const error = new Error('Invalid file type');
        toast({ variant: 'destructive', title: 'Please select a valid file' });
        option.onError?.(error);
        setIsUploading(false);
        return;
      }

      // Handle async upload operations
      const processUpload = async () => {
        try {
          let url = '';

          // Try AWS upload first, fallback to base64
          try {
            url = await upload(file);
          } catch {
            // Fallback to base64 if AWS upload fails
            url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(file);
            });
          }

          if (url) {
            option.onSuccess?.({ url });
            onChange({
              iconType: type,
              iconSource: LauncherIconSource.UPLOAD,
              iconUrl: url,
            });
            setOpen(false);
          } else {
            const error = new Error('Upload failed');
            toast({ variant: 'destructive', title: 'Failed to upload icon' });
            option.onError?.(error);
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Upload failed');
          toast({ variant: 'destructive', title: error.message });
          option.onError?.(error);
        } finally {
          setIsUploading(false);
        }
      };

      // Start async processing without returning a promise
      processUpload();
    },
    [onChange, type, upload, toast],
  );

  const handleUrlSubmit = useCallback(() => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      toast({ variant: 'destructive', title: 'Please enter a valid URL' });
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
      onChange({
        iconType: type,
        iconSource: LauncherIconSource.URL,
        iconUrl: trimmedUrl,
      });
      setOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Please enter a valid URL' });
    }
  }, [urlInput, onChange, type, toast]);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      if (value === 'url') {
        // Only set URL input if current icon source is URL, otherwise clear it
        setUrlInput(iconSource === LauncherIconSource.URL ? (iconUrl ?? '') : '');
      }
    },
    [iconUrl, iconSource],
  );

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start flex h-8 w-full" style={{ zIndex }}>
            {iconSource === LauncherIconSource.UPLOAD || iconSource === LauncherIconSource.URL ? (
              iconUrl ? (
                <img src={iconUrl} alt="Custom icon" className="w-4 h-4" />
              ) : (
                ActiveIcon && <ActiveIcon size={16} />
              )
            ) : (
              ActiveIcon && <ActiveIcon size={16} />
            )}
            <div className="grow text-left ml-2">
              <span className="capitalize">{activeText}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={5}
          className="z-50 w-full p-0"
          style={{
            zIndex: zIndex + 1,
            filter:
              'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
          }}
        >
          <div className="bg-background p-4 rounded space-y-3 w-80">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <UnderlineTabsList>
                <UnderlineTabsTrigger value="builtin">Built-in icon</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="upload">Upload icon</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="url">Enter URL</UnderlineTabsTrigger>
              </UnderlineTabsList>
              <UnderlineTabsContent value="builtin">
                <IconGrid selectedType={type} onIconSelect={handleIconSelect} />
              </UnderlineTabsContent>
              <UnderlineTabsContent value="upload">
                <div className="py-4 flex flex-col items-center gap-4">
                  <Upload
                    accept="image/svg+xml,image/*"
                    customRequest={handleUpload}
                    disabled={isUploading}
                  >
                    <Button variant="outline" className="w-full" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <SpinnerIcon className="mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Choose SVG or Image File'
                      )}
                    </Button>
                  </Upload>
                  {iconSource === LauncherIconSource.UPLOAD && iconUrl && (
                    <div className="w-full">
                      <img
                        src={iconUrl}
                        alt="Uploaded icon"
                        className="w-16 h-16 mx-auto object-contain"
                      />
                    </div>
                  )}
                </div>
              </UnderlineTabsContent>
              <UnderlineTabsContent value="url">
                <div className="py-4 flex flex-col gap-2">
                  <div className="flex gap-x-2">
                    <Input
                      id="icon-url"
                      placeholder="Enter icon URL"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="bg-background flex-1"
                      disabled={isUploading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUrlSubmit();
                        }
                      }}
                    />
                    <Button
                      className="flex-none w-20"
                      variant="ghost"
                      size="default"
                      onClick={handleUrlSubmit}
                      disabled={isUploading || !urlInput.trim()}
                    >
                      <ArrowRightIcon className="mr-1" />
                      Load
                    </Button>
                  </div>
                  {iconSource === LauncherIconSource.URL && iconUrl && (
                    <div className="w-full pt-2">
                      <img
                        src={iconUrl}
                        alt="URL icon"
                        className="w-16 h-16 mx-auto object-contain"
                      />
                    </div>
                  )}
                </div>
              </UnderlineTabsContent>
            </Tabs>
          </div>
          <PopoverArrow className="fill-background" width={20} height={10} />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
LauncherIconType.displayName = 'LauncherIconType';
