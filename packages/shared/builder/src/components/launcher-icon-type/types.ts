import type { LauncherIconSource } from '@usertour/types';
import type { RemixiconComponentType } from '@usertour-packages/icons';

// Main component props
export interface LauncherIconTypeProps {
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

// rc-upload option type (replacing 'any')
export interface RcUploadOption {
  file: File | Blob | string;
  onProgress?: (event: { percent?: number }) => void;
  onError?: (error: Error, body?: unknown) => void;
  onSuccess?: (body: { url: string }) => void;
}

// Icon button props
export interface IconButtonProps {
  icon: RemixiconComponentType;
  text: string;
  isSelected: boolean;
  onClick: () => void;
}

// Icon grid props
export interface IconGridProps {
  selectedType: string;
  onIconSelect: (name: string) => void;
}

// Icon preview props
export interface IconPreviewProps {
  iconUrl: string;
  alt: string;
  size?: 'small' | 'medium' | 'large';
}

// Icon trigger button props
export interface IconTriggerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  iconSource: LauncherIconSource;
  iconUrl?: string;
  iconType: string;
  activeText: string;
}

// Builtin icon tab props
export interface BuiltinIconTabProps {
  selectedType: string;
  onIconSelect: (name: string) => void;
}

// Upload icon tab props
export interface UploadIconTabProps {
  iconUrl?: string;
  iconSource: LauncherIconSource;
  onUploadSuccess: (url: string) => void;
}

// URL icon tab props
export interface UrlIconTabProps {
  iconUrl?: string;
  iconSource: LauncherIconSource;
  onUrlSubmit: (url: string) => void;
  isUploading: boolean;
}
